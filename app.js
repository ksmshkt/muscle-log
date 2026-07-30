// ── Supabase init ──
const { createClient } = supabase;
const sb = createClient(
  'https://irowrhywlanakohpvdsa.supabase.co',
  'sb_publishable_-5Bgp5N-7LT6P7Lx6b_90A_kLtkHWDz'
);

// ── DOM refs ──
const authScreen   = document.getElementById('auth-screen');
const app          = document.getElementById('app');
const authForm     = document.getElementById('auth-form');
const authEmail    = document.getElementById('auth-email');
const authPassword = document.getElementById('auth-password');
const authError    = document.getElementById('auth-error');
const authSubmit   = document.getElementById('auth-submit');
const btnSignout   = document.getElementById('btn-signout');
const authModeTabs = document.querySelectorAll('.auth-mode-tab');

const authMainView       = document.getElementById('auth-main-view');
const authForgotView     = document.getElementById('auth-forgot-view');
const btnForgotPassword  = document.getElementById('btn-forgot-password');
const btnBackToSignin    = document.getElementById('btn-back-to-signin');
const forgotForm         = document.getElementById('forgot-form');
const forgotEmail        = document.getElementById('forgot-email');
const forgotError        = document.getElementById('forgot-error');
const forgotSubmit       = document.getElementById('forgot-submit');

const resetPasswordScreen = document.getElementById('reset-password-screen');
const resetPasswordForm   = document.getElementById('reset-password-form');
const resetPasswordInput  = document.getElementById('reset-password-input');
const resetPasswordError  = document.getElementById('reset-password-error');
const resetPasswordSubmit = document.getElementById('reset-password-submit');

let authMode = 'signin';

// ── Helpers ──
function showAuth() {
  authScreen.classList.remove('hidden');
  app.classList.add('hidden');
  resetPasswordScreen.classList.add('hidden');
  document.getElementById('modal-log').classList.add('hidden');
  sessionExercises = [];
  inputBodyWeight.value = '';
  logDateInput.value = '';
}

function today() {
  return new Date().toISOString().split('T')[0];
}

function formatDateLabel(dateStr) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric' });
}

function showApp() {
  authScreen.classList.add('hidden');
  resetPasswordScreen.classList.add('hidden');
  app.classList.remove('hidden');
  const t = today();
  logDateInput.value = t;
  loadCustomExercises();
  sessionExercises = [];
  existingSessionIds = [];
  renderCalendarGrid();
  loadHistory();
}

function openLogModal(date) {
  document.getElementById('modal-log-date').textContent = formatDateLabel(date);
  document.getElementById('modal-log').classList.remove('hidden');
}

function closeLogModal() {
  const bwVal  = parseFloat(inputBodyWeight.value);
  const bwDate = logDateInput.value || today();
  saveBodyWeight(bwDate, bwVal);

  document.getElementById('modal-log').classList.add('hidden');
  document.getElementById('copy-date-row').classList.add('hidden');
  sessionExercises = [];
  existingSessionIds = [];
  inputBodyWeight.value = '';
  const d = new Date(logDateInput.value || today());
  calendarYear  = d.getUTCFullYear();
  calendarMonth = d.getUTCMonth();
  renderCalendarGrid();
  renderExerciseBlocks();
  updateSaveButton();
}

function setError(msg) {
  authError.textContent = msg;
  authError.classList.toggle('hidden', !msg);
}

// ── Mode toggle (Sign In / Sign Up) ──
authModeTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    authMode = tab.dataset.mode;
    authModeTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    authSubmit.textContent = authMode === 'signin' ? 'Sign In' : 'Sign Up';
    document.getElementById('auth-unit-group').classList.toggle('hidden', authMode !== 'signup');
    btnForgotPassword.classList.toggle('hidden', authMode !== 'signin');
    setError('');
  });
});

// ── Forgot password ──
function setForgotError(msg) {
  forgotError.textContent = msg;
  forgotError.classList.toggle('hidden', !msg);
}

btnForgotPassword.addEventListener('click', () => {
  forgotEmail.value = authEmail.value.trim();
  setForgotError('');
  authMainView.classList.add('hidden');
  authForgotView.classList.remove('hidden');
});

btnBackToSignin.addEventListener('click', () => {
  authForgotView.classList.add('hidden');
  authMainView.classList.remove('hidden');
});

forgotForm.addEventListener('submit', async e => {
  e.preventDefault();
  setForgotError('');
  forgotSubmit.disabled = true;

  const email = forgotEmail.value.trim();
  const { error } = await sb.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + window.location.pathname,
  });

  forgotSubmit.disabled = false;
  setForgotError(error ? error.message : 'Check your email for a reset link.');
});

// ── Sign-up unit selection ──
let signupUnit = 'kg';
document.querySelectorAll('#signup-unit-toggle .unit-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    signupUnit = btn.dataset.unit;
    document.querySelectorAll('#signup-unit-toggle .unit-btn').forEach(b => b.classList.toggle('active', b.dataset.unit === signupUnit));
  });
});

// ── Tab switching ──
const tabs  = document.querySelectorAll('nav button');
const pages = document.querySelectorAll('.page');

tabs.forEach(btn => {
  btn.addEventListener('click', () => {
    tabs.forEach(b => b.classList.remove('active'));
    pages.forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('page-' + btn.dataset.tab).classList.add('active');
    if (btn.dataset.tab === 'charts') loadCharts();
  });
});


// ── Auth state ──
sb.auth.onAuthStateChange((_event, session) => {
  if (_event === 'PASSWORD_RECOVERY') {
    authScreen.classList.add('hidden');
    app.classList.add('hidden');
    resetPasswordScreen.classList.remove('hidden');
    return;
  }
  if (session) {
    currentUnit = session.user.user_metadata?.unit || 'kg';
    applyUnit();
    syncAccountUnitToggle();
    showApp();
  } else {
    showAuth();
  }
});

// ── Set new password (after recovery link) ──
function setResetPasswordError(msg) {
  resetPasswordError.textContent = msg;
  resetPasswordError.classList.toggle('hidden', !msg);
}

resetPasswordForm.addEventListener('submit', async e => {
  e.preventDefault();
  setResetPasswordError('');
  resetPasswordSubmit.disabled = true;

  const { error } = await sb.auth.updateUser({ password: resetPasswordInput.value });

  resetPasswordSubmit.disabled = false;

  if (error) {
    setResetPasswordError(error.message);
    return;
  }

  resetPasswordInput.value = '';
  alert('Password updated.');
  const { data: { user } } = await sb.auth.getUser();
  currentUnit = user.user_metadata?.unit || 'kg';
  applyUnit();
  syncAccountUnitToggle();
  showApp();
});

// ── Email auth ──
authForm.addEventListener('submit', async e => {
  e.preventDefault();
  setError('');
  authSubmit.disabled = true;

  const email    = authEmail.value.trim();
  const password = authPassword.value;

  const { error } = authMode === 'signin'
    ? await sb.auth.signInWithPassword({ email, password })
    : await sb.auth.signUp({ email, password, options: { data: { unit: signupUnit } } });

  authSubmit.disabled = false;

  if (error) {
    setError(error.message);
  } else if (authMode === 'signup') {
    setError('Check your email to confirm your account.');
  }
});

// ── Sign out ──
btnSignout.addEventListener('click', async () => {
  await sb.auth.signOut();
});

const PRESETS = {
  Chest:     ['Bench Press', 'Dumbbell Fly', 'Pec Deck'],
  Back:      ['Deadlift', 'Lat Pulldown', 'Bent Over Row'],
  Legs:      ['Squat', 'Leg Press', 'Leg Curl', 'Leg Extension', 'Calf Raise', 'Hip Adduction'],
  Shoulders: ['Shoulder Press', 'Lateral Raise'],
  Arms:      ['Barbell Curl', 'Triceps Pressdown'],
  Core:      ['Decline Sit-up', 'Crunch', 'Hanging Leg Raise'],
  Cardio:    ['Running', 'Bike'],
};
const CATEGORIES = Object.keys(PRESETS);

let customExercises = [];
let sessionExercises = [];
let activeCategory = CATEGORIES[0];
let currentUnit = 'kg';
let existingSessionIds = [];
let calendarYear    = new Date().getFullYear();
let calendarMonth   = new Date().getMonth();
let calSessionDates = new Set();
let calAllDates     = new Set();

// ── DOM refs (exercise) ──
const modalExercise   = document.getElementById('modal-exercise');
const modalOverlay    = document.getElementById('modal-overlay');
const modalCloseBtn   = document.getElementById('modal-close');
const categoryTabsEl  = document.getElementById('category-tabs');
const exerciseListEl  = document.getElementById('exercise-list');
const customInput     = document.getElementById('custom-exercise-input');
const btnSaveCustom   = document.getElementById('btn-save-custom');
const btnAddExercise    = document.getElementById('btn-add-exercise');
const exerciseBlocksEl  = document.getElementById('exercise-blocks');
const inputBodyWeight     = document.getElementById('input-body-weight');
const bodyWeightUnitLabel = document.getElementById('body-weight-unit-label');
const logDateInput        = document.getElementById('log-date');

// ── Load custom exercises from Supabase ──
async function loadCustomExercises() {
  const { data, error } = await sb
    .from('exercises')
    .select('id, name, category')
    .eq('is_preset', false)
    .order('name');
  if (!error && data) customExercises = data;
}

// ── Modal ──
function openModal() {
  activeCategory = CATEGORIES[0];
  renderCategoryTabs();
  renderExerciseList();
  modalExercise.classList.remove('hidden');
}

function closeModal() {
  modalExercise.classList.add('hidden');
  customInput.value = '';
}

btnAddExercise.addEventListener('click', openModal);
modalCloseBtn.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', closeModal);

// ── Category tabs ──
function renderCategoryTabs() {
  categoryTabsEl.innerHTML = CATEGORIES.map(cat => `
    <button class="category-tab${cat === activeCategory ? ' active' : ''}" data-cat="${cat}">${cat}</button>
  `).join('');

  categoryTabsEl.querySelectorAll('.category-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      activeCategory = btn.dataset.cat;
      renderCategoryTabs();
      renderExerciseList();
    });
  });
}

// ── Exercise list ──
function renderExerciseList() {
  const presets = (PRESETS[activeCategory] || []).map(name => ({ name, category: activeCategory, id: null }));
  const customs = customExercises.filter(e => e.category === activeCategory);
  const all = [...presets, ...customs];

  exerciseListEl.innerHTML = all.length
    ? all.map(ex => `
        <li data-name="${ex.name}" data-cat="${ex.category}"${ex.id ? ` data-id="${ex.id}"` : ''}>
          <span class="ex-name">${ex.name}</span>
          ${ex.id ? `<button class="btn-delete-custom" data-id="${ex.id}" data-name="${ex.name}">✕</button>` : ''}
        </li>`).join('')
    : '<li style="color:var(--text-sub);cursor:default">No exercises</li>';

  exerciseListEl.querySelectorAll('li[data-name]').forEach(li => {
    li.addEventListener('click', () => {
      addExercise(li.dataset.name, li.dataset.cat, li.dataset.id || null);
      closeModal();
    });
  });

  exerciseListEl.querySelectorAll('.btn-delete-custom').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      deleteCustomExercise(btn.dataset.id, btn.dataset.name);
    });
  });
}

// ── Exercise blocks ──
async function addExercise(name, category, id = null) {
  const entry = { name, category, id, sets: [], isEditing: true, isExpanded: true, prevWeight: null, prevReps: null, prevDuration: null };
  sessionExercises.unshift(entry);
  renderExerciseBlocks();

  const { data: { user } } = await sb.auth.getUser();
  if (!user || !sessionExercises.includes(entry)) return;

  const { data: exRow } = await sb.from('exercises').select('id').eq('user_id', user.id).eq('name', name).maybeSingle();
  if (!exRow || !sessionExercises.includes(entry)) return;

  const currentDate = logDateInput.value || today();
  const { data: prevSessions } = await sb.from('sessions').select('id').eq('user_id', user.id).lt('date', currentDate).order('date', { ascending: false }).limit(20);
  if (!prevSessions?.length || !sessionExercises.includes(entry)) return;

  const { data: prevSets } = await sb.from('sets').select('weight, reps, duration').eq('exercise_id', exRow.id).in('session_id', prevSessions.map(s => s.id)).order('id', { ascending: false }).limit(1);
  if (!prevSets?.length || !sessionExercises.includes(entry)) return;

  entry.prevWeight   = prevSets[0].weight;
  entry.prevReps     = prevSets[0].reps;
  entry.prevDuration = prevSets[0].duration;
  renderExerciseBlocks();
}

function removeExercise(index) {
  sessionExercises.splice(index, 1);
  renderExerciseBlocks();
}

function addSet(ei, weight, reps, duration = null) {
  sessionExercises[ei].sets.push({ weight, reps, duration });
  renderExerciseBlocks();
}

function setInputType(category) {
  if (category === 'Cardio') return 'cardio';
  if (category === 'Core')   return 'core';
  return 'weight';
}

function removeSet(ei, si) {
  sessionExercises[ei].sets.splice(si, 1);
  renderExerciseBlocks();
}

function renderExerciseBlocks() {
  if (!sessionExercises.length) {
    exerciseBlocksEl.innerHTML = '<p class="placeholder">No exercises yet.<br>Tap "+ Add Exercise" to start.</p>';
    return;
  }

  exerciseBlocksEl.innerHTML = sessionExercises.map((ex, i) => {
    const itype    = setInputType(ex.category);
    const editing  = ex.isEditing !== false;
    const expanded = editing || ex.isExpanded !== false;
    const setCount = ex.sets.length;

    const setDetailHTML = (s) => {
      if (itype === 'cardio') return `${s.duration} min`;
      if (itype === 'core')   return `${s.reps} reps`;
      return `${s.weight} ${currentUnit} × ${s.reps} reps`;
    };

    const lastSet  = ex.sets.length ? ex.sets[ex.sets.length - 1] : null;
    const phWeight   = lastSet?.weight   ?? ex.prevWeight   ?? 0;
    const phReps     = lastSet?.reps     ?? ex.prevReps     ?? 0;
    const phDuration = lastSet?.duration ?? ex.prevDuration ?? 0;

    const inputRowHTML = itype === 'cardio'
      ? `<input type="number" class="input-duration" data-ei="${i}" placeholder="${phDuration}" min="0" step="1" /><span>min</span>`
      : itype === 'core'
      ? `<input type="number" class="input-reps" data-ei="${i}" placeholder="${phReps}" min="1" step="1" /><span>reps</span>`
      : `<input type="number" class="input-weight" data-ei="${i}" placeholder="${phWeight}" min="0" step="0.5" /><span>${currentUnit}</span><span class="set-sep">×</span><input type="number" class="input-reps" data-ei="${i}" placeholder="${phReps}" min="1" step="1" /><span>reps</span>`;

    const catLabel = (!editing && !expanded && setCount)
      ? `${ex.category} · ${setCount} set${setCount !== 1 ? 's' : ''}`
      : ex.category;

    return `
    <div class="exercise-block" data-cat="${ex.category}">
      <div class="exercise-block-header${!editing ? ' accordion-header' : ''}" data-i="${i}">
        <div class="exercise-info">
          <div class="exercise-name">${ex.name}</div>
          <div class="exercise-category">${catLabel}</div>
        </div>
        <div class="exercise-header-btns">
          ${editing ? `
            <div class="set-input-inline">${inputRowHTML}</div>
            <button class="btn-add-set" data-ei="${i}">+</button>
          ` : `<button class="btn-edit-exercise" data-i="${i}" aria-label="Edit"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg></button>`}
          <button class="btn-remove-exercise" data-i="${i}">✕</button>
        </div>
      </div>
      ${expanded && ex.sets.length ? `
      <div class="set-list">
        ${ex.sets.map((s, j) => `
          <div class="set-row">
            <span class="set-number">Set ${j + 1}</span>
            <span class="set-detail">${setDetailHTML(s)}</span>
            ${editing ? `
              <button class="btn-copy-set" data-ei="${i}" data-si="${j}" title="Copy">⎘</button>
              <button class="btn-delete-set" data-ei="${i}" data-si="${j}">✕</button>
            ` : ''}
          </div>
        `).join('')}
      </div>
      ` : ''}
    </div>
  `;
  }).join('');

  exerciseBlocksEl.querySelectorAll('.accordion-header').forEach(hdr => {
    hdr.addEventListener('click', e => {
      if (e.target.closest('button')) return;
      const i = +hdr.dataset.i;
      sessionExercises[i].isExpanded = !sessionExercises[i].isExpanded;
      renderExerciseBlocks();
    });
  });

  exerciseBlocksEl.querySelectorAll('.btn-edit-exercise').forEach(btn => {
    btn.addEventListener('click', () => {
      sessionExercises[+btn.dataset.i].isEditing = true;
      sessionExercises[+btn.dataset.i].isExpanded = true;
      renderExerciseBlocks();
    });
  });

  exerciseBlocksEl.querySelectorAll('.btn-remove-exercise').forEach(btn => {
    btn.addEventListener('click', () => removeExercise(+btn.dataset.i));
  });

  exerciseBlocksEl.querySelectorAll('.btn-add-set').forEach(btn => {
    btn.addEventListener('click', () => {
      const ei    = +btn.dataset.ei;
      const itype = setInputType(sessionExercises[ei].category);
      if (itype === 'cardio') {
        const durEl  = exerciseBlocksEl.querySelector(`.input-duration[data-ei="${ei}"]`);
        const duration = parseInt(durEl.value) || parseInt(durEl.placeholder) || 0;
        if (!duration) return;
        addSet(ei, null, null, duration);
      } else if (itype === 'core') {
        const repsEl = exerciseBlocksEl.querySelector(`.input-reps[data-ei="${ei}"]`);
        const reps   = parseInt(repsEl.value) || parseInt(repsEl.placeholder) || 0;
        if (!reps) return;
        addSet(ei, null, reps, null);
      } else {
        const wEl    = exerciseBlocksEl.querySelector(`.input-weight[data-ei="${ei}"]`);
        const repsEl = exerciseBlocksEl.querySelector(`.input-reps[data-ei="${ei}"]`);
        const weight = parseFloat(wEl.value)    || parseFloat(wEl.placeholder)    || 0;
        const reps   = parseInt(repsEl.value)   || parseInt(repsEl.placeholder)   || 0;
        if (!weight || !reps) return;
        addSet(ei, weight, reps, null);
      }
    });
  });

  exerciseBlocksEl.querySelectorAll('.input-reps').forEach(input => {
    input.addEventListener('keydown', e => {
      if (e.key !== 'Enter') return;
      const ei    = +input.dataset.ei;
      const itype = setInputType(sessionExercises[ei].category);
      if (itype === 'core') {
        const reps = parseInt(input.value) || parseInt(input.placeholder) || 0;
        if (reps) addSet(ei, null, reps, null);
      } else {
        const wEl    = exerciseBlocksEl.querySelector(`.input-weight[data-ei="${ei}"]`);
        const weight = parseFloat(wEl.value) || parseFloat(wEl.placeholder) || 0;
        const reps   = parseInt(input.value) || parseInt(input.placeholder) || 0;
        if (weight && reps) addSet(ei, weight, reps, null);
      }
    });
  });

  exerciseBlocksEl.querySelectorAll('.input-duration').forEach(input => {
    input.addEventListener('keydown', e => {
      if (e.key !== 'Enter') return;
      const ei       = +input.dataset.ei;
      const duration = parseInt(input.value) || parseInt(input.placeholder) || 0;
      if (duration) addSet(ei, null, null, duration);
    });
  });

  exerciseBlocksEl.querySelectorAll('.btn-copy-set').forEach(btn => {
    btn.addEventListener('click', () => {
      const { weight, reps, duration } = sessionExercises[+btn.dataset.ei].sets[+btn.dataset.si];
      addSet(+btn.dataset.ei, weight, reps, duration);
    });
  });

  exerciseBlocksEl.querySelectorAll('.btn-delete-set').forEach(btn => {
    btn.addEventListener('click', () => removeSet(+btn.dataset.ei, +btn.dataset.si));
  });

  updateSaveButton();
}

// ════════════════════════════════════════
// STEP 5: Training recording
// ════════════════════════════════════════

// ── Unit ──
const LBS_PER_KG = 2.20462;

function convertWeight(value, fromUnit, toUnit) {
  if (value == null || !fromUnit || fromUnit === toUnit) return value;
  const kg = fromUnit === 'lbs' ? value / LBS_PER_KG : value;
  return Math.round((toUnit === 'lbs' ? kg * LBS_PER_KG : kg) * 10) / 10;
}

function applyUnit() {
  bodyWeightUnitLabel.textContent = currentUnit;
}

function syncAccountUnitToggle() {
  document.querySelectorAll('#account-unit-toggle .unit-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.unit === currentUnit);
  });
}

// ── Account menu ──
document.getElementById('account-menu-trigger').addEventListener('click', () => {
  document.getElementById('account-menu').classList.toggle('hidden');
});

document.addEventListener('click', e => {
  if (!document.getElementById('account-menu-wrap').contains(e.target)) {
    document.getElementById('account-menu').classList.add('hidden');
  }
});

document.querySelectorAll('#account-unit-toggle .unit-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.unit;
    if (target === currentUnit) return;
    changeAccountUnit(target);
  });
});

async function changeAccountUnit(newUnit) {
  const { data: { user } } = await sb.auth.getUser();
  if (!user || newUnit === currentUnit) return;

  const toggleButtons = document.querySelectorAll('#account-unit-toggle .unit-btn');
  toggleButtons.forEach(b => b.disabled = true);

  try {
    const { data: sessions } = await sb.from('sessions').select('id').eq('user_id', user.id);
    const sessionIds = (sessions || []).map(s => s.id);

    const [{ data: sets }, { data: bodyWeights }] = await Promise.all([
      sessionIds.length
        ? sb.from('sets').select('id, weight, unit').in('session_id', sessionIds)
        : Promise.resolve({ data: [] }),
      sb.from('body_weights').select('id, weight, unit').eq('user_id', user.id),
    ]);

    const setsToConvert = (sets || []).filter(s => s.weight != null && s.unit !== newUnit);
    const bwToConvert    = (bodyWeights || []).filter(b => b.weight != null && b.unit !== newUnit);
    const totalCount = setsToConvert.length + bwToConvert.length;

    const msg = totalCount > 0
      ? `Convert all your data (${totalCount} record${totalCount !== 1 ? 's' : ''}) to ${newUnit}?`
      : `Switch unit to ${newUnit}?`;
    if (!confirm(msg)) return;

    await Promise.all([
      ...setsToConvert.map(s =>
        sb.from('sets').update({ weight: convertWeight(s.weight, s.unit, newUnit), unit: newUnit }).eq('id', s.id)
      ),
      ...bwToConvert.map(b =>
        sb.from('body_weights').update({ weight: convertWeight(b.weight, b.unit, newUnit), unit: newUnit }).eq('id', b.id)
      ),
    ]);

    const { error } = await sb.auth.updateUser({ data: { unit: newUnit } });
    if (error) throw error;

    currentUnit = newUnit;
    applyUnit();
    syncAccountUnitToggle();
    document.getElementById('account-menu').classList.add('hidden');

    if (document.getElementById('page-charts').classList.contains('active')) {
      loadCharts();
    }
  } catch (err) {
    console.error('changeAccountUnit:', err);
    alert('Failed to update unit. Please try again.');
  } finally {
    toggleButtons.forEach(b => b.disabled = false);
  }
}

document.getElementById('btn-delete-account').addEventListener('click', deleteAllUserData);

async function deleteAllUserData() {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return;

  const confirmed = confirm(
    'This will permanently delete all your workout logs and body weight history. This cannot be undone.\n\n' +
    'Your account itself will not be deleted — you can sign back in afterward to an empty account.\n\n' +
    'Consider exporting your data first (Charts tab).\n\n' +
    'Continue?'
  );
  if (!confirmed) return;

  const btn = document.getElementById('btn-delete-account');
  btn.disabled = true;

  try {
    const { data: sessions } = await sb.from('sessions').select('id').eq('user_id', user.id);
    const sessionIds = (sessions || []).map(s => s.id);

    if (sessionIds.length) {
      await sb.from('sets').delete().in('session_id', sessionIds);
    }

    await Promise.all([
      sb.from('sessions').delete().eq('user_id', user.id),
      sb.from('exercises').delete().eq('user_id', user.id),
      sb.from('body_weights').delete().eq('user_id', user.id),
    ]);

    alert('All your data has been deleted.');
    await sb.auth.signOut();
  } catch (err) {
    console.error('deleteAllUserData:', err);
    alert('Failed to delete your data. Please try again.');
  } finally {
    btn.disabled = false;
  }
}

// ── Load existing records for selected date ──
async function loadDateRecord(date) {
  if (!date) { renderExerciseBlocks(); return; }
  const { data: { user } } = await sb.auth.getUser();
  if (!user) { renderExerciseBlocks(); return; }

  const { data: sessions } = await sb.from('sessions')
    .select('id')
    .eq('user_id', user.id)
    .eq('date', date);

  const { data: bwRows } = await sb.from('body_weights')
    .select('weight, unit').eq('user_id', user.id).eq('date', date)
    .order('id', { ascending: false }).limit(1);
  const bwRow = bwRows?.[0];
  if (bwRow) inputBodyWeight.value = bwRow.weight;

  if (!sessions?.length) {
    existingSessionIds = [];
    renderExerciseBlocks();
    updateSaveButton();
    return;
  }

  existingSessionIds = sessions.map(s => s.id);

  const [{ data: sets }, { data: exercises }] = await Promise.all([
    sb.from('sets')
      .select('exercise_id, weight, reps, duration, unit')
      .in('session_id', existingSessionIds)
      .order('id', { ascending: true }),
    sb.from('exercises').select('id, name, category').eq('user_id', user.id),
  ]);

  const exMap = Object.fromEntries((exercises || []).map(ex => [ex.id, ex]));
  const exerciseMap = {};
  const exerciseOrder = [];
  (sets || []).forEach(set => {
    const ex = exMap[set.exercise_id];
    if (!ex) return;
    if (!exerciseMap[ex.name]) {
      exerciseMap[ex.name] = { name: ex.name, category: ex.category, id: ex.id, sets: [], isEditing: false, isExpanded: false };
      exerciseOrder.push(ex.name);
    }
    exerciseMap[ex.name].sets.push({ weight: set.weight, reps: set.reps, duration: set.duration });
  });

  sessionExercises = exerciseOrder.map(n => exerciseMap[n]).sort((a, b) => {
    const ao = CATEGORIES.indexOf(a.category); const bo = CATEGORIES.indexOf(b.category);
    if (ao !== bo) return (ao === -1 ? 999 : ao) - (bo === -1 ? 999 : bo);
    return exerciseOrder.indexOf(a.name) - exerciseOrder.indexOf(b.name);
  });

  renderExerciseBlocks();
  updateSaveButton();
}

function updateSaveButton() {
  const hasData = existingSessionIds.length > 0;
  const canSave = hasData
    ? sessionExercises.some(ex => ex.isEditing)
    : sessionExercises.some(ex => ex.sets.length > 0);

  const saveBtn = document.getElementById('btn-save-exercise');
  saveBtn.textContent = hasData ? 'Update' : 'Save';
  saveBtn.disabled = !canSave;
  document.getElementById('btn-delete-log').classList.toggle('hidden', !hasData);
}

async function changeLogDate(newDate) {
  if (sessionExercises.some(ex => ex.isEditing)) {
    if (!confirm('Load records for this date? Unsaved changes will be lost.')) return;
  }
  logDateInput.value = newDate;
  sessionExercises = [];
  existingSessionIds = [];
  inputBodyWeight.value = '';
  openLogModal(newDate);
  await loadDateRecord(newDate);
}

// ── Save exercise ──
document.getElementById('btn-save-exercise').addEventListener('click', saveExercise);

async function saveExercise() {
  const exercises = sessionExercises.filter(ex => ex.sets.length > 0);
  if (!exercises.length) return;

  const { data: { user } } = await sb.auth.getUser();
  if (!user) return;

  const btn = document.getElementById('btn-save-exercise');
  btn.disabled = true;
  btn.textContent = 'Saving...';

  const date = logDateInput.value || today();

  // 既存セッションがあれば削除して上書き
  if (existingSessionIds.length) {
    await sb.from('sets').delete().in('session_id', existingSessionIds);
    await sb.from('sessions').delete().in('id', existingSessionIds);
    existingSessionIds = [];
  }

  const { data: session, error: sessionError } = await sb
    .from('sessions')
    .insert({ user_id: user.id, date: date })
    .select()
    .single();

  if (sessionError) {
    btn.disabled = false;
    btn.textContent = 'Save Exercise';
    return;
  }

  for (const ex of exercises) {
    let exerciseId = ex.id;

    if (!exerciseId) {
      const { data: existing } = await sb
        .from('exercises')
        .select('id')
        .eq('user_id', user.id)
        .eq('name', ex.name)
        .maybeSingle();

      if (existing) {
        exerciseId = existing.id;
      } else {
        const { data: created } = await sb
          .from('exercises')
          .insert({ user_id: user.id, name: ex.name, category: ex.category, is_preset: true })
          .select()
          .single();
        exerciseId = created?.id;
      }
    }

    if (!exerciseId) continue;

    await sb.from('sets').insert(
      ex.sets.map(s => ({
        session_id: session.id,
        exercise_id: exerciseId,
        weight: s.weight ?? null,
        reps: s.reps ?? null,
        duration: s.duration ?? null,
        unit: currentUnit,
      }))
    );
  }

  sessionExercises = [];
  existingSessionIds = [];
  await loadDateRecord(date);
  calSessionDates.add(date);
  calAllDates.add(date);
  renderCalendarGrid();
  btn.disabled = false;
  updateSaveButton();
}

// ── Auto-save body weight ──
async function saveBodyWeight(date, val) {
  if (!val || !date) return;
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return;
  await sb.from('body_weights').delete().eq('user_id', user.id).eq('date', date);
  const { error } = await sb.from('body_weights').insert({
    user_id: user.id,
    date,
    weight: val,
    unit: currentUnit,
  });
  if (error) { console.error('saveBodyWeight:', error); return; }
  calAllDates.add(date);
  renderCalendarGrid();
}

inputBodyWeight.addEventListener('blur', () => {
  const val = parseFloat(inputBodyWeight.value);
  const date = logDateInput.value || today();
  saveBodyWeight(date, val);
});

// ── Save custom exercise ──
btnSaveCustom.addEventListener('click', async () => {
  const name = customInput.value.trim();
  if (!name) return;

  const { data: { user } } = await sb.auth.getUser();
  if (!user) return;

  const { data, error } = await sb
    .from('exercises')
    .insert({ user_id: user.id, name, category: activeCategory, is_preset: false })
    .select()
    .single();

  if (!error && data) {
    customExercises.push(data);
    customInput.value = '';
    renderExerciseList();
  }
});

async function deleteCustomExercise(id, name) {
  if (!confirm(`Delete "${name}"?\nAll logged sets for this exercise will also be deleted.`)) return;
  const { error } = await sb.from('exercises').delete().eq('id', id);
  if (error) return;
  customExercises = customExercises.filter(ex => ex.id !== id);
  renderExerciseList();
}

// ════════════════════════════════════════
// History / Calendar data
// ════════════════════════════════════════

async function loadExercisesFromDate(sourceDate) {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return false;

  const { data: sessions } = await sb.from('sessions')
    .select('id')
    .eq('user_id', user.id)
    .eq('date', sourceDate);

  if (!sessions?.length) return false;

  const sessionIds = sessions.map(s => s.id);
  const [{ data: sets }, { data: exercises }] = await Promise.all([
    sb.from('sets')
      .select('exercise_id, weight, reps, duration, unit')
      .in('session_id', sessionIds)
      .order('id', { ascending: true }),
    sb.from('exercises').select('id, name, category').eq('user_id', user.id),
  ]);

  const exMap = Object.fromEntries((exercises || []).map(ex => [ex.id, ex]));
  const exerciseMap = {};
  const exerciseOrder = [];
  (sets || []).forEach(set => {
    const ex = exMap[set.exercise_id];
    if (!ex) return;
    if (!exerciseMap[ex.name]) {
      exerciseMap[ex.name] = {
        name: ex.name, category: ex.category, id: ex.id,
        sets: [], isEditing: true, isExpanded: true,
      };
      exerciseOrder.push(ex.name);
    }
    exerciseMap[ex.name].sets.push({ weight: set.weight, reps: set.reps, duration: set.duration });
  });

  sessionExercises = exerciseOrder.map(n => exerciseMap[n]).sort((a, b) => {
    const ao = CATEGORIES.indexOf(a.category); const bo = CATEGORIES.indexOf(b.category);
    if (ao !== bo) return (ao === -1 ? 999 : ao) - (bo === -1 ? 999 : bo);
    return exerciseOrder.indexOf(a.name) - exerciseOrder.indexOf(b.name);
  });
  renderExerciseBlocks();
  updateSaveButton();
  return true;
}

async function loadHistory() {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return;

  const [{ data: sessions }, { data: bodyWeights }] = await Promise.all([
    sb.from('sessions').select('date').eq('user_id', user.id),
    sb.from('body_weights').select('date').eq('user_id', user.id),
  ]);

  calSessionDates = new Set((sessions || []).map(s => s.date));
  calAllDates = new Set([
    ...calSessionDates,
    ...(bodyWeights || []).map(b => b.date),
  ]);

  renderCalendarGrid();
}

function renderCalendarGrid() {
  const year  = calendarYear;
  const month = calendarMonth;
  document.getElementById('cal-month-label').textContent =
    new Date(year, month, 1).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });

  const firstDow    = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr    = today();
  const selectedDate = logDateInput.value;

  let html = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    .map(d => `<div class="cal-header">${d}</div>`).join('');

  for (let i = 0; i < firstDow; i++) html += `<div class="cal-day cal-empty"></div>`;

  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const hasSession = calSessionDates.has(ds);
    const hasBwOnly  = !hasSession && calAllDates.has(ds);
    const isToday    = ds === todayStr;
    const isSelected = ds === selectedDate;
    html += `<div class="cal-day${hasSession ? ' cal-has-session' : hasBwOnly ? ' cal-has-bw' : ''}${isToday ? ' cal-today' : ''}${isSelected ? ' cal-selected' : ''}" data-date="${ds}">
      <span class="cal-day-num">${d}</span>
      ${hasSession ? '<span class="cal-mark cal-mark-session"></span>' : ''}
      ${hasBwOnly  ? '<span class="cal-mark cal-mark-bw"></span>'      : ''}
    </div>`;
  }

  document.getElementById('calendar-grid').innerHTML = html;
}

async function deleteHistoryByDate(date, sessionIds) {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return;

  if (sessionIds.length) {
    await sb.from('sets').delete().in('session_id', sessionIds);
    await sb.from('sessions').delete().in('id', sessionIds);
  }
  await sb.from('body_weights').delete().eq('user_id', user.id).eq('date', date);

  await loadHistory();
}

// ════════════════════════════════════════
// Charts
// ════════════════════════════════════════

let currentPeriod = 'month';
let bwChartInstance   = null;
let exChartInstance   = null;
let freqChartInstance = null;
let allBodyWeights = [];
let allSessions = [];
let currentExerciseSets      = [];
let currentExerciseId        = null;
let currentExerciseCategory  = null;

const CHART_COLOR = '#3ea8ff';
const CHART_BG    = 'rgba(62,168,255,0.08)';
const chartDefaults = {
  type: 'line',
  options: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, ticks: { maxTicksLimit: 6, font: { size: 11 } } },
      y: { ticks: { font: { size: 11 } } },
    },
  },
};

async function loadCharts() {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return;

  const [{ data: bwData }, { data: sessionsData }, { data: exercisesData }] = await Promise.all([
    sb.from('body_weights').select('date, weight, unit').eq('user_id', user.id).order('date', { ascending: true }),
    sb.from('sessions').select('id, date').eq('user_id', user.id),
    sb.from('exercises').select('id, name, category').eq('user_id', user.id).order('name'),
  ]);

  allBodyWeights = bwData || [];
  allSessions    = sessionsData || [];

  const sessionIds = allSessions.map(s => s.id);
  let usedExerciseIds = new Set();
  if (sessionIds.length) {
    const { data: setsData } = await sb.from('sets').select('exercise_id').in('session_id', sessionIds);
    usedExerciseIds = new Set((setsData || []).map(s => s.exercise_id));
  }
  const recordedExercises = (exercisesData || []).filter(ex => usedExerciseIds.has(ex.id));

  const CAT_COLORS = { Chest:'#ef4444', Back:'#22c55e', Legs:'#8b5cf6', Shoulders:'#f97316', Arms:'#ec4899', Core:'#eab308', Cardio:'#06b6d4' };
  const list = document.getElementById('exercise-select-list');
  list.innerHTML = `<li class="ex-select-item" data-id="">— Select —</li>` +
    recordedExercises.map(ex => {
      const color = CAT_COLORS[ex.category] || 'transparent';
      return `<li class="ex-select-item" data-id="${ex.id}" data-cat="${ex.category || ''}" data-name="${ex.name}" style="border-left-color:${color}">${ex.name}<span class="ex-select-cat">${ex.category || ''}</span></li>`;
    }).join('');
  const found = currentExerciseId && recordedExercises.find(ex => String(ex.id) === String(currentExerciseId));
  if (found) { setExSelectLabel(found.name, CAT_COLORS[found.category] || ''); currentExerciseCategory = found.category || null; }
  else { setExSelectLabel('— Select —', ''); currentExerciseId = null; currentExerciseCategory = null; }

  renderBodyWeightChart();
  renderFrequencyChart();
  renderStats();
}

function filterByPeriod(data, key) {
  if (currentPeriod === 'all') return data;
  const days = currentPeriod === 'month' ? 30 : 365;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().split('T')[0];
  return data.filter(d => d[key] >= cutoffStr);
}

function renderBodyWeightChart() {
  const filtered = filterByPeriod(allBodyWeights, 'date');
  const wrap      = document.getElementById('bw-chart-wrap');
  const ph        = document.getElementById('bw-placeholder');

  if (!filtered.length) {
    wrap.classList.add('hidden');
    ph.classList.remove('hidden');
    return;
  }
  wrap.classList.remove('hidden');
  ph.classList.add('hidden');

  if (bwChartInstance) bwChartInstance.destroy();
  bwChartInstance = new Chart(document.getElementById('bw-chart'), {
    ...chartDefaults,
    data: {
      labels: filtered.map(d => d.date),
      datasets: [{ data: filtered.map(d => convertWeight(d.weight, d.unit, currentUnit)), borderColor: CHART_COLOR, backgroundColor: CHART_BG, borderWidth: 2, pointRadius: 3, fill: true, tension: 0.3 }],
    },
    options: {
      ...chartDefaults.options,
      scales: {
        ...chartDefaults.options.scales,
        y: { ticks: { font: { size: 11 } }, title: { display: true, text: currentUnit, font: { size: 11 } } },
      },
    },
  });
}

function localDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getWeekStart(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const dow = d.getDay();
  d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
  return localDateStr(d);
}

function renderFrequencyChart() {
  const wrap = document.getElementById('freq-chart-wrap');
  const ph   = document.getElementById('freq-placeholder');

  // Group ALL sessions by week start (no period filter on sessions)
  const weekMap = {};
  allSessions.forEach(s => {
    const w = getWeekStart(s.date);
    weekMap[w] = (weekMap[w] || 0) + 1;
  });

  // Filter by week start date being within the period
  let cutoffStr = null;
  if (currentPeriod !== 'all') {
    const days = currentPeriod === 'month' ? 30 : 365;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    cutoffStr = localDateStr(cutoff);
  }

  const currentWeek = getWeekStart(localDateStr(new Date()));
  const sortedWeeks = Object.keys(weekMap).sort();
  const firstWeek   = cutoffStr
    ? sortedWeeks.find(w => w >= cutoffStr)
    : sortedWeeks[0];

  if (!firstWeek) {
    wrap.classList.add('hidden');
    ph.classList.remove('hidden');
    if (freqChartInstance) { freqChartInstance.destroy(); freqChartInstance = null; }
    return;
  }
  wrap.classList.remove('hidden');
  ph.classList.add('hidden');

  const allWeeks = [];
  const cur = new Date(firstWeek + 'T00:00:00');
  const end = new Date(currentWeek + 'T00:00:00');
  while (cur <= end) {
    allWeeks.push(localDateStr(cur));
    cur.setDate(cur.getDate() + 7);
  }

  const labels = allWeeks.map(w => {
    const d = new Date(w + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
  });
  const data = allWeeks.map(w => weekMap[w] || 0);

  if (freqChartInstance) freqChartInstance.destroy();
  freqChartInstance = new Chart(document.getElementById('freq-chart'), {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: 'rgba(62,168,255,0.65)',
        borderColor: '#3ea8ff',
        borderWidth: 1,
        borderRadius: 4,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { maxTicksLimit: 8, font: { size: 11 } } },
        y: { min: 0, ticks: { stepSize: 1, font: { size: 11 } } },
      },
    },
  });
}

async function loadExerciseChart(exerciseId) {
  const sessionDateMap = {};
  allSessions.forEach(s => { sessionDateMap[s.id] = s.date; });

  const { data: sets } = await sb
    .from('sets')
    .select('weight, reps, duration, unit, session_id')
    .eq('exercise_id', exerciseId)
    .in('session_id', allSessions.map(s => s.id))
    .order('id', { ascending: true });

  currentExerciseSets = (sets || [])
    .map(s => ({ date: sessionDateMap[s.session_id], weight: s.weight, reps: s.reps, duration: s.duration, unit: s.unit }))
    .filter(s => s.date)
    .sort((a, b) => a.date.localeCompare(b.date));

  renderExerciseChart();
  renderStats();
}

function renderExerciseChart() {
  const filtered = filterByPeriod(currentExerciseSets, 'date');
  const wrap     = document.getElementById('ex-chart-wrap');
  const ph       = document.getElementById('ex-placeholder');

  if (!filtered.length) {
    wrap.classList.add('hidden');
    ph.classList.remove('hidden');
    ph.textContent = currentExerciseSets.length ? 'No data for this period.' : 'No data yet.';
    return;
  }
  wrap.classList.remove('hidden');
  ph.classList.add('hidden');

  const hasWeight   = filtered.some(s => s.weight > 0);
  const hasDuration = filtered.some(s => s.duration > 0);
  const byDate = {};
  let yLabel;
  if (hasWeight) {
    filtered.forEach(s => {
      const w = convertWeight(s.weight, s.unit, currentUnit) || 0;
      if (!byDate[s.date] || w > byDate[s.date]) byDate[s.date] = w;
    });
    yLabel = currentUnit;
  } else if (hasDuration) {
    filtered.forEach(s => { if (!byDate[s.date] || s.duration > byDate[s.date]) byDate[s.date] = s.duration || 0; });
    yLabel = 'min';
  } else {
    filtered.forEach(s => { if (!byDate[s.date] || s.reps > byDate[s.date]) byDate[s.date] = s.reps || 0; });
    yLabel = 'reps';
  }
  const labels = Object.keys(byDate).sort();

  if (exChartInstance) exChartInstance.destroy();
  exChartInstance = new Chart(document.getElementById('ex-chart'), {
    ...chartDefaults,
    data: {
      labels,
      datasets: [{ data: labels.map(d => byDate[d]), borderColor: CHART_COLOR, backgroundColor: CHART_BG, borderWidth: 2, pointRadius: 3, fill: true, tension: 0.3 }],
    },
    options: {
      ...chartDefaults.options,
      scales: {
        ...chartDefaults.options.scales,
        y: { ticks: { font: { size: 11 } }, title: { display: true, text: yLabel, font: { size: 11 } } },
      },
    },
  });
}

function renderStats() {
  document.getElementById('stat-sessions').textContent = allSessions.length || '—';

  if (currentExerciseSets.length) {
    const hasWeight   = currentExerciseSets.some(s => s.weight > 0);
    const hasDuration = currentExerciseSets.some(s => s.duration > 0);
    if (hasWeight) {
      const max = Math.max(...currentExerciseSets.map(s => convertWeight(s.weight, s.unit, currentUnit) || 0));
      document.getElementById('stat-max-weight').textContent = `${max} ${currentUnit}`;
    } else if (hasDuration) {
      const max = Math.max(...currentExerciseSets.map(s => s.duration || 0));
      document.getElementById('stat-max-weight').textContent = `${max} min`;
    } else {
      const max = Math.max(...currentExerciseSets.map(s => s.reps || 0));
      document.getElementById('stat-max-weight').textContent = `${max} reps`;
    }
  } else {
    document.getElementById('stat-max-weight').textContent = '—';
  }

  const recent = filterByPeriod(allBodyWeights, 'date');
  const periodLabel = { month: 'Avg (Mo)', year: 'Avg (Yr)', all: 'Avg (All)' }[currentPeriod];
  document.getElementById('stat-avg-bw-label').textContent = periodLabel;
  if (recent.length) {
    const avg = (recent.reduce((s, b) => s + convertWeight(b.weight, b.unit, currentUnit), 0) / recent.length).toFixed(1);
    document.getElementById('stat-avg-bw').textContent = `${avg} ${currentUnit}`;
  } else {
    document.getElementById('stat-avg-bw').textContent = '—';
  }
}

document.querySelectorAll('.period-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.period-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentPeriod = btn.dataset.period;
    renderBodyWeightChart();
    renderFrequencyChart();
    renderStats();
    if (currentExerciseSets.length) renderExerciseChart();
  });
});

function setExSelectLabel(name, color) {
  const label = document.getElementById('exercise-select-label');
  label.textContent = name;
  label.style.color = color || '';
}

document.getElementById('exercise-select-trigger').addEventListener('click', () => {
  document.getElementById('exercise-select-list').classList.toggle('hidden');
});

document.addEventListener('click', e => {
  if (!document.getElementById('exercise-select-wrap').contains(e.target)) {
    document.getElementById('exercise-select-list').classList.add('hidden');
  }
});

document.getElementById('exercise-select-list').addEventListener('click', e => {
  const item = e.target.closest('.ex-select-item');
  if (!item) return;
  document.getElementById('exercise-select-list').classList.add('hidden');
  const id    = item.dataset.id;
  const color = item.style.borderLeftColor;
  currentExerciseId       = id || null;
  currentExerciseCategory = id ? (item.dataset.cat || null) : null;
  setExSelectLabel(id ? (item.dataset.name || item.textContent) : item.textContent, id ? color : '');
  if (id) {
    loadExerciseChart(id);
  } else {
    currentExerciseSets = [];
    if (exChartInstance) { exChartInstance.destroy(); exChartInstance = null; }
    document.getElementById('ex-chart-wrap').classList.add('hidden');
    const ph = document.getElementById('ex-placeholder');
    ph.classList.remove('hidden');
    ph.textContent = 'Select an exercise above.';
    renderStats();
  }
});


// ── Calendar ──
document.getElementById('calendar-grid').addEventListener('click', e => {
  const day = e.target.closest('.cal-day[data-date]');
  if (day?.dataset.date) changeLogDate(day.dataset.date);
});

document.getElementById('cal-prev').addEventListener('click', () => {
  if (--calendarMonth < 0) { calendarMonth = 11; calendarYear--; }
  renderCalendarGrid();
});

document.getElementById('cal-next').addEventListener('click', () => {
  if (++calendarMonth > 11) { calendarMonth = 0; calendarYear++; }
  renderCalendarGrid();
});

// ── Swipe calendar to navigate months ──
let calSwipeStartX = 0;
let calSwipeStartY = 0;

document.querySelector('.log-calendar-section').addEventListener('touchstart', e => {
  calSwipeStartX = e.touches[0].clientX;
  calSwipeStartY = e.touches[0].clientY;
}, { passive: true });

document.querySelector('.log-calendar-section').addEventListener('touchend', e => {
  const dx = e.changedTouches[0].clientX - calSwipeStartX;
  const dy = e.changedTouches[0].clientY - calSwipeStartY;
  if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return;
  if (dx < 0) { if (++calendarMonth > 11) { calendarMonth = 0; calendarYear++; } }
  else        { if (--calendarMonth < 0)  { calendarMonth = 11; calendarYear--; } }
  renderCalendarGrid();
}, { passive: true });

// ── Log modal ──
document.getElementById('modal-log-close').addEventListener('click', closeLogModal);
document.getElementById('modal-log-overlay').addEventListener('click', closeLogModal);

document.getElementById('modal-date-prev').addEventListener('click', () => {
  const d = new Date(logDateInput.value || today());
  d.setUTCDate(d.getUTCDate() - 1);
  changeLogDate(d.toISOString().split('T')[0]);
});

document.getElementById('modal-date-next').addEventListener('click', () => {
  const d = new Date(logDateInput.value || today());
  d.setUTCDate(d.getUTCDate() + 1);
  changeLogDate(d.toISOString().split('T')[0]);
});

// ── Swipe to navigate dates ──
let swipeStartX = 0;
let swipeStartY = 0;

document.getElementById('modal-log').addEventListener('touchstart', e => {
  swipeStartX = e.touches[0].clientX;
  swipeStartY = e.touches[0].clientY;
}, { passive: true });

document.getElementById('modal-log').addEventListener('touchend', e => {
  const dx = e.changedTouches[0].clientX - swipeStartX;
  const dy = e.changedTouches[0].clientY - swipeStartY;
  if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return;
  const d = new Date(logDateInput.value || today());
  if (dx < 0) d.setUTCDate(d.getUTCDate() + 1);
  else        d.setUTCDate(d.getUTCDate() - 1);
  changeLogDate(d.toISOString().split('T')[0]);
}, { passive: true });

// ── Copy from date ──
document.getElementById('btn-copy-from-date').addEventListener('click', () => {
  const row = document.getElementById('copy-date-row');
  row.classList.toggle('hidden');
  if (!row.classList.contains('hidden')) {
    const currentDate = logDateInput.value || today();
    const prevDate = [...calSessionDates].filter(d => d < currentDate).sort().at(-1) ?? '';
    document.getElementById('copy-date-input').value = prevDate;
    document.getElementById('copy-date-input').focus();
  }
});

document.getElementById('btn-cancel-copy').addEventListener('click', () => {
  document.getElementById('copy-date-row').classList.add('hidden');
});

async function executeCopy(sourceDate) {
  if (!sourceDate) return;
  document.getElementById('copy-date-row').classList.add('hidden');
  document.getElementById('copy-date-input').value = '';

  const currentDate = logDateInput.value || today();
  if (sourceDate === currentDate) return;

  if (sessionExercises.length > 0 || existingSessionIds.length > 0) {
    const srcLabel = formatDateLabel(sourceDate);
    const dstLabel = formatDateLabel(currentDate);
    if (!confirm(`Copy exercises from ${srcLabel} to ${dstLabel}?\nThis will overwrite the current exercise list.`)) return;
  }

  const found = await loadExercisesFromDate(sourceDate);
  if (!found) alert(`No records found for ${formatDateLabel(sourceDate)}.`);
}

document.getElementById('copy-date-input').addEventListener('change', e => executeCopy(e.target.value));
document.getElementById('copy-date-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') executeCopy(e.target.value);
});
document.getElementById('btn-confirm-copy').addEventListener('click', () => executeCopy(document.getElementById('copy-date-input').value));

// ── Delete log ──
document.getElementById('btn-delete-log').addEventListener('click', async () => {
  const date = logDateInput.value || today();
  if (!confirm(`Delete all data for ${date}?`)) return;
  const ids = [...existingSessionIds];
  closeLogModal();
  await deleteHistoryByDate(date, ids);
});

// ── Data Export ──
const EXPORT_HEADERS = ['date', 'type', 'exercise_name', 'category', 'set_number', 'weight', 'reps', 'duration', 'unit'];

function csvEscape(value) {
  if (value == null) return '';
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function rowsToCsv(rows) {
  const lines = [EXPORT_HEADERS.join(',')];
  rows.forEach(row => {
    lines.push(EXPORT_HEADERS.map(h => csvEscape(row[h])).join(','));
  });
  return lines.join('\r\n');
}

function buildExportRows({ sessions, exercises, sets, bodyWeights }) {
  const sessionDateById = Object.fromEntries(sessions.map(s => [s.id, s.date]));
  const exerciseById = Object.fromEntries(exercises.map(e => [e.id, e]));
  const setNumberCounters = {};

  const setRows = sets
    .map(s => {
      const date = sessionDateById[s.session_id];
      const ex = exerciseById[s.exercise_id];
      if (!date || !ex) return null;
      const key = `${date}|${s.exercise_id}`;
      setNumberCounters[key] = (setNumberCounters[key] || 0) + 1;
      return {
        date,
        type: 'set',
        exercise_name: ex.name,
        category: ex.category,
        set_number: setNumberCounters[key],
        weight: s.weight,
        reps: s.reps,
        duration: s.duration,
        unit: s.unit,
      };
    })
    .filter(Boolean);

  const bwRows = bodyWeights.map(b => ({
    date: b.date,
    type: 'body_weight',
    exercise_name: '',
    category: '',
    set_number: '',
    weight: b.weight,
    reps: '',
    duration: '',
    unit: b.unit,
  }));

  return [...setRows, ...bwRows].sort((a, b) =>
    a.date !== b.date ? a.date.localeCompare(b.date)
    : a.type !== b.type ? a.type.localeCompare(b.type)
    : a.exercise_name !== b.exercise_name ? a.exercise_name.localeCompare(b.exercise_name)
    : (a.set_number || 0) - (b.set_number || 0)
  );
}

function downloadTextFile(filename, text, mime = 'text/csv;charset=utf-8;') {
  const blob = new Blob(['﻿' + text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function exportUserData() {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return;

  const btn = document.getElementById('btn-export-data');
  btn.disabled = true;

  try {
    const [{ data: sessionsRaw }, { data: exercises }, { data: bodyWeightsRaw }] = await Promise.all([
      sb.from('sessions').select('id, date').eq('user_id', user.id),
      sb.from('exercises').select('id, name, category').eq('user_id', user.id),
      sb.from('body_weights').select('date, weight, unit').eq('user_id', user.id).order('date', { ascending: true }),
    ]);

    const sessions = filterByPeriod(sessionsRaw || [], 'date');
    const bodyWeights = filterByPeriod(bodyWeightsRaw || [], 'date');
    const sessionIds = sessions.map(s => s.id);

    const { data: sets } = sessionIds.length
      ? await sb.from('sets').select('session_id, exercise_id, weight, reps, duration, unit').in('session_id', sessionIds).order('id', { ascending: true })
      : { data: [] };

    const rows = buildExportRows({ sessions, exercises: exercises || [], sets: sets || [], bodyWeights });
    if (!rows.length) {
      alert('No data to export for the selected period.');
      return;
    }

    downloadTextFile(`muscle-log-export-${currentPeriod}-${today()}.csv`, rowsToCsv(rows));
  } catch (err) {
    console.error('exportUserData:', err);
    alert('Export failed. Please try again.');
  } finally {
    btn.disabled = false;
  }
}

document.getElementById('btn-export-data').addEventListener('click', exportUserData);

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

let authMode = 'signin';

// ── Helpers ──
function showAuth() {
  authScreen.classList.remove('hidden');
  app.classList.add('hidden');
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
  document.getElementById('modal-log').classList.add('hidden');
  document.getElementById('copy-date-row').classList.add('hidden');
  sessionExercises = [];
  existingSessionIds = [];
  inputBodyWeight.value = '';
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
    setError('');
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
  session ? showApp() : showAuth();
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
    : await sb.auth.signUp({ email, password });

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
let currentUnit = localStorage.getItem('unit') || 'kg';
let existingSessionIds = [];
let calendarYear  = new Date().getFullYear();
let calendarMonth = new Date().getMonth();
let calAllDates   = new Set();

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
function addExercise(name, category, id = null) {
  sessionExercises.unshift({ name, category, id, sets: [], isEditing: true, isExpanded: true });
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

    const inputRowHTML = itype === 'cardio'
      ? `<input type="number" class="input-duration" data-ei="${i}" placeholder="0" min="0" step="1" /><span>min</span>`
      : itype === 'core'
      ? `<input type="number" class="input-reps" data-ei="${i}" placeholder="0" min="1" step="1" /><span>reps</span>`
      : `<input type="number" class="input-weight" data-ei="${i}" placeholder="0" min="0" step="0.5" /><span>${currentUnit}</span><span class="set-sep">×</span><input type="number" class="input-reps" data-ei="${i}" placeholder="0" min="1" step="1" /><span>reps</span>`;

    const catLabel = (!editing && !expanded && setCount)
      ? `${ex.category} · ${setCount} set${setCount !== 1 ? 's' : ''}`
      : ex.category;

    return `
    <div class="exercise-block">
      <div class="exercise-block-header${!editing ? ' accordion-header' : ''}" data-i="${i}">
        <div>
          <div class="exercise-name">${ex.name}</div>
          <div class="exercise-category">${catLabel}</div>
        </div>
        <div class="exercise-header-btns">
          ${!editing ? `<button class="btn-edit-exercise" data-i="${i}">Edit</button>` : ''}
          <button class="btn-remove-exercise" data-i="${i}">✕</button>
        </div>
      </div>
      ${expanded ? `
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
      ${editing ? `
        <div class="set-input-row">
          ${inputRowHTML}
          <button class="btn-add-set" data-ei="${i}">+ Add Set</button>
        </div>
      ` : ''}
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
        const duration = parseInt(exerciseBlocksEl.querySelector(`.input-duration[data-ei="${ei}"]`).value);
        if (!duration) return;
        addSet(ei, null, null, duration);
      } else if (itype === 'core') {
        const reps = parseInt(exerciseBlocksEl.querySelector(`.input-reps[data-ei="${ei}"]`).value);
        if (!reps) return;
        addSet(ei, null, reps, null);
      } else {
        const weight = parseFloat(exerciseBlocksEl.querySelector(`.input-weight[data-ei="${ei}"]`).value);
        const reps   = parseInt(exerciseBlocksEl.querySelector(`.input-reps[data-ei="${ei}"]`).value);
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
        const reps = parseInt(input.value);
        if (reps) addSet(ei, null, reps, null);
      } else {
        const weight = parseFloat(exerciseBlocksEl.querySelector(`.input-weight[data-ei="${ei}"]`).value);
        const reps   = parseInt(input.value);
        if (weight && reps) addSet(ei, weight, reps, null);
      }
    });
  });

  exerciseBlocksEl.querySelectorAll('.input-duration').forEach(input => {
    input.addEventListener('keydown', e => {
      if (e.key !== 'Enter') return;
      const ei       = +input.dataset.ei;
      const duration = parseInt(input.value);
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

// ── Unit toggle ──
function applyUnit() {
  document.querySelectorAll('.unit-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.unit === currentUnit);
  });
  bodyWeightUnitLabel.textContent = currentUnit;
}

document.querySelectorAll('.unit-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    currentUnit = btn.dataset.unit;
    localStorage.setItem('unit', currentUnit);
    applyUnit();
    if (sessionExercises.length) renderExerciseBlocks();
  });
});

// Apply saved unit on load
applyUnit();

// ── Load existing records for selected date ──
async function loadDateRecord(date) {
  if (!date) { renderExerciseBlocks(); return; }
  const { data: { user } } = await sb.auth.getUser();
  if (!user) { renderExerciseBlocks(); return; }

  const { data: sessions } = await sb.from('sessions')
    .select('id')
    .eq('user_id', user.id)
    .eq('date', date);

  if (!sessions?.length) {
    existingSessionIds = [];
    renderExerciseBlocks();
    updateSaveButton();
    return;
  }

  existingSessionIds = sessions.map(s => s.id);

  const [{ data: sets }, { data: exercises }, { data: bwRow }] = await Promise.all([
    sb.from('sets')
      .select('exercise_id, weight, reps, duration, unit')
      .in('session_id', existingSessionIds)
      .order('id', { ascending: true }),
    sb.from('exercises').select('id, name, category').eq('user_id', user.id),
    sb.from('body_weights').select('weight, unit').eq('user_id', user.id).eq('date', date).maybeSingle(),
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

  sessionExercises = exerciseOrder.map(n => exerciseMap[n]);

  if (bwRow) inputBodyWeight.value = bwRow.weight;

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
  const d = new Date(newDate);
  calendarYear  = d.getUTCFullYear();
  calendarMonth = d.getUTCMonth();
  renderCalendarGrid();
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
  calAllDates.add(date);
  renderCalendarGrid();
  btn.disabled = false;
  updateSaveButton();
}

// ── Auto-save body weight on blur ──
inputBodyWeight.addEventListener('blur', async () => {
  const bodyWeightVal = parseFloat(inputBodyWeight.value);
  if (!bodyWeightVal) return;

  const { data: { user } } = await sb.auth.getUser();
  if (!user) return;

  const date = logDateInput.value || today();

  await sb.from('body_weights').upsert({
    user_id: user.id,
    date: date,
    weight: bodyWeightVal,
    unit: currentUnit,
  }, { onConflict: 'user_id,date' });

  calAllDates.add(date);
  renderCalendarGrid();
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

  sessionExercises = exerciseOrder.map(n => exerciseMap[n]);
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

  calAllDates = new Set([
    ...(sessions || []).map(s => s.date),
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
    const hasData  = calAllDates.has(ds);
    const isToday  = ds === todayStr;
    const isSelected = ds === selectedDate;
    html += `<div class="cal-day${hasData ? ' cal-has-data' : ''}${isToday ? ' cal-today' : ''}${isSelected ? ' cal-selected' : ''}" data-date="${ds}">
      <span class="cal-day-num">${d}</span>
      ${hasData ? '<span class="cal-mark"></span>' : ''}
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
let bwChartInstance = null;
let exChartInstance = null;
let allBodyWeights = [];
let allSessions = [];
let currentExerciseSets = [];

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
    sb.from('exercises').select('id, name').eq('user_id', user.id).order('name'),
  ]);

  allBodyWeights = bwData || [];
  allSessions    = sessionsData || [];

  const select = document.getElementById('exercise-select');
  const prev   = select.value;
  select.innerHTML = '<option value="">Select exercise...</option>' +
    (exercisesData || []).map(ex => `<option value="${ex.id}">${ex.name}</option>`).join('');
  if (prev) select.value = prev;

  renderBodyWeightChart();
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

  const unit = filtered[filtered.length - 1]?.unit || 'kg';
  if (bwChartInstance) bwChartInstance.destroy();
  bwChartInstance = new Chart(document.getElementById('bw-chart'), {
    ...chartDefaults,
    data: {
      labels: filtered.map(d => d.date),
      datasets: [{ data: filtered.map(d => d.weight), borderColor: CHART_COLOR, backgroundColor: CHART_BG, borderWidth: 2, pointRadius: 3, fill: true, tension: 0.3 }],
    },
    options: {
      ...chartDefaults.options,
      scales: {
        ...chartDefaults.options.scales,
        y: { ticks: { font: { size: 11 } }, title: { display: true, text: unit, font: { size: 11 } } },
      },
    },
  });
}

async function loadExerciseChart(exerciseId) {
  const sessionDateMap = {};
  allSessions.forEach(s => { sessionDateMap[s.id] = s.date; });

  const { data: sets } = await sb
    .from('sets')
    .select('weight, unit, session_id')
    .eq('exercise_id', exerciseId)
    .in('session_id', allSessions.map(s => s.id))
    .order('id', { ascending: true });

  currentExerciseSets = (sets || [])
    .map(s => ({ date: sessionDateMap[s.session_id], weight: s.weight, unit: s.unit }))
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

  const byDate = {};
  filtered.forEach(s => { if (!byDate[s.date] || s.weight > byDate[s.date]) byDate[s.date] = s.weight; });
  const labels = Object.keys(byDate).sort();
  const unit   = filtered[0]?.unit || 'kg';

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
        y: { ticks: { font: { size: 11 } }, title: { display: true, text: unit, font: { size: 11 } } },
      },
    },
  });
}

function renderStats() {
  document.getElementById('stat-sessions').textContent = allSessions.length || '—';

  if (currentExerciseSets.length) {
    const max  = Math.max(...currentExerciseSets.map(s => s.weight));
    const unit = currentExerciseSets[0].unit;
    document.getElementById('stat-max-weight').textContent = `${max} ${unit}`;
  } else {
    document.getElementById('stat-max-weight').textContent = '—';
  }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);
  const cutoffStr = cutoff.toISOString().split('T')[0];
  const recent = allBodyWeights.filter(b => b.date >= cutoffStr);
  if (recent.length) {
    const avg  = (recent.reduce((s, b) => s + b.weight, 0) / recent.length).toFixed(1);
    const unit = recent[0].unit;
    document.getElementById('stat-avg-bw').textContent = `${avg} ${unit}`;
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
    if (currentExerciseSets.length) renderExerciseChart();
  });
});

document.getElementById('exercise-select').addEventListener('change', e => {
  const id = e.target.value;
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

// ── Data Management ──

async function exportData() {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return;

  const btn = document.getElementById('btn-export');
  btn.disabled = true;
  btn.textContent = 'Exporting...';

  const [{ data: exercises }, { data: sessions }, { data: bodyWeights }] = await Promise.all([
    sb.from('exercises').select('*').eq('user_id', user.id),
    sb.from('sessions').select('*, sets(*)').eq('user_id', user.id),
    sb.from('body_weights').select('*').eq('user_id', user.id),
  ]);

  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    exercises: exercises || [],
    sessions: sessions || [],
    body_weights: bodyWeights || [],
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `muscle-log-${today()}.json`;
  a.click();
  URL.revokeObjectURL(url);

  btn.disabled = false;
  btn.textContent = 'Export JSON';
}

async function importData(file) {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return;

  const statusEl = document.getElementById('import-status');
  statusEl.textContent = 'Importing...';
  statusEl.classList.remove('hidden');

  let payload;
  try {
    payload = JSON.parse(await file.text());
  } catch {
    statusEl.textContent = 'Error: invalid JSON file.';
    return;
  }

  if (!payload.sessions || !payload.body_weights) {
    statusEl.textContent = 'Error: invalid data format.';
    return;
  }

  // Map old exercise ID → new exercise ID
  const exerciseIdMap = {};
  for (const ex of (payload.exercises || [])) {
    const { data: existing } = await sb.from('exercises')
      .select('id').eq('user_id', user.id).eq('name', ex.name).eq('category', ex.category).maybeSingle();
    if (existing) {
      exerciseIdMap[ex.id] = existing.id;
    } else {
      const { data: created } = await sb.from('exercises')
        .insert({ user_id: user.id, name: ex.name, category: ex.category, is_preset: ex.is_preset })
        .select().single();
      if (created) exerciseIdMap[ex.id] = created.id;
    }
  }

  // Import sessions and sets
  for (const session of payload.sessions) {
    const { data: newSession } = await sb.from('sessions')
      .insert({ user_id: user.id, date: session.date })
      .select().single();
    if (!newSession) continue;

    const sets = (session.sets || []).map(s => ({
      session_id: newSession.id,
      exercise_id: exerciseIdMap[s.exercise_id] ?? s.exercise_id,
      weight: s.weight,
      reps: s.reps,
      duration: s.duration,
      unit: s.unit,
    }));
    if (sets.length) await sb.from('sets').insert(sets);
  }

  // Import body weights
  if (payload.body_weights.length) {
    await sb.from('body_weights').insert(
      payload.body_weights.map(b => ({
        user_id: user.id, date: b.date, weight: b.weight, unit: b.unit,
      }))
    );
  }

  statusEl.textContent = `Import complete! (${payload.sessions.length} sessions, ${payload.body_weights.length} body weights)`;
  document.getElementById('input-import').value = '';
}

async function deleteAllData() {
  if (!confirm('Delete ALL your data? This cannot be undone.')) return;
  if (!confirm('Are you sure? All sessions, sets, and body weights will be permanently deleted.')) return;

  const { data: { user } } = await sb.auth.getUser();
  if (!user) return;

  const btn = document.getElementById('btn-delete-all');
  btn.disabled = true;
  btn.textContent = 'Deleting...';

  const { data: sessions } = await sb.from('sessions').select('id').eq('user_id', user.id);
  const sessionIds = (sessions || []).map(s => s.id);

  if (sessionIds.length) {
    await sb.from('sets').delete().in('session_id', sessionIds);
    await sb.from('sessions').delete().in('id', sessionIds);
  }

  await sb.from('body_weights').delete().eq('user_id', user.id);
  await sb.from('exercises').delete().eq('user_id', user.id).eq('is_preset', false);

  calAllDates = new Set();
  renderCalendarGrid();
  sessionExercises = [];
  existingSessionIds = [];
  inputBodyWeight.value = '';
  renderExerciseBlocks();
  updateSaveButton();
  btn.disabled = false;
  btn.textContent = 'Delete All';
  alert('All data deleted.');
}

document.getElementById('btn-export').addEventListener('click', exportData);
document.getElementById('input-import').addEventListener('change', e => {
  if (e.target.files[0]) importData(e.target.files[0]);
});
document.getElementById('btn-delete-all').addEventListener('click', deleteAllData);

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

// ── Copy from date ──
document.getElementById('btn-copy-from-date').addEventListener('click', () => {
  const row = document.getElementById('copy-date-row');
  row.classList.toggle('hidden');
  if (!row.classList.contains('hidden')) {
    document.getElementById('copy-date-input').value = '';
    document.getElementById('copy-date-input').focus();
  }
});

document.getElementById('btn-cancel-copy').addEventListener('click', () => {
  document.getElementById('copy-date-row').classList.add('hidden');
});

document.getElementById('copy-date-input').addEventListener('change', async e => {
  const sourceDate = e.target.value;
  if (!sourceDate) return;

  document.getElementById('copy-date-row').classList.add('hidden');
  e.target.value = '';

  const currentDate = logDateInput.value || today();
  if (sourceDate === currentDate) return;

  if (sessionExercises.length > 0 || existingSessionIds.length > 0) {
    const srcLabel = formatDateLabel(sourceDate);
    const dstLabel = formatDateLabel(currentDate);
    if (!confirm(`Copy exercises from ${srcLabel} to ${dstLabel}?\nThis will overwrite the current exercise list.`)) return;
  }

  const found = await loadExercisesFromDate(sourceDate);
  if (!found) alert(`No records found for ${formatDateLabel(sourceDate)}.`);
});

// ── Delete log ──
document.getElementById('btn-delete-log').addEventListener('click', async () => {
  const date = logDateInput.value || today();
  if (!confirm(`Delete all data for ${date}?`)) return;
  const ids = [...existingSessionIds];
  closeLogModal();
  await deleteHistoryByDate(date, ids);
});

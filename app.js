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
  sessionExercises = [];
  inputBodyWeight.value = '';
  logDateInput.value = '';
}

function today() {
  return new Date().toISOString().split('T')[0];
}

function showApp() {
  authScreen.classList.add('hidden');
  app.classList.remove('hidden');
  logDateInput.value = today();
  loadCustomExercises();
  renderExerciseBlocks();
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
  Legs:      ['Squat', 'Leg Press', 'Leg Curl'],
  Shoulders: ['Shoulder Press', 'Lateral Raise'],
  Arms:      ['Barbell Curl', 'Triceps Pressdown'],
  Cardio:    ['Running', 'Bike'],
};
const CATEGORIES = Object.keys(PRESETS);

let customExercises = [];
let sessionExercises = [];
let activeCategory = CATEGORIES[0];
let currentUnit = localStorage.getItem('unit') || 'kg';

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
    ? all.map(ex => `<li data-name="${ex.name}" data-cat="${ex.category}"${ex.id ? ` data-id="${ex.id}"` : ''}>${ex.name}</li>`).join('')
    : '<li style="color:var(--text-sub);cursor:default">No exercises</li>';

  exerciseListEl.querySelectorAll('li[data-name]').forEach(li => {
    li.addEventListener('click', () => {
      addExercise(li.dataset.name, li.dataset.cat, li.dataset.id || null);
      closeModal();
    });
  });
}

// ── Exercise blocks ──
function addExercise(name, category, id = null) {
  sessionExercises.push({ name, category, id, sets: [] });
  renderExerciseBlocks();
}

function removeExercise(index) {
  sessionExercises.splice(index, 1);
  renderExerciseBlocks();
}

function addSet(ei, weight, reps) {
  sessionExercises[ei].sets.push({ weight, reps });
  renderExerciseBlocks();
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

  exerciseBlocksEl.innerHTML = sessionExercises.map((ex, i) => `
    <div class="exercise-block">
      <div class="exercise-block-header">
        <div>
          <div class="exercise-name">${ex.name}</div>
          <div class="exercise-category">${ex.category}</div>
        </div>
        <button class="btn-remove-exercise" data-i="${i}">✕</button>
      </div>
      <div class="set-list">
        ${ex.sets.map((s, j) => `
          <div class="set-row">
            <span class="set-number">Set ${j + 1}</span>
            <span class="set-detail">${s.weight} ${currentUnit} × ${s.reps} reps</span>
            <button class="btn-copy-set" data-ei="${i}" data-si="${j}" title="Copy">⎘</button>
            <button class="btn-delete-set" data-ei="${i}" data-si="${j}">✕</button>
          </div>
        `).join('')}
      </div>
      <div class="set-input-row">
        <input type="number" class="input-weight" data-ei="${i}" placeholder="0" min="0" step="0.5" />
        <span>${currentUnit}</span>
        <span class="set-sep">×</span>
        <input type="number" class="input-reps" data-ei="${i}" placeholder="0" min="1" step="1" />
        <span>reps</span>
        <button class="btn-add-set" data-ei="${i}">+ Add Set</button>
      </div>
    </div>
  `).join('');

  exerciseBlocksEl.querySelectorAll('.btn-remove-exercise').forEach(btn => {
    btn.addEventListener('click', () => removeExercise(+btn.dataset.i));
  });

  exerciseBlocksEl.querySelectorAll('.btn-add-set').forEach(btn => {
    btn.addEventListener('click', () => {
      const ei = +btn.dataset.ei;
      const weight = parseFloat(exerciseBlocksEl.querySelector(`.input-weight[data-ei="${ei}"]`).value);
      const reps   = parseInt(exerciseBlocksEl.querySelector(`.input-reps[data-ei="${ei}"]`).value);
      if (!weight || !reps) return;
      addSet(ei, weight, reps);
    });
  });

  exerciseBlocksEl.querySelectorAll('.input-reps').forEach(input => {
    input.addEventListener('keydown', e => {
      if (e.key !== 'Enter') return;
      const ei     = +input.dataset.ei;
      const weight = parseFloat(exerciseBlocksEl.querySelector(`.input-weight[data-ei="${ei}"]`).value);
      const reps   = parseInt(input.value);
      if (weight && reps) addSet(ei, weight, reps);
    });
  });

  exerciseBlocksEl.querySelectorAll('.btn-copy-set').forEach(btn => {
    btn.addEventListener('click', () => {
      const { weight, reps } = sessionExercises[+btn.dataset.ei].sets[+btn.dataset.si];
      addSet(+btn.dataset.ei, weight, reps);
    });
  });

  exerciseBlocksEl.querySelectorAll('.btn-delete-set').forEach(btn => {
    btn.addEventListener('click', () => removeSet(+btn.dataset.ei, +btn.dataset.si));
  });
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

// ── Save session ──
document.getElementById('btn-save-session').addEventListener('click', saveSession);

async function saveSession() {
  const exercises = sessionExercises.filter(ex => ex.sets.length > 0);
  const bodyWeightVal = parseFloat(inputBodyWeight.value);
  if (!exercises.length && !bodyWeightVal) return;

  const { data: { user } } = await sb.auth.getUser();
  if (!user) return;

  const btn = document.getElementById('btn-save-session');
  btn.disabled = true;
  btn.textContent = 'Saving...';

  const date = logDateInput.value || today();

  if (exercises.length) {
    const { data: session, error: sessionError } = await sb
      .from('sessions')
      .insert({ user_id: user.id, date: date })
      .select()
      .single();

    if (sessionError) {
      btn.disabled = false;
      btn.textContent = 'Save Session';
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
        ex.sets.map((s, order) => ({
          session_id: session.id,
          exercise_id: exerciseId,
          weight: s.weight,
          reps: s.reps,
          unit: currentUnit,
          order,
        }))
      );
    }
  }

  if (bodyWeightVal) {
    await sb.from('body_weights').insert({
      user_id: user.id,
      date: date,
      weight: bodyWeightVal,
      unit: currentUnit,
    });
  }

  sessionExercises = [];
  inputBodyWeight.value = '';
  renderExerciseBlocks();
  btn.disabled = false;
  btn.textContent = 'Save Session';
}

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

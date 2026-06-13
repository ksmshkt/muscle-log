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
    if (btn.dataset.tab === 'history') loadHistory();
    if (btn.dataset.tab === 'charts')  loadCharts();
  });
});

// ── History action delegation ──
document.getElementById('history-list').addEventListener('click', e => {
  const copyBtn = e.target.closest('.btn-copy-history');
  if (copyBtn) {
    copyHistoryToLog(copyBtn.dataset.date);
    return;
  }
  const deleteBtn = e.target.closest('.btn-delete-history');
  if (!deleteBtn) return;
  const date = deleteBtn.dataset.date;
  const sessionIds = deleteBtn.dataset.sessionIds ? deleteBtn.dataset.sessionIds.split(',').filter(Boolean) : [];
  if (!confirm(`Delete all data for ${date}?`)) return;
  deleteHistoryByDate(date, sessionIds);
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
let historyCache = {};

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
const btnSaveBodyWeight   = document.getElementById('btn-save-body-weight');

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
  sessionExercises.unshift({ name, category, id, sets: [] });
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
    const itype = setInputType(ex.category);

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

    return `
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
            <span class="set-detail">${setDetailHTML(s)}</span>
            <button class="btn-copy-set" data-ei="${i}" data-si="${j}" title="Copy">⎘</button>
            <button class="btn-delete-set" data-ei="${i}" data-si="${j}">✕</button>
          </div>
        `).join('')}
      </div>
      <div class="set-input-row">
        ${inputRowHTML}
        <button class="btn-add-set" data-ei="${i}">+ Add Set</button>
      </div>
    </div>
  `;
  }).join('');

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
  renderExerciseBlocks();
  btn.disabled = false;
  btn.textContent = 'Save Exercise';
}

// ── Save body weight ──
btnSaveBodyWeight.addEventListener('click', async () => {
  const bodyWeightVal = parseFloat(inputBodyWeight.value);
  if (!bodyWeightVal) return;

  const { data: { user } } = await sb.auth.getUser();
  if (!user) return;

  btnSaveBodyWeight.disabled = true;
  btnSaveBodyWeight.textContent = '...';

  const date = logDateInput.value || today();

  await sb.from('body_weights').insert({
    user_id: user.id,
    date: date,
    weight: bodyWeightVal,
    unit: currentUnit,
  });

  inputBodyWeight.value = '';
  btnSaveBodyWeight.disabled = false;
  btnSaveBodyWeight.textContent = 'Save';
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
// History
// ════════════════════════════════════════

async function loadHistory() {
  const historyListEl = document.getElementById('history-list');
  historyListEl.innerHTML = '<p class="placeholder">Loading...</p>';

  const { data: { user } } = await sb.auth.getUser();
  if (!user) return;

  const [{ data: sessions }, { data: bodyWeights }] = await Promise.all([
    sb.from('sessions')
      .select('id, date')
      .eq('user_id', user.id)
      .order('date', { ascending: false }),
    sb.from('body_weights')
      .select('date, weight, unit')
      .eq('user_id', user.id)
      .order('date', { ascending: false }),
  ]);

  if (!sessions?.length && !bodyWeights?.length) {
    renderHistory([], []);
    return;
  }

  const sessionIds = (sessions || []).map(s => s.id);
  const [{ data: sets }, { data: exercises }] = await Promise.all([
    sb.from('sets')
      .select('session_id, exercise_id, weight, reps, duration, unit')
      .in('session_id', sessionIds)
      .order('id', { ascending: true }),
    sb.from('exercises')
      .select('id, name, category')
      .eq('user_id', user.id),
  ]);

  const exMap = Object.fromEntries((exercises || []).map(ex => [ex.id, ex]));

  const sessionsWithSets = (sessions || []).map(s => ({
    ...s,
    sets: (sets || [])
      .filter(set => set.session_id === s.id)
      .map(set => ({ ...set, exercises: exMap[set.exercise_id] || null })),
  }));

  renderHistory(sessionsWithSets, bodyWeights || []);
}

function renderHistory(sessions, bodyWeights) {
  const historyListEl = document.getElementById('history-list');

  if (!sessions.length && !bodyWeights.length) {
    historyListEl.innerHTML = '<p class="placeholder">No history yet.</p>';
    return;
  }

  const bwByDate = {};
  bodyWeights.forEach(bw => { bwByDate[bw.date] = bw; });

  const allDates = [...new Set([
    ...sessions.map(s => s.date),
    ...bodyWeights.map(b => b.date),
  ])].sort((a, b) => b.localeCompare(a));

  const sessionsByDate = {};
  sessions.forEach(s => {
    (sessionsByDate[s.date] = sessionsByDate[s.date] || []).push(s);
  });

  historyListEl.innerHTML = allDates.map(date => {
    const bw = bwByDate[date];
    const sessionIds = (sessionsByDate[date] || []).map(s => s.id).join(',');

    const exerciseMap = {};
    (sessionsByDate[date] || []).forEach(session => {
      (session.sets || []).forEach(set => {
        const name = set.exercises?.name || 'Unknown';
        if (!exerciseMap[name]) exerciseMap[name] = {
          category: set.exercises?.category || '',
          exerciseId: set.exercise_id,
          sets: [],
        };
        exerciseMap[name].sets.push(set);
      });
    });

    historyCache[date] = Object.entries(exerciseMap).map(([name, group]) => ({
      name,
      category: group.category,
      id: group.exerciseId || null,
      sets: group.sets.map(s => ({ weight: s.weight, reps: s.reps, duration: s.duration })),
    }));

    const bwHTML = bw
      ? `<div class="history-bw">Body Weight: ${bw.weight} ${bw.unit}</div>`
      : '';

    const exercisesHTML = Object.entries(exerciseMap).map(([name, group]) => `
      <div class="history-exercise">
        <div class="history-exercise-name">${name}<span class="history-exercise-cat">${group.category}</span></div>
        ${group.sets.map((s, i) => {
          const itype = setInputType(group.category);
          const detail = (itype === 'cardio' || s.duration != null)
            ? `${s.duration} min`
            : (itype === 'core' || s.weight == null)
            ? `${s.reps} reps`
            : `${s.weight} ${s.unit} × ${s.reps} reps`;
          return `
          <div class="history-set-row">
            <span class="set-number">Set ${i + 1}</span>
            <span>${detail}</span>
          </div>`;
        }).join('')}
      </div>
    `).join('');

    return `
      <div class="card history-card">
        <div class="history-date-row">
          <div class="history-date">${date}</div>
          ${bw ? `<span class="history-bw-inline">${bw.weight} ${bw.unit}</span>` : ''}
          <div class="history-card-actions">
            <button class="btn-copy-history" data-date="${date}">Copy to Log</button>
            <button class="btn-delete-history" data-date="${date}" data-session-ids="${sessionIds}">Delete</button>
          </div>
        </div>
        <div class="history-exercises-grid">${exercisesHTML}</div>
      </div>
    `;
  }).join('');
}

async function deleteHistoryByDate(date, sessionIds) {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return;

  if (sessionIds.length) {
    await sb.from('sets').delete().in('session_id', sessionIds);
    await sb.from('sessions').delete().in('id', sessionIds);
  }
  await sb.from('body_weights').delete().eq('user_id', user.id).eq('date', date);

  loadHistory();
}

function copyHistoryToLog(date) {
  const exercises = historyCache[date];
  if (!exercises?.length) return;

  if (sessionExercises.length > 0) {
    if (!confirm(`Overwrite current log with ${date}?`)) return;
  }

  sessionExercises = exercises.map(ex => ({ ...ex, sets: ex.sets.map(s => ({ ...s })) }));
  renderExerciseBlocks();
  document.querySelector('nav button[data-tab="log"]').click();
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

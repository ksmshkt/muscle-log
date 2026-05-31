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
}

function showApp() {
  authScreen.classList.add('hidden');
  app.classList.remove('hidden');
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

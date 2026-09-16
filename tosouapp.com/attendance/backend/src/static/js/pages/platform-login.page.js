import { login, refresh } from '../api/auth.api.js';

const $ = (sel) => document.querySelector(sel);

function hidePageSpinner() {
  try {
    const ps = document.querySelector('#pageSpinner');
    if (!ps) return;
    ps.setAttribute('hidden', '');
    ps.style.display = 'none';
  } catch (e) { /* silently ignored */ }
}

function showPageSpinner() {
  try {
    const ps = document.querySelector('#pageSpinner');
    if (!ps) return;
    ps.removeAttribute('hidden');
    ps.style.display = 'grid';
  } catch (e) { /* silently ignored */ }
}

function setError(msg) {
  const el = $('#error');
  el.textContent = msg || '';
  el.style.display = msg ? 'block' : 'none';
}

function saveAuth({ accessToken, username, email, role, tenants, tenantId, tenantName }) {
  sessionStorage.setItem('accessToken', accessToken);
  try { localStorage.setItem('accessToken', accessToken); } catch (e) { /* silently ignored */ }
  const userObj = { username, email, role };
  if (tenantId) { userObj.tenantId = tenantId; userObj.tenantName = tenantName; }
  sessionStorage.setItem('user', JSON.stringify(userObj));
  try { localStorage.setItem('user', JSON.stringify(userObj)); } catch (e) { /* silently ignored */ }
  if (Array.isArray(tenants) && tenants.length > 0) {
    try { sessionStorage.setItem('sc_tenants', JSON.stringify(tenants)); } catch (e) { /* silently ignored */ }
    try { localStorage.setItem('sc_tenants', JSON.stringify(tenants)); } catch (e) { /* silently ignored */ }
  }
}

async function handleSubmit(e) {
  e.preventDefault();
  setError('');
  const email = $('#email').value.trim();
  const password = $('#password').value;
  const form = $('#loginForm');
  if (!email || !password) {
    setError('メール/パスワードを入力してください');
    return;
  }
  if (form && !form.checkValidity()) {
    try { form.reportValidity(); } catch (e) { /* silently ignored */ }
    setError('メール/パスワードを正しく入力してください');
    return;
  }

  try { localStorage.removeItem('monthly.lastParams'); } catch (e) { /* silently ignored */ }

  const btn = $('#loginBtn');
  const statusEl = $('#status');
  if (btn) { btn.disabled = true; }
  if (statusEl) { statusEl.textContent = 'ログイン中...'; }
  showPageSpinner();
  let navigated = false;

  try {
    const data = await login(email, password);
    saveAuth(data);
    navigated = true;
    // Platform login always goes to platform dashboard
    try { sessionStorage.setItem('navSpinner', '1'); } catch (e) { /* silently ignored */ }
    window.location.href = `/platform/dashboard?boot=${Date.now()}`;
  } catch (err) {
    const msg = String(err.message || '').toLowerCase();
    if (msg.includes('invalid') || msg.includes('not found') || msg.includes('unauthorized')) {
      setError('メールまたはパスワードが正しくありません');
    } else if (msg.includes('locked')) {
      setError('アカウントが一時的にロックされています。しばらくしてからお試しください');
    } else if (msg.includes('abort') || msg.includes('timeout')) {
      setError('サーバーが応答しません。しばらくしてからお試しください');
    } else {
      setError('ログインに失敗しました: ' + (err.message || 'unknown'));
    }
  } finally {
    if (btn) { btn.disabled = false; }
    if (statusEl) { statusEl.textContent = ''; }
    if (!navigated) hidePageSpinner();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  try { sessionStorage.removeItem('navSpinner'); } catch (e) { /* silently ignored */ }
  hidePageSpinner();

  // Clear any stale session data on load
  try {
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('user');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    localStorage.removeItem('sc_tenants');
  } catch (e) { /* silently ignored */ }

  const form = $('#loginForm');
  const emailInput = $('#email');
  const passwordInput = $('#password');

  if (emailInput) { emailInput.value = ''; }
  if (passwordInput) { passwordInput.value = ''; }

  const btn = $('#loginBtn');
  const updateBtnState = () => {
    const em = emailInput ? String(emailInput.value).trim() : '';
    const pw = passwordInput ? String(passwordInput.value) : '';
    if (btn) { btn.disabled = !(em && pw); }
  };
  updateBtnState();
  if (emailInput) emailInput.addEventListener('input', updateBtnState);
  if (passwordInput) passwordInput.addEventListener('input', updateBtnState);

  if (form) form.addEventListener('submit', handleSubmit);

  // Toggle password visibility
  const toggle = $('#togglePassword');
  const EYE_OFF = `<svg viewBox="0 0 24 24"><path d="M3 3l18 18"/><path d="M10.73 5.08A10.47 10.47 0 0 1 12 5c7 0 11 7 11 7a19.54 19.54 0 0 1-4.21 4.62"/><path d="M6.11 6.11A19.45 19.45 0 0 0 1 12s4 7 11 7a10.65 10.65 0 0 0 3.89-.73"/><circle cx="12" cy="12" r="3"/></svg>`;
  const EYE_ON  = `<svg viewBox="0 0 24 24"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>`;
  if (toggle) {
    toggle.innerHTML = EYE_OFF;
    toggle.addEventListener('click', () => {
      const input = $('#password');
      input.type = input.type === 'password' ? 'text' : 'password';
      toggle.innerHTML = input.type === 'password' ? EYE_OFF : EYE_ON;
      toggle.setAttribute('aria-label', input.type === 'password' ? 'パスワードを表示' : 'パスワードを非表示');
      input.focus();
    });
  }

  // Rerun on pageshow (back button)
  window.addEventListener('pageshow', () => {
    try {
      sessionStorage.removeItem('accessToken');
      sessionStorage.removeItem('user');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
    } catch (e) { /* silently ignored */ }
    hidePageSpinner();
  });
});

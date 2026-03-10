import { login, me, refresh } from '../api/auth.api.js';

const $ = (sel) => document.querySelector(sel);

function setError(msg) {
  const el = $('#error'); el.textContent = msg || ''; el.style.display = msg ? 'block' : 'none';
}

function saveAuth({ accessToken, refreshToken, username, email, role }) {
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('user', JSON.stringify({ username, email, role }));
}

async function tryRefresh() {
  try {
    const csrf = getCookie('csrfToken');
    const r = await refresh(csrf);
    localStorage.setItem('accessToken', r.accessToken);
    return r.accessToken;
  } catch (e) { return null; }
}

function getCookie(name) {
  const m = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  return m ? decodeURIComponent(m[2]) : null;
}

function roleRedirect(role) {
  window.location.href = '/ui/dashboard';
}

async function handleSubmit(e) {
  e.preventDefault();
  setError('');
  const statusEl = document.querySelector('#status');
  const email = $('#email').value.trim();
  const password = $('#password').value;
  const form = $('#loginForm');
  if (form && !form.checkValidity()) {
    try { form.reportValidity(); } catch {}
    setError('メール/パスワードを正しく入力してください');
    return;
  }
  if (!email || !password) { setError('メール/パスワードを入力してください'); return; }
  const btn = $('#loginBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'ログイン中…'; btn.setAttribute('aria-busy', 'true'); }
  try {
    const data = await login(email, password);
    saveAuth(data);
    window.location.href = '/ui/dashboard';
  } catch (err) {
    const msg = String(err.message || '').toLowerCase();
    if (msg.includes('invalid') || msg.includes('not found') || msg.includes('unauthorized')) {
      setError('メールまたはパスワードが正しくありません');
    } else if (msg.includes('locked')) {
      setError('アカウントが一時的にロックされています。しばらくしてからお試しください');
    } else if (msg.startsWith('http')) {
      setError('サーバーが応答しません ( ' + err.message + ' )');
    } else {
      setError('ログインに失敗しました: ' + (err.message || 'unknown'));
    }
  }
  finally {
    if (btn) { btn.disabled = false; btn.textContent = 'ログイン'; btn.removeAttribute('aria-busy'); }
    if (statusEl) { statusEl.textContent = ''; }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const form = $('#loginForm');
  form.addEventListener('submit', handleSubmit);
  const toggle = $('#togglePassword');
  const EYE_ON = `<svg viewBox="0 0 24 24"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>`;
  const EYE_OFF = `<svg viewBox="0 0 24 24"><path d="M3 3l18 18"/><path d="M10.73 5.08A10.47 10.47 0 0 1 12 5c7 0 11 7 11 7a19.54 19.54 0 0 1-4.21 4.62"/><path d="M6.11 6.11A19.45 19.45 0 0 0 1 12s4 7 11 7a10.65 10.65 0 0 0 3.89-.73"/><circle cx="12" cy="12" r="3"/></svg>`;
  toggle.innerHTML = EYE_ON;
  toggle.addEventListener('click', () => {
    const input = $('#password');
    input.type = input.type === 'password' ? 'text' : 'password';
    toggle.innerHTML = input.type === 'password' ? EYE_ON : EYE_OFF;
    toggle.setAttribute('aria-label', input.type === 'password' ? '表示' : '非表示');
    input.focus();
  });
  const remember = $('#remember');
  if (remember) {
    remember.addEventListener('change', () => {
      localStorage.setItem('remember', remember.checked ? '1' : '0');
    });
  }
  const remembered = localStorage.getItem('remember') === '1';
  const nav = performance.getEntriesByType('navigation')[0];
  const isBack = nav && nav.type === 'back_forward';
  if (remembered && !isBack) {
    (async () => {
      const token = await tryRefresh();
      if (token) {
        try {
          await me(token);
          window.location.href = '/ui/dashboard';
        } catch {}
      }
    })();
  }
});

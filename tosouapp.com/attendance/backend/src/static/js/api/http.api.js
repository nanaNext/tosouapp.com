import { refresh } from '/static/js/api/auth.api.js';
const REQUEST_TIMEOUT_MS = 15000;

try {
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (e) => {
      if (e.key === 'auth-logout-event') {
        try {
          sessionStorage.removeItem('accessToken');
          sessionStorage.removeItem('refreshToken');
          sessionStorage.removeItem('user');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
        } catch (e) { console.error('[http.api.js] Swallowed error:', e); }
        if (window.location.pathname !== '/ui/login') {
          window.location.replace('/ui/login');
        }
      } else if (e.key === 'auth-login-event') {
        // Clear cached tokens so the new token will be fetched
        try {
          sessionStorage.removeItem('accessToken');
          sessionStorage.removeItem('user');
        } catch (e) { console.error('[http.api.js] Swallowed error:', e); }
        // Reload to apply the new login state correctly
        if (window.location.pathname !== '/ui/login') {
          window.location.reload();
        }
      }
    });
  }
} catch (e) { console.error('[http.api.js] Swallowed error:', e); }

function getApiBase() {
  try {
    const h = String(window.location.hostname || '').toLowerCase();
    if (!h || h === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(h)) return '';
    if (h === 'tosouapp.com' || h.endsWith('.tosouapp.com')) return '';
  } catch (e) { console.error('[http.api.js] Swallowed error:', e); }
  return '';
}

async function fetchWithTimeout(url, options, timeoutMs = REQUEST_TIMEOUT_MS) {
  const ms = Number(timeoutMs || 0) > 0 ? Number(timeoutMs) : REQUEST_TIMEOUT_MS;
  const ac = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    ac.abort();
  }, ms);
  try {
    return await fetch(url, { ...(options || {}), signal: ac.signal });
  } catch (e) {
    if (timedOut || (e && e.name === 'AbortError')) {
      throw new Error(`Request timeout after ${ms}ms`);
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}
function resolveUrl(u) {
  const url = String(u || '');
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const base = getApiBase();
  if (url.startsWith('/')) return base ? (base + url) : url;
  return url;
}
const getCookie = (name) => {
  const m = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  return m ? decodeURIComponent(m[2]) : null;
};

let refreshInFlight = null;
let refreshCooldownUntil = 0;
async function refreshCached() {
  const now = Date.now();
  if (now < refreshCooldownUntil) throw new Error('Too many requests');
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    try {
      return await refresh();
    } catch (e) {
      const msg = String((e && e.message) ? e.message : '');
      if (msg.includes('HTTP 429') || msg.toLowerCase().includes('too many requests')) {
        refreshCooldownUntil = Date.now() + 60000;
      }
      throw e;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

let redirecting = false;
function redirectToLoginOnce() {
  if (redirecting) return;
  redirecting = true;
  try {
    if (String(window.location && window.location.pathname || '') === '/ui/login') return;
  } catch (e) { console.error('[http.api.js] Swallowed error:', e); }
  try {
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('refreshToken');
    sessionStorage.removeItem('user');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  } catch (e) { console.error('[http.api.js] Swallowed error:', e); }
  try {
    const next = (() => {
      try {
        const p = String(window.location.pathname || '');
        const s = String(window.location.search || '');
        const h = String(window.location.hash || '');
        return p + s + h;
      } catch {
        return '';
      }
    })();
    const url = '/ui/login' + (next ? ('?next=' + encodeURIComponent(next)) : '');
    try { window.location.href = url; return; } catch (e) { console.error('[http.api.js] Swallowed error:', e); }
  } catch (e) { console.error('[http.api.js] Swallowed error:', e); }
  try {
    const a = document.createElement('a');
    a.href = '/ui/login';
    a.textContent = 'ログイン画面へ';
    a.style.cssText = 'position:fixed;top:12px;right:12px;z-index:99999;background:#fff1f2;color:#7f1d1d;border:1px solid #fecaca;border-radius:10px;padding:10px 12px;font-weight:900;';
    document.body.appendChild(a);
  } catch (e) { console.error('[http.api.js] Swallowed error:', e); }
}

async function doFetchAuth(url, options, accessToken) {
  const csrf = getCookie('csrfToken');
  const opt = options || {};
  const baseHeaders = {
    'Authorization': accessToken ? `Bearer ${accessToken}` : '',
    'X-CSRF-Token': csrf || ''
  };
  const hasFormData = typeof FormData !== 'undefined' && opt.body instanceof FormData;
  if (!hasFormData) {
    baseHeaders['Content-Type'] = 'application/json';
  }
  const mergedHeaders = { ...baseHeaders, ...(opt.headers || {}) };
  return fetchWithTimeout(resolveUrl(url), {
    credentials: 'include',
    cache: 'no-store',
    ...opt,
    headers: mergedHeaders
  }, REQUEST_TIMEOUT_MS);
}

async function fetchAuthResponse(url, options) {
  let tok = sessionStorage.getItem('accessToken') || '';
  if (!tok) {
    try {
      const r0 = await refreshCached();
      tok = r0.accessToken || '';
      if (tok) {
        sessionStorage.setItem('accessToken', tok);
      }
    } catch (e) { console.error('[http.api.js] Swallowed error:', e); }
  }
  let res = await doFetchAuth(url, options, tok);
  if (!res.ok && (res.status === 401 || res.status === 403)) {
    let authExpiredLike = res.status === 401;
    try {
      const clone = res.clone();
      const j = await clone.json().catch(() => ({}));
      const msg = String(j?.message || '').toLowerCase();
      if (res.status === 403 && (msg.includes('invalid or expired token') || msg.includes('invalid token version'))) {
        authExpiredLike = true;
      }
      if (j.notPublished || (j.message && j.message.includes('公開されていません'))) {
        // It's a specific business error, not an auth error, so don't try to refresh/login
        throw new Error(j.message || 'Not published');
      }
    } catch (e) {
      if (e.message && e.message.includes('公開されていません')) {
        throw e; // Pass it down to be caught below
      }
      // If not JSON or not our specific error, proceed with refresh logic
    }

    if (authExpiredLike) {
      try {
        const r = await refreshCached();
        sessionStorage.setItem('accessToken', r.accessToken);
        res = await doFetchAuth(url, options, r.accessToken);
      } catch {
        redirectToLoginOnce();
      }
    }
  }
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const j = await res.json();
      msg = j.message || (Array.isArray(j.errors) && j.errors.length ? j.errors[0].msg : msg);
    } catch (e) { console.error('[http.api.js] Swallowed error:', e); }
    const m = String(msg || '').toLowerCase();
    if (res.status === 429 || m.includes('too many requests')) {
      throw new Error('Too many requests（操作が多すぎます。1分ほど待ってから再度お試しください）');
    }
    if (res.status === 401) {
      redirectToLoginOnce();
    } else if (res.status === 403) {
      // Don't redirect on 403 (Forbidden), just throw the error so the UI can handle it (e.g. role restriction)
    }
    throw new Error(msg);
  }
  return res;
}

export async function fetchJSONAuth(url, options) {
  const res = await fetchAuthResponse(url, options);
  try { return await res.json(); } catch { return null; }
}

export async function fetchBlobAuth(url, options) {
  const res = await fetchAuthResponse(url, options);
  return res.blob();
}

export async function fetchResponseAuth(url, options) {
  return fetchAuthResponse(url, options);
}

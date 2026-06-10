import { fetchJSONAuth } from '/static/js/api/http.api.js';

const escHtml = (s) => String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtNoticeTime = (v) => {
  const s = String(v || '').trim();
  if (!s) return '';
  if (s.length >= 16) return s.slice(0, 16).replace('T', ' ');
  return s;
};
const previewMsg = (v, max = 80) => {
  const s = String(v || '').replace(/\s+/g, ' ').trim();
  if (!s) return '（内容なし）';
  return s.length > max ? `${s.slice(0, max)}...` : s;
};
const resolveEmployeeUid = () => {
  try {
    const fromWin = parseInt(String(window.__EMP_UID || 0), 10) || 0;
    if (fromWin) return fromWin;
  } catch (e) { /* silently ignored */ }
  try {
    const raw = sessionStorage.getItem('user') || localStorage.getItem('user') || '';
    const u = raw ? JSON.parse(raw) : null;
    return parseInt(String(u?.id || 0), 10) || 0;
  } catch {
    return 0;
  }
};
const shouldHideEmployeeAppliedNotice = (it) => {
  const msg = String(it?.message || '');
  const isApplyLike = /(交通費|有休|休暇|時間修正|修正).*(申請)|申請/.test(msg);
  const isAppliedState = /\((applied|pending)\)/i.test(msg) || /(申請中|未申請)/.test(msg);
  const me = resolveEmployeeUid();
  const createdBy = parseInt(String(it?.created_by || it?.createdBy || 0), 10) || 0;
  if (me && createdBy && me === createdBy && isApplyLike) return true;
  if (isApplyLike && isAppliedState) return true;
  return false;
};
const state = {
  mounted: false,
  open: false,
  items: [],
  hiddenIds: readHiddenIds(),
  timer: null,
  observer: null
};
let selfNavGuardBound = false;
let softReqNavBound = false;
const REQ_PATH = '/ui/requests';
const EXP_PATH = '/ui/expenses';
let softNavInFlight = false;
const CACHE_KEY = 'emp_notify_cache_v1';
const HIDE_KEY = 'emp_notify_hidden_v1';
function readHiddenIds() {
  try {
    const raw = localStorage.getItem(HIDE_KEY) || '[]';
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.map((x) => parseInt(String(x || 0), 10) || 0).filter((x) => !!x));
  } catch {
    return new Set();
  }
}
function writeHiddenIds(setLike) {
  try {
    const arr = Array.from(setLike || []).map((x) => parseInt(String(x || 0), 10) || 0).filter((x) => !!x).slice(0, 1000);
    localStorage.setItem(HIDE_KEY, JSON.stringify(arr));
  } catch (e) { /* silently ignored */ }
}
function readCache() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY) || '';
    if (!raw) return [];
    const obj = JSON.parse(raw);
    const rows = Array.isArray(obj?.items) ? obj.items : [];
    return rows.slice(0, 60);
  } catch {
    return [];
  }
}
function writeCache(items) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), items: Array.isArray(items) ? items.slice(0, 60) : [] }));
  } catch (e) { /* silently ignored */ }
}

function ensureStyle() {
  if (document.getElementById('empNotifyStickyStyle')) return;
  const st = document.createElement('style');
  st.id = 'empNotifyStickyStyle';
  st.textContent = `
    .emp-notify-wrap { position: relative; display: inline-flex; align-items: center; margin-left: 8px; }
    .emp-notify-btn { border: 0; background: transparent; color: #334155; cursor: pointer; font-size: 18px; line-height: 1; padding: 0; display: inline-flex; align-items: center; justify-content: center; }
    .emp-notify-btn:hover { opacity: .85; }
    .emp-notify-badge { position: absolute; top: -5px; right: -4px; min-width: 16px; height: 16px; border-radius: 999px; background: #dc2626; color: #fff; font-size: 10px; line-height: 16px; text-align: center; padding: 0 4px; box-sizing: border-box; font-weight: 700; }
    .emp-notify-badge[hidden] { display: none; }
    .emp-notify-panel { position: absolute; top: 36px; right: 0; width: min(380px, calc(100vw - 24px)); max-height: 60vh; overflow: auto; background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; box-shadow: 0 10px 24px rgba(15, 23, 42, .18); z-index: 3600; }
    .emp-notify-panel[hidden] { display: none; }
    .emp-notify-head { position: sticky; top: 0; background: #fff; border-bottom: 1px solid #e2e8f0; padding: 10px 12px; font-size: 12px; color: #0f172a; font-weight: 700; display:flex; justify-content:space-between; align-items:center; }
    .emp-notify-head-badge { display:inline-flex; align-items:center; justify-content:center; min-width:18px; height:18px; border-radius:999px; background:#dc2626; color:#fff; font-size:11px; font-weight:700; padding:0 6px; margin:0 4px; vertical-align:middle; }
    .emp-notify-list { display: flex; flex-direction: column; }
    .emp-notify-item { border: 1px solid #e2e8f0; border-radius: 10px; text-align: left; background: #fff; margin: 8px 10px 0; display:flex; gap:8px; align-items:flex-start; padding:8px; }
    .emp-notify-item:hover { background: #f8fafc; border-color:#dbeafe; }
    .emp-notify-item.is-unread { background: #f8fbff; border-color:#dbeafe; }
    .emp-notify-item.is-read { background: #fff; border-color:#eef2f7; }
    .emp-notify-open { flex:1; border:none; background:transparent; text-align:left; padding:2px 4px; cursor:pointer; }
    .emp-notify-del { border:1px solid #e2e8f0; background:#fff; color:#64748b; border-radius:8px; min-width:26px; height:26px; cursor:pointer; font-weight:700; margin-top:2px; }
    .emp-notify-del:hover { background:#fee2e2; border-color:#fecaca; color:#b91c1c; }
    .emp-notify-row { display: flex; justify-content: space-between; gap: 8px; align-items: center; }
    .emp-notify-meta { color:#64748b; font-size:11px; }
    .emp-notify-title { color:#0f172a; font-size: 16px; font-weight: 800; margin-top:2px; }
    .emp-notify-item-count { display:inline-flex; align-items:center; justify-content:center; min-width:18px; height:18px; border-radius:999px; color:#fff; font-size:11px; font-weight:700; margin-left:6px; padding:0 6px; }
    .emp-notify-item-count.is-unread { background:#dc2626; color:#fff; }
    .emp-notify-time { color: #64748b; font-size: 11px; white-space: nowrap; }
    .emp-notify-msg { color: #64748b; font-size: 13px; margin-top: 2px; line-height: 1.35; }
    .emp-notify-empty { padding: 12px; color: #64748b; font-size: 12px; }
  `;
  document.head.appendChild(st);
}

function splitMsg(msg) {
  const s = String(msg || '').trim();
  const idx = s.indexOf(':');
  if (idx > 0) return { title: s.slice(0, idx).trim(), detail: s.slice(idx + 1).trim() };
  return { title: previewMsg(s, 32), detail: '' };
}
function normalizeDetailForGroup(detail) {
  return String(detail || '')
    .replace(/\d{4}-\d{2}-\d{2}/g, '')
    .replace(/\d{2}:\d{2}/g, '')
    .replace(/[~〜]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}
function inferLinkFromMessage(msg) {
  const s = String(msg || '');
  if (s.includes('有休') || s.includes('休暇')) return '/ui/requests';
  if (s.includes('交通費')) return '/ui/expenses';
  if (s.includes('時間修正') || s.includes('調整')) return '/ui/adjust';
  if (s.includes('FAQ') || s.includes('質問')) return '/ui/faq';
  return '/ui/attendance';
}
function normalizeLink(v) {
  const s = String(v || '').trim();
  if (!s) return '';
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith('/')) return s;
  return `/${s}`;
}
function toCategory(title) {
  const t = String(title || '');
  if (t.includes('有休') || t.includes('休暇')) return '有休';
  if (t.includes('交通費')) return '交通費';
  if (t.includes('時間修正')) return '時間修正';
  if (t.includes('FAQ') || t.includes('質問')) return 'FAQ';
  return '通知';
}

function render() {
  const badge = document.getElementById('empNotifyStickyBadge');
  const list = document.getElementById('empNotifyStickyList');
  const headCount = document.getElementById('empNotifyStickyHeadCount');
  if (!badge || !list || !headCount) return;
  const setHeadCount = (unread, total) => {
    const u = Number(unread || 0);
    const t = Number(total || 0);
    headCount.innerHTML = `未読<span class="emp-notify-head-badge">${escHtml(String(u))}</span> / 全${escHtml(String(t))}件`;
  };

  const map = new Map();
  for (const it of (Array.isArray(state.items) ? state.items : [])) {
    if (shouldHideEmployeeAppliedNotice(it)) continue;
    const msg = String(it?.message || '').trim();
    const parts = splitMsg(msg);
    const keyBase = `${parts.title}|${normalizeDetailForGroup(parts.detail)}`.trim();
    const key = keyBase || msg || `notice:${String(it?.id || '')}`;
    if (!map.has(key)) {
      map.set(key, { key, message: msg, ids: [], link: '', created_at: it?.created_at || null, unread: 0, count: 0 });
    }
    const g = map.get(key);
    const nid = parseInt(String(it?.id || 0), 10) || 0;
    if (nid) g.ids.push(nid);
    const itemLink = normalizeLink(it?.link_url || it?.linkUrl || inferLinkFromMessage(msg));
    if (!g.link && itemLink) g.link = itemLink;
    g.count += 1;
    if (!it?.read_at) g.unread += 1;
    if (!g.created_at || new Date(it?.created_at || 0).getTime() > new Date(g.created_at || 0).getTime()) g.created_at = it?.created_at || g.created_at;
  }

  const groupsAll = Array.from(map.values()).sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
  const unreadGroups = groupsAll.filter((g) => Number(g.unread || 0) > 0);
  const readGroups = groupsAll.filter((g) => Number(g.unread || 0) <= 0);
  const unread = unreadGroups.reduce((s, g) => s + Number(g.unread || 0), 0);
  const total = groupsAll.reduce((s, g) => s + Number(g.count || 0), 0);
  setHeadCount(unread, total);

  if (unread > 0) {
    badge.textContent = unread > 99 ? '99+' : String(unread);
    badge.removeAttribute('hidden');
  } else {
    badge.setAttribute('hidden', '');
  }

  if (!groupsAll.length) {
    list.innerHTML = `<div class="emp-notify-empty">新しいお知らせはありません。</div>`;
    return;
  }

  const toItemHtml = (g) => `
    <div class="emp-notify-item ${g.unread > 0 ? 'is-unread' : 'is-read'}" data-notice-ids="${escHtml((g.ids || []).join(','))}" data-link="${escHtml(g.link || '')}">
      <button type="button" class="emp-notify-open" data-action="open">
      <div class="emp-notify-row">
        <span class="emp-notify-meta">${escHtml(toCategory(splitMsg(g.message).title))}</span>
        <span class="emp-notify-time">${escHtml(fmtNoticeTime(g.created_at))}</span>
      </div>
      <div class="emp-notify-title">${escHtml(splitMsg(g.message).title)}${g.unread > 0 ? `<span class="emp-notify-item-count is-unread">${escHtml(String(g.unread))}</span>` : ''}</div>
      <div class="emp-notify-msg">${escHtml(splitMsg(g.message).detail || '')}${g.count > 1 ? ` ${escHtml(`（同じ通知 ${g.count}件）`)}` : ''}</div>
      </button>
    </div>`;
  list.innerHTML = unreadGroups.concat(readGroups).map(toItemHtml).join('');

  list.querySelectorAll('.emp-notify-item[data-notice-ids]').forEach((el) => {
    const onOpen = el.querySelector('[data-action="open"]');
    const onDelete = el.querySelector('[data-action="delete"]');
    onOpen?.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const ids = String(el.getAttribute('data-notice-ids') || '').split(',').map((x) => parseInt(String(x || 0), 10) || 0).filter((x) => !!x);
      if (!ids.length) return;
      const items = Array.isArray(state.items) ? state.items : [];
      const unreadInGroup = items
        .filter((it) => {
          const nid = parseInt(String(it?.id || 0), 10) || 0;
          return !!nid && ids.includes(nid) && !it?.read_at;
        })
        .sort((a, b) => new Date(b?.created_at || 0).getTime() - new Date(a?.created_at || 0).getTime());
      const markIds = unreadInGroup.length
        ? [parseInt(String(unreadInGroup[0]?.id || 0), 10) || 0]
        : [ids[0]];
      const safeMarkIds = markIds.filter((x) => !!x);
      if (!safeMarkIds.length) return;
      const link = String(el.getAttribute('data-link') || '').trim();
      const nowIso = new Date().toISOString();
      state.items = (Array.isArray(state.items) ? state.items : []).map((it) => {
        const nid = parseInt(String(it?.id || 0), 10) || 0;
        if (!nid || !safeMarkIds.includes(nid)) return it;
        return it?.read_at ? it : { ...it, read_at: nowIso };
      });
      render();
      try { await fetchJSONAuth('/api/notices/read', { method: 'POST', body: JSON.stringify({ ids: safeMarkIds }) }); } catch (e) { /* silently ignored */ }
      if (link) window.location.href = link;
    });
    onDelete?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
  });
}

async function refresh() {
  const res = await fetchJSONAuth('/api/notices?all=1&limit=100').catch(() => null);
  state.items = (Array.isArray(res?.notices) ? res.notices : []).filter((it) => !shouldHideEmployeeAppliedNotice(it));
  writeCache(state.items);
  render();
}

function mount() {
  // Disabled by request to remove the bell icon next to logout
  return;
  if (state.mounted) return;
  const subnav = document.querySelector('.subbar .subnav');
  const kintaiTopLinks = document.querySelector('.kintai-top .kintai-top-links');
  const host = subnav || kintaiTopLinks;
  if (!host) return;
  if (document.getElementById('empNotifyStickyBtn') || document.getElementById('empNotifyBtn')) return;
  ensureStyle();
  const wrap = document.createElement('span');
  wrap.className = 'emp-notify-wrap';
  wrap.innerHTML = `
    <button id="empNotifyStickyBtn" class="emp-notify-btn" type="button" aria-label="お知らせ" aria-expanded="false">🔔</button>
    <span id="empNotifyStickyBadge" class="emp-notify-badge" hidden>0</span>
    <div id="empNotifyStickyPanel" class="emp-notify-panel" hidden>
      <div class="emp-notify-head"><span>通知</span><span id="empNotifyStickyHeadCount">0件</span></div>
      <div id="empNotifyStickyList" class="emp-notify-list"><div class="emp-notify-empty">読み込み中...</div></div>
    </div>`;
  wrap.style.marginLeft = subnav ? 'auto' : '8px';
  host.appendChild(wrap);
  const btn = wrap.querySelector('#empNotifyStickyBtn');
  const panel = wrap.querySelector('#empNotifyStickyPanel');
  btn?.addEventListener('click', (e) => {
    e.preventDefault();
    state.open = !state.open;
    if (state.open) {
      panel?.removeAttribute('hidden');
      btn?.setAttribute('aria-expanded', 'true');
    } else {
      panel?.setAttribute('hidden', '');
      btn?.setAttribute('aria-expanded', 'false');
    }
  });
  const closePanel = () => {
    state.open = false;
    panel?.setAttribute('hidden', '');
    btn?.setAttribute('aria-expanded', 'false');
  };
  const shouldKeepOpen = (target) => {
    try {
      if (!(target instanceof Node)) return false;
      if (wrap.contains(target)) return true;
      // Keep open only when clicking inside the notify UI itself.
      return false;
    } catch {
      return false;
    }
  };
  // Capture phase prevents conflicts with other handlers using stopPropagation.
  document.addEventListener('click', (e) => {
    const t = e.target;
    if (shouldKeepOpen(t)) return;
    closePanel();
  }, true);
  document.addEventListener('pointerdown', (e) => {
    const t = e.target;
    if (shouldKeepOpen(t)) return;
    closePanel();
  }, true);
  window.addEventListener('popstate', closePanel);
  window.addEventListener('hashchange', closePanel);
  document.addEventListener('visibilitychange', () => { if (document.hidden) closePanel(); });
  state.mounted = true;
}

function tryBoot() {
  try {
    if (!state.mounted) mount();
    if (!state.mounted) return false;
    if (!Array.isArray(state.items) || !state.items.length) {
      state.items = readCache();
      render();
    }
    refresh().catch(() => { });
    if (state.timer) clearInterval(state.timer);
    state.timer = setInterval(() => { refresh().catch(() => { }); }, 60000);
    if (state.observer) { try { state.observer.disconnect(); } catch (e) { /* silently ignored */ } state.observer = null; }
    return true;
  } catch {
    return false;
  }
}

function bindSelfNavigationGuard() {
  if (selfNavGuardBound) return;
  selfNavGuardBound = true;
  document.addEventListener('click', (e) => {
    const a = e.target?.closest?.('a[href]');
    if (!a) return;
    if (a.hasAttribute('download')) return;
    const target = String(a.getAttribute('target') || '').toLowerCase();
    if (target && target !== '_self') return;
    const href = String(a.getAttribute('href') || '').trim();
    if (!href || href === '#' || href.startsWith('javascript:')) return;
    let to = null;
    let cur = null;
    try {
      to = new URL(href, window.location.href);
      cur = new URL(window.location.href);
    } catch {
      return;
    }
    if (!to || !cur) return;
    if (to.origin !== cur.origin) return;
    if (to.pathname === cur.pathname && to.search === cur.search && (to.hash || '') === (cur.hash || '')) {
      e.preventDefault();
    }
  }, true);
}

function setNavCurrent(pathName) {
  try {
    document.querySelectorAll('.subbar .subnav a[href]').forEach((a) => {
      const href = String(a.getAttribute('href') || '');
      const u = new URL(href, window.location.origin);
      if (u.pathname === pathName) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    document.querySelectorAll('#mobileDrawer a.drawer-item[href]').forEach((a) => {
      const href = String(a.getAttribute('href') || '');
      const u = new URL(href, window.location.origin);
      if (u.pathname === pathName) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
  } catch (e) { /* silently ignored */ }
}
function syncPageHeadStyle(doc) {
  try {
    const id = 'pjax-requests-style';
    const styles = Array.from(doc?.head?.querySelectorAll?.('style') || []).map((el) => String(el.textContent || '')).filter(Boolean);
    if (!styles.length) return;
    let st = document.getElementById(id);
    if (!st) {
      st = document.createElement('style');
      st.id = id;
      document.head.appendChild(st);
    }
    st.textContent = styles.join('\n\n');
  } catch (e) { /* silently ignored */ }
}
async function softNavigateLocal(url, push = true) {
  try {
    const main = document.querySelector('main.content');
    if (!main) return false;
    const res = await fetch(url.pathname + url.search, { credentials: 'include', cache: 'no-store' });
    if (!res.ok) return false;
    const html = await res.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const nextMain = doc.querySelector('main.content');
    if (!nextMain) return false;
    main.innerHTML = nextMain.innerHTML;
    if (doc.title) document.title = doc.title;
    syncPageHeadStyle(doc);
    if (push) history.pushState({ pjax: true, path: url.pathname }, '', url.pathname + url.search + url.hash);
    setNavCurrent(url.pathname);
    try { window.scrollTo({ top: 0, behavior: 'auto' }); } catch { window.scrollTo(0, 0); }
    if (url.pathname === REQ_PATH) {
      try {
        const mod = await import('/static/js/pages/requests.page.js');
        if (mod && typeof mod.bootRequestsPage === 'function') await mod.bootRequestsPage();
      } catch (e) { /* silently ignored */ }
    } else if (url.pathname === EXP_PATH) {
      try {
        const mod = await import('/static/js/pages/expenses.page.js?v=20260529-23');
        if (mod && typeof mod.bootExpensesPage === 'function') await mod.bootExpensesPage();
      } catch (e) { /* silently ignored */ }
    }
    return true;
  } catch {
    return false;
  }
}
function bindSoftRequestNavigation() {
  if (softReqNavBound) return;
  softReqNavBound = true;
  document.addEventListener('click', async (e) => {
    const a = e.target?.closest?.('a[href]');
    if (!a) return;
    if (a.hasAttribute('download')) return;
    const target = String(a.getAttribute('target') || '').toLowerCase();
    if (target && target !== '_self') return;
    const href = String(a.getAttribute('href') || '').trim();
    if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;
    let to = null;
    try { to = new URL(href, window.location.href); } catch { return; }
    if (!to || to.origin !== window.location.origin) return;
    if (to.pathname !== REQ_PATH && to.pathname !== EXP_PATH) return;
    if (window.location.pathname === to.pathname && window.location.search === to.search) {
      e.preventDefault();
      return;
    }
    if (softNavInFlight) {
      e.preventDefault();
      return;
    }
    e.preventDefault();
    e.stopImmediatePropagation();
    softNavInFlight = true;
    const portalSoft = window.__employeeSoftNavigate;
    let ok = false;
    try {
      if (typeof portalSoft === 'function') {
        ok = await portalSoft(to.pathname + to.search + to.hash, true);
      } else {
        ok = await softNavigateLocal(to, true);
      }
    } finally {
      softNavInFlight = false;
    }
    if (!ok) window.location.href = to.pathname + to.search + to.hash;
  }, true);
  window.addEventListener('popstate', async () => {
    try {
      const p = String(window.location.pathname || '');
      if (p !== REQ_PATH && p !== EXP_PATH) return;
      if (softNavInFlight) return;
      softNavInFlight = true;
      const portalSoft = window.__employeeSoftNavigate;
      let ok = false;
      try {
        if (typeof portalSoft === 'function') {
          ok = await portalSoft(window.location.href, false);
        } else {
          ok = await softNavigateLocal(new URL(window.location.href), false);
        }
      } finally {
        softNavInFlight = false;
      }
      if (!ok) window.location.reload();
    } catch (e) { /* silently ignored */ }
  });
}

// Reduce header/subbar flicker feeling on employee pages.
try { document.documentElement.classList.add('topbar-ready'); } catch (e) { /* silently ignored */ }
try { bindSelfNavigationGuard(); } catch (e) { /* silently ignored */ }
// Keep a single navigation router (portal.page.js) to avoid race/flicker.
try {
  const sp = document.getElementById('pageSpinner');
  if (sp) sp.setAttribute('hidden', '');
} catch (e) { /* silently ignored */ }

if (!tryBoot()) {
  // Mount as soon as subnav is inserted, without waiting full page lifecycle.
  try {
    state.observer = new MutationObserver(() => { if (tryBoot()) return; });
    state.observer.observe(document.documentElement || document.body, { childList: true, subtree: true });
  } catch (e) { /* silently ignored */ }
  document.addEventListener('DOMContentLoaded', () => { tryBoot(); }, { once: true });
}

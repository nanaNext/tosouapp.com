// import API và helper, me() lấy thông tin user hiện tại, refresh() -> refresh token, logout() -> đăng xuất, fetchJSONAuth() -> fetch API có kèm token
// Mục đích đây là các nền tảng để đồng bộ thông tin trạng thái user và gọi APi thông báo

import { me, refresh, logout } from '../api/auth.api.js';
import { fetchJSONAuth } from '../api/http.api.js';
// Các helper DOM và format
// shortcut cho document.querySelecttor

const $ = (sel) => document.querySelector(sel);
// Thêm class topbar - ready vào html dể css có thể áp dụng
// Dùng để đánh dấu khi topbar đã sẵn sàng để sử dụng

const markTopbarReady = () => {
  try { document.documentElement.classList.add('topbar-ready'); } catch { }
};
const todayJST = () => new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
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
  } catch { }
  try {
    const raw = sessionStorage.getItem('user') || localStorage.getItem('user') || '';
    const u = raw ? JSON.parse(raw) : null;
    const id = parseInt(String(u?.id || 0), 10) || 0;
    if (id) return id;
  } catch { }
  return 0;
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
const notifyState = {
  mounted: false,
  open: false,
  items: [],
  groups: [],
  hiddenIds: (() => {
    try {
      const raw = localStorage.getItem('emp_notify_hidden_v1') || '[]';
      const arr = JSON.parse(raw);
      return new Set((Array.isArray(arr) ? arr : []).map((x) => parseInt(String(x || 0), 10) || 0).filter((x) => !!x));
    } catch { return new Set(); }
  })(),
  refreshTimer: null
};
const ensureEmpNotifyStyle = () => {
  try {
    if (document.getElementById('empNotifyStyle')) return;
    const st = document.createElement('style');
    st.id = 'empNotifyStyle';
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
  } catch { }
};
const mountEmployeeNoticeBell = () => {
  try {
    // Disabled by request to remove the bell icon
    // return true;
    if (notifyState.mounted) return true;
    // If a sticky/shared bell is already mounted on this page, skip local mount.
    if (document.getElementById('empNotifyBtn') || document.getElementById('empNotifyStickyBtn')) {
      notifyState.mounted = true;
      return true;
    }
    const subnav = document.querySelector('.subbar .subnav');
    if (!subnav) return false;
    ensureEmpNotifyStyle();
    const wrap = document.createElement('span');
    wrap.className = 'emp-notify-wrap';
    wrap.innerHTML = `
      <button id="empNotifyBtn" class="emp-notify-btn" type="button" aria-label="お知らせ" aria-expanded="false">🔔</button>
      <span id="empNotifyBadge" class="emp-notify-badge" hidden>0</span>
      <div id="empNotifyPanel" class="emp-notify-panel" hidden>
        <div class="emp-notify-head"><span>通知</span><span id="empNotifyHeadCount">0件</span></div>
        <div id="empNotifyList" class="emp-notify-list"><div class="emp-notify-empty">読み込み中...</div></div>
      </div>
    `;
    wrap.style.marginLeft = 'auto';
    subnav.appendChild(wrap);
    const btn = wrap.querySelector('#empNotifyBtn');
    const panel = wrap.querySelector('#empNotifyPanel');
    btn?.addEventListener('click', (e) => {
      e.preventDefault();
      notifyState.open = !notifyState.open;
      if (notifyState.open) {
        panel?.removeAttribute('hidden');
        btn?.setAttribute('aria-expanded', 'true');
      } else {
        panel?.setAttribute('hidden', '');
        btn?.setAttribute('aria-expanded', 'false');
      }
    });
    const closePanel = () => {
      notifyState.open = false;
      panel?.setAttribute('hidden', '');
      btn?.setAttribute('aria-expanded', 'false');
    };
    const shouldKeepOpen = (target) => {
      try {
        if (!(target instanceof Node)) return false;
        return wrap.contains(target);
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
    notifyState.mounted = true;
    return true;
  } catch {
    return false;
  }
};
const renderEmployeeNoticeBell = () => {
  try {
    const badge = document.getElementById('empNotifyBadge');
    const list = document.getElementById('empNotifyList');
    const headCount = document.getElementById('empNotifyHeadCount');
    if (!badge || !list) return;
    const setHeadCount = (unread, total) => {
      if (!headCount) return;
      const u = Number(unread || 0);
      const t = Number(total || 0);
      headCount.innerHTML = `未読<span class="emp-notify-head-badge">${escHtml(String(u))}</span> / 全${escHtml(String(t))}件`;
    };
    const hidden = notifyState.hiddenIds instanceof Set ? notifyState.hiddenIds : new Set();
    const items = (Array.isArray(notifyState.items) ? notifyState.items : []).filter((it) => {
      const nid = parseInt(String(it?.id || 0), 10) || 0;
      if (hidden.has(nid)) return false;
      if (shouldHideEmployeeAppliedNotice(it)) return false;
      return true;
    });
    const splitMsg = (msg) => {
      const s = String(msg || '').trim();
      const idx = s.indexOf(':');
      if (idx > 0) {
        return { title: s.slice(0, idx).trim(), detail: s.slice(idx + 1).trim() };
      }
      return { title: previewMsg(s, 32), detail: '' };
    };
    const inferLinkFromMessage = (msg) => {
      const s = String(msg || '');
      if (s.includes('有休') || s.includes('休暇')) return '/ui/requests';
      if (s.includes('交通費')) return '/ui/expenses';
      if (s.includes('時間修正') || s.includes('調整')) return '/ui/adjust';
      if (s.includes('FAQ') || s.includes('質問')) return '/ui/faq';
      return '/ui/portal';
    };
    const normalizeLink = (v) => {
      const s = String(v || '').trim();
      if (!s) return '';
      if (/^https?:\/\//i.test(s)) return s;
      if (s.startsWith('/')) return s;
      return `/${s}`;
    };
    const normalizeDetailForGroup = (detail) => {
      const s = String(detail || '');
      return s
        .replace(/\d{4}-\d{2}-\d{2}/g, '')
        .replace(/\d{2}:\d{2}/g, '')
        .replace(/[~〜]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
    };
    const map = new Map();
    items.forEach((it) => {
      const msg = String(it?.message || '').trim();
      const parts = splitMsg(msg);
      const keyBase = `${parts.title}|${normalizeDetailForGroup(parts.detail)}`.trim();
      const key = keyBase || msg || `notice:${String(it?.id || '')}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          message: msg,
          ids: [],
          link: '',
          created_at: it?.created_at || null,
          unread: 0,
          count: 0
        });
      }
      const g = map.get(key);
      const nid = parseInt(String(it?.id || 0), 10) || 0;
      if (nid) g.ids.push(nid);
      const itemLink = normalizeLink(it?.link_url || it?.linkUrl || inferLinkFromMessage(msg));
      if (!g.link && itemLink) g.link = itemLink;
      g.count += 1;
      if (!it?.read_at) g.unread += 1;
      if (!g.created_at || new Date(it?.created_at || 0).getTime() > new Date(g.created_at || 0).getTime()) {
        g.created_at = it?.created_at || g.created_at;
      }
    });
    const groupsAll = Array.from(map.values()).sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    const unreadGroups = groupsAll.filter((g) => Number(g.unread || 0) > 0);
    const readGroups = groupsAll.filter((g) => Number(g.unread || 0) <= 0);
    notifyState.groups = groupsAll;
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
      setHeadCount(0, 0);
      list.innerHTML = `<div class="emp-notify-empty">新しいお知らせはありません。</div>`;
      return;
    }
    const toCategory = (title) => {
      const t = String(title || '');
      if (t.includes('有休') || t.includes('休暇')) return '有休';
      if (t.includes('交通費')) return '交通費';
      if (t.includes('時間修正')) return '時間修正';
      if (t.includes('FAQ') || t.includes('質問')) return 'FAQ';
      return '通知';
    };
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
        <button type="button" class="emp-notify-del" data-action="delete" aria-label="削除">✕</button>
      </div>
    `;
    list.innerHTML = unreadGroups.concat(readGroups).map(toItemHtml).join('');
    list.querySelectorAll('.emp-notify-item[data-notice-ids]').forEach((el) => {
      const onOpen = el.querySelector('[data-action="open"]');
      const onDelete = el.querySelector('[data-action="delete"]');
      onOpen?.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const ids = String(el.getAttribute('data-notice-ids') || '')
          .split(',')
          .map((x) => parseInt(String(x || 0), 10) || 0)
          .filter((x) => !!x);
        if (!ids.length) return;
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
        notifyState.items = items.map((it) => {
          const nid = parseInt(String(it?.id || 0), 10) || 0;
          if (!nid || !safeMarkIds.includes(nid)) return it;
          return it?.read_at ? it : { ...it, read_at: nowIso };
        });
        renderEmployeeNoticeBell();
        try { await fetchJSONAuth('/api/notices/read', { method: 'POST', body: JSON.stringify({ ids: safeMarkIds }) }); } catch { }
        if (link) {
          try {
            const to = new URL(link, window.location.origin);
            if (to.origin === window.location.origin) {
              const href = `${to.pathname}${to.search}${to.hash}`;
              const goSoft = window.__employeeSoftNavigate;
              if (typeof goSoft === 'function') {
                const ok = await goSoft(href, true);
                if (ok) return;
              }
              window.location.href = href;
              return;
            }
          } catch { }
          window.location.href = link;
        }
      });
      onDelete?.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        const ids = String(el.getAttribute('data-notice-ids') || '')
          .split(',')
          .map((x) => parseInt(String(x || 0), 10) || 0)
          .filter((x) => !!x);
        if (!ids.length) return;
        const dropSet = new Set(ids);
        dropSet.forEach((id) => notifyState.hiddenIds.add(id));
        try {
          localStorage.setItem('emp_notify_hidden_v1', JSON.stringify(Array.from(notifyState.hiddenIds).slice(0, 1000)));
        } catch { }
        notifyState.items = items.filter((it) => {
          const nid = parseInt(String(it?.id || 0), 10) || 0;
          return !dropSet.has(nid);
        });
        renderEmployeeNoticeBell();
        try { await fetchJSONAuth('/api/notices/hide', { method: 'POST', body: JSON.stringify({ ids }) }); } catch { }
      });
    });
  } catch { }
};
const refreshEmployeeNoticeBell = async () => {
  try {
    const date = todayJST();
    const month = date.slice(0, 7);
    const res = await fetchJSONAuth(`/api/notices?all=1&date=${encodeURIComponent(date)}&month=${encodeURIComponent(month)}&limit=30`).catch(() => null);
    notifyState.items = (Array.isArray(res?.notices) ? res.notices : []).filter((it) => !shouldHideEmployeeAppliedNotice(it));
    renderEmployeeNoticeBell();
  } catch { }
};
const bootEmployeeNoticeBell = () => {
  try {
    if (!mountEmployeeNoticeBell()) return;
    refreshEmployeeNoticeBell();
    if (notifyState.refreshTimer) clearInterval(notifyState.refreshTimer);
    notifyState.refreshTimer = setInterval(() => { refreshEmployeeNoticeBell(); }, 60000);
  } catch { }
};

const prefillUserName = () => {
  try {
    const el = $('#userName');
    if (!el) return;
    const raw = sessionStorage.getItem('user') || localStorage.getItem('user') || '';
    const u = raw ? JSON.parse(raw) : null;
    const name = (u && (u.username || u.email)) ? String(u.username || u.email) : '';
    if (name) el.textContent = name;
  } catch { }
};

const setUserNameStable = (nextName, { force = false } = {}) => {
  try {
    const el = $('#userName');
    if (!el) return;
    const current = String(el.textContent || '').trim();
    const next = String(nextName || '').trim();
    if (!next) return;
    if (!force && current) return;
    if (current === next) return;
    el.textContent = next;
  } catch { }
};

// Run as early as possible (module executes before DOMContentLoaded on these pages)
// to reduce visible flicker in the user area while auth/profile is still resolving.
try { prefillUserName(); } catch { }
markTopbarReady();

function getCookie(name) {
  const m = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  return m ? decodeURIComponent(m[2]) : null;
}

const wireExpandingSearch = () => {
  try {
    const box = document.querySelector('.topbar-inner .search');
    if (!box) return;
    if (box.dataset.bound === '1') return;
    box.dataset.bound = '1';
    const input = box.querySelector('input[type="search"]');
    const closeBtn = box.querySelector('.search-close');
    const hint = box.querySelector('.search-hint');
    box.classList.remove('active');
    if (hint) hint.style.display = 'none';
    if (closeBtn) closeBtn.style.display = 'none';
    document.addEventListener('keydown', (e) => {
      const isCtrlK = (e.key === 'k' || e.key === 'K') && (e.ctrlKey || e.metaKey);
      if (isCtrlK) {
        const t = e.target;
        const tag = (t && t.tagName) ? t.tagName.toLowerCase() : '';
        const editable = (t && (t.isContentEditable || tag === 'input' || tag === 'textarea' || tag === 'select'));
        if (editable) return;
        e.preventDefault();
        try { input && input.focus({ preventScroll: true }); input && input.select(); } catch { }
      }
    });
  } catch { }
};

async function ensureAuthProfile() {
  let token = sessionStorage.getItem('accessToken');
  let profile = null;

  // Add timeout to prevent hanging
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Auth timeout')), 5000)
  );

  try {
    if (token) {
      try { profile = await Promise.race([me(token), timeoutPromise]); } catch (e) {
        console.warn('⚠️ Me() failed:', e.message);
      }
    }
    if (!profile) {
      try {
        const r = await Promise.race([refresh(), timeoutPromise]);
        sessionStorage.setItem('accessToken', r.accessToken);
        token = r.accessToken;
        profile = await me(token);
      } catch (e) {
        console.warn('⚠️ Refresh failed:', e.message);
      }
    }
    if (!profile) {
      try {
        const userStr = sessionStorage.getItem('user') || localStorage.getItem('user') || '';
        const user = userStr ? JSON.parse(userStr) : null;
        if (user && (user.role === 'admin' || user.role === 'manager' || user.role === 'employee')) {
          profile = user;
          try {
            const r2 = await Promise.race([refresh(), timeoutPromise]);
            sessionStorage.setItem('accessToken', r2.accessToken);
          } catch { }
        }
      } catch (e) {
        console.warn('⚠️ Fallback profile failed:', e.message);
      }
    }
  } catch (e) {
    console.error('❌ ensureAuthProfile error:', e);
  }

  if (!profile) { return null; }
  return profile;
}

document.addEventListener('DOMContentLoaded', async () => {
  markTopbarReady();
  prefillUserName();
  // Prevent full reload when user clicks the link of the page already opened.
  // This removes topbar/user flicker on same-tab clicks such as "申請" on /ui/requests.
  try {
    if (!window.__preventSelfNavBound) {
      window.__preventSelfNavBound = true;
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
  } catch { }
  const pageSpinner = document.querySelector('#pageSpinner');
  try {
    const navEntry = (typeof performance !== 'undefined' && performance.getEntriesByType) ? performance.getEntriesByType('navigation')[0] : null;
    const navType = navEntry?.type || (performance && performance.navigation && performance.navigation.type === 2 ? 'back_forward' : '');
    if (navType === 'back_forward') {
      if (pageSpinner) { pageSpinner.setAttribute('hidden', ''); }
      try { sessionStorage.removeItem('navSpinner'); } catch { }
    }
    window.addEventListener('pageshow', () => {
      try { sessionStorage.removeItem('navSpinner'); } catch { }
      if (pageSpinner) { pageSpinner.setAttribute('hidden', ''); }
    });
  } catch { }
  try {
    /* giữ spinner đến khi xác thực xong, không auto-hide theo thời gian */
  } catch { }
  try {
    const f = sessionStorage.getItem('navSpinner');
    if (f === '1' && pageSpinner) {
      pageSpinner.removeAttribute('hidden');
    }
    sessionStorage.removeItem('navSpinner');
  } catch { }
  const waitMinDelay = async () => { };
  // Keep header height stable to avoid first-paint layout jump between pages.
  const setTopbarHeightVar = () => { };
  const status = $('#status');
  if (status) status.textContent = '認証を確認しています…';
  const tilesRoot = document.querySelector('.tiles');
  if (tilesRoot) { tilesRoot.style.visibility = 'hidden'; }
  let profile = null;
  try {
    profile = await ensureAuthProfile();
  } catch (e) {
    const err = $('#error');
    if (err) { err.style.display = 'block'; err.textContent = '認証エラー: ' + (e?.message || 'unknown'); }
    if (pageSpinner) { pageSpinner.setAttribute('hidden', ''); }
  }
  if (!profile) { if (pageSpinner) { pageSpinner.setAttribute('hidden', ''); } window.location.replace('/ui/login'); return; }
  markTopbarReady();
  try {
    const userStr = sessionStorage.getItem('user') || '';
    if (userStr) { localStorage.setItem('user', userStr); }
  } catch { }
  const role = String(profile.role || '').toLowerCase();
  try { window.__EMP_UID = parseInt(String(profile.id || 0), 10) || 0; } catch { }
  setUserNameStable(profile.username || profile.email || 'ユーザー');
  if (role === 'admin' || role === 'manager') {
    const p0 = String(window.location.pathname || '');
    if (p0 === '/ui/portal' || p0 === '/ui/dashboard') {
      try { window.location.replace('/admin/dashboard'); } catch { window.location.href = '/admin/dashboard'; }
      return;
    }
  }
  const bindEmployeePjaxRequests = () => {
    const REQ_PATH = '/ui/requests';
    const EXP_PATH = '/ui/expenses';
    const CONTACT_PATH = '/ui/contact';
    const HOME_PATH = '/ui/portal';
    const CHATBOT_PATH = '/ui/faq';
    const SOFT_PATHS = new Set([CONTACT_PATH, HOME_PATH, REQ_PATH, EXP_PATH, CHATBOT_PATH]);
    let pjaxNavInFlight = false;
    const main = document.querySelector('main.content');
    if (!main) return;
    const applyContentSpacing = (pathName) => {
      try {
        const isMobile = window.matchMedia && window.matchMedia('(max-width: 768px)').matches;
        // Route-level hardening: prevent style bleed when navigating from expenses page.
        let pad;
        if (isMobile) {
          pad = 'calc(var(--topbar-height) + 2px)';
          main.style.setProperty('margin-top', '0px', 'important');
        } else {
          pad = 'calc(var(--topbar-height) + var(--subbar-height) + 24px)';
          main.style.removeProperty('margin-top');
        }

        // Không áp dụng inline padding cho trang expenses vì nó đã được xử lý riêng bằng CSS
        if (pathName === EXP_PATH) {
          main.style.removeProperty('padding-top');
        } else {
          main.style.setProperty('padding-top', pad, 'important');
        }
      } catch { }
    };
    const syncInlinePageStyle = (doc, pathName) => {
      try {
        const id = 'req-pjax-inline-style';
        let st = document.getElementById(id);
        const needsInlineStyle =
          pathName === REQ_PATH ||
          pathName === EXP_PATH ||
          pathName === CHATBOT_PATH;
        if (!needsInlineStyle) {
          if (st) st.textContent = '';
          return;
        }
        const styles = Array.from(doc?.head?.querySelectorAll?.('style') || [])
          .map((el) => String(el.textContent || ''))
          .filter(Boolean);
        if (!styles.length) return;
        if (!st) {
          st = document.createElement('style');
          st.id = id;
          document.head.appendChild(st);
        }
        st.textContent = styles.join('\n\n');
      } catch { }
    };
    const setNavCurrent = (pathName) => {
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
      } catch { }
    };
    const loadViaPjax = async (url, push = true) => {
      try {
        try {
          if (typeof window.__employeePageCleanup === 'function') {
            window.__employeePageCleanup();
          }
        } catch { }
        try { delete window.__employeePageCleanup; } catch { }
        const res = await fetch(url.pathname + url.search, { credentials: 'include', cache: 'no-store' });
        if (!res.ok) return false;
        const html = await res.text();
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const nextMain = doc.querySelector('main.content');
        if (!nextMain) return false;
        syncInlinePageStyle(doc, url.pathname);
        main.innerHTML = nextMain.innerHTML;
        if (doc.title) document.title = doc.title;
        if (push) history.pushState({ pjax: true }, '', url.pathname + url.search + url.hash);
        setNavCurrent(url.pathname);
        applyContentSpacing(url.pathname);
        try { window.scrollTo({ top: 0, behavior: 'auto' }); } catch { window.scrollTo(0, 0); }
        if (url.pathname === REQ_PATH) {
          try {
            const mod = await import('/static/js/pages/requests.page.js');
            if (mod && typeof mod.bootRequestsPage === 'function') {
              await mod.bootRequestsPage();
            }
          } catch { }
        }
        if (url.pathname === EXP_PATH) {
          try {
            const mod = await import('/static/js/pages/expenses.page.js?v=20260529-23');
            if (mod && typeof mod.bootExpensesPage === 'function') {
              await mod.bootExpensesPage();
            }
          } catch { }
        }
        if (url.pathname === CHATBOT_PATH) {
          try {
            const mod = await import('/static/js/pages/chatbot.page.js');
            if (mod && typeof mod.bootChatbotPage === 'function') {
              await mod.bootChatbotPage();
            }
          } catch { }
        }
        if (url.pathname === HOME_PATH) {
          try { renderHomeTiles(role); } catch { }
          try {
            const tiles = document.querySelector('.tiles');
            if (tiles && tiles.dataset.navBound !== '1') {
              tiles.dataset.navBound = '1';
              tiles.addEventListener('click', (e) => {
                if (e.defaultPrevented) return;
                const a = e.target?.closest?.('a.tile');
                if (a && a.href && a.target !== '_blank') {
                  e.preventDefault();
                  const goSoft = window.__employeeSoftNavigate;
                  if (typeof goSoft === 'function') {
                    goSoft(a.href, true).then((ok) => {
                      if (!ok) window.location.href = a.href;
                    }).catch(() => { window.location.href = a.href; });
                    return;
                  }
                  window.location.href = a.href;
                }
              });
            }
          } catch { }
        }
        return true;
      } catch {
        return false;
      }
    };
    if (!window.__employeePjaxReqBound) {
      window.__employeePjaxReqBound = true;
      applyContentSpacing(String(window.location.pathname || ''));
      const softNavigateSafe = async (to, push = true) => {
        if (pjaxNavInFlight) return true;
        pjaxNavInFlight = true;
        try {
          return await loadViaPjax(to, !!push);
        } finally {
          pjaxNavInFlight = false;
        }
      };
      window.__employeeSoftNavigate = async (href, push = true) => {
        try {
          const to = new URL(String(href || ''), window.location.href);
          if (to.origin !== window.location.origin) return false;
          if (!SOFT_PATHS.has(to.pathname)) return false;
          const ok = await softNavigateSafe(to, !!push);
          return !!ok;
        } catch {
          return false;
        }
      };
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
        if (!SOFT_PATHS.has(to.pathname)) return;
        if (window.location.pathname === to.pathname && window.location.search === to.search) {
          e.preventDefault();
          e.stopImmediatePropagation();
          return;
        }
        e.preventDefault();
        e.stopImmediatePropagation();
        const ok = await softNavigateSafe(to, true);
        if (!ok) window.location.href = to.pathname + to.search + to.hash;
      }, true);
      window.addEventListener('popstate', async () => {
        try {
          const p = String(window.location.pathname || '');
          if (SOFT_PATHS.has(p)) {
            const hasExpectedMain =
              (p === CONTACT_PATH && !!document.querySelector('.contact-wrap')) ||
              (p === HOME_PATH && !!document.querySelector('.tiles')) ||
              (p === REQ_PATH && !!document.querySelector('.req-page')) ||
              (p === EXP_PATH && !!document.querySelector('#exDate')) ||
              (p === CHATBOT_PATH && !!document.querySelector('#cat'));
            if (!hasExpectedMain) {
              const ok = await softNavigateSafe(new URL(window.location.href), false);
              if (!ok) window.location.reload();
            }
            return;
          }
          if (document.querySelector('.req-page')) {
            window.location.reload();
          }
        } catch { }
      });
    }
  };
  bindEmployeePjaxRequests();
  if (pageSpinner) { pageSpinner.setAttribute('hidden', ''); }
  // Keep natural browser history:
  // sub page -> home -> login
  // (do not force back button to jump directly to login)
  try {
  } catch { }
  if (role === 'employee' || role === 'manager') {
    const tiles = document.querySelector('.tiles');
    if (tiles) {
      tiles.innerHTML = `
        <a class="tile" href="/ui/attendance/simple"><div class="icon">⏱</div><div class="title">出退勤打刻</div></a>
        <a class="tile" href="/ui/profile"><div class="icon">👤</div><div class="title">プロフィール</div></a>
        <a class="tile" href="/ui/salary"><div class="icon">💴</div><div class="title">給与明細など</div></a>
        <a class="tile" href="/ui/calendar"><div class="icon">📅</div><div class="title">カレンダー</div></a>
        <a class="tile" href="/ui/requests"><div class="icon">✈️</div><div class="title">休暇申請</div></a>
      `;
    }
  }

  if (role === 'admin') {
    const tiles = document.querySelector('.tiles');
    if (tiles) {
      tiles.innerHTML = `
        <a class="tile" href="/ui/employees"><div class="icon">👤</div><div class="title">社員管理</div></a>
        <a class="tile" href="/ui/admin?tab=dbcheck"><div class="icon">🗄️</div><div class="title">DB検査</div></a>
        <a class="tile" href="/ui/admin?tab=users"><div class="icon">👥</div><div class="title">ユーザー管理</div></a>
        <a class="tile" href="/ui/admin?tab=departments"><div class="icon">🏢</div><div class="title">部門管理</div></a>
        <a class="tile" href="/ui/admin?tab=attendance"><div class="icon">⏱</div><div class="title">勤怠管理</div></a>
        <a class="tile" href="/ui/admin?tab=approvals"><div class="icon">✅</div><div class="title">承認フロー</div></a>
        <a class="tile" href="/ui/admin?tab=reports"><div class="icon">📊</div><div class="title">レポート</div></a>
        <a class="tile" href="/ui/admin?tab=salary_list"><div class="icon">💴</div><div class="title">給与管理</div></a>
        <a class="tile" href="/ui/admin?tab=settings"><div class="icon">⚙️</div><div class="title">システム設定</div></a>
        <a class="tile" href="/ui/admin?tab=audit"><div class="icon">📝</div><div class="title">監査ログ</div></a>
        <a class="tile" href="/ui/admin?tab=refresh"><div class="icon">🔑</div><div class="title">トークン管理</div></a>
        <a class="tile" href="/ui/admin?tab=calendar"><div class="icon">📅</div><div class="title">カレンダー</div></a>
        <a class="tile" href="/ui/admin?tab=shifts"><div class="icon">🗓️</div><div class="title">シフト</div></a>
        <a class="tile" href="/ui/admin?tab=routes"><div class="icon">🔗</div><div class="title">API一覧</div></a>
      `;
    }
    const drawer = document.querySelector('#mobileDrawer');
    if (drawer) {
      drawer.innerHTML = `
        <div class="drawer-header">
          <button id="mobileClose" class="mobile-close" aria-label="close">✕</button>
        </div>
        <a href="/ui/portal" class="drawer-item">ホーム</a>
        <a href="/admin/employees" class="drawer-item">社員管理</a>
        <a href="/ui/admin?tab=users" class="drawer-item">ユーザー管理</a>
        <a href="/admin/departments" class="drawer-item">部門管理</a>
        <a href="/admin/attendance" class="drawer-item">勤怠管理</a>
        <a href="/admin/leave/requests" class="drawer-item">承認フロー</a>
        <a href="/ui/admin?tab=reports" class="drawer-item">レポート</a>
        <a href="/admin/payroll/salary" class="drawer-item">給与管理</a>
        <a href="/admin/system/settings" class="drawer-item">システム設定</a>
        <a href="/admin/system/audit-logs" class="drawer-item">監査ログ</a>
        <a href="/ui/admin?tab=refresh" class="drawer-item">トークン管理</a>
        <a href="/admin/attendance/holidays" class="drawer-item">カレンダー</a>
        <a href="/admin/attendance/shifts" class="drawer-item">シフト</a>
        <a href="/ui/admin?tab=routes" class="drawer-item">API一覧</a>
        <button id="drawerLogout" class="drawer-item" type="button">ログアウト</button>
      `;
    }
  } else if (role === 'manager') {
    // manager drawer set above; tiles rendered by renderHomeTiles below
  } else {
    // non-admin/non-manager; tiles rendered by renderHomeTiles below
  }
  const renderHomeTiles = (role) => {
    const tiles = document.querySelector('.tiles');
    if (!tiles) return;
    const isAdmin = role === 'admin' || role === 'manager';
    if (!isAdmin) {
      tiles.classList.add('employee-portal');
      tiles.innerHTML = `
        <div class="emp-tiles-3">
          <a class="tile" href="/ui/attendance/simple">
            <div class="icon">🕒</div>
            <div class="title">勤怠入力</div>
          </a>
          <a class="tile" href="/ui/expenses" target="_blank" rel="opener">
            <div class="icon">💳</div>
            <div class="title">交通費申請</div>
          </a>
          <a class="tile" href="/ui/adjust">
            <div class="icon">⏲</div>
            <div class="title">調整申請</div>
          </a>
        </div>
        <div class="emp-tiles-2">
          <a class="tile emp-wide" href="/ui/faq">
            <div class="icon">💬</div>
            <div class="title">エンジニア<br>サポートセンター</div>
            <div class="arrow">›</div>
          </a>
          <a class="tile emp-wide" href="/ui/salary">
            <div class="icon">💴</div>
            <div class="title">給与明細など</div>
            <div class="arrow">›</div>
          </a>
        </div>
      `;
      return;
    }
    const cfg = [
      { key: 'attendance_manage', title: '勤怠管理', icon: '', href: (r) => (r === 'admin' || r === 'manager') ? '/admin/attendance' : '/ui/attendance', desc: (r) => (r === 'admin' || r === 'manager') ? 'Team attendance (missing/late)' : 'Attendance overview', prio: 10 },
      { key: 'users', title: 'ユーザー管理', icon: '👥', href: '/ui/admin?tab=users', desc: 'User management', adminOnly: true, prio: 12 },
      { key: 'departments', title: '部門管理', icon: '🏢', href: '/admin/departments', desc: 'Departments', adminOnly: true, prio: 14 },
      { key: 'admin', title: '社員管理', icon: '🛠', href: '/admin/employees', desc: 'Admin portal', adminOnly: true, prio: 16 },
      { key: 'attendance_in', title: '勤怠入力', icon: '', href: '/ui/attendance/simple', desc: 'Daily time input', prio: 20, hideForAdmin: true },
      { key: 'paid_leave', title: '有給休暇', icon: '🏝', href: '/ui/requests', desc: 'Paid leave', prio: 25 },
      { key: 'paid_leave_manage', title: '有給休暇管理', icon: '🏝', href: '/admin/leave/balance', desc: 'Paid leave admin', adminOnly: true, prio: 22 },
      { key: 'leave', title: '申請', icon: '📝', href: '/ui/requests', desc: 'Leave & requests', prio: 30, hideForAdmin: true },
      { key: 'overtime', title: '残業申請', icon: '⏲', href: '/ui/adjust?type=overtime', desc: 'Overtime / time correction request', prio: 32, hideForAdmin: true },
      { key: 'overtime_manage', title: '残業管理', icon: '⏲', href: '/admin/leave/requests', desc: 'Overtime management', adminOnly: true, prio: 18 },
      { key: 'requests_manage', title: '申請管理', icon: '🗂', href: '/admin/leave/requests', desc: 'Requests management', adminOnly: true, prio: 19 },
      { key: 'expenses', title: '交通費申請', icon: '💳', href: '/ui/expenses', target: '_blank', rel: 'opener', desc: 'Expense claims', prio: 34 },
      { key: 'salary', title: (r) => (r === 'admin' || r === 'manager') ? '給与管理' : '給与明細', icon: '💴', href: (r) => (r === 'admin' || r === 'manager') ? '/admin/payroll/salary' : '/ui/salary', desc: (r) => (r === 'admin' || r === 'manager') ? 'Salary management' : 'Payslips', prio: 36 },
      { key: 'salary_calc', title: '給与計算', icon: '🧮', href: '/ui/admin?tab=salary_calc', desc: 'Payroll calculation', adminOnly: true, prio: 37 },
      { key: 'salary_send', title: '給与明細送信', icon: '📧', href: '/admin/payroll/payslips', desc: 'Send payslips', adminOnly: true, prio: 38 },
      { key: 'calendar', title: 'カレンダー', icon: '📆', href: '/admin/attendance/holidays', desc: 'Work calendar', adminOnly: true, prio: 40 },
      { key: 'shifts', title: 'シフト', icon: '🗓', href: '/admin/attendance/shifts', desc: 'Shift planning', adminOnly: true, prio: 42 },
      { key: 'reports', title: 'レポート', icon: '📊', href: '/ui/admin?tab=reports', desc: 'Reports', adminOnly: true, prio: 50 },
      { key: 'settings', title: 'システム設定', icon: '⚙️', href: '/admin/system/settings', desc: 'System settings', adminOnly: true, prio: 60 },
      { key: 'audit', title: '監査ログ', icon: '🧾', href: '/admin/system/audit-logs', desc: 'Audit logs', adminOnly: true, prio: 62 },
      { key: 'tokens', title: 'トークン管理', icon: '🔑', href: '/ui/admin?tab=refresh', desc: 'Token control', adminOnly: true, prio: 64 },
      { key: 'api', title: 'API一覧', icon: '🔗', href: '/ui/admin?tab=routes', desc: 'API list', adminOnly: true, prio: 66 },
      { key: 'contacts', title: 'お問い合わせ先', icon: '☎', href: '/ui/contact', desc: 'Contacts', prio: 80 },
      { key: 'help', title: 'サポート', icon: '💬', href: '/ui/faq', desc: 'Help center', prio: 82 },
      { key: 'profile', title: 'プロフィール', icon: '👤', href: '/ui/dashboard', desc: 'Profile overview', prio: 90 }
    ];
    const items = cfg
      .filter(c => (isAdmin || !c.adminOnly) && !(isAdmin && c.hideForAdmin))
      .sort((a, b) => ((a.prio == null ? 100 : a.prio) - (b.prio == null ? 100 : b.prio)));
    tiles.innerHTML = items.map(c => {
      const link = typeof c.href === 'function' ? c.href(role) : c.href;
      const title = typeof c.title === 'function' ? c.title(role) : c.title;
      const desc = typeof c.desc === 'function' ? c.desc(role) : (c.desc || '');
      const targetAttr = c.target ? ` target="${c.target}"` : '';
      return `
      <a class="tile" href="${link}"${targetAttr}>
        ${c.icon ? `<div class="icon">${c.icon}</div>` : ''}
        <div class="title">${title}</div>
        <div class="desc">${desc}</div>
      </a>
    `;
    }).join('');
  };
  renderHomeTiles(role);
  if (role === 'employee') {
    try { bootEmployeeNoticeBell(); } catch { }
  }
  try {
    const brand = document.querySelector('.topbar .brand');
    if (brand) {
      brand.style.cursor = 'pointer';
      brand.addEventListener('click', (e) => {
        e.preventDefault();
        const goSoft = window.__employeeSoftNavigate;
        if (typeof goSoft === 'function') {
          goSoft('/ui/portal', true).then((ok) => {
            if (!ok) window.location.href = '/ui/portal';
          }).catch(() => { window.location.href = '/ui/portal'; });
          return;
        }
        window.location.href = '/ui/portal';
      });
    }
  } catch { }
  /* dùng biến pageSpinner đã khai báo ở đầu scope */
  function navigateWithSpinner(href) {
    const goSoft = window.__employeeSoftNavigate;
    if (typeof goSoft === 'function') {
      goSoft(href, true).then((ok) => {
        if (!ok) window.location.href = href;
      }).catch(() => { window.location.href = href; });
      return;
    }
    window.location.href = href;
  }
  const tilesSection = document.querySelector('.tiles');
  if (tilesSection) {
    tilesSection.addEventListener('click', (e) => {
      if (e.defaultPrevented) return;
      const a = e.target?.closest?.('a.tile');
      if (a && a.href && a.target !== '_blank') {
        e.preventDefault();
        navigateWithSpinner(a.href);
      }
    });
  }

  const drawerEl = document.querySelector('#mobileDrawer');
  if (drawerEl) {
    drawerEl.addEventListener('click', async (e) => {
      const btn = e.target?.closest?.('#drawerLogout');
      if (btn) {
        try { await logout(); } catch { }
        sessionStorage.removeItem('accessToken');
        sessionStorage.removeItem('user');
        sessionStorage.removeItem('refreshToken');
        try { localStorage.removeItem('refreshToken'); localStorage.removeItem('user'); } catch { }
        try { localStorage.setItem('auth-logout-event', Date.now()); } catch { }
        window.location.replace('/ui/login');
      }
    });
  }
  const adminTile = document.querySelector('#tile-admin');
  if (adminTile) {
    if (role === 'admin') {
      adminTile.style.display = '';
    } else {
      adminTile.style.display = 'none';
    }
  }
  if (status) status.textContent = '';
  if (tilesRoot) { tilesRoot.style.visibility = ''; }
  markTopbarReady();
  const input = document.querySelector('.search input');
  if (input) {
    const tiles = Array.from(document.querySelectorAll('.tiles .tile'));
    const applyFilter = () => {
      const q = input.value.trim().toLowerCase();
      tiles.forEach(t => {
        const text = String(t.textContent || '').toLowerCase();
        const match = q.length === 0 || text.includes(q);
        t.style.display = match ? '' : 'none';
      });
    };
    input.addEventListener('input', applyFilter);
    input.addEventListener('change', applyFilter);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const first = tiles.find(t => t.style.display !== 'none');
        if (first) first.click();
      }
    });
  }
  const imgIcons = document.querySelectorAll('.tile .img-icon');
  imgIcons.forEach(img => {
    img.addEventListener('error', () => {
      img.src = '/static/images/iconlogin.png';
    }, { once: true });
  });
  const userBtn = document.querySelector('.user .user-btn');
  const dropdown = document.querySelector('#userDropdown');
  if (!window.__employeeUserMenuDelegated) {
    window.__employeeUserMenuDelegated = true;
    document.addEventListener('click', (e) => {
      const btn = e.target?.closest?.('.user .user-btn');
      const dd = document.querySelector('#userDropdown');
      if (btn && dd) {
        e.preventDefault();
        e.stopImmediatePropagation();
        const hidden = dd.hasAttribute('hidden');
        if (hidden) {
          dd.removeAttribute('hidden');
          btn.setAttribute('aria-expanded', 'true');
          const firstItem = dd.querySelector('.item, a, button');
          if (firstItem && typeof firstItem.focus === 'function') {
            try { firstItem.focus(); } catch { }
          }
        } else {
          dd.setAttribute('hidden', '');
          btn.setAttribute('aria-expanded', 'false');
        }
        return;
      }
      const menu = e.target?.closest?.('.user .user-menu');
      if (!menu && dd && !dd.hasAttribute('hidden')) {
        dd.setAttribute('hidden', '');
        const anyBtn = document.querySelector('.user .user-btn');
        if (anyBtn) anyBtn.setAttribute('aria-expanded', 'false');
      }
    }, true);
  }
  if (userBtn && dropdown) {
    const btnLogout = document.querySelector('#btnLogout');
    if (btnLogout && btnLogout.dataset.bound !== '1') {
      btnLogout.dataset.bound = '1';
      btnLogout.addEventListener('click', async () => {
        try { await logout(); } catch { }
        sessionStorage.removeItem('accessToken');
        sessionStorage.removeItem('user');
        sessionStorage.removeItem('refreshToken');
        try { localStorage.removeItem('refreshToken'); localStorage.removeItem('user'); } catch { }
        try { localStorage.setItem('auth-logout-event', Date.now()); } catch { }
        window.location.replace('/ui/login');
      });
    }
  }
  const mobileBtn = document.querySelector('#mobileMenuBtn');
  const mobileDrawer = document.querySelector('#mobileDrawer');
  const mobileClose = document.querySelector('#mobileClose');
  const mobileBackdrop = document.querySelector('#drawerBackdrop');
  if (mobileBtn && mobileDrawer) {
    if (mobileBtn.dataset.bound === '1') return;
    mobileBtn.dataset.bound = '1';
    const isMobileViewport = () => {
      try { return (window.innerWidth || 0) <= 480; } catch { return false; }
    };
    let drawerScrollY = 0;
    const lockViewport = () => {
      try {
        drawerScrollY = window.scrollY || window.pageYOffset || 0;
        document.documentElement.style.overflow = 'hidden';
        document.body.style.position = 'fixed';
        document.body.style.top = `-${drawerScrollY}px`;
        document.body.style.left = '0';
        document.body.style.right = '0';
        document.body.style.width = '100%';
        document.body.style.overflow = 'hidden';
      } catch { }
    };
    const unlockViewport = () => {
      try {
        document.documentElement.style.overflow = '';
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.left = '';
        document.body.style.right = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        window.scrollTo(0, Math.max(0, Number(drawerScrollY) || 0));
      } catch { }
    };
    const swallowWhenDrawerOpen = (e) => {
      try {
        if (!document.body.classList.contains('drawer-open')) return;
        const inDrawer = e.target && e.target.closest && e.target.closest('#mobileDrawer');
        if (inDrawer) return;
        e.preventDefault();
      } catch { }
    };
    document.addEventListener('touchmove', swallowWhenDrawerOpen, { passive: false });
    document.addEventListener('wheel', swallowWhenDrawerOpen, { passive: false });
    const toggleDrawer = (open) => {
      if (!isMobileViewport()) {
        try {
          mobileDrawer.setAttribute('hidden', '');
          mobileBtn.setAttribute('aria-expanded', 'false');
          document.body.classList.remove('drawer-open');
          unlockViewport();
          if (mobileBackdrop) mobileBackdrop.setAttribute('hidden', '');
        } catch { }
        return;
      }
      const isHidden = mobileDrawer.hasAttribute('hidden');
      const shouldOpen = typeof open === 'boolean' ? open : isHidden;
      if (shouldOpen) {
        mobileDrawer.removeAttribute('hidden');
        mobileBtn.setAttribute('aria-expanded', 'true');
        try {
          const w = Math.round(mobileDrawer.getBoundingClientRect().width || 280);
          document.documentElement.style.setProperty('--drawer-offset', `${w}px`);
          document.body.classList.add('drawer-open');
          lockViewport();
        } catch { }
        if (mobileBackdrop) { mobileBackdrop.removeAttribute('hidden'); }
      } else {
        mobileDrawer.setAttribute('hidden', '');
        mobileBtn.setAttribute('aria-expanded', 'false');
        document.body.classList.remove('drawer-open');
        unlockViewport();
        if (mobileBackdrop) { mobileBackdrop.setAttribute('hidden', ''); }
      }
    };
    mobileBtn.addEventListener('click', () => {
      if (!isMobileViewport()) return;
      toggleDrawer();
    });
    if (mobileClose) mobileClose.addEventListener('click', () => toggleDrawer(false));
    mobileDrawer.addEventListener('click', (e) => {
      const link = e.target?.closest?.('a[href]');
      if (!link) return;
      const href = String(link.getAttribute('href') || '').trim();
      if (!href) return;
      if (!isMobileViewport()) return;
      e.preventDefault();
      toggleDrawer(false);
      let to = null;
      try { to = new URL(href, window.location.href); } catch { to = null; }
      if (!to) return;
      if (to.pathname === window.location.pathname && to.search === window.location.search) return;
      const goSoft = window.__employeeSoftNavigate;
      if (typeof goSoft === 'function') {
        goSoft(to.pathname + to.search + to.hash, true).then((ok) => {
          if (!ok) window.location.href = to.pathname + to.search + to.hash;
        }).catch(() => { window.location.href = to.pathname + to.search + to.hash; });
        return;
      }
      window.location.href = to.pathname + to.search + to.hash;
    });
    window.addEventListener('resize', () => {
      if (!isMobileViewport()) toggleDrawer(false);
    }, { passive: true });
    if (!isMobileViewport()) toggleDrawer(false);
    /* backdrop không đóng, chỉ nút X mới đóng */
  }
  try { wireExpandingSearch(); } catch { }
});

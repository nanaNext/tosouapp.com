import { fetchJSONAuth } from '/static/js/api/http.api.js';

document.addEventListener('DOMContentLoaded', function () {
  var ADMIN_HIDDEN_KEY = 'admin_notify_hidden_v1';
  var readHiddenIds = function () {
    try {
      var raw = localStorage.getItem(ADMIN_HIDDEN_KEY) || '[]';
      var arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return [];
      return arr.map(function (x) { return parseInt(String(x || '0'), 10) || 0; }).filter(function (x) { return !!x; });
    } catch { return []; }
  };
  var writeHiddenIds = function (arr) {
    try {
      var clean = Array.from(new Set((Array.isArray(arr) ? arr : []).map(function (x) { return parseInt(String(x || '0'), 10) || 0; }).filter(function (x) { return !!x; }))).slice(0, 2000);
      localStorage.setItem(ADMIN_HIDDEN_KEY, JSON.stringify(clean));
    } catch (e) { /* silently ignored */ }
  };
  var appendHiddenIds = function (ids) {
    var current = readHiddenIds();
    var merged = current.concat(Array.isArray(ids) ? ids : []);
    writeHiddenIds(merged);
  };
  try {
    if (!document.getElementById('adminNotifyStyle')) {
      var st = document.createElement('style');
      st.id = 'adminNotifyStyle';
      st.textContent = '.notify-btn{position:relative;min-width:44px;padding:0 10px}.notify-bell{font-size:16px;line-height:1}.notify-badge{position:absolute;top:-6px;right:-6px;min-width:18px;height:18px;padding:0 5px;border-radius:999px;background:#dc2626;color:#fff;font-size:11px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;border:2px solid #fff}.notify-badge[hidden]{display:none !important}.admin-notify-panel{position:fixed;top:56px;right:12px;width:360px;max-height:420px;overflow:auto;background:#fff;border:1px solid #dbe3f0;border-radius:10px;box-shadow:0 12px 36px rgba(15,23,42,.18);z-index:2147483646}.admin-notify-panel[hidden]{display:none}.admin-notify-head{display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-bottom:1px solid #eef2f7;font-weight:700;color:#0f172a}.admin-notify-summary{display:flex;flex-wrap:wrap;gap:6px;padding:8px 10px;border-bottom:1px solid #eef2f7;background:#f8fafc}.admin-notify-chip{display:inline-flex;align-items:center;gap:4px;border:1px solid #e2e8f0;background:#fff;border-radius:999px;padding:2px 8px;font-size:11px;color:#334155}.admin-notify-chip strong{color:#0f172a}.admin-notify-chip .unread{display:inline-flex;align-items:center;justify-content:center;min-width:16px;height:16px;padding:0 5px;border-radius:999px;background:#dc2626;color:#fff;font-size:10px;font-weight:700}.admin-notify-list{padding:6px}.admin-notify-row{display:flex;gap:8px;align-items:flex-start;padding:8px 10px;border-radius:8px;border:1px solid transparent}.admin-notify-row:hover{background:#f8fbff;border-color:#e5edf8}.admin-notify-row.is-unread{background:#eef6ff;border-color:#dbeafe}.admin-notify-item{display:block;flex:1;min-width:0;text-decoration:none;color:#0f172a}.admin-notify-count{display:inline-block;min-width:18px;padding:1px 6px;border-radius:999px;background:#dc2626;color:#fff;font-size:11px;font-weight:700;margin-left:6px;vertical-align:middle}.admin-notify-delete{border:1px solid #e2e8f0;background:#fff;color:#64748b;border-radius:6px;font-size:11px;line-height:1;padding:4px 6px;cursor:pointer}.admin-notify-delete:hover{border-color:#cbd5e1;color:#334155;background:#f8fafc}.admin-notify-meta{font-size:11px;color:#64748b}.admin-notify-title{font-size:13px;font-weight:700;color:#0f172a;margin:2px 0}.admin-notify-empty{padding:14px;color:#64748b;font-size:12px}';
      document.head.appendChild(st);
    }
  } catch (e) { /* silently ignored */ }

  try {
    var btn = document.getElementById('userBtnInitial');
    var dd = document.getElementById('userInitial');
    var nameEl = document.getElementById('userName');
    var userStr = sessionStorage.getItem('user') || localStorage.getItem('user') || '';
    var full = '';
    try { if (userStr) { var u = JSON.parse(userStr); full = (u && u.username) || (u && u.email) || ''; } } catch (e) { /* silently ignored */ }
    if (!full && nameEl && nameEl.textContent) full = nameEl.textContent.trim();
    var firstChar = function (s) { try { var t = String(s || '').trim(); if (!t) return ''; var arr = Array.from(t); return arr.length ? arr[0] : ''; } catch { return ''; } };
    var ch = firstChar(full);
    if (btn) { btn.textContent = ''; btn.setAttribute('data-initial', ch); }
    if (dd) { dd.textContent = ''; dd.setAttribute('data-initial', ch); }
    if (!ch) {
      fetch('/api/auth/me', { credentials: 'include', cache: 'no-store' }).then(function (r) { if (!r.ok) return null; return r.json(); })
        .then(function (p) {
          if (!p) return;
          try { sessionStorage.setItem('user', JSON.stringify(p)); } catch (e) { /* silently ignored */ }
          var full2 = (String(p.username || '').trim()) || (String(p.email || '').trim());
          var c = firstChar(full2);
          if (nameEl && full2 && !nameEl.textContent) nameEl.textContent = full2;
          if (btn) { btn.textContent = ''; btn.setAttribute('data-initial', c); }
          if (dd) { dd.textContent = ''; dd.setAttribute('data-initial', c); }
        }).catch(function () {});
      setTimeout(function () {
        try {
          var cur = nameEl && nameEl.textContent ? nameEl.textContent.trim() : '';
          var c2 = firstChar(cur);
          if (btn && !btn.getAttribute('data-initial')) { btn.textContent = ''; btn.setAttribute('data-initial', c2); }
          if (dd && !dd.getAttribute('data-initial')) { dd.textContent = ''; dd.setAttribute('data-initial', c2); }
        } catch (e) { /* silently ignored */ }
      }, 400);
    }
  } catch (e) { /* silently ignored */ }

  try {
    var notifyBtn = document.getElementById('btnAdminNotify');
    var notifyBadge = document.getElementById('adminNotifyBadge');
    if (notifyBtn) {
      var panel = document.createElement('div');
      panel.id = 'adminNotifyPanel';
      panel.className = 'admin-notify-panel';
      panel.setAttribute('hidden', '');
      panel.innerHTML = '<div class="admin-notify-head"><span>通知</span><span id="adminNotifyCountText">0件</span></div><div id="adminNotifySummary" class="admin-notify-summary"></div><div class="admin-notify-list" id="adminNotifyList"><div class="admin-notify-empty">読み込み中...</div></div>';
      document.body.appendChild(panel);

      var countText = panel.querySelector('#adminNotifyCountText');
      var summaryEl = panel.querySelector('#adminNotifySummary');
      var listEl = panel.querySelector('#adminNotifyList');
      var pollTimer = null;
      var setHeadCount = function (unread, total) {
        if (!countText) return;
        var u = Number(unread || 0);
        var t = Number(total || 0);
        if (u > 0) {
          countText.innerHTML = '未読 <span style="display:inline-flex;align-items:center;justify-content:center;min-width:18px;height:18px;padding:0 6px;border-radius:999px;background:#dc2626;color:#fff;font-size:11px;font-weight:700;">' + esc(u) + '</span> / 全' + esc(t) + '件';
          return;
        }
        countText.textContent = '未読 0 / 全' + String(t) + '件';
      };
      var positionPanel = function () {
        try {
          var rect = notifyBtn.getBoundingClientRect();
          var top = Math.max(8, Math.round(rect.bottom + 8));
          var right = Math.max(8, Math.round(window.innerWidth - rect.right));
          panel.style.top = String(top) + 'px';
          panel.style.right = String(right) + 'px';
        } catch (e) { /* silently ignored */ }
      };

      var fmtTime = function (v) {
        try {
          var d = new Date(v);
          if (!isFinite(d.getTime())) return '';
          var mm = String(d.getMonth() + 1).padStart(2, '0');
          var dd = String(d.getDate()).padStart(2, '0');
          var hh = String(d.getHours()).padStart(2, '0');
          var mi = String(d.getMinutes()).padStart(2, '0');
          return mm + '/' + dd + ' ' + hh + ':' + mi;
        } catch { return ''; }
      };
      var esc = function (s) {
        return String(s || '').replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
      };
      var getCategory = function (it) {
        var k = String(it && it.kind || '').toLowerCase();
        var t = String(it && it.title || '').toLowerCase();
        if (k.indexOf('expense') >= 0 || t.indexOf('交通費') >= 0) return '交通費';
        if (k.indexOf('leave') >= 0 || t.indexOf('有休') >= 0 || t.indexOf('休暇') >= 0) return '有休';
        if (k.indexOf('adjust') >= 0 || t.indexOf('時間修正') >= 0) return '時間修正';
        if (k.indexOf('faq') >= 0 || t.indexOf('faq') >= 0 || t.indexOf('質問') >= 0) return 'FAQ';
        if (k.indexOf('attendance_punch') >= 0 || t.indexOf('打刻通知') >= 0) return '打刻通知';
        if (k.indexOf('attendance') >= 0 || t.indexOf('勤怠') >= 0 || k === 'employee_action') return '勤怠/操作';
        return 'その他';
      };
      var shouldHideAdminBellItem = function (it) {
        var rawMsg = String(it && it.message || '').trim();
        var rawTitle = String(it && it.title || '').trim();
        var rawKind = String(it && it.kind || '').toLowerCase();
        // Employee-targeted result notices must not appear in admin bell.
        return ((/交通費申請/.test(rawMsg) || /交通費/.test(rawTitle) || rawKind.indexOf('expense') >= 0)
          && /(承認されました|差戻しされました|却下されました)/.test(rawMsg));
      };
      var groupItems = function (items) {
        var map = new Map();
        (Array.isArray(items) ? items : []).forEach(function (it) {
          if (shouldHideAdminBellItem(it)) return;
          var rawMsg = String(it && it.message || '').trim();
          var link = String(it && it.linkUrl || '').trim() || '/admin/dashboard';
          var title = String(it && it.title || '').trim() || '通知';
          var msg = rawMsg;
          var category = getCategory(it);
          var key = [category, title, link].join('|');
          if (category === '打刻通知') {
             key = [category, title, msg, link].join('|');
          }
          if (!map.has(key)) {
            map.set(key, {
              category: category,
              title: title,
              message: msg,
              linkUrl: link,
              createdAt: it && it.createdAt,
              ids: [],
              count: 0,
              unread: 0
            });
          }
          var g = map.get(key);
          var id = parseInt(String(it && it.id || '0'), 10) || 0;
          if (id) g.ids.push(id);
          g.count += 1;
          if (it && it.isRead === false) g.unread += 1;
          if (!g.createdAt || (new Date(it && it.createdAt).getTime() > new Date(g.createdAt).getTime())) g.createdAt = it && it.createdAt;
          if (!g.message && msg) g.message = msg;
        });
        return Array.from(map.values()).sort(function (a, b) {
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        });
      };
      var renderSummary = function (groups) {
        if (!summaryEl) return;
        var byCat = {};
        (groups || []).forEach(function (g) {
          if (!byCat[g.category]) byCat[g.category] = { total: 0, unread: 0 };
          byCat[g.category].total += Number(g.count || 0);
          byCat[g.category].unread += Number(g.unread || 0);
        });
        var entries = Object.keys(byCat).map(function (k) {
          return { name: k, total: byCat[k].total, unread: byCat[k].unread };
        });
        // Summary badges should only reflect unread counts.
        entries = entries.filter(function (e) { return Number(e.unread || 0) > 0; });
        entries.sort(function (a, b) { return Number(b.unread || 0) - Number(a.unread || 0); });
        if (!entries.length) {
          summaryEl.innerHTML = '<span class="admin-notify-chip">通知なし</span>';
          return;
        }
        // If only one category exists, hide summary chips to avoid duplicated count feeling.
        if (entries.length <= 1) {
          summaryEl.innerHTML = '';
          return;
        }
        summaryEl.innerHTML = entries.map(function (e) {
          return '<span class="admin-notify-chip">' + esc(e.name) + ' <span class="unread">' + esc(e.unread) + '</span></span>';
        }).join('');
      };
      var toItemHtml = function (it) {
        var link = String(it && it.linkUrl || '').trim() || '/admin/dashboard';
        if (link === '/admin/faq' || link.indexOf('/admin/chatbot/faq') === 0) link = '/admin/chatbot/faq';
        if (link === '/admin-attendance-adjust-requests.html') link = '/admin/attendance/adjust-requests';
        var title = String(it && it.title || '').trim() || '通知';
        var msg = String(it && it.message || '').trim();
        var rowCls = 'admin-notify-row' + ((Number(it && it.unread || 0) > 0) ? ' is-unread' : '');
        var idsCsv = Array.isArray(it && it.ids) ? it.ids.join(',') : '';
        var unreadCount = Number(it && it.unread || 0);
        // Always show unread badge inside panel (including "1") for quick visibility.
        var countHtml = unreadCount > 0 ? ('<span class="admin-notify-count">' + esc(unreadCount) + '</span>') : '';
        return '<div class="' + rowCls + '" data-notice-row="' + esc(idsCsv) + '">' +
          '<a class="admin-notify-item" href="' + esc(link) + '" data-notice-ids="' + esc(idsCsv) + '">' +
            '<div class="admin-notify-meta">' + esc(it && it.category || '') + ' ・ ' + esc(fmtTime(it && it.createdAt)) + '</div>' +
            '<div class="admin-notify-title">' + esc(title) + countHtml + '</div>' +
            (msg ? ('<div class="admin-notify-meta">' + esc(msg) + '</div>') : '') +
          '</a>' +
          (idsCsv ? ('<button type="button" class="admin-notify-delete" data-notice-delete-ids="' + esc(idsCsv) + '" aria-label="delete">削除</button>') : '') +
        '</div>';
      };

      var markRead = function (ids) {
        var arr = Array.isArray(ids) ? ids : [];
        if (!arr.length) return Promise.resolve();
        var csrf = getCookie('csrfToken');
        var headers = Object.assign({ 'Content-Type': 'application/json' }, (csrf ? { 'X-CSRF-Token': csrf } : {}));
        return fetch('/api/admin/notifications/read', {
          method: 'POST',
          keepalive: true,
          credentials: 'include',
          headers: headers,
          body: JSON.stringify({ ids: arr })
        }).catch(function () {});
      };
      var getCookie = function (name) {
        try {
          var m = document.cookie.match(new RegExp('(^| )' + String(name || '') + '=([^;]+)'));
          return m ? decodeURIComponent(m[2]) : '';
        } catch {
          return '';
        }
      };
      var deleteNotice = function (id) {
        var nid = parseInt(String(id || '0'), 10) || 0;
        if (!nid) return Promise.resolve();
        var csrf = getCookie('csrfToken');
        var headers = Object.assign({ 'Content-Type': 'application/json' }, (csrf ? { 'X-CSRF-Token': csrf } : {}));
        return fetch('/api/notices/hide', {
          method: 'POST',
          credentials: 'include',
          headers: headers,
          body: JSON.stringify({ ids: [nid] })
        }).then(function (r) {
          if (r && r.ok) return;
          // Backward compatibility for old server snapshots.
          return fetch('/api/admin/notifications/hide', {
            method: 'POST',
            credentials: 'include',
            headers: headers,
            body: JSON.stringify({ ids: [nid] })
          }).then(function (r2) {
            if (r2 && r2.ok) return;
            return fetch('/api/notices/admin/' + nid, {
              method: 'DELETE',
              credentials: 'include',
              headers: csrf ? { 'X-CSRF-Token': csrf } : {}
            }).then(function (r3) {
              if (!r3 || !r3.ok) {
                var code = (r3 && r3.status) ? r3.status : ((r2 && r2.status) ? r2.status : ((r && r.status) ? r.status : 0));
                throw new Error(code ? ('HTTP ' + code) : 'DELETE failed');
              }
            });
          });
        });
      };

      var render = function (data) {
        var unreadTotal = Number(data && data.unread || 0);
        var totalAll = Number(data && data.total || 0);
        var badgeCount = unreadTotal;
        if (notifyBadge) {
          if (badgeCount > 0) {
            notifyBadge.hidden = false;
            notifyBadge.textContent = String(badgeCount > 99 ? '99+' : badgeCount);
          } else {
            notifyBadge.hidden = true;
            notifyBadge.textContent = '0';
          }
        }
        setHeadCount(unreadTotal, totalAll);
        var items = Array.isArray(data && data.items) ? data.items : [];
        var hiddenSet = new Set(readHiddenIds());
        items = items.filter(function (it) {
          var idv = parseInt(String(it && it.id || '0'), 10) || 0;
          if (hiddenSet.has(idv)) return false;
          if (shouldHideAdminBellItem(it)) return false;
          // Ẩn luôn thông báo đã đọc khỏi danh sách thả xuống
          if (it.isRead === true) return false;
          return true;
        });
        unreadTotal = items.reduce(function (s, it) { return s + ((it && it.isRead === false) ? 1 : 0); }, 0);
        totalAll = items.length;
        if (notifyBadge) {
          if (unreadTotal > 0) {
            notifyBadge.hidden = false;
            notifyBadge.textContent = String(unreadTotal > 99 ? '99+' : unreadTotal);
          } else {
            notifyBadge.hidden = true;
            notifyBadge.textContent = '0';
          }
        }
        setHeadCount(unreadTotal, totalAll);
        var groups = groupItems(items);
        renderSummary(groups);
        if (!listEl) return;
        if (!groups.length) {
          listEl.innerHTML = '<div class="admin-notify-empty">新しい通知はありません</div>';
          return;
        }
        listEl.innerHTML = groups.map(toItemHtml).join('');
      };
      var renderFromSummary = function (data) {
        var items0 = Array.isArray(data && data.items) ? data.items : [];
        var items = items0.filter(function (it) {
          var t = String(it && it.type || '');
          return t === 'leave' || t === 'adjust' || t === 'expense';
        });
        var total = Number(items.length || 0);
        if (notifyBadge) {
          if (total > 0) {
            notifyBadge.hidden = false;
            notifyBadge.textContent = String(total > 99 ? '99+' : total);
          } else {
            notifyBadge.hidden = true;
            notifyBadge.textContent = '0';
          }
        }
        setHeadCount(total, total);
        if (!items.length) {
          if (summaryEl) summaryEl.innerHTML = '<span class="admin-notify-chip">通知なし</span>';
          listEl.innerHTML = '<div class="admin-notify-empty">新しい通知はありません</div>';
          return;
        }
        if (summaryEl) summaryEl.innerHTML = '<span class="admin-notify-chip">申請通知</span>';
        listEl.innerHTML = items.map(function (it) {
          var link = '/admin/dashboard';
          var title = '通知';
          var type = String(it && it.type || '');
          if (type === 'leave') { link = '/admin/leave/requests'; title = '有休申請: ' + String(it.username || ''); }
          else if (type === 'adjust') { link = '/admin-attendance-adjust-requests.html'; title = '時間修正: ' + String(it.username || ''); }
          else if (type === 'expense') { link = '/admin/expenses'; title = '交通費申請: ' + String(it.username || ''); }
          if (link === '/admin/faq' || link.indexOf('/admin/chatbot/faq') === 0) link = '/admin/chatbot/faq';
          return '<a class="admin-notify-item is-unread" href="' + esc(link) + '"><div class="admin-notify-meta">' + esc(fmtTime(it && it.createdAt)) + '</div><div class="admin-notify-title">' + esc(title) + '</div></a>';
        }).join('');
      };

      var load = function () {
        // Prevent employee users from hitting 403 when topbar loads on their pages
        var rawUser = localStorage.getItem('user') || sessionStorage.getItem('user') || '{}';
        var userRole = '';
        try { 
          var u = JSON.parse(rawUser); 
          userRole = String(u.role || '').toLowerCase(); 
        } catch(e) {}
        
        if (userRole && userRole !== 'admin' && userRole !== 'manager') {
          if (notifyBadge) notifyBadge.hidden = true;
          return;
        }

        // Add additional check for standalone app routes where user might not be available in localStorage
        if (window.location.pathname.includes('attendance/holidays') || window.location.pathname.includes('attendance?standalone=1')) {
          return;
        }

        fetchJSONAuth('/api/admin/notifications/feed?limit=100', { cache: 'no-store' })
          .then(function (d) { render(d || {}); })
          .catch(function () {
            fetchJSONAuth('/api/admin/notifications/summary', { cache: 'no-store' })
              .then(function (d) { renderFromSummary(d || {}); })
              .catch(function () {
                if (listEl && !listEl.children.length) { listEl.innerHTML = '<div class="admin-notify-empty">通知の取得に失敗しました</div>'; }
              });
          });
      };

      var closePanel = function () {
        panel.setAttribute('hidden', '');
        notifyBtn.setAttribute('aria-expanded', 'false');
      };
      var shouldKeepOpen = function (target) {
        try {
          if (!target || !target.closest) return false;
          return !!(target.closest('#adminNotifyPanel') || target.closest('#btnAdminNotify'));
        } catch {
          return false;
        }
      };
      notifyBtn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var isHidden = panel.hasAttribute('hidden');
        if (isHidden) {
          positionPanel();
          panel.removeAttribute('hidden');
          notifyBtn.setAttribute('aria-expanded', 'true');
          load();
        } else {
          closePanel();
        }
      });
      listEl.addEventListener('click', function (e) {
        var delBtn = e && e.target && e.target.closest ? e.target.closest('[data-notice-delete-ids]') : null;
        if (delBtn) {
          e.preventDefault();
          e.stopPropagation();
          if (e.stopImmediatePropagation) e.stopImmediatePropagation();
          var dCsv = String(delBtn.getAttribute('data-notice-delete-ids') || '');
          var idsToDelete = dCsv.split(',').map(function (x) { return parseInt(String(x || '0'), 10) || 0; }).filter(function (x) { return !!x; });
          if (!idsToDelete.length) return;
          appendHiddenIds(idsToDelete);
          var rowToRemove = delBtn.closest ? delBtn.closest('.admin-notify-row') : null;
          if (rowToRemove && rowToRemove.parentNode) rowToRemove.parentNode.removeChild(rowToRemove);
          Promise.all(idsToDelete.map(function (idv) { return deleteNotice(idv); }))
            .then(function () { load(); })
            .catch(function (err) {
              try { window.alert('削除に失敗しました: ' + String((err && err.message) ? err.message : 'unknown')); } catch (e) { /* silently ignored */ }
              load();
            });
          return;
        }
        var a = e && e.target && e.target.closest ? e.target.closest('a[data-notice-ids]') : null;
        if (!a) return;
        var csv = String(a.getAttribute('data-notice-ids') || '');
        var ids = csv.split(',').map(function (x) { return parseInt(String(x || '0'), 10) || 0; }).filter(function (x) { return !!x; });
        var row = a.closest ? a.closest('.admin-notify-row') : null;
        if (row && row.classList && row.classList.contains('is-unread')) row.classList.remove('is-unread');
        if (ids.length) {
          markRead(ids).finally(function () { setTimeout(load, 80); });
        }
        closePanel();
        // Let native anchor navigation happen for maximum reliability.
      });
      // Use capture phase so panel closes even if other handlers stop propagation.
      document.addEventListener('click', function (e) {
        var t = e && e.target;
        if (shouldKeepOpen(t)) return;
        closePanel();
      }, true);
      document.addEventListener('pointerdown', function (e) {
        var t = e && e.target;
        if (shouldKeepOpen(t)) return;
        closePanel();
      }, true);
      // Close when route/page context changes.
      window.addEventListener('popstate', closePanel);
      window.addEventListener('hashchange', closePanel);
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closePanel(); });
      document.addEventListener('visibilitychange', function () { if (!document.hidden) load(); else closePanel(); });
      window.addEventListener('resize', positionPanel);
      window.addEventListener('scroll', positionPanel, { passive: true });
      load();
      pollTimer = setInterval(load, 30000);
      window.addEventListener('beforeunload', function () { try { clearInterval(pollTimer); } catch (e) { /* silently ignored */ } });
    }
  } catch (e) { /* silently ignored */ }
});

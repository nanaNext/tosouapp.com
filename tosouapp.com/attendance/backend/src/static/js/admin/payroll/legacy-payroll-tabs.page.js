import { delegate } from '../_shared/dom.js';
import { api, downloadWithAuth } from '../../shared/api/client.js';
// cái này dùng để ensure payroll nav style được tạo ra trước khi mount payroll tabs

function normalizeUsers(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.rows)) return payload.rows;
  return [];
}

function ensurePayrollNavStyle() {
  try {
    if (document.getElementById('payrollNavStyle')) return;
    const st = document.createElement('style');
    st.id = 'payrollNavStyle';
    st.textContent = `
      .pe-nav{display:flex;gap:24px;margin:-16px 0 12px 0;border-bottom:1px solid #e5e7eb;padding:0 16px}
      .pe-nav a{display:inline-flex;align-items:center;padding:8px 0;border-bottom:2px solid transparent;background:none;color:#6b7280;font-weight:600;font-size:14px;text-decoration:none;transition:all 0.2s;margin-bottom:-1px}
      .pe-nav a:hover{color:#374151}
      .pe-nav a.active{color:#2563eb;border-bottom-color:#2563eb}
    `;
    document.head.appendChild(st);
  } catch (e) { /* silently ignored */ }
}

function tabHref(tab) {
  const p = String(window.location.pathname || '');
  const base = p.startsWith('/admin/payroll') ? p : '/ui/admin';
  return `${base}?tab=${encodeURIComponent(String(tab || ''))}`;
}

function formatEmployeeCode(u) {
  return String((u && (u.employee_code || u.employeeCode || ('EMP' + String(u.id).padStart(3, '0')))) || '').trim();
}

function mountNav(activeTab) {
  const nav = document.createElement('div');
  nav.className = 'pe-nav';
  nav.innerHTML = `
    <a class="${activeTab === 'salary_list' ? 'active' : ''}" href="${tabHref('salary_list')}">給与一覧</a>
    <a class="${activeTab === 'salary_calc' ? 'active' : ''}" href="${tabHref('salary_calc')}">給与計算</a>
    <a class="${activeTab === 'payroll_editor' ? 'active' : ''}" href="${tabHref('payroll_editor')}">給与入力</a>
    <a class="${activeTab === 'salary_send' ? 'active' : ''}" href="${tabHref('salary_send')}">送信・履歴</a>
  `;
  return nav;
}

export async function mountSalaryList({ content }) {
  if (!content) return;
  content.innerHTML = '<h3>給与一覧</h3>';
  ensurePayrollNavStyle();
  content.appendChild(mountNav('salary_list'));

  const form = document.createElement('form');
  form.innerHTML = `
    <input id="salUserId" type="number" placeholder="userId(任意)">
    <input id="salMonth" placeholder="YYYY-MM(任意)">
    <button type="submit">表示</button>
  `;
  const result = document.createElement('div');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const userId = document.querySelector('#salUserId').value.trim();
    const month = document.querySelector('#salMonth').value.trim();
    const qs = [];
    if (userId) qs.push(`userId=${encodeURIComponent(userId)}`);
    if (month) qs.push(`month=${encodeURIComponent(month)}`);
    const r = await api.get(`/api/admin/salary/history${qs.length ? '?' + qs.join('&') : ''}`);
    result.innerHTML = '';
    const table = document.createElement('table');
    table.style.width = '100%';
    table.innerHTML = '<thead><tr><th>ID</th><th>User</th><th>Month</th><th>Created</th></tr></thead>';
    const tbody = document.createElement('tbody');
    for (const row of ((r && Array.isArray(r.data)) ? r.data : [])) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${row.id}</td><td>${row.userId}</td><td>${row.month}</td><td>${row.created_at}</td>`;
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    result.appendChild(table);
  });
  content.appendChild(form);
  content.appendChild(result);
}

export async function mountSalaryCalc({ content, listUsers }) {
  if (!content) return;
  content.innerHTML = '<h3>給与計算</h3>';
  ensurePayrollNavStyle();
  content.appendChild(mountNav('salary_calc'));

  const users = normalizeUsers(await listUsers());
  const sel = document.createElement('select');
  sel.id = 'salaryUserIds';
  sel.multiple = true;
  sel.style.minWidth = '280px';
  for (const u of users) {
    const role = String(u.role || '').toLowerCase();
    if (role === 'admin' || role === 'manager') continue;
    const opt = document.createElement('option');
    opt.value = String(u.id);
    const code = formatEmployeeCode(u);
    opt.textContent = `${code} ${u.username || u.email}`.trim();
    sel.appendChild(opt);
  }
  const form = document.createElement('form');
  form.innerHTML = `
    <input id="salaryMonth" placeholder="YYYY-MM">
    <button type="submit">プレビュー</button>
    <button type="button" data-action="close-month">月締め</button>
    <button type="button" data-action="export-csv">CSV</button>
  `;
  content.appendChild(sel);
  content.appendChild(form);
  const result = document.createElement('div');
  content.appendChild(result);

  function getSelectedIds() {
    return Array.from(sel.selectedOptions).map(o => o.value);
  }
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const ids = getSelectedIds();
    const month = document.querySelector('#salaryMonth').value.trim();
    if (!ids.length || !month) return alert('ユーザーと月を選択');
    const r = await api.get(`/api/admin/salary?userIds=${encodeURIComponent(ids.join(','))}&month=${encodeURIComponent(month)}`);
    result.innerHTML = '';
    const table = document.createElement('table');
    table.style.width = '100%';
    table.innerHTML = '<thead><tr><th>User</th><th>氏名</th><th>月</th><th>総支給額</th><th>差引支給額</th></tr></thead>';
    const tbody = document.createElement('tbody');
    for (const e1 of ((r && Array.isArray(r.employees)) ? r.employees : [])) {
      const tr = document.createElement('tr');
      const totals = (e1 && e1['合計'] && typeof e1['合計'] === 'object') ? e1['合計'] : {};
      tr.innerHTML = `<td>${e1.userId}</td><td>${e1.氏名 || ''}</td><td>${e1.対象年月}</td><td>${totals['総支給額'] || 0}</td><td>${totals['差引支給額'] || 0}</td>`;
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    result.appendChild(table);
    result.dataset.csv = JSON.stringify((r && Array.isArray(r.employees)) ? r.employees : []);
  });
  delegate(form, 'button[data-action]', 'click', async (_e, btn) => {
    const action = btn.dataset.action || '';
    if (action === 'close-month') {
      const ids = getSelectedIds();
      const month = document.querySelector('#salaryMonth').value.trim();
      if (!ids.length || !month) return alert('ユーザーと月を選択');
      const r = await api.post('/api/admin/salary/close-month', { userIds: ids.join(','), month });
      alert(`締め処理: ${r.closed} 件`);
      return;
    }
    if (action === 'export-csv') {
      try {
        const arr = JSON.parse(result.dataset.csv || '[]');
        let csv = 'userId,name,month,total_gross,total_net\n';
        for (const e1 of arr) {
          const totals = (e1 && e1['合計'] && typeof e1['合計'] === 'object') ? e1['合計'] : {};
          csv += `${e1.userId},${e1.氏名 || ''},${e1.対象年月},${totals['総支給額'] || 0},${totals['差引支給額'] || 0}\n`;
        }
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'salary.csv';
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } catch (e) { /* silently ignored */ }
    }
  });
}

export async function mountPayslipSend({ content, listUsers }) {
  if (!content) return;
  
  ensurePayrollNavStyle();
  content.innerHTML = '';
  // Removed top nav per user request: content.appendChild(mountNav('salary_send'));

  (function mountLocalStyle(){
    if (document.getElementById('payslipHistoryStyle')) return;
    const st = document.createElement('style');
    st.id = 'payslipHistoryStyle';
    st.textContent = `
      .ps-table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:14px}
      .ps-table th,.ps-table td{padding:12px 16px;border-bottom:1px solid #e5e7eb;text-align:left;vertical-align:middle;color:#111827}
      .ps-table thead th{background:#ffffff;color:#6b7280;font-weight:600;font-size:12px;border-bottom:2px solid #e5e7eb}
      .ps-table tbody tr:hover td{background:#f9fafb}
      .ps-table tbody tr:last-child td{border-bottom:none}
      .ps-col-user{width:25%}
      .ps-col-month{width:12%}
      .ps-col-file{width:30%}
      .ps-col-sender{width:15%}
      .ps-col-time{width:18%}
      .ps-col-count{width:20%}
      .btn-neutral{display:inline-flex;align-items:center;justify-content:center;padding:4px 12px;border:1px solid #d1d5db;background:#ffffff;color:#374151;border-radius:4px;font-size:13px;font-weight:500;cursor:pointer;transition:all 0.2s;min-height:28px}
      .btn-neutral:hover{background:#f3f4f6;border-color:#9ca3af}
      .btn-danger{color:#dc2626;background:#fef2f2;border-color:#fecaca}
      .btn-danger:hover{background:#fee2e2;border-color:#fca5a5}
      .ps-card{background:transparent;border:none;border-radius:0;box-shadow:none;padding:0;margin-bottom:12px}
      .ps-header{display:none}
      .ps-filter{display:flex;gap:12px;align-items:center;margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid #f3f4f6}
      .ps-input{height:32px;padding:4px 12px;border:1px solid #d1d5db;border-radius:4px;font-size:14px;color:#111827}
      .ps-input:focus{outline:none;border-color:#2563eb;box-shadow:0 0 0 1px rgba(37,99,235,0.2)}
      details > summary { list-style: none; display: flex; align-items: center; gap: 8px; }
      details > summary::-webkit-details-marker { display: none; }
      details > summary::before { content: '▸'; display: inline-block; transition: transform 0.2s; font-size: 12px; color: #6b7280; }
      details[open] > summary::before { transform: rotate(90deg); }
      .ps-tabs { display: flex; gap: 24px; border-bottom: 1px solid #e5e7eb; margin-bottom: 16px; }
      .ps-tab { padding: 8px 0; font-size: 14px; font-weight: 600; color: #6b7280; cursor: pointer; border-bottom: 2px solid transparent; transition: all 0.2s; background: transparent; border-top: none; border-left: none; border-right: none; margin-bottom: -1px; }
      .ps-tab:hover { color: #374151; }
      .ps-tab.active { color: #2563eb; border-bottom-color: #2563eb; }
    `;
    document.head.appendChild(st);
  })();

  const info = document.createElement('div');
  info.className = 'ps-card';
  info.style.display = 'flex';
  info.style.justifyContent = 'flex-end';
  info.innerHTML = `
    <div class="ps-filter" style="margin-top: 0px; margin-bottom: 0px; padding-bottom: 0px; border-bottom: none;">
      <label style="font-size:14px;font-weight:500;color:#374151">対象年間</label>
      <input id="psMonth" type="month" class="ps-input">
      <button id="psClear" type="button" class="btn-neutral" title="クリア" style="padding: 4px 8px;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
    </div>
  `;
  content.appendChild(info);

  // --- Sub-Tabs for Send/History page ---
  const subNav = document.createElement('div');
  subNav.className = 'ps-tabs';
  subNav.innerHTML = `
    <button type="button" class="ps-tab active" data-subtab="summary">月別サマリー</button>
    <button type="button" class="ps-tab" data-subtab="deliveries">配信履歴</button>
    <button type="button" class="ps-tab" data-subtab="files">PDF作成履歴</button>
  `;
  content.appendChild(subNav);

  const monthsCard = document.createElement('div');
  monthsCard.className = 'ps-card';
  monthsCard.style.padding = '0';
  monthsCard.style.display = 'block'; // active by default
  monthsCard.innerHTML = `
    <div id="monthsHost" style="overflow-x:auto">
      <table class="ps-table">
        <thead>
          <tr>
            <th class="ps-col-month">月</th>
            <th class="ps-col-count">配信人数</th>
            <th class="ps-col-count">PDF作成人数</th>
          </tr>
        </thead>
        <tbody id="monthsBody"></tbody>
      </table>
    </div>
  `;
  content.appendChild(monthsCard);

  const delivCard = document.createElement('div');
  delivCard.className = 'ps-card';
  delivCard.style.padding = '0';
  delivCard.style.display = 'none';
  delivCard.innerHTML = `
    <div id="delivBox" style="overflow-x:auto"></div>
  `;
  content.appendChild(delivCard);

  const filesCard = document.createElement('div');
  filesCard.className = 'ps-card';
  filesCard.style.padding = '0';
  filesCard.style.display = 'none';
  filesCard.innerHTML = `
    <div id="fileBox" style="overflow-x:auto"></div>
  `;
  content.appendChild(filesCard);

  // Tab switching logic
  subNav.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      subNav.querySelectorAll('button').forEach(x => x.classList.remove('active'));
      btn.classList.add('active');
      const tab = btn.dataset.subtab;
      monthsCard.style.display = tab === 'summary' ? 'block' : 'none';
      delivCard.style.display = tab === 'deliveries' ? 'block' : 'none';
      filesCard.style.display = tab === 'files' ? 'block' : 'none';
    });
  });

  let selectedMonth = '';
  async function loadHistory() {
    const delivBox = delivCard.querySelector('#delivBox');
    const fileBox = filesCard.querySelector('#fileBox');
    if (delivBox) delivBox.textContent = '読み込み中...';
    if (fileBox) fileBox.textContent = '読み込み中...';
    try {
      const qs = selectedMonth ? `?month=${encodeURIComponent(selectedMonth)}` : '';
      const d = await api.get(`/api/admin/salary/deliveries${qs}`);
      const f = await api.get(`/api/admin/salary/files${qs}`);
      if (delivBox) {
        const items = Array.isArray(d?.items) ? d.items : [];
        const t = document.createElement('table');
        t.className = 'ps-table';
        t.innerHTML = '<thead><tr><th class="ps-col-user">User</th><th class="ps-col-month">月</th><th class="ps-col-file">ファイル</th><th class="ps-col-sender">送信者</th><th class="ps-col-time">送信日時</th><th style="width:12%">アクション</th></tr></thead>';
        const tb = document.createElement('tbody');
        items.forEach(it => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td>${it.userId} ${it.userName || ''}</td>
            <td>${it.month}</td>
            <td>${it.fileId ? `<a href="#" data-dl-file-id="${it.fileId}" data-file-name="${(it.fileName || '').replace(/"/g,'')}">${it.fileName || ''}</a>` : (it.fileName || '')}</td>
            <td>${it.senderName || it.sentBy || ''}</td>
            <td>${it.sentAt || ''}</td>
            <td style="white-space:nowrap;display:flex;gap:8px;">
            <button class="btn-neutral" data-act="unpublish" data-user="${it.userId}" data-month="${it.month}">取消公開</button>
            <button class="btn-neutral btn-danger" data-act="del-delivery" data-id="${it.id}">削除</button>
          </td>`;
          tb.appendChild(tr);
        });
        t.appendChild(tb);
        delivBox.innerHTML = '';
        delivBox.appendChild(t);
        delivBox.querySelectorAll('a[data-dl-file-id]').forEach(a => {
          a.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            const id = e.currentTarget.dataset.dlFileId;
            const name = e.currentTarget.dataset.fileName || 'payslip.pdf';
            try { await downloadWithAuth(`/api/payslips/admin/file/${encodeURIComponent(id)}`, name); }
            catch (err) { alert('ダウンロードに失敗しました: ' + (err?.message || 'unknown')); }
          });
        });
        delivBox.querySelectorAll('button.btn-neutral').forEach(btn => {
          btn.addEventListener('click', async (e) => {
            const b = e.currentTarget;
            const act = b.dataset.act;
            if (act === 'unpublish') {
              const userId = b.dataset.user;
              const month = b.dataset.month;
              if (!confirm(`「${month}」の公開を取り消しますか？`)) return;
              try {
                await api.post('/api/admin/salary/publish', { userId, month, is_published: false });
                await loadHistory();
                await refreshMonthSummary();
              } catch (err) {
                alert('取消公開に失敗しました: ' + (err?.message || 'unknown'));
              }
              } else if (act === 'del-delivery') {
              const id = b.dataset.id;
              if (!confirm('配信履歴を削除しますか？')) return;
              try {
                await api.del(`/api/admin/salary/deliveries/${encodeURIComponent(id)}`);
                await loadHistory();
                await refreshMonthSummary();
              } catch (err) {
                alert('削除に失敗しました: ' + (err?.message || 'unknown'));
              }
            }
          });
        });
      }
      if (fileBox) {
        const items = Array.isArray(f?.items) ? f.items : [];
        const t = document.createElement('table');
        t.className = 'ps-table';
        t.innerHTML = '<thead><tr><th class="ps-col-user">User</th><th class="ps-col-month">月</th><th class="ps-col-file">ファイル</th><th class="ps-col-sender">作成者</th><th class="ps-col-time">作成日時</th><th style="width:12%">アクション</th></tr></thead>';
        const tb = document.createElement('tbody');
        items.forEach(it => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td>${it.userId} ${it.userName || ''}</td>
            <td>${it.month}</td>
            <td>${it.fileId ? `<a href="#" data-dl-file-id="${it.fileId}" data-file-name="${(it.fileName || '').replace(/"/g,'')}">${it.fileName || ''}</a>` : (it.fileName || '')}</td>
            <td>${it.creatorName || it.createdBy || ''}</td>
            <td>${it.createdAt || ''}</td>
            <td style="white-space:nowrap;display:flex;gap:8px;">
              <button class="btn-neutral btn-danger" data-act="del-file" data-id="${it.id}">削除</button>
            </td>`;
          tb.appendChild(tr);
        });
        t.appendChild(tb);
        fileBox.innerHTML = '';
        fileBox.appendChild(t);
        fileBox.querySelectorAll('a[data-dl-file-id]').forEach(a => {
          a.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            const id = e.currentTarget.dataset.dlFileId;
            const name = e.currentTarget.dataset.fileName || 'payslip.pdf';
            try { await downloadWithAuth(`/api/payslips/admin/file/${encodeURIComponent(id)}`, name); }
            catch (err) { alert('ダウンロードに失敗しました: ' + (err?.message || 'unknown')); }
          });
        });
        fileBox.querySelectorAll('button.btn-neutral').forEach(btn => {
          btn.addEventListener('click', async (e) => {
            const id = e.currentTarget.dataset.id;
            const reason = prompt('削除理由を入力してください');
            if (reason == null) return;
            try {
              await api.del(`/api/payslips/admin/${encodeURIComponent(id)}`, { body: JSON.stringify({ reason }) });
              await loadHistory();
              await refreshMonthSummary();
            } catch (err) {
              alert('削除に失敗しました: ' + (err?.message || 'unknown'));
            }
          });
        });
      }
    } catch (e) {
      const msg = String(e?.message || '読み込み失敗');
      try { console.error('payslip history load error:', e); } catch (e) { /* silently ignored */ }
      if (delivBox) delivBox.textContent = `読み込み失敗: ${msg}`;
      if (fileBox) fileBox.textContent = `読み込み失敗: ${msg}`;
    }
  }
  setTimeout(loadHistory, 0);
  async function refreshMonthSummary() {
    const host = monthsCard.querySelector('#monthsBody');
    if (!host) return;
    host.innerHTML = `<tr><td style="padding:10px 12px" colspan="3">読み込み中…</td></tr>`;
    try {
      const d = await api.get(`/api/admin/salary/deliveries`);
      const f = await api.get(`/api/admin/salary/files`);
      const map = new Map();
      const add = (m, k) => {
        if (!m) return;
        if (!map.has(m)) map.set(m, { deliv: new Set(), files: new Set() });
        map.get(m)[k].add(true);
      };
      (Array.isArray(d?.items) ? d.items : []).forEach(it => add(String(it.month || ''), 'deliv'));
      (Array.isArray(f?.items) ? f.items : []).forEach(it => add(String(it.month || ''), 'files'));
      const months = Array.from(map.keys()).sort((a,b) => a.localeCompare(b));
      host.innerHTML = months.map(m => {
        const v = map.get(m);
        const delivCnt = v.deliv.size;
        const fileCnt = v.files.size;
        const active = selectedMonth === m;
        return `
          <tr data-month="${m}" style="cursor:pointer;${active ? 'background:#eef2ff' : ''}">
            <td style="padding:10px 12px;border-top:1px solid #f1f5f9;font-weight:900;color:#0f172a">${m}</td>
            <td style="padding:10px 12px;border-top:1px solid #f1f5f9">${delivCnt}</td>
            <td style="padding:10px 12px;border-top:1px solid #f1f5f9">${fileCnt}</td>
          </tr>
        `;
      }).join('') || `<tr><td style="padding:10px 12px" colspan="3">データがありません</td></tr>`;
      monthsCard.querySelectorAll('tr[data-month]').forEach(tr => {
        tr.addEventListener('click', () => {
          selectedMonth = String(tr.getAttribute('data-month') || '');
          const pm = document.getElementById('psMonth');
          if (pm) pm.value = selectedMonth.replace('-', '-');
          refreshMonthSummary();
          loadHistory();
        });
      });
    } catch (e) {
      const msg = String(e?.message || '読み込み失敗');
      try { console.error('payslip months summary error:', e); } catch (e) { /* silently ignored */ }
      host.innerHTML = `<tr><td style="padding:10px 12px" colspan="3">読み込み失敗: ${msg}</td></tr>`;
    }
  }
  refreshMonthSummary();

  const pm = document.getElementById('psMonth');
  if (pm) pm.addEventListener('change', () => { selectedMonth = String(pm.value || ''); loadHistory(); refreshMonthSummary(); });
  const pc = document.getElementById('psClear');
  if (pc) pc.addEventListener('click', () => { selectedMonth = ''; try { document.getElementById('psMonth').value = ''; } catch (e) { /* silently ignored */ } loadHistory(); refreshMonthSummary(); });
}

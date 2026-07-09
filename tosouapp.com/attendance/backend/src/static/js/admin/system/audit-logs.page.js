import { fetchJSONAuth } from '../../api/http.api.js';

export async function mount(options = {}) {
  const host = (options && options.content) || document.querySelector('#adminContent');
  if (!host) return;

  host.innerHTML = `
    <div class="audit-page" style="padding:16px;max-width:1200px;">
      <h2 style="margin:0 0 16px;font-size:18px;font-weight:700;">監査ログ</h2>
      
      <!-- Filters -->
      <div class="audit-filters" style="display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end;margin-bottom:16px;padding:12px;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;">
        <div style="display:flex;flex-direction:column;gap:2px;">
          <label style="font-size:11px;font-weight:600;color:#475569;">アクション</label>
          <select id="auditFilterAction" style="height:32px;border:1px solid #cbd5e1;border-radius:4px;padding:0 8px;font-size:13px;">
            <option value="">すべて</option>
            <option value="admin_user_create">ユーザー作成</option>
            <option value="admin_user_update">ユーザー更新</option>
            <option value="admin_user_delete">ユーザー削除</option>
            <option value="admin_employee_create">社員作成</option>
            <option value="login">ログイン</option>
            <option value="logout">ログアウト</option>
            <option value="password_change">パスワード変更</option>
          </select>
        </div>
        <div style="display:flex;flex-direction:column;gap:2px;">
          <label style="font-size:11px;font-weight:600;color:#475569;">開始日</label>
          <input type="date" id="auditFilterFrom" style="height:32px;border:1px solid #cbd5e1;border-radius:4px;padding:0 8px;font-size:13px;">
        </div>
        <div style="display:flex;flex-direction:column;gap:2px;">
          <label style="font-size:11px;font-weight:600;color:#475569;">終了日</label>
          <input type="date" id="auditFilterTo" style="height:32px;border:1px solid #cbd5e1;border-radius:4px;padding:0 8px;font-size:13px;">
        </div>
        <button id="auditBtnSearch" type="button" style="height:32px;padding:0 14px;background:#0b2c66;color:#fff;border:none;border-radius:4px;font-size:13px;font-weight:600;cursor:pointer;">検索</button>
        <button id="auditBtnReset" type="button" style="height:32px;padding:0 14px;background:#fff;color:#475569;border:1px solid #cbd5e1;border-radius:4px;font-size:13px;cursor:pointer;">リセット</button>
      </div>

      <!-- Results -->
      <div id="auditStatus" style="font-size:12px;color:#64748b;margin-bottom:8px;"></div>
      <div class="audit-table-wrap" style="border:1px solid #e2e8f0;border-radius:8px;overflow:auto;max-height:65vh;">
        <table class="audit-table" style="width:100%;border-collapse:collapse;min-width:800px;font-size:13px;">
          <thead>
            <tr style="background:#f1f5f9;">
              <th style="padding:8px 10px;text-align:left;border-bottom:2px solid #e2e8f0;white-space:nowrap;">日時</th>
              <th style="padding:8px 10px;text-align:left;border-bottom:2px solid #e2e8f0;white-space:nowrap;">ユーザーID</th>
              <th style="padding:8px 10px;text-align:left;border-bottom:2px solid #e2e8f0;white-space:nowrap;">アクション</th>
              <th style="padding:8px 10px;text-align:left;border-bottom:2px solid #e2e8f0;white-space:nowrap;">メソッド</th>
              <th style="padding:8px 10px;text-align:left;border-bottom:2px solid #e2e8f0;">パス</th>
              <th style="padding:8px 10px;text-align:left;border-bottom:2px solid #e2e8f0;white-space:nowrap;">IP</th>
            </tr>
          </thead>
          <tbody id="auditTableBody">
            <tr><td colspan="6" style="text-align:center;padding:24px;color:#94a3b8;">読み込み中...</td></tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div id="auditPager" style="display:flex;align-items:center;justify-content:space-between;margin-top:12px;font-size:12px;color:#64748b;"></div>
    </div>
  `;

  let currentPage = 1;
  const pageSize = 30;

  const actionLabels = {
    admin_user_create: 'ユーザー作成',
    admin_user_update: 'ユーザー更新',
    admin_user_delete: 'ユーザー削除',
    admin_employee_create: '社員作成',
    login: 'ログイン',
    logout: 'ログアウト',
    password_change: 'パスワード変更',
  };

  function fmtDate(d) {
    if (!d) return '-';
    try { return new Date(d).toLocaleString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }); }
    catch { return String(d).slice(0, 16); }
  }

  function esc(s) { return String(s || '').replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c])); }

  async function loadLogs(page = 1) {
    currentPage = page;
    const action = document.getElementById('auditFilterAction')?.value || '';
    const from = document.getElementById('auditFilterFrom')?.value || '';
    const to = document.getElementById('auditFilterTo')?.value || '';

    const params = new URLSearchParams({ page, pageSize });
    if (action) params.set('action', action);
    if (from) params.set('from', from);
    if (to) params.set('to', to);

    const status = document.getElementById('auditStatus');
    const tbody = document.getElementById('auditTableBody');
    const pager = document.getElementById('auditPager');

    try {
      if (status) status.textContent = '読み込み中...';
      const result = await fetchJSONAuth(`/api/admin/audit?${params.toString()}`);
      const { data = [], total = 0, pages = 1 } = result || {};

      if (status) status.textContent = `全 ${total} 件中 ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} 件を表示`;

      if (!data.length) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:24px;color:#94a3b8;">該当するログがありません</td></tr>';
      } else {
        tbody.innerHTML = data.map(row => `
          <tr style="border-bottom:1px solid #f1f5f9;">
            <td style="padding:6px 10px;white-space:nowrap;">${fmtDate(row.created_at)}</td>
            <td style="padding:6px 10px;">${esc(row.userId || '-')}</td>
            <td style="padding:6px 10px;"><span style="background:#eef2ff;color:#3730a3;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;">${esc(actionLabels[row.action] || row.action)}</span></td>
            <td style="padding:6px 10px;font-family:monospace;font-size:12px;">${esc(row.method || '')}</td>
            <td style="padding:6px 10px;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${esc(row.path)}">${esc(row.path || '')}</td>
            <td style="padding:6px 10px;font-size:11px;color:#64748b;">${esc(row.ip || '')}</td>
          </tr>
        `).join('');
      }

      // Pager
      if (pager) {
        const prevDisabled = page <= 1 ? 'disabled' : '';
        const nextDisabled = page >= pages ? 'disabled' : '';
        pager.innerHTML = `
          <span>ページ ${page} / ${pages}</span>
          <div style="display:flex;gap:8px;">
            <button id="auditPrev" ${prevDisabled} style="padding:4px 12px;border:1px solid #cbd5e1;border-radius:4px;background:#fff;cursor:pointer;font-size:12px;">前へ</button>
            <button id="auditNext" ${nextDisabled} style="padding:4px 12px;border:1px solid #cbd5e1;border-radius:4px;background:#fff;cursor:pointer;font-size:12px;">次へ</button>
          </div>
        `;
        document.getElementById('auditPrev')?.addEventListener('click', () => { if (page > 1) loadLogs(page - 1); });
        document.getElementById('auditNext')?.addEventListener('click', () => { if (page < pages) loadLogs(page + 1); });
      }
    } catch (err) {
      if (tbody) tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:24px;color:#ef4444;">エラー: ${esc(err.message)}</td></tr>`;
      if (status) status.textContent = '';
    }
  }

  // Bind events
  document.getElementById('auditBtnSearch')?.addEventListener('click', () => loadLogs(1));
  document.getElementById('auditBtnReset')?.addEventListener('click', () => {
    document.getElementById('auditFilterAction').value = '';
    document.getElementById('auditFilterFrom').value = '';
    document.getElementById('auditFilterTo').value = '';
    loadLogs(1);
  });

  // Initial load
  await loadLogs(1);
}

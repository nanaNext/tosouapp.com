import { fetchJSONAuth } from '../../api/http.api.js';

const ACTION_LABEL = {
  department_create: '部署作成',
  department_update: '部署編集',
  department_deactivate: '部署無効化',
  department_assignment_create: '異動登録',
  department_assignment_update: '異動編集',
  department_assignment_delete: '異動削除',
  department_month_close: '月次締め',
  department_month_reopen: '月次再オープン',
  corporation_create: '法人作成',
  corporation_update: '法人編集',
  corporation_deactivate: '法人無効化'
};

function escapeHtml(s) {
  return String(s ?? '').replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c]));
}

function formatDateTime(v) {
  if (!v) return '-';
  try {
    return new Date(v).toLocaleString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch {
    return String(v);
  }
}

function summarizeDiff(row) {
  let before = null;
  let after = null;
  try { before = row.beforeData ? JSON.parse(row.beforeData) : null; } catch { /* ignore */ }
  try { after = row.afterData ? JSON.parse(row.afterData) : null; } catch { /* ignore */ }
  if (!before && !after) return '-';
  const beforeText = before ? escapeHtml(JSON.stringify(before)) : '(なし)';
  const afterText = after ? escapeHtml(JSON.stringify(after)) : '(なし)';
  return `
    <div style="font-size:11px;color:#94a3b8;text-decoration:line-through;max-width:320px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${beforeText}">${beforeText}</div>
    <div style="font-size:12px;color:#0f172a;max-width:320px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${afterText}">${afterText}</div>
  `;
}

export async function mount({ content } = {}) {
  const root = content;
  if (!root) return () => {};

  async function render() {
    root.innerHTML = `
      <div style="padding:0 20px 24px;max-width:1150px;">
        <div id="historyStatus" style="font-size:12px;color:#64748b;margin-bottom:8px;">読み込み中...</div>
        <div style="border:1px solid #e2e8f0;border-radius:8px;overflow:auto;max-height:65vh;">
          <table style="width:100%;border-collapse:collapse;font-size:13px;">
            <thead><tr style="background:#f1f5f9;">
              <th style="padding:8px;text-align:left;white-space:nowrap;">日時</th>
              <th style="padding:8px;text-align:left;white-space:nowrap;">操作者ID</th>
              <th style="padding:8px;text-align:left;white-space:nowrap;">操作</th>
              <th style="padding:8px;text-align:left;">変更内容（変更前 / 変更後）</th>
            </tr></thead>
            <tbody id="historyBody"><tr><td colspan="4" style="text-align:center;padding:24px;color:#94a3b8;">読み込み中...</td></tr></tbody>
          </table>
        </div>
        <div id="historyPager" style="margin-top:12px;font-size:12px;color:#64748b;"></div>
      </div>
    `;
    await load(1);
  }

  async function load(page) {
    const pageSize = 30;
    const status = root.querySelector('#historyStatus');
    const body = root.querySelector('#historyBody');
    const pager = root.querySelector('#historyPager');
    try {
      const res = await fetchJSONAuth(`/api/admin/audit?actionPrefixes=department_,corporation_&page=${page}&pageSize=${pageSize}`);
      const { data = [], total = 0, pages = 1 } = res || {};
      status.textContent = total ? `全 ${total} 件中 ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} 件` : '';
      body.innerHTML = data.length ? data.map(row => `
        <tr style="border-bottom:1px solid #f1f5f9;">
          <td style="padding:6px 8px;white-space:nowrap;">${formatDateTime(row.created_at)}</td>
          <td style="padding:6px 8px;">${escapeHtml(row.userId ?? '-')}</td>
          <td style="padding:6px 8px;white-space:nowrap;"><span style="background:#eef2ff;color:#3730a3;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;">${escapeHtml(ACTION_LABEL[row.action] || row.action)}</span></td>
          <td style="padding:6px 8px;">${summarizeDiff(row)}</td>
        </tr>
      `).join('') : '<tr><td colspan="4" style="text-align:center;padding:24px;color:#94a3b8;">該当するログがありません</td></tr>';
      pager.innerHTML = `
        <button type="button" id="histPrev" ${page <= 1 ? 'disabled' : ''} style="cursor:pointer;">前へ</button>
        <span style="margin:0 8px;">${page} / ${pages}</span>
        <button type="button" id="histNext" ${page >= pages ? 'disabled' : ''} style="cursor:pointer;">次へ</button>
      `;
      root.querySelector('#histPrev')?.addEventListener('click', () => page > 1 && load(page - 1));
      root.querySelector('#histNext')?.addEventListener('click', () => page < pages && load(page + 1));
    } catch (err) {
      body.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:24px;color:#ef4444;">エラー: ${escapeHtml(err.message)}</td></tr>`;
    }
  }

  await render();
  return () => {};
}

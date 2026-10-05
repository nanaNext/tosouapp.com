import { fetchJSONAuth } from '../../api/http.api.js';
import { listDepartments } from '../../api/departments.api.js';
import { listCorporations } from '../../api/corporations.api.js';
import { listUsers, extractUserRows } from '../../api/users.api.js';
import { escapeHtml, fmtDate } from './org-ui.js?v=20261005-org1';
import { mount as mountMonthLocks } from './month-locks.page.js?v=20261005-org1';

const ACTION_LABEL = {
  department_create: '部署作成',
  department_update: '部署編集',
  department_deactivate: '部署無効化',
  department_assignment_create: '異動登録',
  department_assignment_update: '異動編集',
  department_assignment_delete: '異動削除',
  department_month_close: '締め',
  department_month_reopen: '締め解除',
  corporation_create: '法人作成',
  corporation_update: '法人編集',
  corporation_deactivate: '法人無効化'
};

function formatDateTime(v) {
  if (!v) return '-';
  try {
    return new Date(v).toLocaleString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch {
    return String(v);
  }
}

function parse(s) {
  try { return s ? JSON.parse(s) : null; } catch { return null; }
}

// 部門管理の操作記録を「誰が・何を・どう変えたか」の1文にする
export async function mount({ content } = {}) {
  const root = content;
  if (!root) return () => {};

  let users = new Map();
  let depts = new Map();
  let corps = new Map();
  try {
    const [u, d, c] = await Promise.all([
      listUsers().catch(() => []),
      listDepartments({ includeInactive: true }).catch(() => []),
      listCorporations({ includeInactive: true }).catch(() => [])
    ]);
    users = new Map(extractUserRows(u).map(x => [String(x.id), x]));
    depts = new Map((d || []).map(x => [String(x.id), x]));
    corps = new Map((c || []).map(x => [String(x.id), x]));
  } catch { /* 名前が引けなくても ID で表示する */ }

  const b = (s) => `<b>${escapeHtml(s)}</b>`;
  const userName = (id) => { const u = users.get(String(id)); return u ? (u.username || u.email) : (id != null ? `ID ${id}` : '-'); };
  const deptName = (id) => (id == null ? '' : (depts.get(String(id))?.name || `部署${id}`));
  const corpName = (id) => (id == null ? '' : (corps.get(String(id))?.name || `法人${id}`));
  const typeName = (t) => (t === 'temporary_support' ? '応援' : '異動');
  const period = (s, e) => `${fmtDate(s)}〜${e ? fmtDate(e) : ''}`;

  function describe(row) {
    const bf = parse(row.beforeData) || {};
    const af = parse(row.afterData) || {};
    switch (row.action) {
      case 'department_create':
        return `部署 ${b(af.name)} を作成${af.corporationId ? `（${escapeHtml(corpName(af.corporationId))}）` : ''}`;
      case 'department_update': {
        const parts = [];
        if (bf.name && af.name && bf.name !== af.name) parts.push(`名前 ${escapeHtml(bf.name)} → ${b(af.name)}`);
        if ((bf.code || '') !== (af.code || '') && af.code !== undefined) parts.push(`コード ${escapeHtml(bf.code || 'なし')} → ${b(af.code || 'なし')}`);
        const bc = bf.corporation_id ?? bf.corporationId;
        if (af.corporationId != null && String(bc) !== String(af.corporationId)) parts.push(`法人 ${escapeHtml(corpName(bc) || 'なし')} → ${b(corpName(af.corporationId))}`);
        return `部署 ${b(af.name || bf.name)} を変更${parts.length ? `: ${parts.join('、')}` : ''}`;
      }
      case 'department_deactivate':
        return `部署 ${b(bf.name || deptName(af.id))} を無効化`;
      case 'department_assignment_create':
        return `${b(userName(af.userId))} さんを ${b(deptName(af.departmentId))} へ${typeName(af.assignmentType)}（${period(af.startDate, af.endDate)}）${af.reason ? ` 理由: ${escapeHtml(af.reason)}` : ''}`;
      case 'department_assignment_update': {
        const who = userName(bf.user_id ?? bf.userId);
        const parts = [];
        const bs = bf.start_date ? String(bf.start_date).slice(0, 10) : '';
        const be = bf.end_date ? String(bf.end_date).slice(0, 10) : '';
        if (af.startDate && af.startDate !== bs) parts.push(`開始日 ${fmtDate(bs)} → ${b(fmtDate(af.startDate))}`);
        if ((af.endDate || '') !== be) parts.push(`終了日 ${fmtDate(be) || 'なし'} → ${b(fmtDate(af.endDate) || 'なし')}`);
        if (af.reason && af.reason !== bf.reason) parts.push(`理由 → ${escapeHtml(af.reason)}`);
        return `${b(who)} さんの${typeName(bf.assignment_type)}（${escapeHtml(deptName(bf.department_id))}）を変更${parts.length ? `: ${parts.join('、')}` : ''}`;
      }
      case 'department_assignment_delete':
        return `${b(userName(bf.user_id))} さんの${typeName(bf.assignment_type)}（${escapeHtml(deptName(bf.department_id))}、${period(bf.start_date && String(bf.start_date).slice(0, 10), bf.end_date && String(bf.end_date).slice(0, 10))}）を削除`;
      case 'department_month_close':
        return `${b(`${af.year}年${af.month}月`)} の異動を締めました`;
      case 'department_month_reopen':
        return `${b(`${af.year}年${af.month}月`)} の締めを解除${af.reason ? ` 理由: ${escapeHtml(af.reason)}` : ''}`;
      case 'corporation_create':
        return `法人 ${b(af.name)} を作成`;
      case 'corporation_update':
        return bf.name && af.name && bf.name !== af.name ? `法人名 ${escapeHtml(bf.name)} → ${b(af.name)}` : `法人 ${b(af.name || bf.name)} を変更`;
      case 'corporation_deactivate':
        return `法人 ${b(bf.name || corpName(af.id))} を無効化`;
      default:
        return escapeHtml(row.action);
    }
  }

  root.innerHTML = `
    <div class="org-body">
      <div class="org-card">
        <div class="org-card-h"><h4>部署・異動の履歴</h4><span class="org-sub" id="historyStatus">読み込み中...</span><span class="org-right org-sub">部署の変更は「社員編集」の部署欄で行います（ここに自動で記録されます）</span></div>
        <table class="org-table">
          <thead><tr><th style="width:150px;">日時</th><th style="width:120px;">操作した人</th><th>内容</th></tr></thead>
          <tbody id="historyBody"><tr><td colspan="3" class="org-muted" style="text-align:center;padding:24px;">読み込み中...</td></tr></tbody>
        </table>
      </div>
      <div id="historyPager" style="font-size:12px;color:#64748b;display:flex;gap:8px;align-items:center;margin-bottom:16px;"></div>
      <details class="org-more" id="histLocks">
        <summary>異動の締め（詳細設定）<span class="org-sub">締めた月には、さかのぼって部署を変更できなくなります</span></summary>
        <div class="org-more-body" id="histLocksBody"></div>
      </details>
    </div>
  `;

  async function load(page) {
    const pageSize = 30;
    const status = root.querySelector('#historyStatus');
    const body = root.querySelector('#historyBody');
    const pager = root.querySelector('#historyPager');
    try {
      const res = await fetchJSONAuth(`/api/admin/audit?actionPrefixes=department_,corporation_&page=${page}&pageSize=${pageSize}`);
      const { data = [], total = 0, pages = 1 } = res || {};
      status.textContent = total ? `全 ${total} 件` : '';
      body.innerHTML = data.length ? data.map(row => `
        <tr>
          <td style="white-space:nowrap;color:#475569;">${formatDateTime(row.created_at)}</td>
          <td style="white-space:nowrap;">${escapeHtml(userName(row.userId))}</td>
          <td><span class="org-tag reg" style="margin-right:6px;">${escapeHtml(ACTION_LABEL[row.action] || row.action)}</span>${describe(row)}</td>
        </tr>
      `).join('') : '<tr><td colspan="3" class="org-muted" style="text-align:center;padding:24px;">まだ履歴がありません</td></tr>';
      pager.innerHTML = pages > 1 ? `
        <button type="button" class="org-btn" id="histPrev" ${page <= 1 ? 'disabled' : ''}>前へ</button>
        <span>${page} / ${pages}</span>
        <button type="button" class="org-btn" id="histNext" ${page >= pages ? 'disabled' : ''}>次へ</button>
      ` : '';
      root.querySelector('#histPrev')?.addEventListener('click', () => page > 1 && load(page - 1));
      root.querySelector('#histNext')?.addEventListener('click', () => page < pages && load(page + 1));
    } catch (err) {
      body.innerHTML = `<tr><td colspan="3" style="text-align:center;padding:24px;color:#ef4444;">エラー: ${escapeHtml(err.message)}</td></tr>`;
    }
  }

  const locksEl = root.querySelector('#histLocks');
  let locksMounted = false;
  locksEl.addEventListener('toggle', async () => {
    if (locksEl.open && !locksMounted) { locksMounted = true; await mountMonthLocks({ content: root.querySelector('#histLocksBody') }); }
  });

  await load(1);
  return () => {};
}

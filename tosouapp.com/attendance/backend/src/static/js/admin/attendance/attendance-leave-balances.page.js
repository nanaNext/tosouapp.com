import { fetchJSONAuth } from '../../api/http.api.js';
import { downloadWithAuth } from '../../shared/api/client.js';
import { listDepartments } from '../../api/departments.api.js';
import { requireAdmin } from '../_shared/require-admin.js';

function escapeHtml(s) {
  return String(s ?? '').replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c]));
}

export async function mount({ content } = {}) {
  const admin = await requireAdmin();
  const root = content || document.getElementById('attendanceHubContent') || document.getElementById('adminContent');
  if (!admin || !root) return () => {};

  let dept = '';
  let userId = '';
  let departments = [];
  let employees = [];

  async function loadFilterOptions() {
    departments = await listDepartments().catch(() => []);
    employees = await fetchJSONAuth('/api/admin/users?employmentStatus=active&role=employee&limit=5000')
      .then(r => Array.isArray(r) ? r : (r.rows || r.items || r.users || []))
      .catch(() => []);
    const deptSel = root.querySelector('#lbDeptFilter');
    if (deptSel) {
      deptSel.innerHTML = ['<option value="">すべて</option>']
        .concat(departments.map(d => `<option value="${escapeHtml(d.name)}">${escapeHtml(d.name)}</option>`))
        .join('');
    }
    const empSel = root.querySelector('#lbUserFilter');
    if (empSel) {
      empSel.innerHTML = ['<option value="">全員</option>']
        .concat(employees.map(u => `<option value="${u.id}">${escapeHtml(u.username || '')}${u.employee_code ? `（${escapeHtml(u.employee_code)}）` : ''}</option>`))
        .join('');
    }
  }

  function renderCards(items) {
    const box = root.querySelector('#lbCards');
    if (!box) return;
    const totalRemaining = items.reduce((s, r) => s + Number(r.remaining || 0), 0);
    const needsAction = items.filter(r => !r.obligationMet).length;
    const cards = [
      { label: '対象社員', value: `${items.length}名` },
      { label: '残日数合計', value: `${totalRemaining}日` },
      { label: '年5日義務未達成', value: `${needsAction}名`, danger: needsAction > 0 }
    ];
    box.innerHTML = cards.map(c => `
      <div style="flex:1;min-width:160px;border:1px solid ${c.danger ? '#fecaca' : '#e2e8f0'};border-radius:10px;padding:18px 20px;background:#fff;">
        <div style="font-size:26px;font-weight:700;color:${c.danger ? '#991b1b' : '#0f172a'};line-height:1.2;">${escapeHtml(c.value)}</div>
        <div style="font-size:13px;color:#64748b;margin-top:4px;">${escapeHtml(c.label)}</div>
      </div>
    `).join('');
  }

  function renderTable(items) {
    const body = root.querySelector('#lbTableBody');
    if (!body) return;
    if (!items.length) {
      body.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:24px;color:#94a3b8;">対象データがありません</td></tr>';
      return;
    }
    const cellStyle = 'padding:12px;border-bottom:1px solid #f1f5f9;white-space:nowrap;color:#334155;text-align:center;';
    body.innerHTML = items.map(r => `
      <tr>
        <td style="${cellStyle}text-align:left;font-weight:600;">${escapeHtml(r.username || '')}${r.employeeCode ? `<br><span style="font-size:11px;font-weight:400;color:#94a3b8;">${escapeHtml(r.employeeCode)}</span>` : ''}</td>
        <td style="${cellStyle}text-align:left;">${escapeHtml(r.departmentName || '—')}</td>
        <td style="${cellStyle}">${r.granted}</td>
        <td style="${cellStyle}">${r.carriedOver}</td>
        <td style="${cellStyle}">${r.usedDays}</td>
        <td style="${cellStyle}font-weight:700;">${r.remaining}</td>
        <td style="${cellStyle}"><span style="display:inline-block;padding:5px 14px;border-radius:999px;font-size:12px;font-weight:600;${r.obligationMet ? 'background:#f0fdf4;color:#166534;border:1px solid #bbf7d0;' : 'background:#fef2f2;color:#991b1b;border:1px solid #fecaca;'}">${r.obligationMet ? '達成' : '要取得'}</span></td>
      </tr>
    `).join('');
  }

  async function loadList() {
    const body = root.querySelector('#lbTableBody');
    if (body) body.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:24px;color:#94a3b8;">読み込み中...</td></tr>';
    try {
      const qs = new URLSearchParams();
      if (dept) qs.set('dept', dept);
      if (userId) qs.set('userId', userId);
      const data = await fetchJSONAuth(`/api/leave/admin-balances?${qs.toString()}`);
      const items = data.items || [];
      renderCards(items);
      renderTable(items);
    } catch (err) {
      if (body) body.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:24px;color:#ef4444;">エラー: ${escapeHtml(err.message)}</td></tr>`;
    }
  }

  root.innerHTML = `
    <div style="padding:16px 20px 32px;max-width:1200px;">
      <h2 style="margin:0 0 16px;font-size:18px;font-weight:700;">有給管理</h2>

      <div style="display:flex;gap:12px;align-items:flex-end;margin-bottom:20px;flex-wrap:wrap;">
        <div style="display:flex;flex-direction:column;gap:4px;">
          <label style="font-size:12px;color:#64748b;font-weight:600;">部署</label>
          <select id="lbDeptFilter" style="height:36px;border:1px solid #cbd5e1;border-radius:6px;padding:0 10px;min-width:130px;font-size:13px;"><option value="">すべて</option></select>
        </div>
        <div style="display:flex;flex-direction:column;gap:4px;">
          <label style="font-size:12px;color:#64748b;font-weight:600;">社員</label>
          <select id="lbUserFilter" style="height:36px;border:1px solid #cbd5e1;border-radius:6px;padding:0 10px;min-width:150px;font-size:13px;"><option value="">全員</option></select>
        </div>
        <button type="button" id="lbGoBtn" style="height:36px;padding:0 18px;background:#0b2c66;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:600;font-size:13px;">表示</button>
        <div style="flex:1;"></div>
        <button type="button" id="lbXlsxBtn" style="height:36px;padding:0 16px;border:none;border-radius:6px;background:#0b2c66;color:#fff;cursor:pointer;font-weight:600;font-size:13px;">Excel出力</button>
      </div>

      <div id="lbCards" style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:20px;"></div>

      <div style="border:1px solid #e2e8f0;border-radius:10px;overflow:auto;max-height:65vh;background:#fff;">
        <table style="width:100%;border-collapse:separate;border-spacing:0;font-size:13px;min-width:800px;">
          <thead>
            <tr>
              <th style="padding:12px;text-align:left;white-space:nowrap;position:sticky;top:-1px;z-index:1;background:#f8fafc;color:#64748b;font-weight:600;font-size:12px;border-bottom:1px solid #e2e8f0;transform:translateZ(0);">社員</th>
              <th style="padding:12px;text-align:left;white-space:nowrap;position:sticky;top:-1px;z-index:1;background:#f8fafc;color:#64748b;font-weight:600;font-size:12px;border-bottom:1px solid #e2e8f0;transform:translateZ(0);">部署</th>
              <th style="padding:12px;text-align:center;white-space:nowrap;position:sticky;top:-1px;z-index:1;background:#f8fafc;color:#64748b;font-weight:600;font-size:12px;border-bottom:1px solid #e2e8f0;transform:translateZ(0);">付与</th>
              <th style="padding:12px;text-align:center;white-space:nowrap;position:sticky;top:-1px;z-index:1;background:#f8fafc;color:#64748b;font-weight:600;font-size:12px;border-bottom:1px solid #e2e8f0;transform:translateZ(0);">繰越</th>
              <th style="padding:12px;text-align:center;white-space:nowrap;position:sticky;top:-1px;z-index:1;background:#f8fafc;color:#64748b;font-weight:600;font-size:12px;border-bottom:1px solid #e2e8f0;transform:translateZ(0);">取得</th>
              <th style="padding:12px;text-align:center;white-space:nowrap;position:sticky;top:-1px;z-index:1;background:#f8fafc;color:#64748b;font-weight:600;font-size:12px;border-bottom:1px solid #e2e8f0;transform:translateZ(0);">残</th>
              <th style="padding:12px;text-align:center;white-space:nowrap;position:sticky;top:-1px;z-index:1;background:#f8fafc;color:#64748b;font-weight:600;font-size:12px;border-bottom:1px solid #e2e8f0;transform:translateZ(0);">年5日義務</th>
            </tr>
          </thead>
          <tbody id="lbTableBody"></tbody>
        </table>
      </div>
    </div>
  `;

  await loadFilterOptions();

  root.querySelector('#lbGoBtn')?.addEventListener('click', () => {
    dept = root.querySelector('#lbDeptFilter').value || '';
    userId = root.querySelector('#lbUserFilter').value || '';
    loadList();
  });

  root.querySelector('#lbXlsxBtn')?.addEventListener('click', async () => {
    try {
      const qs = new URLSearchParams();
      if (dept) qs.set('dept', dept);
      if (userId) qs.set('userId', userId);
      await downloadWithAuth(`/api/leave/admin-balances/export.xlsx?${qs.toString()}`, `leave_balances.xlsx`);
    } catch (err) {
      alert(String(err?.message || 'Excel出力に失敗しました'));
    }
  });

  await loadList();

  return () => {};
}

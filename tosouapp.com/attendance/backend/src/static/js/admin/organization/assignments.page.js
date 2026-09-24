import { listAssignments, createAssignment, updateAssignment, deleteAssignment, listDepartments } from '../../api/departments.api.js';
import { listUsers, extractUserRows } from '../../api/users.api.js';
import { delegate } from '../_shared/dom.js';

function escapeHtml(s) {
  return String(s ?? '').replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c]));
}

const TYPE_LABEL = { regular: '異動（正式）', temporary_support: '応援（一時的）' };

export async function mount({ content } = {}) {
  const root = content;
  if (!root) return () => {};

  async function render() {
    const [assignments, departments, usersRaw] = await Promise.all([
      listAssignments(),
      listDepartments(),
      listUsers()
    ]);
    const users = extractUserRows(usersRaw);
    const deptOptions = departments.map(d => `<option value="${d.id}">${escapeHtml(d.name)}</option>`).join('');
    const userOptions = users.map(u => `<option value="${u.id}">${escapeHtml(u.employee_code ? `${u.employee_code} ` : '')}${escapeHtml(u.username || u.email)}</option>`).join('');

    const rowsHtml = assignments.map(a => `
      <tr style="border-bottom:1px solid #f1f5f9;" data-row-id="${a.id}">
        <td style="padding:6px 8px;">${escapeHtml(a.username || a.email || a.user_id)}</td>
        <td style="padding:6px 8px;">${escapeHtml(a.department_name || a.department_id)}</td>
        <td style="padding:6px 8px;">${TYPE_LABEL[a.assignment_type] || a.assignment_type}</td>
        <td style="padding:6px 8px;"><input type="date" value="${a.start_date}" data-field="start_date" style="border:1px solid #e2e8f0;border-radius:4px;"></td>
        <td style="padding:6px 8px;"><input type="date" value="${a.end_date || ''}" data-field="end_date" style="border:1px solid #e2e8f0;border-radius:4px;"></td>
        <td style="padding:6px 8px;"><input type="text" value="${escapeHtml(a.reason || '')}" data-field="reason" style="border:1px solid #e2e8f0;border-radius:4px;width:140px;"></td>
        <td style="padding:6px 8px;white-space:nowrap;">
          <button type="button" data-action="save" data-id="${a.id}" style="margin-right:6px;cursor:pointer;">保存</button>
          <button type="button" data-action="delete" data-id="${a.id}" style="color:#dc2626;cursor:pointer;">削除</button>
        </td>
      </tr>
    `).join('');

    root.innerHTML = `
      <style>
        .assign-submit-btn {
          transition: background-color .15s ease, transform .05s ease, box-shadow .15s ease;
          box-shadow: 0 1px 2px rgba(11,44,102,.25);
        }
        .assign-submit-btn:hover { background: #0a285c; }
        .assign-submit-btn:active { transform: translateY(1px); box-shadow: none; }
      </style>
      <div style="padding:0 20px 24px;max-width:1150px;">
        <div style="border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-bottom:20px;background:#f8fafc;">
          <h4 style="margin:0 0 10px;font-size:14px;font-weight:700;">異動を登録</h4>
          <form id="assignForm" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px 12px;align-items:end;">
            <div style="display:flex;flex-direction:column;gap:4px;min-width:0;">
              <label style="font-size:12px;color:#475569;">社員</label>
              <select id="assignUser" required style="height:36px;width:100%;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:4px;padding:0 8px;font-size:14px;">${userOptions}</select>
            </div>
            <div style="display:flex;flex-direction:column;gap:4px;min-width:0;">
              <label style="font-size:12px;color:#475569;">異動先の部署</label>
              <select id="assignDept" required style="height:36px;width:100%;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:4px;padding:0 8px;font-size:14px;">${deptOptions}</select>
            </div>
            <div style="display:flex;flex-direction:column;gap:4px;min-width:0;">
              <label style="font-size:12px;color:#475569;">種類</label>
              <select id="assignType" style="height:36px;width:100%;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:4px;padding:0 8px;font-size:14px;">
                <option value="regular">異動（正式）</option>
                <option value="temporary_support">応援（一時的）</option>
              </select>
            </div>
            <div style="display:flex;flex-direction:column;gap:4px;min-width:0;">
              <label style="font-size:12px;color:#475569;">開始日（発効日）</label>
              <input type="date" id="assignStart" required style="height:36px;width:100%;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:4px;padding:0 8px;font-size:14px;">
            </div>
            <div style="display:flex;flex-direction:column;gap:4px;min-width:0;">
              <label style="font-size:12px;color:#475569;">終了日（応援は必須）</label>
              <input type="date" id="assignEnd" style="height:36px;width:100%;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:4px;padding:0 8px;font-size:14px;">
            </div>
            <div style="display:flex;flex-direction:column;gap:4px;min-width:0;grid-column:span 2;">
              <label style="font-size:12px;color:#475569;">理由（任意）</label>
              <input type="text" id="assignReason" placeholder="例: 組織再編、応援要請" style="height:36px;width:100%;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:4px;padding:0 8px;font-size:14px;">
            </div>
            <div style="display:flex;align-items:flex-end;min-width:0;">
              <button type="submit" class="assign-submit-btn" style="height:36px;padding:0 20px;background:#0b2c66;color:#fff;border:none;border-radius:4px;font-weight:600;cursor:pointer;white-space:nowrap;font-size:14px;">登録</button>
            </div>
          </form>
          <p style="font-size:11px;color:#64748b;margin:8px 0 0;">応援（一時的）は元の部署の上に一時的に重なるだけなので、終了日を過ぎれば自動的に元の部署へ戻ります。締め済みの月には遡って登録できません。</p>
        </div>

        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead>
            <tr style="background:#f1f5f9;">
              <th style="padding:8px;text-align:left;">社員</th>
              <th style="padding:8px;text-align:left;">部署</th>
              <th style="padding:8px;text-align:left;">種類</th>
              <th style="padding:8px;text-align:left;">開始日</th>
              <th style="padding:8px;text-align:left;">終了日</th>
              <th style="padding:8px;text-align:left;">理由</th>
              <th style="padding:8px;text-align:left;">操作</th>
            </tr>
          </thead>
          <tbody>${rowsHtml || '<tr><td colspan="7" style="padding:20px;text-align:center;color:#94a3b8;">まだ異動履歴がありません</td></tr>'}</tbody>
        </table>
      </div>
    `;

    // フォームは render() のたびに DOM ごと作り直されるので、ここで毎回 bind し直しても問題ない。
    root.querySelector('#assignForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const userId = root.querySelector('#assignUser').value;
      const departmentId = root.querySelector('#assignDept').value;
      const assignmentType = root.querySelector('#assignType').value;
      const startDate = root.querySelector('#assignStart').value;
      const endDate = root.querySelector('#assignEnd').value || null;
      const reason = root.querySelector('#assignReason').value || null;
      if (assignmentType === 'temporary_support' && !endDate) {
        alert('応援は終了日が必須です');
        return;
      }
      try {
        await createAssignment({ userId, departmentId, assignmentType, startDate, endDate, reason });
        await render();
      } catch (err) {
        alert(`登録に失敗しました: ${err.message}`);
      }
    });
  }

  // root は tab 切替中ずっと同じ要素なので delegate() は mount 内で1回だけ呼ぶ
  // (render() の中で毎回呼ぶと、他タブに切り替えた後も古いリスナーが残ってクリックが誤爆する)
  const disposeDelegate = delegate(root, 'button[data-action]', 'click', async (e, btn) => {
    const id = btn.dataset.id;
    const row = root.querySelector(`tr[data-row-id="${id}"]`);
    if (btn.dataset.action === 'save') {
      const startDate = row.querySelector('[data-field="start_date"]').value;
      const endDate = row.querySelector('[data-field="end_date"]').value || null;
      const reason = row.querySelector('[data-field="reason"]').value || null;
      try {
        await updateAssignment(id, { startDate, endDate, reason });
        await render();
      } catch (err) {
        alert(`保存に失敗しました: ${err.message}`);
      }
      return;
    }
    if (btn.dataset.action === 'delete') {
      if (!confirm('この異動を削除しますか？')) return;
      try {
        await deleteAssignment(id);
        await render();
      } catch (err) {
        alert(`削除に失敗しました: ${err.message}`);
      }
    }
  });

  await render();
  return () => { if (typeof disposeDelegate === 'function') disposeDelegate(); };
}

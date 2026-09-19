import { listDepartments, createDepartment, updateDepartment, deactivateDepartment, listDepartmentUsers } from '../../api/departments.api.js';
import { listUsers, extractUserRows } from '../../api/users.api.js';
import { delegate, $ } from '../_shared/dom.js';

function escapeHtml(s) {
  return String(s ?? '').replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c]));
}

export async function mount({ content } = {}) {
  const root = content;
  if (!root) return () => {};

  async function render() {
    const [departments, usersRaw] = await Promise.all([
      listDepartments({ includeInactive: true }),
      listUsers()
    ]);
    const users = extractUserRows(usersRaw);

    const rowsHtml = departments.map(d => `
      <tr>
        <td>${d.id}</td>
        <td><input class="dept-input dept-input-sm" data-dept-code="${d.id}" value="${escapeHtml(d.code || '')}" placeholder="例: HR, ENG"></td>
        <td><input class="dept-input" data-dept-name="${d.id}" value="${escapeHtml(d.name)}"></td>
        <td>${d.is_active ? '<span style="color:#16a34a;">有効</span>' : '<span style="color:#94a3b8;">無効</span>'}</td>
        <td>
          <div class="dept-actions">
            <button class="dept-btn" type="button" data-action="save" data-id="${d.id}">保存</button>
            <button class="dept-btn danger" type="button" data-action="deactivate" data-id="${d.id}" ${d.is_active ? '' : 'disabled'}>無効化</button>
            <button class="dept-btn" type="button" data-action="users" data-id="${d.id}">社員一覧</button>
          </div>
        </td>
      </tr>
    `).join('');

    root.innerHTML = `
      <div class="dept-page">
        <div class="dept-head">
          <h3 class="dept-title">部門管理</h3>
          <form id="deptCreateForm" class="dept-create">
            <label class="dept-label" for="deptName">新規</label>
            <input id="deptName" class="dept-input" placeholder="例: 総務部">
            <button type="submit" class="dept-btn primary">作成</button>
          </form>
        </div>
        <p style="font-size:11px;color:#64748b;margin:0 0 10px;">名前・コードを変更すると旧バージョンは履歴として残ります。削除の代わりに「無効化」します（異動履歴・監査ログの参照を壊さないため）。</p>
        <div class="dept-table-wrap">
          <table class="dept-table">
            <thead><tr><th style="width:80px;">ID</th><th style="width:160px;">コード</th><th>名前</th><th style="width:80px;">状態</th><th style="width:260px;">操作</th></tr></thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </div>
        <div class="dept-users"></div>
      </div>
    `;

    const form = root.querySelector('#deptCreateForm');
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = root.querySelector('#deptName');
      const name = String(input?.value || '').trim();
      if (!name) return;
      await createDepartment({ name });
      await render();
    });

    const usersBox = root.querySelector('.dept-users');
    delegate(root, 'button[data-action]', 'click', async (e, btn) => {
      const action = btn.dataset.action;
      const id = btn.dataset.id;
      if (action === 'save') {
        const nameInput = $(`input[data-dept-name="${id}"]`, root);
        const codeInput = $(`input[data-dept-code="${id}"]`, root);
        const name = String(nameInput && nameInput.value != null ? nameInput.value : '').trim();
        const code = String(codeInput && codeInput.value != null ? codeInput.value : '').trim() || null;
        await updateDepartment(id, { name, code });
        alert('保存しました（改名した場合は変更履歴に残ります）');
        await render();
        return;
      }
      if (action === 'deactivate') {
        if (!confirm('この部署を無効化しますか？（削除ではなく履歴は保持されます）')) return;
        await deactivateDepartment(id);
        await render();
        return;
      }
      if (action === 'users') {
        const res = await listDepartmentUsers(id);
        const idSet = new Set((res.userIds || []).map(String));
        const members = users.filter(u => idSet.has(String(u.id)));
        usersBox.innerHTML = `
          <h4 class="dept-users-title">所属社員（${res.asOf} 時点）</h4>
          <ul class="dept-users-list">
            ${members.map(u => `<li>${u.id} ${escapeHtml(u.username || u.email)}</li>`).join('') || '<li>該当者なし</li>'}
          </ul>
        `;
      }
    });
  }

  await render();
  return () => {};
}

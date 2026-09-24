import { listDepartments, createDepartment, updateDepartment, deactivateDepartment, listDepartmentUsers } from '../../api/departments.api.js';
import { listCorporations } from '../../api/corporations.api.js';
import { listUsers, extractUserRows } from '../../api/users.api.js';
import { delegate, $ } from '../_shared/dom.js';

function escapeHtml(s) {
  return String(s ?? '').replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c]));
}

export async function mount({ content } = {}) {
  const root = content;
  if (!root) return () => {};

  // root は tab 切替の間ずっと同じ要素なので、delegate() は mount 内で1回だけ呼ぶ
  // (render() の中で毎回呼ぶと、他タブに切り替えた後も古いリスナーが残ってクリックが二重に処理される)
  let users = [];

  async function render() {
    const [departments, corporations, usersRaw] = await Promise.all([
      listDepartments({ includeInactive: true }),
      listCorporations({ includeInactive: true }),
      listUsers()
    ]);
    users = extractUserRows(usersRaw);
    const corpOptions = (selectedId) => corporations.map(c => `<option value="${c.id}" ${String(c.id) === String(selectedId) ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('');

    const rowsHtml = departments.map(d => `
      <tr>
        <td>${d.id}</td>
        <td><input class="dept-input dept-input-sm" data-dept-code="${d.id}" value="${escapeHtml(d.code || '')}" placeholder="例: HR, ENG"></td>
        <td><input class="dept-input" data-dept-name="${d.id}" value="${escapeHtml(d.name)}"></td>
        <td>
          <select class="dept-input" data-dept-corp="${d.id}">
            <option value="">${d.corporation_id ? '' : '（未設定）'}</option>
            ${corpOptions(d.corporation_id)}
          </select>
        </td>
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
            <select id="deptCorp" class="dept-input">
              <option value="">法人を選択</option>
              ${corpOptions(null)}
            </select>
            <button type="submit" class="dept-btn primary">作成</button>
          </form>
        </div>
        <p style="font-size:11px;color:#64748b;margin:0 0 10px;">名前・コードを変更すると旧バージョンは履歴として残ります。削除の代わりに「無効化」します（異動履歴・監査ログの参照を壊さないため）。1部署は必ず1法人に属します（法人管理タブで先に法人を登録してください）。</p>
        <div class="dept-table-wrap">
          <table class="dept-table">
            <thead><tr><th style="width:80px;">ID</th><th style="width:120px;">コード</th><th>名前</th><th style="width:160px;">法人</th><th style="width:80px;">状態</th><th style="width:260px;">操作</th></tr></thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </div>
        <div class="dept-users"></div>
      </div>
    `;

    // フォームは render() のたびに DOM ごと作り直されるので、ここで毎回 bind し直しても
    // 古いリスナーが残る心配はない (delegate() と違い、対象要素自体が再生成されるため)。
    const form = root.querySelector('#deptCreateForm');
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = root.querySelector('#deptName');
      const name = String(input?.value || '').trim();
      if (!name) return;
      const corporationId = root.querySelector('#deptCorp')?.value || null;
      try {
        await createDepartment({ name, corporationId });
        await render();
      } catch (err) {
        alert(`作成に失敗しました: ${err.message}`);
      }
    });
  }

  const disposeDelegate = delegate(root, 'button[data-action]', 'click', async (e, btn) => {
    const action = btn.dataset.action;
    const id = btn.dataset.id;
    if (action === 'save') {
      const nameInput = $(`input[data-dept-name="${id}"]`, root);
      const codeInput = $(`input[data-dept-code="${id}"]`, root);
      const corpSelect = $(`select[data-dept-corp="${id}"]`, root);
      const name = String(nameInput && nameInput.value != null ? nameInput.value : '').trim();
      const code = String(codeInput && codeInput.value != null ? codeInput.value : '').trim() || null;
      const corporationId = corpSelect?.value || null;
      if (!name) {
        alert('名前は空にできません');
        return;
      }
      try {
        await updateDepartment(id, { name, code, corporationId });
        alert('保存しました（改名した場合は変更履歴に残ります）');
        await render();
      } catch (err) {
        alert(`保存に失敗しました: ${err.message}`);
      }
      return;
    }
    if (action === 'deactivate') {
      if (!confirm('この部署を無効化しますか？（削除ではなく履歴は保持されます）')) return;
      try {
        await deactivateDepartment(id);
        await render();
      } catch (err) {
        alert(`無効化に失敗しました: ${err.message}`);
      }
      return;
    }
    if (action === 'users') {
      const res = await listDepartmentUsers(id);
      const idSet = new Set((res.userIds || []).map(String));
      const members = users.filter(u => idSet.has(String(u.id)));
      const usersBox = root.querySelector('.dept-users');
      if (usersBox) {
        usersBox.innerHTML = `
          <h4 class="dept-users-title">所属社員（${res.asOf} 時点）</h4>
          <ul class="dept-users-list">
            ${members.map(u => `<li>${u.id} ${escapeHtml(u.username || u.email)}</li>`).join('') || '<li>該当者なし</li>'}
          </ul>
        `;
      }
    }
  });

  await render();
  return () => { if (typeof disposeDelegate === 'function') disposeDelegate(); };
}

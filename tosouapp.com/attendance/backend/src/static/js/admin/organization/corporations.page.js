import { listCorporations, createCorporation, updateCorporation, deactivateCorporation } from '../../api/corporations.api.js';
import { delegate, $ } from '../_shared/dom.js';

function escapeHtml(s) {
  return String(s ?? '').replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c]));
}

export async function mount({ content } = {}) {
  const root = content;
  if (!root) return () => {};

  async function render() {
    const corporations = await listCorporations({ includeInactive: true });

    const rowsHtml = corporations.map(c => `
      <tr>
        <td>${c.id}</td>
        <td><input class="dept-input dept-input-sm" data-corp-code="${c.id}" value="${escapeHtml(c.code || '')}" placeholder="例: A, B"></td>
        <td><input class="dept-input" data-corp-name="${c.id}" value="${escapeHtml(c.name)}"></td>
        <td>${c.is_active ? '<span style="color:#16a34a;">有効</span>' : '<span style="color:#94a3b8;">無効</span>'}</td>
        <td>
          <div class="dept-actions">
            <button class="dept-btn" type="button" data-action="save" data-id="${c.id}">保存</button>
            <button class="dept-btn danger" type="button" data-action="deactivate" data-id="${c.id}" ${c.is_active ? '' : 'disabled'}>無効化</button>
          </div>
        </td>
      </tr>
    `).join('');

    root.innerHTML = `
      <div class="dept-page">
        <div class="dept-head">
          <h3 class="dept-title">法人管理</h3>
          <form id="corpCreateForm" class="dept-create">
            <label class="dept-label" for="corpName">新規</label>
            <input id="corpName" class="dept-input" placeholder="例: 株式会社〇〇建設">
            <button type="submit" class="dept-btn primary">作成</button>
          </form>
        </div>
        <p style="font-size:11px;color:#64748b;margin:0 0 10px;">1つの部署は必ず1つの法人に属します（部署タブで割り当ててください）。法人をまたぐ異動（転籍・出向）は別プロセスのため、ここでは扱いません。</p>
        <div class="dept-table-wrap">
          <table class="dept-table">
            <thead><tr><th style="width:80px;">ID</th><th style="width:120px;">コード</th><th>法人名</th><th style="width:80px;">状態</th><th style="width:220px;">操作</th></tr></thead>
            <tbody>${rowsHtml || '<tr><td colspan="5" style="padding:20px;text-align:center;color:#94a3b8;">法人がまだ登録されていません</td></tr>'}</tbody>
          </table>
        </div>
      </div>
    `;

    // フォームは render() のたびに DOM ごと作り直されるので、ここで毎回 bind し直しても問題ない。
    const form = root.querySelector('#corpCreateForm');
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = root.querySelector('#corpName');
      const name = String(input?.value || '').trim();
      if (!name) return;
      try {
        await createCorporation({ name });
        await render();
      } catch (err) {
        alert(`作成に失敗しました: ${err.message}`);
      }
    });
  }

  // root は tab 切替中ずっと同じ要素なので delegate() は mount 内で1回だけ呼ぶ
  // (render() の中で毎回呼ぶと、他タブに切り替えた後も古いリスナーが残ってクリックが誤爆する)
  const disposeDelegate = delegate(root, 'button[data-action]', 'click', async (e, btn) => {
    const action = btn.dataset.action;
    const id = btn.dataset.id;
    if (action === 'save') {
      const nameInput = $(`input[data-corp-name="${id}"]`, root);
      const codeInput = $(`input[data-corp-code="${id}"]`, root);
      const name = String(nameInput && nameInput.value != null ? nameInput.value : '').trim();
      const code = String(codeInput && codeInput.value != null ? codeInput.value : '').trim() || null;
      if (!name) {
        alert('法人名は空にできません');
        return;
      }
      try {
        await updateCorporation(id, { name, code });
        alert('保存しました');
        await render();
      } catch (err) {
        alert(`保存に失敗しました: ${err.message}`);
      }
      return;
    }
    if (action === 'deactivate') {
      if (!confirm('この法人を無効化しますか？（既存の部署の割り当ては残ります）')) return;
      try {
        await deactivateCorporation(id);
        await render();
      } catch (err) {
        alert(`無効化に失敗しました: ${err.message}`);
      }
    }
  });

  await render();
  return () => { if (typeof disposeDelegate === 'function') disposeDelegate(); };
}

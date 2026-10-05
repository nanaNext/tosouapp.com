import { listCorporations, createCorporation, updateCorporation, deactivateCorporation } from '../../api/corporations.api.js';
import { delegate, $ } from '../_shared/dom.js';
import { toast } from './org-ui.js?v=20261005-org1';

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
        <td style="width:110px;"><input class="org-in" data-corp-code="${c.id}" value="${escapeHtml(c.code || '')}" placeholder="コード" style="width:90px;"></td>
        <td><input class="org-in" data-corp-name="${c.id}" value="${escapeHtml(c.name)}" style="width:100%;max-width:320px;"></td>
        <td style="width:70px;">${c.is_active ? '' : '<span class="org-tag off">無効</span>'}</td>
        <td style="width:170px;text-align:right;white-space:nowrap;">
          <button class="org-btn" type="button" data-action="save" data-id="${c.id}">保存</button>
          <button class="org-btn danger" type="button" data-action="deactivate" data-id="${c.id}" ${c.is_active ? '' : 'disabled'}>無効化</button>
        </td>
      </tr>
    `).join('');

    root.innerHTML = `
      <table class="org-table">
        <thead><tr><th>コード</th><th>法人名</th><th></th><th></th></tr></thead>
        <tbody>${rowsHtml || '<tr><td colspan="4" class="org-muted" style="text-align:center;padding:16px;">法人がまだ登録されていません</td></tr>'}</tbody>
      </table>
      <form id="corpCreateForm" style="display:flex;gap:8px;align-items:center;padding:10px 14px;border-top:1px solid #f1f5f9;">
        <input id="corpName" class="org-in" placeholder="新しい法人名（例: 株式会社〇〇建設）" style="width:280px;">
        <button type="submit" class="org-btn primary">法人を追加</button>
      </form>
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
        toast('保存しました');
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

import { fetchJSONAuth } from '../../api/http.api.js';

export async function mount(options = {}) {
  const host = (options && options.content) || document.querySelector('#adminContent');
  if (!host) return;

  host.innerHTML = `
    <div style="padding:16px;max-width:1000px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
        <h2 style="margin:0;font-size:18px;font-weight:700;">支店管理</h2>
        <div style="display:flex;gap:8px;align-items:center;">
          <span style="font-size:13px;color:#64748b;">新規</span>
          <input id="branchNewName" type="text" placeholder="例: 東京支店" style="height:32px;border:1px solid #cbd5e1;border-radius:4px;padding:0 10px;font-size:13px;width:200px;">
          <input id="branchNewCode" type="text" placeholder="コード (任意)" style="height:32px;border:1px solid #cbd5e1;border-radius:4px;padding:0 10px;font-size:13px;width:100px;">
          <button id="btnCreateBranch" type="button" style="height:32px;padding:0 14px;background:#0b2c66;color:#fff;border:none;border-radius:4px;font-size:13px;font-weight:600;cursor:pointer;">作成</button>
        </div>
      </div>

      <div id="branchTableWrap" style="border:1px solid #e2e8f0;border-radius:8px;overflow:auto;">
        <table style="width:100%;border-collapse:collapse;min-width:600px;font-size:13px;">
          <thead>
            <tr style="background:#f1f5f9;">
              <th style="padding:8px 10px;text-align:left;border-bottom:2px solid #e2e8f0;width:50px;">ID</th>
              <th style="padding:8px 10px;text-align:left;border-bottom:2px solid #e2e8f0;width:100px;">コード</th>
              <th style="padding:8px 10px;text-align:left;border-bottom:2px solid #e2e8f0;">名前</th>
              <th style="padding:8px 10px;text-align:left;border-bottom:2px solid #e2e8f0;width:80px;">社員数</th>
              <th style="padding:8px 10px;text-align:left;border-bottom:2px solid #e2e8f0;width:120px;">管理者</th>
              <th style="padding:8px 10px;text-align:left;border-bottom:2px solid #e2e8f0;width:160px;">操作</th>
            </tr>
          </thead>
          <tbody id="branchTableBody">
            <tr><td colspan="6" style="text-align:center;padding:24px;color:#94a3b8;">読み込み中...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  function esc(s) { return String(s || '').replace(/[<>&"']/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'}[c])); }

  async function loadBranches() {
    const tbody = document.getElementById('branchTableBody');
    try {
      const res = await fetchJSONAuth('/api/branches');
      const branches = res?.data || res || [];

      if (!branches.length) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:24px;color:#94a3b8;">支店がまだ登録されていません</td></tr>';
        return;
      }

      tbody.innerHTML = branches.map(b => `
        <tr style="border-bottom:1px solid #f1f5f9;">
          <td style="padding:6px 10px;">${b.id}</td>
          <td style="padding:6px 10px;"><input data-id="${b.id}" data-field="code" value="${esc(b.code || '')}" style="width:80px;height:28px;border:1px solid #e2e8f0;border-radius:4px;padding:0 6px;font-size:12px;"></td>
          <td style="padding:6px 10px;"><input data-id="${b.id}" data-field="name" value="${esc(b.name)}" style="width:100%;height:28px;border:1px solid #e2e8f0;border-radius:4px;padding:0 6px;font-size:13px;"></td>
          <td style="padding:6px 10px;">${b.employeeCount || 0}人</td>
          <td style="padding:6px 10px;font-size:12px;color:#475569;">${esc(b.managerName || '未設定')}</td>
          <td style="padding:6px 10px;">
            <button data-save="${b.id}" style="padding:2px 10px;background:#2563eb;color:#fff;border:none;border-radius:4px;font-size:12px;cursor:pointer;margin-right:4px;">保存</button>
            <button data-delete="${b.id}" style="padding:2px 10px;background:#fff;color:#dc2626;border:1px solid #fca5a5;border-radius:4px;font-size:12px;cursor:pointer;">削除</button>
          </td>
        </tr>
      `).join('');

      // Save buttons
      tbody.querySelectorAll('[data-save]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.dataset.save;
          const name = tbody.querySelector(`input[data-id="${id}"][data-field="name"]`)?.value;
          const code = tbody.querySelector(`input[data-id="${id}"][data-field="code"]`)?.value;
          try {
            await fetchJSONAuth(`/api/branches/${id}`, { method: 'PATCH', body: JSON.stringify({ name, code }) });
            btn.textContent = '✓';
            setTimeout(() => { btn.textContent = '保存'; }, 1000);
          } catch (e) { alert('保存失敗: ' + e.message); }
        });
      });

      // Delete buttons
      tbody.querySelectorAll('[data-delete]').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (!confirm('この支店を削除しますか？所属社員の支店設定が解除されます。')) return;
          try {
            await fetchJSONAuth(`/api/branches/${btn.dataset.delete}`, { method: 'DELETE' });
            await loadBranches();
          } catch (e) { alert('削除失敗: ' + e.message); }
        });
      });
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:24px;color:#ef4444;">エラー: ${esc(e.message)}</td></tr>`;
    }
  }

  // Create branch
  document.getElementById('btnCreateBranch')?.addEventListener('click', async () => {
    const name = document.getElementById('branchNewName')?.value?.trim();
    const code = document.getElementById('branchNewCode')?.value?.trim();
    if (!name) { alert('支店名を入力してください'); return; }
    try {
      await fetchJSONAuth('/api/branches', { method: 'POST', body: JSON.stringify({ name, code }) });
      document.getElementById('branchNewName').value = '';
      document.getElementById('branchNewCode').value = '';
      await loadBranches();
    } catch (e) { alert('作成失敗: ' + e.message); }
  });

  await loadBranches();
}

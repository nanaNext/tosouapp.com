import { requireAdmin } from '../_shared/require-admin.js';
import { fetchJSONAuth } from '../../api/http.api.js';

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);
}

async function mount({ content }) {
  const profile = await requireAdmin();
  if (!profile) return;

  const container = content || document.querySelector('#adminContent');
  if (!container) return;

  const role = String(profile.role || '').toLowerCase();
  const base = role === 'manager' ? '/api/manager' : '/api/admin';

  container.className = 'card wide';
  container.innerHTML = `
    <div style="padding:16px 20px;border-bottom:1px solid #edeff0;">
      <a href="/admin/attendance/shifts" style="color:#0b2c66;text-decoration:none;font-weight:700;">&larr; シフト管理へ戻る</a>
      <h2 style="margin:8px 0 0;font-size:18px;">シフト一括割当</h2>
    </div>
    <div style="padding:16px 20px;border-bottom:1px solid #edeff0;display:flex;flex-wrap:wrap;gap:12px;align-items:flex-end;">
      <div>
        <label style="display:block;font-size:12px;color:#6a6d70;margin-bottom:4px;">シフト *</label>
        <select id="bulkShift" style="padding:6px 10px;border:1px solid #d0d7de;border-radius:6px;min-width:220px;"><option value="">読み込み中...</option></select>
      </div>
      <div>
        <label style="display:block;font-size:12px;color:#6a6d70;margin-bottom:4px;">適用開始日 *</label>
        <input type="date" id="bulkStart" style="padding:6px 10px;border:1px solid #d0d7de;border-radius:6px;">
      </div>
      <div>
        <label style="display:block;font-size:12px;color:#6a6d70;margin-bottom:4px;">適用終了日（空欄=継続）</label>
        <input type="date" id="bulkEnd" style="padding:6px 10px;border:1px solid #d0d7de;border-radius:6px;">
      </div>
      <button type="button" id="btnBulkAssign" style="height:34px;padding:0 16px;border-radius:6px;border:none;background:#0b2c66;color:#fff;font-weight:700;cursor:pointer;">選択した従業員に一括割当</button>
    </div>
    <div id="bulkStatus" style="padding:0 20px;margin-top:10px;font-weight:700;"></div>
    <div style="padding:8px 20px;display:flex;gap:12px;align-items:center;flex-wrap:wrap;">
      <input type="text" id="bulkSearch" placeholder="氏名・社員番号・部署で検索" style="padding:6px 10px;border:1px solid #d0d7de;border-radius:6px;min-width:240px;">
      <label style="font-size:13px;"><input type="checkbox" id="bulkSelectAll"> 表示中を全て選択</label>
      <span id="bulkSelectedCount" style="font-size:12px;color:#6a6d70;"></span>
    </div>
    <div id="bulkEmpList" style="padding:0 20px 20px;">読み込み中...</div>
  `;

  const shiftSelect = container.querySelector('#bulkShift');
  const empListEl = container.querySelector('#bulkEmpList');
  const statusEl = container.querySelector('#bulkStatus');

  try {
    const defs = await fetchJSONAuth('/api/attendance/shifts/definitions');
    const list = Array.isArray(defs) ? defs : [];
    shiftSelect.innerHTML = '<option value="">シフトを選択</option>' + list.map(d =>
      `<option value="${d.id}">${escapeHtml(d.name)} (${d.start_time}-${d.end_time})</option>`
    ).join('');
  } catch (err) {
    shiftSelect.innerHTML = '<option value="">読み込み失敗</option>';
  }

  try {
    const listUrl = role === 'manager' ? `${base}/users?role=employee&limit=2000` : `${base}/employees?role=employee&limit=2000`;
    const res = await fetchJSONAuth(listUrl);
    const rows = Array.isArray(res) ? res : (res && Array.isArray(res.rows) ? res.rows : []);
    const employees = rows.filter(u => String(u.role || '').toLowerCase() === 'employee');
    if (!employees.length) {
      empListEl.innerHTML = '<div style="color:#6a6d70;">対象の従業員がいません。</div>';
    } else {
      empListEl.innerHTML = `
        <table class="excel-table" style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="background:#fafbfc;">
              <th style="width:32px;padding:6px;border:1px solid #edeff0;"></th>
              <th style="text-align:left;padding:6px 10px;border:1px solid #edeff0;">社員番号</th>
              <th style="text-align:left;padding:6px 10px;border:1px solid #edeff0;">氏名</th>
              <th style="text-align:left;padding:6px 10px;border:1px solid #edeff0;">部署</th>
            </tr>
          </thead>
          <tbody>
            ${employees.map(u => {
              const code = u.employee_code || u.employeeCode || '';
              const name = u.username || u.email || '';
              const dept = u.departmentName || '';
              const searchKey = `${code} ${name} ${dept}`.toLowerCase();
              return `
              <tr class="bulk-emp-row" data-search="${escapeHtml(searchKey)}">
                <td style="padding:6px;border:1px solid #edeff0;text-align:center;"><input type="checkbox" class="bulk-emp-cb" value="${u.id}"></td>
                <td style="padding:6px 10px;border:1px solid #edeff0;">${escapeHtml(code)}</td>
                <td style="padding:6px 10px;border:1px solid #edeff0;">${escapeHtml(name)}</td>
                <td style="padding:6px 10px;border:1px solid #edeff0;">${escapeHtml(dept)}</td>
              </tr>
            `;
            }).join('')}
          </tbody>
        </table>
      `;
    }
  } catch (err) {
    empListEl.innerHTML = `<div style="color:#b91c1c;">読み込み失敗: ${escapeHtml(err?.message || 'unknown')}</div>`;
  }

  const selectedCountEl = container.querySelector('#bulkSelectedCount');
  const updateSelectedCount = () => {
    const n = container.querySelectorAll('.bulk-emp-cb:checked').length;
    selectedCountEl.textContent = n ? `${n}人選択中` : '';
  };
  container.addEventListener('change', (ev) => {
    if (ev.target.classList && ev.target.classList.contains('bulk-emp-cb')) updateSelectedCount();
  });

  container.querySelector('#bulkSelectAll').addEventListener('change', (ev) => {
    // Chỉ chọn/bỏ chọn những dòng đang HIỂN THỊ (sau khi lọc tìm kiếm),
    // không đụng tới lựa chọn của những dòng đang bị ẩn.
    container.querySelectorAll('.bulk-emp-row').forEach((row) => {
      if (row.style.display === 'none') return;
      const cb = row.querySelector('.bulk-emp-cb');
      if (cb) cb.checked = ev.target.checked;
    });
    updateSelectedCount();
  });

  const applySearch = (q) => {
    container.querySelectorAll('.bulk-emp-row').forEach((row) => {
      const match = !q || (row.dataset.search || '').includes(q);
      row.style.display = match ? '' : 'none';
    });
    // Đổi bộ lọc thì bỏ trạng thái "đã chọn tất cả" cũ — tránh checkbox vẫn
    // hiện đã tick trong khi danh sách hiển thị đã khác hẳn tập đã chọn.
    container.querySelector('#bulkSelectAll').checked = false;
  };
  let searchTimer = null;
  let isComposing = false;
  const searchInput = container.querySelector('#bulkSearch');
  searchInput.addEventListener('compositionstart', () => { isComposing = true; });
  searchInput.addEventListener('compositionend', (ev) => {
    isComposing = false;
    applySearch(ev.target.value.trim().toLowerCase());
  });
  searchInput.addEventListener('input', (ev) => {
    if (isComposing) return; // Bỏ qua trạng thái gõ dở của IME (chưa xác nhận kanji)
    const value = ev.target.value.trim().toLowerCase();
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => applySearch(value), 200);
  });

  container.querySelector('#btnBulkAssign').addEventListener('click', async () => {
    const shiftId = shiftSelect.value;
    const startDate = container.querySelector('#bulkStart').value;
    const endDate = container.querySelector('#bulkEnd').value || null;
    const userIds = Array.from(container.querySelectorAll('.bulk-emp-cb:checked')).map((cb) => parseInt(cb.value, 10));

    if (!shiftId || !startDate || !userIds.length) {
      statusEl.style.color = '#b91c1c';
      statusEl.textContent = 'シフト・適用開始日・対象従業員（1名以上）は必須です。';
      return;
    }
    if (!window.confirm(`${userIds.length}名の従業員にシフトを割当します。よろしいですか？`)) return;

    const btn = container.querySelector('#btnBulkAssign');
    btn.disabled = true;
    statusEl.style.color = '#0b2c66';
    statusEl.textContent = '処理中...';
    try {
      const res = await fetchJSONAuth('/api/attendance/shifts/assign-bulk', {
        method: 'POST',
        body: JSON.stringify({ userIds, shiftId, startDate, endDate })
      });
      const failed = (res.results || []).filter((r) => !r.ok);
      if (!failed.length) {
        statusEl.style.color = '#166534';
        statusEl.textContent = `完了: ${res.succeeded}名に割当しました。`;
      } else {
        statusEl.style.color = '#b45309';
        statusEl.innerHTML = `成功 ${res.succeeded}名 / 失敗 ${res.failed}名<br>` +
          failed.map((f) => `userId ${f.userId}: ${escapeHtml(f.message)}`).join('<br>');
      }
    } catch (err) {
      statusEl.style.color = '#b91c1c';
      statusEl.textContent = String(err?.message || '割当に失敗しました');
    } finally {
      btn.disabled = false;
    }
  });
}

export { mount };

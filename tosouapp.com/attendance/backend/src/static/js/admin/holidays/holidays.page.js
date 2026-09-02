import { escapeHtml as esc } from '../_shared/dom.js';
import { api } from '../../shared/api/client.js';

let controller = null;

export async function mount({ content }) {
  controller = new AbortController();

  // Trạng thái
  let departments = [];
  let jpHolidays = [];       // Ngày lễ cố định Nhật Bản (祝日) — read only
  let companyHolidays = [];  // Ngày nghỉ công ty (お盆, 年末年始...) — từ company_holidays
  let deptHolidays = [];     // Ngày nghỉ do bộ phận tự thiết lập
  let selectedDeptId = '';
  let selectedYear = new Date().getFullYear();
  let editingItem = null;

  // Hàm tiện ích
  const dowJa = (dateStr) => {
    try {
      const [y, m, d] = String(dateStr).slice(0, 10).split('-').map(Number);
      const dt = new Date(Date.UTC(y, m - 1, d));
      return ['日','月','火','水','木','金','土'][dt.getUTCDay()];
    } catch { return ''; }
  };
  const dowClass = (dateStr) => {
    try {
      const [y, m, d] = String(dateStr).slice(0, 10).split('-').map(Number);
      const dt = new Date(Date.UTC(y, m - 1, d));
      const w = dt.getUTCDay();
      if (w === 0) return 'hol-dow-sun';
      if (w === 6) return 'hol-dow-sat';
      return '';
    } catch { return ''; }
  };
  const typeLabel = (t) => {
    const map = {
      jp_auto: '祝日', jp_substitute: '振替休日', jp_bridge: '国民の休日',
      custom: '会社設定', fixed: '会社指定', annual: '年次', special: '特別'
    };
    return map[t] || t || '—';
  };
  const typeOptions = [
    { value: 'custom', label: '会社設定' },
    { value: 'fixed', label: '会社指定' },
    { value: 'annual', label: '年次休暇' },
    { value: 'special', label: '特別休暇' }
  ];
  const isJpType = (t) => ['jp_auto', 'jp_substitute', 'jp_bridge'].includes(t);

  // Tải danh sách phòng ban
  const loadDepartments = async () => {
    // Thử endpoint admin trước (URL đúng)
    try {
      const data = await api.get('/admin/departments');
      if (Array.isArray(data) && data.length > 0) {
        departments = data;
        return;
      }
    } catch (e) {
      console.warn('[holidays] /admin/departments failed, will use fallback:', e.message || e);
    }
    // Nếu lỗi thì departments sẽ được lấy từ response của loadJpHolidays
  };

  // Tải ngày lễ quốc gia Nhật Bản (祝日)
  const loadJpHolidays = async () => {
    try {
      const data = await api.get(`/holidays/jp?year=${selectedYear}`);
      jpHolidays = Array.isArray(data.holidays) ? data.holidays : [];
      companyHolidays = Array.isArray(data.companyHolidays) ? data.companyHolidays : [];
      // Lấy luôn danh sách phòng ban từ endpoint này làm dự phòng
      if (Array.isArray(data.departments) && data.departments.length > 0 && departments.length === 0) {
        departments = data.departments;
      }
    } catch (e) {
      console.error('[holidays] Failed to load JP holidays:', e);
      jpHolidays = [];
      companyHolidays = [];
    }
  };

  // Tải ngày nghỉ tùy chỉnh theo phòng ban
  const loadDeptHolidays = async () => {
    try {
      const params = new URLSearchParams({ year: selectedYear });
      if (selectedDeptId) params.set('department_id', selectedDeptId);
      const data = await api.get(`/holidays?${params.toString()}`);
      deptHolidays = Array.isArray(data.rows) ? data.rows : [];
    } catch (e) {
      console.error('[holidays] Failed to load dept holidays:', e);
      deptHolidays = [];
    }
  };

  // Gộp & sắp xếp tất cả ngày nghỉ để hiển thị
  const getMergedList = () => {
    const jpRows = jpHolidays.map(r => ({
      id: null,
      date: String(r.date || '').slice(0, 10),
      name: r.name || '',
      name_en: r.name_en || '',
      type: r.type,
      is_off: 1,
      department_name: '—',
      department_id: null,
      source: 'jp'
    }));
    const companyRows = companyHolidays.map(r => ({
      id: null,
      date: String(r.date || '').slice(0, 10),
      name: r.name || '',
      name_en: '',
      type: r.type || 'fixed',
      is_off: 1,
      department_name: '全社',
      department_id: null,
      source: 'company'
    }));
    const deptRows = deptHolidays.map(r => ({
      id: r.id,
      date: String(r.date || '').slice(0, 10),
      name: r.name || '',
      name_en: '',
      type: r.type,
      is_off: r.is_off,
      department_name: r.department_name || departments.find(d => String(d.id) === String(r.department_id))?.name || '',
      department_id: r.department_id,
      source: 'dept'
    }));
    const all = [...jpRows, ...companyRows, ...deptRows];
    all.sort((a, b) => a.date.localeCompare(b.date));
    return all;
  };

  // Render giao diện
  const render = () => {
    if (!content) return;
    const merged = getMergedList();

    const deptOptions = departments.map(d =>
      `<option value="${esc(d.id)}" ${String(d.id) === String(selectedDeptId) ? 'selected' : ''}>${esc(d.name)}</option>`
    ).join('');

    const yearOptions = [];
    for (let y = selectedYear - 2; y <= selectedYear + 2; y++) {
      yearOptions.push(`<option value="${y}" ${y === selectedYear ? 'selected' : ''}>${y}年</option>`);
    }

    const jpCount = merged.filter(r => r.source === 'jp').length;
    const companyCount = merged.filter(r => r.source === 'company').length;
    const deptCount = merged.filter(r => r.source === 'dept').length;

    const tableRows = merged.map(h => {
      const isJp = h.source === 'jp';
      const isCompany = h.source === 'company';
      const isReadOnly = isJp || isCompany;
      const rowClass = isJp ? 'hol-row-jp' : (isCompany ? 'hol-row-company' : 'hol-row-dept');
      return `
        <tr class="${rowClass}">
          <td class="${dowClass(h.date)}">${esc(h.date)}</td>
          <td class="${dowClass(h.date)}">${esc(dowJa(h.date))}</td>
          <td>${isJp ? `<span class="hol-badge-jp">祝日</span>` : (isCompany ? `<span class="hol-badge-company">全社</span>` : esc(h.department_name))}</td>
          <td>${esc(h.name)}${h.name_en ? ` <span class="hol-name-en">${esc(h.name_en)}</span>` : ''}</td>
          <td><span class="hol-pill ${h.is_off ? 'hol-pill-off' : 'hol-pill-on'}">${h.is_off ? '休' : '出勤'}</span></td>
          <td>${esc(typeLabel(h.type))}</td>
          <td class="hol-actions-cell">
            ${isReadOnly ? '<span class="hol-fixed-label">固定</span>' : `
              <button class="hol-btn-edit" data-id="${esc(h.id)}" title="編集">✏️</button>
              <button class="hol-btn-del" data-id="${esc(h.id)}" title="削除">🗑️</button>
            `}
          </td>
        </tr>
      `;
    }).join('');

    content.innerHTML = `
      <style>
        .hol-page { display:flex; flex-direction:column; height:100%; padding:24px; box-sizing:border-box; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; }
        .hol-toolbar { display:flex; flex-wrap:wrap; align-items:center; gap:10px; margin-bottom:16px; }
        .hol-toolbar select, .hol-toolbar button { height:36px; border-radius:6px; border:1px solid #cbd5e1; padding:0 12px; font-size:13px; background:#fff; cursor:pointer; }
        .hol-toolbar button.primary { background:#1e40af; color:#fff; border-color:#1e40af; font-weight:600; }
        .hol-toolbar button.primary:hover { background:#1e3a8a; }
        .hol-toolbar button.danger { background:#fff; color:#dc2626; border-color:#fca5a5; }
        .hol-toolbar button.danger:hover { background:#fef2f2; }
        .hol-stats { display:flex; gap:12px; flex-wrap:wrap; font-size:13px; color:#64748b; margin-bottom:12px; align-items:center; }
        .hol-stats strong { color:#1e293b; }
        .hol-stat-badge { display:inline-flex; align-items:center; gap:4px; padding:3px 10px; border-radius:12px; font-size:12px; font-weight:600; }
        .hol-stat-jp { background:#fef3c7; color:#92400e; }
        .hol-stat-company { background:#dbeafe; color:#1e40af; }
        .hol-stat-dept { background:#e0e7ff; color:#4338ca; }
        .hol-table-wrap { flex:1; overflow:auto; border:1px solid #e2e8f0; border-radius:8px; background:#fff; }
        .hol-table { width:100%; border-collapse:collapse; font-size:13px; }
        .hol-table thead { background:#f8fafc; position:sticky; top:0; z-index:1; }
        .hol-table th { padding:10px 12px; text-align:left; font-weight:600; color:#475569; border-bottom:2px solid #e2e8f0; white-space:nowrap; }
        .hol-table td { padding:9px 12px; border-bottom:1px solid #f1f5f9; color:#1e293b; }
        .hol-table tbody tr:hover { background:#f8fafc; }
        .hol-row-jp { background:#fffbeb; }
        .hol-row-jp:hover { background:#fef3c7 !important; }
        .hol-row-company { background:#eff6ff; }
        .hol-row-company:hover { background:#dbeafe !important; }
        .hol-row-dept { background:#fff; }
        .hol-badge-jp { display:inline-block; padding:2px 8px; border-radius:10px; font-size:11px; font-weight:700; background:#fde68a; color:#92400e; }
        .hol-badge-company { display:inline-block; padding:2px 8px; border-radius:10px; font-size:11px; font-weight:700; background:#bfdbfe; color:#1e40af; }
        .hol-name-en { color:#94a3b8; font-size:11px; }
        .hol-pill { display:inline-block; padding:2px 8px; border-radius:12px; font-size:11px; font-weight:600; }
        .hol-pill-off { background:#fee2e2; color:#dc2626; }
        .hol-pill-on { background:#dcfce7; color:#16a34a; }
        .hol-fixed-label { font-size:11px; color:#94a3b8; font-style:italic; }
        .hol-actions-cell { white-space:nowrap; }
        .hol-btn-edit, .hol-btn-del { background:none; border:none; cursor:pointer; font-size:15px; padding:4px; border-radius:4px; }
        .hol-btn-edit:hover { background:#e0f2fe; }
        .hol-btn-del:hover { background:#fee2e2; }
        .hol-dow-sun { color:#dc2626; font-weight:600; }
        .hol-dow-sat { color:#2563eb; font-weight:600; }
        .hol-empty { text-align:center; padding:48px 24px; color:#94a3b8; }
        .hol-empty-icon { font-size:32px; margin-bottom:8px; }

        /* Modal */
        .hol-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.4); z-index:10000; display:flex; align-items:center; justify-content:center; }
        .hol-modal { background:#fff; border-radius:12px; padding:28px 32px; width:440px; max-width:90vw; box-shadow:0 20px 60px rgba(0,0,0,0.15); }
        .hol-modal h3 { margin:0 0 20px; font-size:16px; color:#1e293b; }
        .hol-modal label { display:block; font-size:12px; font-weight:600; color:#475569; margin-bottom:4px; margin-top:14px; }
        .hol-modal input, .hol-modal select { width:100%; height:36px; border:1px solid #cbd5e1; border-radius:6px; padding:0 10px; font-size:13px; box-sizing:border-box; }
        .hol-modal input:focus, .hol-modal select:focus { outline:none; border-color:#3b82f6; box-shadow:0 0 0 3px rgba(59,130,246,0.1); }
        .hol-modal-actions { display:flex; justify-content:flex-end; gap:8px; margin-top:24px; }
        .hol-modal-actions button { height:36px; padding:0 16px; border-radius:6px; font-size:13px; font-weight:600; cursor:pointer; border:1px solid #cbd5e1; background:#fff; color:#475569; }
        .hol-modal-actions button.save { background:#1e40af; color:#fff; border-color:#1e40af; }
        .hol-modal-actions button.save:hover { background:#1e3a8a; }
        .hol-checkbox-row { display:flex; align-items:center; gap:8px; margin-top:14px; }
        .hol-checkbox-row input[type="checkbox"] { width:auto; height:auto; }
        .hol-hint { font-size:11px; color:#94a3b8; margin-top:4px; }

        @media (max-width:768px) {
          .hol-page { padding:12px; }
          .hol-toolbar { gap:6px; }
          .hol-toolbar select, .hol-toolbar button { height:32px; font-size:12px; padding:0 8px; }
          .hol-table { font-size:12px; }
          .hol-table th, .hol-table td { padding:7px 8px; }
          .hol-modal { padding:20px; width:95vw; }
        }
      </style>
      <div class="hol-page">
        <div class="hol-toolbar">
          <select id="holDept">
            <option value="">全部署</option>
            ${deptOptions}
          </select>
          <select id="holYear">${yearOptions.join('')}</select>
          <button class="primary" id="holAdd">＋ 休日追加</button>
          <button class="danger" id="holBulkDel" ${!selectedDeptId ? 'disabled title="部署を選択してください"' : ''}>一括削除</button>
        </div>
        <div class="hol-stats">
          <span class="hol-stat-badge hol-stat-jp">🇯🇵 祝日: ${jpCount}件</span>
          <span class="hol-stat-badge hol-stat-company">🏢 全社休日: ${companyCount}件</span>
          <span class="hol-stat-badge hol-stat-dept">📋 部署設定: ${deptCount}件</span>
          <span>合計: <strong>${merged.length}</strong>件</span>
          ${selectedDeptId ? `<span>— ${esc(departments.find(d => String(d.id) === String(selectedDeptId))?.name || '')}</span>` : ''}
        </div>
        <div class="hol-table-wrap">
          ${merged.length ? `
            <table class="hol-table">
              <thead>
                <tr>
                  <th>日付</th>
                  <th>曜日</th>
                  <th>部署/区分</th>
                  <th>名称</th>
                  <th>休日</th>
                  <th>種別</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>${tableRows}</tbody>
            </table>
          ` : `
            <div class="hol-empty">
              <div class="hol-empty-icon">📅</div>
              <div>データがありません</div>
            </div>
          `}
        </div>
      </div>
    `;

    // Gắn sự kiện
    content.querySelector('#holDept')?.addEventListener('change', async (e) => {
      selectedDeptId = e.target.value;
      await loadDeptHolidays();
      render();
    });
    content.querySelector('#holYear')?.addEventListener('change', async (e) => {
      selectedYear = parseInt(e.target.value, 10);
      await Promise.all([loadJpHolidays(), loadDeptHolidays()]);
      render();
    });
    content.querySelector('#holAdd')?.addEventListener('click', () => {
      editingItem = { id: null, department_id: selectedDeptId || '', date: '', name: '', type: 'custom', is_off: true };
      renderModal();
    });
    content.querySelector('#holBulkDel')?.addEventListener('click', async () => {
      if (!selectedDeptId) return;
      const deptName = departments.find(d => String(d.id) === String(selectedDeptId))?.name || '';
      if (!confirm(`「${deptName}」の ${selectedYear}年 の会社設定休日を全て削除しますか？\n※ 祝日（国の休日）は削除されません。`)) return;
      try {
        await api.del(`/holidays/department/${selectedDeptId}/year/${selectedYear}`);
        await loadDeptHolidays();
        render();
      } catch (e) {
        alert('削除に失敗しました: ' + (e.message || e));
      }
    });
    content.querySelectorAll('.hol-btn-edit').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const item = deptHolidays.find(h => String(h.id) === id);
        if (!item) return;
        editingItem = { ...item, date: String(item.date || '').slice(0, 10), is_off: !!item.is_off };
        renderModal();
      });
    });
    content.querySelectorAll('.hol-btn-del').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        if (!confirm('この休日を削除しますか？')) return;
        try {
          await api.del(`/holidays/${id}`);
          await loadDeptHolidays();
          render();
        } catch (e) {
          alert('削除に失敗しました: ' + (e.message || e));
        }
      });
    });
  };

  // Render modal
  const renderModal = () => {
    document.querySelector('.hol-overlay')?.remove();
    if (!editingItem) return;

    const isNew = !editingItem.id;
    const deptOpts = departments.map(d =>
      `<option value="${esc(d.id)}" ${String(d.id) === String(editingItem.department_id) ? 'selected' : ''}>${esc(d.name)}</option>`
    ).join('');
    const typeOpts = typeOptions.map(t =>
      `<option value="${esc(t.value)}" ${t.value === editingItem.type ? 'selected' : ''}>${esc(t.label)}</option>`
    ).join('');

    const overlay = document.createElement('div');
    overlay.className = 'hol-overlay';
    overlay.innerHTML = `
      <div class="hol-modal">
        <h3>${isNew ? '🏢 会社休日を追加' : '✏️ 休日を編集'}</h3>
        <label>対象 <span style="color:#dc2626">*</span></label>
        <select id="holModalDept" ${!isNew ? 'disabled' : ''}>
          <option value="">選択してください</option>
          <option value="__all__" ${editingItem.department_id === '__all__' ? 'selected' : ''}>🏢 全社（全体）</option>
          ${deptOpts}
        </select>
        <div class="hol-hint">※「全社」を選ぶと全社員に適用されます（お盆・年末年始など）</div>
        <label>日付 <span style="color:#dc2626">*</span></label>
        <input type="date" id="holModalDate" value="${esc(editingItem.date || '')}">
        <label>名称</label>
        <input type="text" id="holModalName" value="${esc(editingItem.name || '')}" placeholder="例: お盆休み、年末年始、創立記念日">
        <label>種別</label>
        <select id="holModalType">${typeOpts}</select>
        <div class="hol-checkbox-row">
          <input type="checkbox" id="holModalIsOff" ${editingItem.is_off ? 'checked' : ''}>
          <label for="holModalIsOff" style="margin:0;cursor:pointer;">休日とする</label>
        </div>
        <div class="hol-modal-actions">
          <button id="holModalCancel">キャンセル</button>
          <button class="save" id="holModalSave">${isNew ? '登録' : '更新'}</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });
    overlay.querySelector('#holModalCancel').addEventListener('click', closeModal);
    overlay.querySelector('#holModalSave').addEventListener('click', async () => {
      const dept = overlay.querySelector('#holModalDept').value;
      const date = overlay.querySelector('#holModalDate').value;
      const name = overlay.querySelector('#holModalName').value.trim();
      const type = overlay.querySelector('#holModalType').value;
      const isOff = overlay.querySelector('#holModalIsOff').checked;

      if (!dept) { alert('対象を選択してください'); return; }
      if (!date) { alert('日付を入力してください'); return; }

      try {
        if (dept === '__all__') {
          // Toàn công ty → lưu vào bảng company_holidays
          await api.post('/holidays/company', { date, name, type: type || 'fixed', is_off: isOff });
        } else if (isNew) {
          await api.post('/holidays', { department_id: dept, date, name, type, is_off: isOff });
        } else {
          await api.patch(`/holidays/${editingItem.id}`, { date, name, type, is_off: isOff });
        }
        closeModal();
        await Promise.all([loadJpHolidays(), loadDeptHolidays()]);
        render();
      } catch (e) {
        console.error('[holidays] Save failed:', e);
        alert('保存に失敗しました: ' + (e.message || JSON.stringify(e)));
      }
    });
  };

  const closeModal = () => {
    editingItem = null;
    document.querySelector('.hol-overlay')?.remove();
  };

  // Tải lần đầu
  await loadDepartments();
  await Promise.all([loadJpHolidays(), loadDeptHolidays()]);
  render();

  // Dọn dẹp
  return () => {
    if (controller) { controller.abort(); controller = null; }
    closeModal();
  };
}

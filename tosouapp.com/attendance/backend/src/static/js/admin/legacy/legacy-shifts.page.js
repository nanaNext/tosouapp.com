import { api } from '../../shared/api/client.js';

export async function mount({ content }) {
  await mountShifts({ content });
}

export async function mountShifts({ content }) {
  // Check if standalone
  const isStandalone = new URLSearchParams(window.location.search).get('standalone') === '1';
  const vhExpr = isStandalone ? '100dvh' : 'calc(100vh - var(--topbar-height) - var(--subbar-height))';

  content.style.margin = '0';
  content.style.padding = '0';
  content.style.width = '100%';
  content.style.height = vhExpr;
  content.style.display = 'flex';
  content.style.flexDirection = 'column';
  content.style.overflow = 'hidden';
  content.style.background = '#FFFFFF';
  content.style.flex = '1';
  content.style.minWidth = '0';
  content.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'admin-shifts shift-fiori-override';
  wrap.style.cssText = `display: flex; flex-direction: column; height: 100%;`;

  const head = document.createElement('div');
  head.className = 'form-title page-title';
  head.textContent = 'シフト管理';
  head.style.display = 'none'; // Ẩn cái này đi vì đã có tiêu đề ở dưới
  wrap.appendChild(head);

  const defCard = document.createElement('div');
  defCard.className = 'form-card';
  defCard.style.cssText = `
    background: #fff;
    border: none;
    box-shadow: none;
    border-radius: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    flex: 1;
    overflow: hidden;
    margin: 0;
  `;
  const defTitle = document.createElement('div');
  defTitle.className = 'form-title';
  defTitle.textContent = 'シフト管理'; // Đổi từ シフト定義 thành シフト管理
  defTitle.style.display = 'none';
  defCard.appendChild(defTitle);
  
  const addWrap = document.createElement('div');
  addWrap.className = 'form-actions';
  addWrap.style.borderTop = 'none';
  addWrap.style.borderBottom = '1px solid #e2e8f0';
  let nameIn = document.createElement('input');
  nameIn.type = 'text'; nameIn.placeholder = '例: day_8_17'; nameIn.style.minWidth = '160px'; nameIn.style.marginRight = '8px';
  let sIn = document.createElement('input');
  sIn.type = 'time'; sIn.value = '08:00'; sIn.style.marginRight = '8px';
  let eIn = document.createElement('input');
  eIn.type = 'time'; eIn.value = '17:00'; eIn.style.marginRight = '8px';
  let brSel = document.createElement('select');
  brSel.style.marginRight = '8px';
  brSel.innerHTML = '<option value="60">1:00</option><option value="45">0:45</option><option value="30">0:30</option><option value="0">0:00</option>';
  
  const buildPayload = () => ({
    name: normalizeName(nameIn.value),
    start_time: String(sIn.value || '').trim(),
    end_time: String(eIn.value || '').trim(),
    break_minutes: parseInt(String(brSel.value || '0'), 10)
  });
  const validatePayload = (payload) => {
    if (!payload.name) return false;
    if (!/^\d{2}:\d{2}$/.test(payload.start_time)) return false;
    if (!/^\d{2}:\d{2}$/.test(payload.end_time)) return false;
    return true;
  };
  const refresh = async () => {
    const rows = await api.get('/attendance/shifts/definitions');
    defs = Array.isArray(rows) ? rows : [];
    renderDefs(defs);
  };
  const clearInputs = () => {
    nameIn.value = '';
  };

  const addBtn = document.createElement('button');
  addBtn.className = 'btn-primary';
  addBtn.textContent = '追加';
  addBtn.style.padding = '0 12px';
  addBtn.style.height = '30px';
  addBtn.style.minHeight = '30px';
  addBtn.style.width = 'auto';
  addBtn.style.minWidth = '60px';
  addBtn.style.boxSizing = 'border-box';
  addBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    const payload = buildPayload();
    if (!validatePayload(payload)) {
      alert('名称・開始・終了を入力してください');
      return;
    }
    if (findDefByName(payload.name)) {
      alert('同じ名称のシフトが既に存在します。更新する場合は「更新」を押してください。');
      return;
    }
    await api.post('/attendance/shifts/definitions', payload);
    await refresh();
    clearInputs();
  });

  const updateBtn = document.createElement('button');
  updateBtn.className = 'btn-secondary';
  updateBtn.style.marginLeft = '8px';
  updateBtn.style.padding = '0 12px';
  updateBtn.style.height = '30px';
  updateBtn.style.minHeight = '30px';
  updateBtn.style.width = 'auto';
  updateBtn.style.minWidth = '60px';
  updateBtn.style.boxSizing = 'border-box';
  updateBtn.textContent = '更新';
  updateBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    const payload = buildPayload();
    if (!validatePayload(payload)) {
      alert('名称・開始・終了を入力してください');
      return;
    }
    if (!findDefByName(payload.name)) {
      alert('更新できません: 対象のシフトが見つかりません。追加する場合は「追加」を押してください。');
      return;
    }
    await api.post('/attendance/shifts/definitions', payload);
    await refresh();
  });
  addWrap.appendChild(nameIn);
  addWrap.appendChild(sIn);
  addWrap.appendChild(eIn);
  addWrap.appendChild(brSel);
  addWrap.appendChild(addBtn);
  addWrap.appendChild(updateBtn);
  defCard.appendChild(addWrap);

  const defTable = document.createElement('table');
  defTable.className = 'excel-table';
  defTable.innerHTML = `
    <thead><tr>
      <th style="width:160px;">名称</th>
      <th style="width:120px;">開始</th>
      <th style="width:120px;">終了</th>
      <th style="width:120px;">休憩</th>
      <th style="width:140px;">所定時間</th>
      <th style="width:120px;">削除</th>
    </tr></thead>
    <tbody></tbody>
  `;
  // cái này có chức năng render list
  let defs = [];
  const normalizeName = (v) => String(v || '').trim();
  const findDefByName = (name) => {
    const n = normalizeName(name);
    if (!n) return null;
    return (Array.isArray(defs) ? defs : []).find(d => normalizeName(d?.name) === n) || null;
  };
  const renderDefs = (rows) => {
    const tb = defTable.querySelector('tbody');
    tb.innerHTML = '';
    for (const d of (Array.isArray(rows) ? rows : [])) {
      const tr = document.createElement('tr');
      const tdN = document.createElement('td'); tdN.textContent = d.name || '';
      const tdS = document.createElement('td'); tdS.textContent = d.start_time || '';
      const tdE = document.createElement('td'); tdE.textContent = d.end_time || '';
      const tdB = document.createElement('td'); tdB.textContent = String(d.break_minutes ?? 0);
      const tdM = document.createElement('td'); tdM.textContent = String(d.standard_minutes ?? '');
      const tdDel = document.createElement('td');
      const delBtn = document.createElement('button');
      delBtn.className = 'btn-danger';
      delBtn.textContent = '削除';
      delBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const id = Number(d.id);
        if (!id) {
          alert('削除できません: IDがありません');
          return;
        }
        if (!confirm(`${d.name || ''} を削除しますか？`)) return;
        try {
          await api.del(`/attendance/shifts/definitions/${id}`);
          const rows2 = await api.get('/attendance/shifts/definitions');
          defs = Array.isArray(rows2) ? rows2 : [];
          renderDefs(rows2);
        } catch (err) {
          const msg = String(err?.message || err || '');
          if (msg.toLowerCase().includes('409')) {
            alert('このシフトは使用中のため削除できません');
            return;
          }
          alert('削除に失敗しました');
        }
      });
      tdDel.appendChild(delBtn);
      tr.appendChild(tdN); tr.appendChild(tdS); tr.appendChild(tdE); tr.appendChild(tdB); tr.appendChild(tdM); tr.appendChild(tdDel);
      tr.addEventListener('click', () => {
        try {
          const nameInput = document.querySelector('.form-actions input[type="text"]');
          const timeInputs = document.querySelectorAll('.form-actions input[type="time"]');
          const select = document.querySelector('.form-actions select');
          
          if (!nameInput || timeInputs.length < 2 || !select) return;
          
          nameInput.value = d.name || '';
          timeInputs[0].value = d.start_time || '';
          timeInputs[1].value = d.end_time || '';
          select.value = String(d.break_minutes ?? 0);
        } catch (e) { /* silently ignored */ }
      });
      tb.appendChild(tr);
    }
  };
  try {
    defs = await api.get('/attendance/shifts/definitions');
  } catch { defs = []; }
  renderDefs(defs);
  const tableContainer = document.createElement('div');
  tableContainer.className = 'table-container';
  tableContainer.appendChild(defTable);
  defCard.appendChild(tableContainer);

  wrap.appendChild(defCard);

  content.innerHTML = '';
  content.innerHTML = `
    <style>
      .shift-fiori-override .form-title {
        font-size: 16px !important;
        font-weight: 700 !important;
        color: #111827 !important;
        letter-spacing: -0.01em;
        margin: 0 !important;
        padding: 16px 24px 16px 24px !important;
        border-bottom: none !important;
      }
      .shift-fiori-override .form-card {
        background: #fff !important;
        border: none !important;
        box-shadow: none !important;
        border-radius: 0 !important;
        padding: 0 !important;
        display: flex;
        flex-direction: column;
        flex: 1;
        overflow: hidden;
      }
      .shift-fiori-override .form-card .form-title {
        padding: 0 24px 12px 24px !important;
      }
      .shift-fiori-override .excel-table {
        margin: 0 !important;
        border-top: none !important;
        width: 100%;
        border-collapse: collapse;
      }
      .shift-fiori-override .excel-table th {
        padding: 6px 12px !important;
        font-size: 12px !important;
        background: #f8fafc !important;
        color: #475569 !important;
        border-bottom: 1px solid #e2e8f0 !important;
        position: sticky;
        top: 0;
        z-index: 10;
        text-align: left;
      }
      .shift-fiori-override .excel-table td {
        padding: 6px 12px !important;
        font-size: 13px !important;
        vertical-align: middle !important;
        border-bottom: 1px solid #f1f5f9 !important;
      }
      .shift-fiori-override .excel-table {
        border-collapse: collapse !important;
        width: 100% !important;
      }
      .shift-fiori-override .excel-table th {
        background-color: #e6f2ff !important;
        color: #0f172a !important;
        font-weight: 600 !important;
        border: 1px solid #cbd5e1 !important;
        padding: 4px 8px !important;
        font-size: 13px !important;
        text-align: center !important;
        white-space: nowrap;
      }
      .shift-fiori-override .excel-table td {
        border: 1px solid #cbd5e1 !important;
        padding: 2px 8px !important;
        font-size: 13px !important;
        vertical-align: middle !important;
        text-align: center !important;
      }
      .shift-fiori-override .excel-table tbody tr {
        cursor: pointer;
        transition: background-color 0.15s;
      }
      .shift-fiori-override .excel-table tbody tr:hover td {
        background-color: #f8fafc !important;
      }
      .shift-fiori-override input[type="text"],
      .shift-fiori-override input[type="time"],
      .shift-fiori-override select {
        height: 30px !important;
        font-size: 13px !important;
        padding: 0 10px !important;
        border-radius: 4px !important;
        box-sizing: border-box;
        border: 1px solid #cbd5e1;
        outline: none;
        transition: all 0.2s;
        background: #fff;
        color: #0f172a;
      }
      .shift-fiori-override input[type="text"]:focus,
      .shift-fiori-override input[type="time"]:focus,
      .shift-fiori-override select:focus {
        border-color: #3b82f6;
        box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
      }
      .shift-fiori-override .btn-primary,
      .shift-fiori-override .btn-secondary,
      .shift-fiori-override .btn-danger {
        height: 30px !important;
        min-height: 30px !important;
        font-size: 13px !important;
        padding: 0 12px !important;
        border-radius: 4px !important;
        box-sizing: border-box !important;
        border: none;
        cursor: pointer;
        font-weight: 500;
        transition: all 0.2s;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: auto !important;
        min-width: 60px !important;
      }
      .shift-fiori-override .btn-primary {
        background-color: #0a6ed1 !important;
        border: 1px solid #0a6ed1 !important;
        color: #ffffff !important;
      }
      .shift-fiori-override .btn-primary:hover {
        background-color: #0854a0 !important;
        border-color: #0854a0 !important;
        box-shadow: 0 1px 3px rgba(0,0,0,0.15) !important;
      }
      .shift-fiori-override .btn-secondary {
        background-color: transparent !important;
        border: 1px solid #0a6ed1 !important;
        color: #0a6ed1 !important;
      }
      .shift-fiori-override .btn-secondary:hover {
        background-color: #e5f0fa !important;
      }
      .shift-fiori-override .btn-danger {
        background: #fef2f2 !important;
        color: #dc2626 !important;
        border: 1px solid #fca5a5 !important;
        padding: 0 10px !important;
        height: 26px !important;
        font-size: 12px !important;
      }
      .shift-fiori-override .btn-danger:hover {
        background: #fee2e2 !important;
        border-color: #f87171 !important;
      }
      .shift-fiori-override .form-actions {
        padding: 16px 24px !important;
        background: #f8fafc;
        border-top: 1px solid #e2e8f0;
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        flex-shrink: 0;
      }
      .shift-fiori-override .table-container {
        flex: 1;
        overflow: auto;
        padding: 0 24px 24px 24px;
      }
    </style>
  `;
  content.appendChild(wrap);
}

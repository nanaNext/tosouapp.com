import { api } from '../../shared/api/client.js';

export async function mount({ content }) {
  await mountShifts({ content });
}

export async function mountShifts({ content }) {
  // Check if standalone
  const isStandalone = new URLSearchParams(window.location.search).get('standalone') === '1';
  const vhExpr = isStandalone ? '100dvh' : 'calc(100vh - var(--topbar-height) - var(--subbar-height))';

  content.className = (content.className || '') + ' shift-page-content';
  content.style.cssText = `margin: 0; padding: 0; width: 100%; display: flex; flex-direction: column; background: #FFFFFF; flex: 1; min-width: 0;`;
  content.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'admin-shifts shift-fiori-override';
  wrap.style.cssText = `display: flex; flex-direction: column; flex: 1 1 0%; min-height: 0;`;

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
    flex: 1 1 0%;
    min-height: 0;
    margin: 0;
  `;
  const defTitle = document.createElement('div');
  defTitle.className = 'form-title';
  defTitle.textContent = 'シフト管理'; // Đổi từ シフト定義 thành シフト管理
  defTitle.style.display = 'none';
  defCard.appendChild(defTitle);
  
  const addWrap = document.createElement('div');
  addWrap.className = 'form-actions shift-form-actions';
  addWrap.style.borderTop = 'none';
  addWrap.style.borderBottom = '1px solid #e2e8f0';
  
  // Create wrapper for inputs
  const inputsWrap = document.createElement('div');
  inputsWrap.className = 'shift-inputs-wrap';
  
  const createField = (labelText, inputEl) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'shift-field-wrapper';
    
    const label = document.createElement('label');
    label.className = 'shift-field-label';
    label.textContent = labelText;
    if (inputEl.id) {
      label.htmlFor = inputEl.id;
    }
    
    wrapper.appendChild(label);
    wrapper.appendChild(inputEl);
    return wrapper;
  };
  
  let nameIn = document.createElement('input');
  nameIn.type = 'text'; nameIn.name = 'shift_name'; nameIn.id = 'shiftNameInput'; nameIn.placeholder = '例: day_8_17'; nameIn.className = 'shift-input';
  let sIn = document.createElement('input');
  sIn.type = 'time'; sIn.name = 'shift_start'; sIn.id = 'shiftStartInput'; sIn.value = '08:00'; sIn.className = 'shift-input';
  let eIn = document.createElement('input');
  eIn.type = 'time'; eIn.name = 'shift_end'; eIn.id = 'shiftEndInput'; eIn.value = '17:00'; eIn.className = 'shift-input';
  let brSel = document.createElement('select');
  brSel.name = 'shift_break'; brSel.id = 'shiftBreakSelect'; brSel.className = 'shift-input';
  brSel.innerHTML = '<option value="180">180分 (3時間)</option><option value="150">150分 (2時間半)</option><option value="120">120分 (2時間)</option><option value="90">90分</option><option value="60" selected>60分</option><option value="45">45分</option><option value="30">30分</option><option value="0">0分</option>';
  
  inputsWrap.appendChild(createField('名称', nameIn));
  inputsWrap.appendChild(createField('開始時間', sIn));
  inputsWrap.appendChild(createField('終了時間', eIn));
  inputsWrap.appendChild(createField('休憩時間', brSel));
  
  // Create wrapper for buttons
  const btnsWrap = document.createElement('div');
  btnsWrap.className = 'shift-btns-wrap';
  
  let addBtn = document.createElement('button');
  addBtn.type = 'button'; addBtn.className = 'shift-btn shift-btn-add'; addBtn.textContent = '追加';
  let updateBtn = document.createElement('button');
  updateBtn.type = 'button'; updateBtn.className = 'shift-btn shift-btn-update'; updateBtn.textContent = '更新';
  updateBtn.disabled = true; // Disabled by default
  updateBtn.style.opacity = '0.5'; // Visual cue for disabled
  updateBtn.style.cursor = 'not-allowed';
  
  btnsWrap.appendChild(addBtn);
  btnsWrap.appendChild(updateBtn);
  
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
    clearInputs();
  };
  const clearInputs = () => {
    nameIn.value = '';
    sIn.value = '08:00';
    eIn.value = '17:00';
    brSel.value = '60';
    updateBtn.disabled = true;
    updateBtn.style.opacity = '0.5';
    updateBtn.style.cursor = 'not-allowed';
    addBtn.disabled = false;
    addBtn.style.opacity = '1';
    addBtn.style.cursor = 'pointer';
  };

  const enableUpdate = () => {
    updateBtn.disabled = false;
    updateBtn.style.opacity = '1';
    updateBtn.style.cursor = 'pointer';
    addBtn.disabled = true;
    addBtn.style.opacity = '0.5';
    addBtn.style.cursor = 'not-allowed';
  };

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
  addWrap.appendChild(inputsWrap);
  addWrap.appendChild(btnsWrap);
  defCard.appendChild(addWrap);

  const defTable = document.createElement('div');
  defTable.className = 'shift-list-container';
  
  // Create desktop table inside container
  const desktopTable = document.createElement('table');
  desktopTable.className = 'excel-table shift-desktop-table';
  desktopTable.innerHTML = `
    <thead><tr>
      <th style="width:160px;">名称</th>
      <th style="width:120px; text-align:center;">開始時間</th>
      <th style="width:120px; text-align:center;">終了時間</th>
      <th style="width:100px; text-align:center;">休憩時間</th>
      <th style="width:120px; text-align:center;">所定時間(分)</th>
      <th style="width:80px; text-align:center;">削除</th>
    </tr></thead>
    <tbody></tbody>
  `;
  defTable.appendChild(desktopTable);
  
  // Create mobile card list inside container
  const mobileList = document.createElement('div');
  mobileList.className = 'shift-mobile-list';
  defTable.appendChild(mobileList);

  // cái này có chức năng render list
  let defs = [];
  const normalizeName = (v) => String(v || '').trim();
  const findDefByName = (name) => {
    const n = normalizeName(name);
    if (!n) return null;
    return (Array.isArray(defs) ? defs : []).find(d => normalizeName(d?.name) === n) || null;
  };
  const formatTime = (s) => (s && s.length >= 5) ? s.substring(0,5) : '';

  const renderDefs = (rows) => {
    const tb = desktopTable.querySelector('tbody');
    tb.innerHTML = '';
    
    // Render mobile list
    mobileList.innerHTML = '';

    for (const d of (Array.isArray(rows) ? rows : [])) {
      const tr = document.createElement('tr');
      const tdN = document.createElement('td'); tdN.textContent = d.name || ''; tdN.style.textAlign = 'center';
      const tdS = document.createElement('td'); tdS.textContent = formatTime(d.start_time || ''); tdS.style.textAlign = 'center';
      const tdE = document.createElement('td'); tdE.textContent = formatTime(d.end_time || ''); tdE.style.textAlign = 'center';
      const tdB = document.createElement('td'); tdB.textContent = String(d.break_minutes ?? 0) + '分'; tdB.style.textAlign = 'center';
      const tdM = document.createElement('td'); tdM.textContent = String(d.standard_minutes ?? ''); tdM.style.textAlign = 'center';
      const tdDel = document.createElement('td'); tdDel.style.textAlign = 'center';
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
          enableUpdate();
        } catch (e) { /* silently ignored */ }
      });
      tb.appendChild(tr);

      // Mobile Card
      const card = document.createElement('div');
      card.className = 'shift-card';
      card.innerHTML = `
        <div class="shift-card-header">
          <span class="shift-card-title">${d.name || ''}</span>
          <button class="shift-card-del-btn" aria-label="削除">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
          </button>
        </div>
        <div class="shift-card-body">
          <div class="shift-card-row">
            <span class="shift-card-label">時間:</span>
            <span class="shift-card-value">${formatTime(d.start_time || '')} - ${formatTime(d.end_time || '')}</span>
          </div>
          <div class="shift-card-row">
            <span class="shift-card-label">休憩:</span>
            <span class="shift-card-value">${String(d.break_minutes ?? 0)}分</span>
          </div>
          <div class="shift-card-row">
            <span class="shift-card-label">所定:</span>
            <span class="shift-card-value">${String(d.standard_minutes ?? '')}分</span>
          </div>
        </div>
      `;
      
      const mobileDelBtn = card.querySelector('.shift-card-del-btn');
      mobileDelBtn.addEventListener('click', async (e) => {
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
      
      card.addEventListener('click', () => {
        try {
          const nameInput = document.querySelector('.form-actions input[type="text"]');
          const timeInputs = document.querySelectorAll('.form-actions input[type="time"]');
          const select = document.querySelector('.form-actions select');
          
          if (!nameInput || timeInputs.length < 2 || !select) return;
          
          nameInput.value = d.name || '';
          timeInputs[0].value = d.start_time || '';
          timeInputs[1].value = d.end_time || '';
          select.value = String(d.break_minutes ?? 0);
          enableUpdate();
        } catch (e) { /* silently ignored */ }
      });

      mobileList.appendChild(card);
    }
  };
  try {
    defs = await api.get('/attendance/shifts/definitions');
  } catch { defs = []; }
  renderDefs(defs);
  const tableContainer = document.createElement('div');
  tableContainer.className = 'table-container';
  tableContainer.style.cssText = 'padding: 0 16px 24px 16px;';
  tableContainer.appendChild(defTable);
  defCard.appendChild(tableContainer);

  wrap.appendChild(defCard);

  content.innerHTML = '';
  content.innerHTML = `
    <style>
      .shift-page-content { flex: 1 1 0%; min-height: 0; display: flex; flex-direction: column; overflow: hidden; }
      .table-container { flex: 1 1 0%; min-height: 0; overflow-y: auto; overflow-x: auto; -webkit-overflow-scrolling: touch; }
      @media (max-width: 768px) {
        .shift-page-content { flex: 1 1 0% !important; min-height: 0 !important; overflow: hidden !important; display: flex !important; flex-direction: column !important; }
        .table-container { flex: 1 1 0% !important; min-height: 0 !important; overflow-y: auto !important; overflow-x: hidden !important; -webkit-overflow-scrolling: touch !important; }
        #adminContent.card { padding: 0 !important; }
      }
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
        border: 1px solid #e4e7ed;
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
        padding: 0 16px 24px 16px;
      }
      .shift-form-actions { display: flex; flex-wrap: wrap; gap: 12px; }
      .shift-inputs-wrap { display: flex; flex-wrap: wrap; gap: 8px; flex: 1; align-items: flex-end; }
      .shift-field-wrapper { display: flex; flex-direction: column; gap: 2px; }
      .shift-field-label { font-size: 12px; font-weight: 600; color: #475569; margin-left: 2px; }
      .shift-btns-wrap { display: flex; gap: 8px; flex-shrink: 0; align-items: flex-end; }
      .shift-input { height: 38px; border-radius: 6px; border: 1px solid #e4e7ed; padding: 0 12px; font-size: 14px; box-sizing: border-box; }
      .shift-btn { height: 40px !important; padding: 0 24px !important; border-radius: 6px !important; font-size: 14px !important; font-weight: 600 !important; cursor: pointer; box-sizing: border-box !important; display: inline-flex !important; align-items: center !important; justify-content: center !important; transition: all 0.2s ease !important; min-width: 90px !important; }
      .shift-btn:disabled { opacity: 0.5 !important; cursor: not-allowed !important; }
      
      .shift-btn-add { background: #2563eb !important; color: #ffffff !important; border: 1px solid #2563eb !important; box-shadow: 0 1px 2px rgba(37, 99, 235, 0.1) !important; }
      .shift-btn-add:hover:not(:disabled) { background: #1d4ed8 !important; border-color: #1d4ed8 !important; box-shadow: 0 4px 6px rgba(37, 99, 235, 0.2) !important; transform: translateY(-1px); }
      .shift-btn-add:active:not(:disabled) { transform: translateY(0); box-shadow: 0 1px 2px rgba(37, 99, 235, 0.1) !important; }
      
      .shift-btn-update { background: #ffffff !important; border: 1px solid #2563eb !important; color: #2563eb !important; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05) !important; }
      .shift-btn-update:hover:not(:disabled) { background: #eff6ff !important; box-shadow: 0 4px 6px rgba(37, 99, 235, 0.1) !important; transform: translateY(-1px); }
      .shift-btn-update:active:not(:disabled) { transform: translateY(0); box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05) !important; }
      
      .shift-list-container { margin-top: 16px; }
      .shift-mobile-list { display: none; }
      
      .shift-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; margin-bottom: 12px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
      .shift-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; }
      .shift-card-title { font-weight: 700; font-size: 15px; color: #0f172a; }
      .shift-card-del-btn { background: #fef2f2; color: #ef4444; border: 1px solid #fecaca; border-radius: 4px; padding: 4px; display: flex; align-items: center; justify-content: center; cursor: pointer; }
      .shift-card-row { display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 14px; }
      .shift-card-label { color: #64748b; }
      .shift-card-value { color: #334155; font-weight: 500; }
      
      @media (max-width: 768px) {
        .shift-form-actions { flex-direction: column; align-items: stretch; padding: 10px !important; gap: 8px !important; }
        .shift-inputs-wrap { display: grid !important; grid-template-columns: repeat(3, 1fr); gap: 6px !important; width: 100%; align-items: start; }
        .shift-field-wrapper { width: 100%; align-items: center; flex-direction: row; justify-content: space-between; gap: 4px; }
        .shift-field-label { flex-shrink: 0; width: 60px; font-size: 11px; margin: 0; }
        
        .shift-field-wrapper:nth-child(1) { grid-column: 1 / -1; align-items: center; flex-direction: row; } /* Name full width */
        .shift-field-wrapper:nth-child(2) { grid-column: 1 / 2; flex-direction: column; align-items: flex-start; } /* Start time */
        .shift-field-wrapper:nth-child(2) .shift-field-label { width: auto; margin-bottom: 2px; }
        .shift-field-wrapper:nth-child(3) { grid-column: 2 / 3; flex-direction: column; align-items: flex-start; } /* End time */
        .shift-field-wrapper:nth-child(3) .shift-field-label { width: auto; margin-bottom: 2px; }
        .shift-field-wrapper:nth-child(4) { grid-column: 3 / 4; flex-direction: column; align-items: flex-start; } /* Break time */
        .shift-field-wrapper:nth-child(4) .shift-field-label { width: auto; margin-bottom: 2px; }
        
        .shift-input { width: 100% !important; margin: 0 !important; height: 32px !important; font-size: 12px !important; padding: 0 4px !important; flex: 1; }
        .shift-btns-wrap { display: grid; grid-template-columns: 1fr 1fr; width: 100%; gap: 8px !important; margin-top: 4px; }
        .shift-btn { width: 100%; height: 36px !important; min-height: 36px !important; border-radius: 6px !important; font-size: 13px !important; }
        
        .shift-desktop-table { display: none !important; }
        .shift-mobile-list { display: block; }
      }
    </style>
  `;
  content.appendChild(wrap);
}

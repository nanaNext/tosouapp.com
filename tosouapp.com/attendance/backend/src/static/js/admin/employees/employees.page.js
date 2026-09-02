import { requireAdmin } from '../_shared/require-admin.js';
import { listEmployees, getEmployee, createEmployee, updateEmployee, deleteEmployee } from '../../api/employees.api.js';
import { listDepartments } from '../../api/departments.api.js';
import { listUsers, deleteUser as deleteUserHard } from '../../api/users.api.js';
import { fetchJSONAuth } from '../../api/http.api.js';
import { $, ensureEmployeePillStyle, showNavSpinner, hideNavSpinner, getTopbarSearchParts, bindTopbarSearchClear, syncTopbarSearchKeyword, clearTopbarNoResultState, setTopbarNoResultState, getEmployeesMode, isEmployeesPath } from './employees.helpers.js';

let employeesRenderSeq = 0;

function extractRows(result) {
  if (Array.isArray(result)) return result;
  if (result && Array.isArray(result.rows)) return result.rows;
  return [];
}

async function renderEmployees(profile, c) {
  clearTopbarNoResultState();
  try {
    const currentPath = String(location.pathname || '');
    if (!isEmployeesPath(currentPath)) return;
    const f = sessionStorage.getItem('navSpinner');
    if (f === '1') showNavSpinner();
  } catch (e) { /* bỏ qua lỗi */ }

  const seq = ++employeesRenderSeq;
  const content = c || $('#adminContent');
  if (!content) return;
  ensureEmployeePillStyle();

  const params = new URLSearchParams(location.search);
  const detailId = params.get('detail');
  const editId = params.get('edit');
  const summaryId = params.get('summary');
  const createFlag = params.get('create');
  const consumeEmpFlash = () => {
    try {
      const msg = sessionStorage.getItem('empFlashMessage') || '';
      if (!msg) return '';
      sessionStorage.removeItem('empFlashMessage');
      return msg;
    } catch {
      return '';
    }
  };
  const role2 = String((profile && profile.role) || '').toLowerCase();
  const photoApiBase = role2 === 'manager' ? '/api/manager' : '/api/admin';
  const isSuper = false;
  const superEmail = '';

  const pathname = String(location.pathname || '');
  const hash = location.hash || '';
  const mode = getEmployeesMode(pathname, hash, detailId, editId, summaryId, createFlag);
  try {
    if ((pathname === '/admin/employees' || pathname === '/admin/employees/') && !hash && !detailId && !editId && !summaryId && !createFlag) {
      history.replaceState(null, '', '/admin/employees#list');
    }
  } catch (e) { /* bỏ qua lỗi */ }

  try { document.body.classList.remove('employees-wide'); } catch (e) { /* bỏ qua lỗi */ }
  try {
    if (mode === 'delete') {
      document.body.classList.add('emp-delete-mode');
      document.documentElement.classList.add('emp-delete-mode');
    } else {
      document.body.classList.remove('emp-delete-mode');
      document.documentElement.classList.remove('emp-delete-mode');
    }
  } catch (e) { /* bỏ qua lỗi */ }
  try { content.innerHTML = ''; } catch (e) { /* bỏ qua lỗi */ }

  if (mode === 'detail' && detailId) {
    const u = await getEmployee(detailId);
    if (seq !== employeesRenderSeq) return;
    let depts2 = [];
    try { depts2 = role2 === 'manager' ? await fetchJSONAuth('/api/manager/departments') : await listDepartments(); } catch { depts2 = []; }
    if (seq !== employeesRenderSeq) return;
    let branches = [];
    try { branches = (await fetchJSONAuth('/api/branches'))?.data || []; } catch { branches = []; }

    const deptName2 = (id) => {
      const d = depts2.find(x => String(x.id) === String(id));
      return d ? d.name : '';
    };
    const statusJa2 = (s) => {
      const v = String(s || '').toLowerCase();
      if (v === 'inactive') return '無効';
      if (v === 'retired') return '退職';
      return '在職';
    };
    const fmtDate2 = (d) => {
      if (!d || String(d) === '-' || String(d) === '0000-00-00') return '未登録';
      const raw = String(d);
      const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (m) return `${m[1]}/${m[2]}/${m[3]}`;
      try {
        const x = new Date(raw);
        if (!isNaN(x.getTime())) return `${x.getFullYear()}/${String(x.getMonth()+1).padStart(2,'0')}/${String(x.getDate()).padStart(2,'0')}`;
      } catch (e) { /* bỏ qua lỗi */ }
      return raw;
    };

    content.innerHTML = '';
    const panel = document.createElement('div');
    panel.className = 'card detail-card';
    const roleV = String(u.role || '').toLowerCase();
    const roleJa3 = roleV === 'admin' ? '管理者' : roleV === 'manager' ? 'マネージャー' : roleV === 'employee' ? '従業員' : (u.role || '');
    const roleCls3 = roleV === 'admin' ? 'admin' : roleV === 'manager' ? 'manager' : 'employee';
    const typeV = String(u.employment_type || '').toLowerCase();
    const typeJa3 = typeV === 'full_time' ? '正社員' : typeV === 'part_time' ? 'パート・アルバイト' : typeV === 'contract' ? '契約社員' : (u.employment_type || '');
    const typeCls3 = typeV === 'full_time' ? 'full' : typeV === 'part_time' ? 'part' : typeV === 'contract' ? 'contract' : '';
    const statusV = String(u.employment_status || '').toLowerCase();
    const statusCls3 = statusV === 'retired' ? 'retired' : statusV === 'inactive' ? 'inactive' : 'active';
    const name3 = (u.username || u.email || '').trim();
    const ini3 = name3 ? name3[0].toUpperCase() : '?';
    let mgrName3 = '';
    try {
      let allUsers3 = role2 === 'manager' ? await fetchJSONAuth('/api/manager/users') : await listUsers();
      allUsers3 = (allUsers3 && allUsers3.rows) || allUsers3;
      const mgr3 = allUsers3.find(x => String(x.id) === String(u.manager_id));
      mgrName3 = mgr3 ? (mgr3.username || mgr3.email) : '';
    } catch (e) { /* bỏ qua lỗi */ }
    const avatarBlock3 = `<div style="width:36px;height:36px;border-radius:50%;background:#e2e8f0;color:#475569;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;flex-shrink:0;border:1px solid #cbd5e1;">${ini3}</div>`;
    const branchName3 = (branches.find(br => String(br.id) === String(u.branch_id)) || {}).name || '';
    panel.style.cssText = 'border:1px solid #d0d7de;border-radius:0;background:#fff;box-shadow:none;overflow:hidden;max-width:100%;';
    panel.innerHTML = `
      <style>
        .sap-obj-header { display:flex; align-items:center; gap:12px; padding:10px 16px; border-bottom:1px solid #d0d7de; background:#f6f8fa; }
        .sap-obj-header .sap-name { font-size:14px; font-weight:700; color:#1c2025; }
        .sap-obj-header .sap-meta { font-size:12px; color:#5a6872; }
        .sap-obj-badges { display:flex; gap:6px; margin-left:auto; }
        .sap-badge { padding:2px 8px; font-size:11px; font-weight:600; border-radius:3px; border:1px solid; }
        .sap-badge-role { background:#ebf5ff; color:#0854a0; border-color:#b0d4f1; }
        .sap-badge-status { background:#f1fdf4; color:#256f3a; border-color:#b0e2c2; }
        .sap-section { border-bottom:1px solid #d0d7de; }
        .sap-section-title { font-size:12px; font-weight:700; color:#32363a; padding:8px 16px; background:#f6f8fa; border-bottom:1px solid #d0d7de; }
        .sap-table { width:100%; border-collapse:collapse; table-layout:fixed; word-break:break-word; border:1px solid #d0d7de; }
        .sap-table td { padding:6px 12px; border:1px solid #edeff0; font-size:13px; vertical-align:top; }
        .sap-table td.lbl { width:110px; color:#6a6d70; background:#fafbfc; font-weight:500; white-space:nowrap; }
        .sap-table td.val { color:#32363a; }
        .sap-table td.val.empty { color:#bcc3ca; }
        .sap-two-col { display:grid; grid-template-columns:1fr 1fr; gap:12px; padding:8px 16px; }
        .sap-two-col > div { }
        .sap-actions { padding:10px 16px; border-top:1px solid #d0d7de; display:flex; gap:8px; background:#f6f8fa; }
        .sap-btn { padding:6px 14px; font-size:12px; font-weight:600; border-radius:3px; text-decoration:none; cursor:pointer; border:1px solid #0854a0; }
        .sap-btn-primary { background:#0854a0; color:#fff; }
        .sap-btn-ghost { background:transparent; color:#0854a0; }
        .sap-btn-danger { background:transparent; color:#b91c1c; border-color:#fca5a5; }
        .sap-btn-danger:hover { background:#fee2e2; border-color:#f87171; }
        .sap-btn-del { background:transparent; color:#b91c1c; border-color:#fca5a5; }
        .sap-btn-del:hover { background:#fee2e2; border-color:#f87171; }
        @media (max-width:768px) { .sap-two-col { grid-template-columns:1fr; } }
      </style>
      <div class="sap-obj-header">
        ${avatarBlock3}
        <div>
          <div class="sap-name">${u.username || ''}</div>
          <div class="sap-meta">${u.employee_code || ('EMP' + String(u.id).padStart(3,'0'))} ・ ${u.email || ''}</div>
        </div>
        <div class="sap-obj-badges">
          <span class="sap-badge sap-badge-role">${roleJa3}</span>
          <span class="sap-badge sap-badge-status">${statusJa2(u.employment_status)}</span>
        </div>
      </div>
      <div class="sap-section">
        <div class="sap-section-title">基本情報</div>
        <div class="sap-two-col">
          <div>
            <table class="sap-table">
              <tr><td class="lbl">社員番号</td><td class="val">${u.employee_code || ('EMP' + String(u.id).padStart(3,'0'))}</td></tr>
              <tr><td class="lbl">氏名</td><td class="val">${u.username || ''}</td></tr>
              <tr><td class="lbl">メール</td><td class="val">${u.email || ''}</td></tr>
              <tr><td class="lbl">電話番号</td><td class="val ${u.phone ? '' : 'empty'}">${u.phone || '—'}</td></tr>
            </table>
          </div>
          <div>
            <table class="sap-table">
              <tr><td class="lbl">生年月日</td><td class="val">${fmtDate2(u.birth_date)}</td></tr>
              <tr><td class="lbl">性別</td><td class="val">${u.gender === 'male' ? '男性' : u.gender === 'female' ? '女性' : u.gender === 'other' ? 'その他' : '—'}</td></tr>
              <tr><td class="lbl">住所</td><td class="val ${u.address ? '' : 'empty'}">${u.address || '—'}</td></tr>
            </table>
          </div>
        </div>
      </div>
      <div class="sap-section">
        <div class="sap-section-title">職務情報</div>
        <div class="sap-two-col">
          <div>
            <table class="sap-table">
              <tr><td class="lbl">支店</td><td class="val">${branchName3 || '未設定'}</td></tr>
              <tr><td class="lbl">部署</td><td class="val">${deptName2(u.departmentId) || '未設定'}</td></tr>
              <tr><td class="lbl">シフト</td><td class="val" id="shiftValue">—</td></tr>
              <tr><td class="lbl">マネージャー</td><td class="val">${mgrName3 || '—'}</td></tr>
              <tr><td class="lbl">雇用形態</td><td class="val">${typeJa3}</td></tr>
              <tr><td class="lbl">レベル</td><td class="val ${u.level ? '' : 'empty'}">${u.level || '—'}</td></tr>
            </table>
          </div>
          <div>
            <table class="sap-table">
              <tr><td class="lbl">入社日</td><td class="val">${fmtDate2(u.hire_date)}</td></tr>
              <tr><td class="lbl">試用開始</td><td class="val">${fmtDate2(u.probation_date)}</td></tr>
              <tr><td class="lbl">正社員化</td><td class="val">${fmtDate2(u.official_date)}</td></tr>
              <tr><td class="lbl">契約終了</td><td class="val">${fmtDate2(u.contract_end)}</td></tr>
              <tr><td class="lbl">基本給</td><td class="val">${u.base_salary == null ? '—' : String.fromCharCode(165) + Number(u.base_salary).toLocaleString()}</td></tr>
            </table>
          </div>
        </div>
      </div>
      <div class="sap-section">
        <div class="sap-section-title">書類</div>
        <div style="padding:8px 16px;"><div id="detailAvatarGallery" style="display:flex;gap:8px;flex-wrap:wrap;min-height:32px;"><span style="color:#6a6d70;font-size:12px;">読み込み中...</span></div></div>
      </div>
      <div class="sap-actions">
        <a class="sap-btn sap-btn-primary" id="btnDetailEdit" href="/admin/employees?edit=${u.id}">✏️ 編集</a>
        ${role2 === 'admin' ? `<button type="button" class="sap-btn sap-btn-danger" id="btnDetailDisable" data-uid="${u.id}">🚫 無効化</button>` : ''}
        ${role2 === 'admin' ? `<button type="button" class="sap-btn sap-btn-del" id="btnDetailDelete" data-uid="${u.id}">🗑️ 削除</button>` : ''}
        <a class="sap-btn sap-btn-ghost" id="btnDetailBack" href="/admin/employees#list">← 一覧へ</a>
      </div>
    `;
    content.appendChild(panel);

    // Handler 無効化: đổi trạng thái nhân viên sang inactive.
    panel.querySelector('#btnDetailDisable')?.addEventListener('click', async () => {
      if (!confirm(`この社員（${u.username || u.email}）を無効化しますか？`)) return;
      try {
        await deleteEmployee(u.id);
        alert('無効化しました（状態: 無効/休職）');
        history.replaceState(null, '', '/admin/employees#list');
        await renderEmployees(profile);
      } catch (err) {
        alert(String(err?.message || '無効化に失敗しました'));
      }
    });
    // Handler 削除: nhân viên bị xóa hoàn toàn (không thể khôi phục).
    panel.querySelector('#btnDetailDelete')?.addEventListener('click', async () => {
      if (!confirm(`この社員（${u.username || u.email}）を完全に削除しますか？この操作は取り消せません。`)) return;
      try {
        await deleteUserHard(String(u.id));
        alert('削除しました');
        history.replaceState(null, '', '/admin/employees#list');
        await renderEmployees(profile);
      } catch (err) {
        alert(String(err?.message || '削除に失敗しました'));
      }
    });

    try {
      const today = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
      const r = await fetchJSONAuth(`/api/attendance/shifts/assignments?userId=${encodeURIComponent(String(u.id))}&from=1900-01-01&to=2999-12-31`);
      const items = (r && Array.isArray(r.items)) ? r.items : [];
      const active = items.find(it => {
        const sd = String(it.start_date || '').slice(0, 10);
        const ed = String(it.end_date || '').slice(0, 10);
        const okStart = !!sd && sd <= today;
        const okEnd = !ed || ed >= today;
        return okStart && okEnd;
      }) || null;
      let name = '—', st = '—', et = '—';
      const range = `${String(active?.start_date || '—')}${active?.end_date ? ' 〜 ' + String(active.end_date) : ''}`;
      if (active) {
        let def = null;
        if (active.shiftId) {
          try {
            const defs = await fetchJSONAuth('/api/attendance/shifts/definitions');
            def = (defs || []).find(d => String(d.id) === String(active.shiftId)) || null;
          } catch (e) { /* bỏ qua lỗi */ }
        }
        if (active.shift && typeof active.shift === 'object') {
          name = String(active.shift.name || '');
          st = String(active.shift.start_time || '—');
          et = String(active.shift.end_time || '—');
          if ((!st || st === '—' || !et || et === '—') && def) {
            st = String(def.start_time || st || '—');
            et = String(def.end_time || et || '—');
          }
        } else {
          name = def ? String(def.name || '') : String(active.shift || '');
          st = def ? String(def.start_time || '—') : '—';
          et = def ? String(def.end_time || '—') : '—';
        }
      }
      const rowShift = panel.querySelector('#shiftValue');
      if (rowShift) {
        const nm = name && name !== '—' ? name : '—';
        const time = (st && st !== '—' && et && et !== '—') ? `${st}-${et}` : '—';
        const rangeText = range && !range.startsWith('—') ? ` ${range}` : '';
        rowShift.innerHTML = `<span style="display:inline-block;padding:4px 12px;border-radius:999px;background:#eef5ff;color:#0b2c66;font-weight:700;margin-right:8px;">${nm}</span><span style="font-weight:700;color:#334155;margin-right:8px;">${time}</span><span style="color:#64748b;">${rangeText}</span>`;
      }
    } catch (e) { /* bỏ qua lỗi */ }
    try {
      const box = panel.querySelector('#detailAvatarGallery');
      if (box) {
        const rows = await fetchJSONAuth(`${photoApiBase}/employees/${encodeURIComponent(String(u.id))}/photos`);
        const list = Array.isArray(rows) ? rows : [];
        if (!list.length) {
          box.innerHTML = `<span style="color:#64748b;">保存済み写真はありません（編集画面からアップロードできます）</span>`;
        } else {
          box.innerHTML = list.map((it) => {
            const url = String(it?.url || '').trim();
            const safeUrl = encodeURI(url);
            const name = String(it?.originalName || '').trim();
            return `
              <a href="${safeUrl}" target="_blank" rel="noopener noreferrer" style="border:1px solid #cbd5e1;border-radius:8px;padding:6px;background:#fff;text-decoration:none;">
                <img src="${safeUrl}" alt="${name || 'photo'}" style="width:72px;height:72px;object-fit:cover;border-radius:6px;display:block;">
                <div style="max-width:96px;font-size:11px;color:#334155;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:4px;" title="${name}">${name || 'photo'}</div>
              </a>
            `;
          }).join('');
        }
      }
    } catch (err) {
      const box = panel.querySelector('#detailAvatarGallery');
      if (box) box.innerHTML = `<span style="color:#b91c1c;">写真の読み込みに失敗しました</span>`;
    }
    try {
      const listKeys = ['q','dept','employmentType','role','status','hireFrom','hireTo','sortKey','sortDir','page'];
      const keep = new URLSearchParams();
      for (const k of listKeys) { const v = params.get(k); if (v) keep.set(k, v); }
      const qsKeep = keep.toString();
      const backHref = `/admin/employees${qsKeep ? '?' + qsKeep : ''}#list`;
      const editHref = `/admin/employees?edit=${u.id}${qsKeep ? '&' + qsKeep : ''}`;
      const btnEdit = panel.querySelector('#btnDetailEdit');
      if (btnEdit) btnEdit.setAttribute('href', editHref);
      const btnBack = panel.querySelector('#btnDetailBack');
      if (btnBack) {
        btnBack.setAttribute('href', backHref);
        btnBack.addEventListener('click', (e) => {
          e.preventDefault();
          window.location.href = '/admin/employees';
        });
      }
    } catch (e) { /* bỏ qua lỗi */ }
    hideNavSpinner();
    return;
  }

  content.innerHTML = ``;
  const flashMsg = consumeEmpFlash();
  if (flashMsg) {
    const note = document.createElement('div');
    note.style.margin = '0 0 10px';
    note.style.padding = '8px 10px';
    note.style.border = '1px solid #86efac';
    note.style.background = '#f0fdf4';
    note.style.color = '#166534';
    note.style.borderRadius = '8px';
    note.style.fontWeight = '700';
    note.textContent = flashMsg;
    content.appendChild(note);
  }

  let users = [];
  let depts = [];
  let errMsgs = [];
  const isForbiddenErr = (e) => /forbidden|access denied|insufficient permission/i.test(String((e && e.message) || ''));
  const isCountedUser = (u) => {
    return true;
  };
  try {
    if (role2 === 'manager') {
      const res = await fetchJSONAuth('/api/manager/users');
      users = extractRows(res);
    } else {
      users = extractRows(await listEmployees());
    }
  } catch (e1) {
    if (!isForbiddenErr(e1)) errMsgs.push(`一覧: ${(e1 && e1.message) ? e1.message : 'unknown'}`);
    if (role2 !== 'manager') {
      try {
        const res2 = await fetchJSONAuth('/api/manager/users');
        users = extractRows(res2);
      } catch (eMid) {
        if (!isForbiddenErr(eMid)) errMsgs.push(`一覧(管理者予備): ${(eMid && eMid.message) ? eMid.message : 'unknown'}`);
        try { users = extractRows(await listUsers()); } catch (e2) { if (!isForbiddenErr(e2)) errMsgs.push(`一覧(予備): ${(e2 && e2.message) ? e2.message : 'unknown'}`); users = []; }
      }
    } else {
      try { users = extractRows(await listEmployees()); } catch (e2) { if (!isForbiddenErr(e2)) errMsgs.push(`一覧(予備): ${(e2 && e2.message) ? e2.message : 'unknown'}`); users = []; }
    }
  }
  if (seq !== employeesRenderSeq) return;
  try { users = (users || []).filter(isCountedUser); } catch { users = []; }
  
  try {
    depts = role2 === 'manager' ? await fetchJSONAuth('/api/manager/departments') : await listDepartments();
  } catch (e3) {
    if (!isForbiddenErr(e3)) errMsgs.push(`部署: ${(e3 && e3.message) ? e3.message : 'unknown'}`);
    try { depts = role2 === 'manager' ? await listDepartments() : await fetchJSONAuth('/api/manager/departments'); } catch (e4) { if (!isForbiddenErr(e4)) errMsgs.push(`部署(予備): ${(e4 && e4.message) ? e4.message : 'unknown'}`); depts = []; }
  }
  // Tải danh sách chi nhánh cho dropdown
  let branches = [];
  try { branches = (await fetchJSONAuth('/api/branches'))?.data || []; } catch { branches = []; }
  // Tải danh sách tenant cho sysadmin (để đổ dropdown "所属会社" trong form tạo mới)
  let tenantsList = [];
  const isSysRole = role2 === 'sysadmin' || role2 === 'owner';
  if (isSysRole) {
    try { tenantsList = (await fetchJSONAuth('/api/platform/tenants'))?.tenants || []; } catch { tenantsList = []; }
  }
  if (seq !== employeesRenderSeq) return;
  if (role2 === 'manager' && (!users || users.length === 0)) {
    try {
      const note = document.createElement('div');
      note.style.color = '#0b2c66';
      note.style.margin = '8px 0';
      note.style.fontWeight = '700';
      note.textContent = '従業員が見つかりません。従業員が未登録か、表示条件に一致しません。';
      content.appendChild(note);
    } catch (e) { /* bỏ qua lỗi */ }
  }
  if (errMsgs.length) {
    const msg = document.createElement('div');
    msg.style.color = '#b00020';
    msg.style.margin = '8px 0';
    msg.textContent = `読み込みエラー: ${errMsgs.join(' / ')}`;
    content.appendChild(msg);
  }

  if (editId) {
    const u = await getEmployee(editId);
    if (seq !== employeesRenderSeq) return;
    content.innerHTML = ``;
    const formEdit = document.createElement('form');
    formEdit.innerHTML = `
      <style>
        .emp-edit-wrap { max-width:960px; margin:0 auto; }
        .emp-edit-wrap .emp-add-form td input, .emp-edit-wrap .emp-add-form td select { transition:border-color .15s,box-shadow .15s; outline:none; }
        .emp-edit-wrap .emp-add-form td input:focus, .emp-edit-wrap .emp-add-form td select:focus { border-color:#2563eb; box-shadow:0 0 0 2px rgba(37,99,235,.12); }
        .emp-edit-wrap .emp-add-form .section-header { background:#f1f5f9; padding:10px 16px; font-weight:700; font-size:13px; color:#0f172a; border-bottom:1px solid #d1d5db; }
        .emp-edit-wrap .emp-add-form .field-label { width:120px; padding:9px 14px; border-bottom:1px solid #e5e7eb; font-size:13px; font-weight:500; color:#374151; background:#f8fafc; vertical-align:middle; white-space:nowrap; }
        .emp-edit-wrap .emp-add-form .field-value { padding:8px 12px; border-bottom:1px solid #e5e7eb; vertical-align:middle; }
        .emp-edit-wrap .emp-add-form .field-value input, .emp-edit-wrap .emp-add-form .field-value select { width:100%; height:32px; border:1px solid #d1d5db; padding:0 8px; font-size:13px; box-sizing:border-box; background:#fff; color:#0f172a; }
        .emp-edit-wrap .emp-add-form .field-value select { cursor:pointer; }
        .emp-edit-wrap .emp-add-form tr:last-child .field-label, .emp-edit-wrap .emp-add-form tr:last-child .field-value { border-bottom:none; }
        .emp-edit-2col { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:16px; }
        @media(max-width:700px){ .emp-edit-2col { grid-template-columns:1fr; } }
        .emp-edit-2col .emp-add-form { margin-bottom:0; }
        :root[data-theme='dark'] .emp-edit-wrap .emp-add-form { border-color:#334155!important; background:#111827!important; }
        :root[data-theme='dark'] .emp-edit-wrap .emp-add-form .section-header { background:#1e293b!important; color:#93c5fd!important; border-color:#334155!important; }
        :root[data-theme='dark'] .emp-edit-wrap .emp-add-form .field-label { background:#111827!important; color:#fff!important; border-color:#1e293b!important; }
        :root[data-theme='dark'] .emp-edit-wrap .emp-add-form .field-value { border-color:#1e293b!important; }
        :root[data-theme='dark'] .emp-edit-wrap .emp-add-form .field-value input,
        :root[data-theme='dark'] .emp-edit-wrap .emp-add-form .field-value select { background:#1e293b!important; color:#f1f5f9!important; border-color:#475569!important; }
      </style>

      <div class="emp-edit-wrap">
        <div style="margin-bottom:12px;"><a id="editBack" class="btn" href="#list">← 社員一覧へ戻る</a></div>
        <h4 style="margin:0 0 16px;font-size:17px;font-weight:700;color:#0f172a;">社員編集（${u.employee_code || ('EMP' + String(u.id).padStart(3,'0'))}）</h4>

        <!-- 2 cột: 基本情報 + 職務情報 -->
        <div class="emp-edit-2col">
          <div class="emp-add-form" style="border:1px solid #cbd5e1;box-shadow:0 1px 3px rgba(0,0,0,.04);">
            <div class="section-header">基本情報</div>
            <table style="width:100%;border-collapse:collapse;">
              <tr><td class="field-label">社員番号</td><td class="field-value"><span style="font-size:13px;color:#334155;font-weight:600;">${u.employee_code || ('EMP' + String(u.id).padStart(3,'0'))}</span></td></tr>
              <tr><td class="field-label">氏名 <span style="color:#ef4444">*</span></td><td class="field-value"><input id="empName" value="${u.username || ''}"></td></tr>
              <tr><td class="field-label">メール <span style="color:#ef4444">*</span></td><td class="field-value"><input id="empEmail" type="email" value="${u.email || ''}"></td></tr>
              <tr><td class="field-label">パスワード</td><td class="field-value"><input id="empPw" type="password" placeholder="変更する場合のみ入力" autocomplete="new-password"></td></tr>
              <tr><td class="field-label">生年月日</td><td class="field-value"><input id="empBirth" type="date" value="${u.birth_date || ''}"></td></tr>
              <tr><td class="field-label">性別</td><td class="field-value"><select id="empGender"><option value="">未設定</option><option value="male" ${u.gender==='male'?'selected':''}>男性</option><option value="female" ${u.gender==='female'?'selected':''}>女性</option><option value="other" ${u.gender==='other'?'selected':''}>その他</option></select></td></tr>
              <tr><td class="field-label">電話番号</td><td class="field-value"><input id="empPhone" value="${u.phone || ''}" placeholder="080-1234-5678"></td></tr>
              <tr><td class="field-label">住所</td><td class="field-value"><input id="empAddr" value="${u.address || ''}" placeholder="東京都..."></td></tr>
            </table>
          </div>

          <div class="emp-add-form" style="border:1px solid #cbd5e1;box-shadow:0 1px 3px rgba(0,0,0,.04);">
            <div class="section-header">職務情報</div>
            <table style="width:100%;border-collapse:collapse;">
              <tr><td class="field-label">支店</td><td class="field-value"><select id="empBranch"><option value="">未設定</option></select></td></tr>
              <tr><td class="field-label">部署</td><td class="field-value"><select id="empDept"><option value="">未設定</option>${depts.map(d=>`<option value="${d.id}" ${String(u.departmentId||'')===String(d.id)?'selected':''}>${d.name}</option>`).join('')}</select></td></tr>
              <tr><td class="field-label">役割 <span style="color:#ef4444">*</span></td><td class="field-value"><select id="empRole"><option value="employee" ${u.role==='employee'?'selected':''}>従業員</option><option value="manager" ${u.role==='manager'?'selected':''}>マネージャー</option><option value="admin" ${u.role==='admin'?'selected':''}>管理者</option></select></td></tr>
              <tr><td class="field-label">雇用形態 <span style="color:#ef4444">*</span></td><td class="field-value"><select id="empType"><option value="full_time" ${u.employment_type==='full_time'?'selected':''}>正社員</option><option value="part_time" ${u.employment_type==='part_time'?'selected':''}>パート・アルバイト</option><option value="contract" ${u.employment_type==='contract'?'selected':''}>契約社員</option></select></td></tr>
              <tr><td class="field-label">状態 <span style="color:#ef4444">*</span></td><td class="field-value"><select id="empStatus"><option value="active" ${String(u.employment_status||'')==='active'?'selected':''}>在職</option><option value="inactive" ${String(u.employment_status||'')==='inactive'?'selected':''}>無効/休職</option><option value="retired" ${String(u.employment_status||'')==='retired'?'selected':''}>退職</option></select></td></tr>
              <tr><td class="field-label">マネージャー</td><td class="field-value"><select id="empManager"><option value="">未設定</option>${users.filter(x=>x.role==='manager').map(m=>`<option value="${m.id}" ${String(u.manager_id||'')===String(m.id)?'selected':''}>${m.username || m.email}</option>`).join('')}</select></td></tr>
              <tr><td class="field-label">レベル</td><td class="field-value"><input id="empLevel" value="${u.level || ''}" placeholder="L1/L2/Senior"></td></tr>
              <tr><td class="field-label">入社日</td><td class="field-value"><input id="empHireDate" type="date" value="${(u.hire_date || u.join_date || '').slice(0,10)}"></td></tr>
              <tr><td class="field-label">試用開始</td><td class="field-value"><input id="empProbDate" type="date" value="${(u.probation_date || '').slice(0,10)}"></td></tr>
              <tr><td class="field-label">正社員化</td><td class="field-value"><input id="empOfficialDate" type="date" value="${(u.official_date || '').slice(0,10)}"></td></tr>
              <tr><td class="field-label">契約終了</td><td class="field-value"><input id="empContractEnd" type="date" value="${(u.contract_end || '').slice(0,10)}"></td></tr>
              <tr><td class="field-label">基本給</td><td class="field-value"><input id="empBaseSalary" type="number" step="0.01" value="${u.base_salary == null ? '' : u.base_salary}" placeholder="円"></td></tr>
            </table>
          </div>
        </div>

        <!-- シフト割当 -->
        <div class="emp-add-form" style="border:1px solid #cbd5e1;margin-bottom:16px;box-shadow:0 1px 3px rgba(0,0,0,.04);">
          <div class="section-header">シフト割当</div>
          <table style="width:100%;max-width:520px;border-collapse:collapse;">
            <tr><td class="field-label">シフト</td><td class="field-value"><select id="saShift"><option value="">シフト</option></select></td></tr>
            <tr><td class="field-label">適用開始日</td><td class="field-value"><input id="saStart" type="date"></td></tr>
            <tr><td class="field-label">適用終了日</td><td class="field-value"><input id="saEnd" type="date"></td></tr>
          </table>
          <div style="padding:8px 16px;border-top:1px solid #e5e7eb;display:flex;gap:8px;">
            <button type="button" class="btn" id="btnSaAdd">追加</button>
          </div>
          <div id="saStatus" style="font-size:12px;color:#64748b;padding:2px 16px 6px;"></div>
        </div>

        <!-- 契約内容・業務内容 -->
        <div class="emp-add-form" style="border:1px solid #cbd5e1;margin-bottom:16px;box-shadow:0 1px 3px rgba(0,0,0,.04);">
          <div class="section-header">契約内容・業務内容</div>
          <table style="width:100%;max-width:520px;border-collapse:collapse;">
            <tr><td class="field-label">開始日</td><td class="field-value"><input id="wdStart" type="date"></td></tr>
            <tr><td class="field-label">終了日</td><td class="field-value"><input id="wdEnd" type="date"></td></tr>
            <tr><td class="field-label">企業名</td><td class="field-value"><input id="wdCompany" placeholder="企業名"></td></tr>
            <tr><td class="field-label">就業先住所</td><td class="field-value"><input id="wdAddr" placeholder="住所"></td></tr>
            <tr><td class="field-label">業務内容</td><td class="field-value"><input id="wdWork" placeholder="業務内容"></td></tr>
            <tr><td class="field-label">役職</td><td class="field-value"><input id="wdRole" placeholder="役職"></td></tr>
            <tr><td class="field-label">責任程度</td><td class="field-value"><input id="wdResp" placeholder="責任程度"></td></tr>
          </table>
          <div style="padding:8px 16px;border-top:1px solid #e5e7eb;display:flex;gap:8px;">
            <button type="button" class="btn" id="btnWdAdd">保存</button>
          </div>
          <div id="wdStatus" style="font-size:12px;color:#64748b;padding:2px 16px 6px;"></div>
        </div>

        <!-- プロフィール写真 -->
        <div class="emp-add-form" style="border:1px solid #cbd5e1;margin-bottom:16px;box-shadow:0 1px 3px rgba(0,0,0,.04);">
          <div class="section-header">プロフィール写真</div>
          <table style="width:100%;max-width:520px;border-collapse:collapse;">
            <tr>
              <td class="field-label">現在の写真</td>
              <td class="field-value">
                <div id="avatarPreviewBox" style="width:72px;height:72px;border-radius:6px;border:1px solid #cbd5e1;display:flex;align-items:center;justify-content:center;background:#f8fafc;overflow:hidden;color:#94a3b8;font-size:11px;">
                  ${u.avatar_url ? `<img src="${u.avatar_url}" style="width:100%;height:100%;object-fit:cover;">` : 'No Image'}
                </div>
              </td>
            </tr>
            <tr>
              <td class="field-label">写真を選ぶ</td>
              <td class="field-value">
                <!-- input file ẩn — trigger bằng nút custom -->
                <input id="empAvatarFile" type="file" accept="image/*" multiple style="display:none;">
                <div style="display:flex;align-items:center;gap:8px;">
                  <button type="button" class="btn" id="btnChooseFile" onclick="document.getElementById('empAvatarFile').click()">ファイルを選ぶ</button>
                  <span id="empFileLabel" style="font-size:13px;color:#64748b;">選択されていません</span>
                </div>
                <!-- Preview ảnh đã chọn (trước khi upload) -->
                <div id="empAvatarSelectedPreview" style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;"></div>
              </td>
            </tr>
            <tr id="rowUpload" style="display:none;">
              <td class="field-label">アップロード</td>
              <td class="field-value" style="display:flex;align-items:center;gap:10px;border-bottom:none;">
                <button type="button" id="btnAvatarUpload" class="btn" style="background:#0f172a;color:#fff;border-color:#0f172a;">アップロード</button>
                <span id="avatarUploadStatus" style="font-size:13px;color:#334155;"></span>
              </td>
            </tr>
            <tr>
              <td class="field-label">保存済み写真</td>
              <td class="field-value"><div id="empAvatarGallery" style="display:flex;gap:8px;flex-wrap:wrap;min-height:20px;"></div></td>
            </tr>
          </table>
        </div>

        <div class="form-actions" style="padding:12px 0;display:flex;justify-content:flex-end;align-items:center;gap:12px;">
          <div id="empEditMsg" style="color:#f87171;font-weight:600;font-size:14px;flex:1;text-align:left;display:none;"></div>
          <a id="btnCancelEdit" href="#list" style="background:transparent;color:#64748b;border:none;font-weight:bold;min-width:80px;height:40px;display:inline-flex;align-items:center;justify-content:center;text-decoration:none;cursor:pointer;">キャンセル</a>
          <button type="submit" style="background:#0f172a;color:#fff;border:none;padding:0 28px;height:40px;font-weight:700;font-size:14px;border-radius:4px;display:flex;align-items:center;justify-content:center;gap:8px;cursor:pointer;">
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
            更新
          </button>
        </div>
      </div>
`;
    try {
      const listKeys = ['q','dept','employmentType','role','status','hireFrom','hireTo','sortKey','sortDir','page','code','showAll'];
      const keep = new URLSearchParams();
      for (const k of listKeys) { const v = params.get(k); if (v) keep.set(k, v); }
      const qsKeep = keep.toString();
      const backHref = `/admin/employees${qsKeep ? '?' + qsKeep : ''}#list`;
      const backA = formEdit.querySelector('#editBack');
      const cancelA = formEdit.querySelector('#btnCancelEdit');
      if (backA) backA.setAttribute('href', backHref);
      if (cancelA) cancelA.setAttribute('href', backHref);
    } catch (e) { /* bỏ qua lỗi */ }
    // Đổ dropdown chi nhánh
    try {
      const brSel = formEdit.querySelector('#empBranch');
      if (brSel && branches.length) {
        brSel.innerHTML = '<option value="">未設定</option>' + branches.map(br => `<option value="${br.id}" ${String(u.branch_id||u.branchId||'')===String(br.id)?'selected':''}>${br.name}</option>`).join('');
      }
    } catch (e) { /* bỏ qua lỗi */ }
    formEdit.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = formEdit.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = '保存中...';
      }
      try {
        const b = {
          username: document.querySelector('#empName').value.trim(),
          email: document.querySelector('#empEmail').value.trim(),
          role: document.querySelector('#empRole').value,
          branchId: document.querySelector('#empBranch').value ? parseInt(document.querySelector('#empBranch').value,10) : null,
          departmentId: document.querySelector('#empDept').value ? parseInt(document.querySelector('#empDept').value,10) : null,
          level: (document.querySelector('#empLevel').value || '').trim() || null,
          managerId: document.querySelector('#empManager').value ? parseInt(document.querySelector('#empManager').value,10) : null,
          employmentType: document.querySelector('#empType').value,
          hireDate: document.querySelector('#empHireDate').value.trim() || null,
          probationDate: document.querySelector('#empProbDate').value.trim() || null,
          officialDate: document.querySelector('#empOfficialDate').value.trim() || null,
          contractEnd: document.querySelector('#empContractEnd').value.trim() || null,
          baseSalary: (document.querySelector('#empBaseSalary').value || '').trim() || null,
          birthDate: document.querySelector('#empBirth').value.trim() || null,
          gender: document.querySelector('#empGender').value || null,
          phone: (document.querySelector('#empPhone').value || '').trim() || null,
          employmentStatus: document.querySelector('#empStatus').value,
          address: (document.querySelector('#empAddr').value || '').trim() || null
        };
        await updateEmployee(u.id, b);
        const newPw = document.querySelector('#empPw').value;
        if (newPw && newPw.length >= 6) {
          await fetchJSONAuth(`/api/admin/users/${u.id}/password`, { method: 'PATCH', body: JSON.stringify({ password: newPw }) });
        }
        let uploadedCount = 0;
        const fileElOnSave = formEdit.querySelector('#empAvatarFile');
        const statusElOnSave = formEdit.querySelector('#avatarUploadStatus');
        const saveFiles = fileElOnSave && fileElOnSave.files ? Array.from(fileElOnSave.files) : [];
        if (saveFiles.length) {
          try {
            if (statusElOnSave) statusElOnSave.textContent = '画像アップロード中...';
            const fd = new FormData();
            saveFiles.forEach((f) => fd.append('files', f));
            const out = await fetchJSONAuth(`${photoApiBase}/employees/${encodeURIComponent(String(u.id))}/photos`, {
              method: 'POST',
              body: fd
            });
            uploadedCount = Number(out?.count || saveFiles.length || 0);
            if (statusElOnSave) statusElOnSave.textContent = `アップロード完了 (${uploadedCount}件)`;
            try { fileElOnSave.value = ''; } catch (e) { /* bỏ qua lỗi */ }
          } catch (uploadErr) {
            if (statusElOnSave) statusElOnSave.textContent = String(uploadErr?.message || 'アップロード失敗');
            throw new Error(`社員情報は保存済みですが、写真アップロードに失敗しました: ${String(uploadErr?.message || '')}`);
          }
        }
        try {
          const msg = uploadedCount > 0 ? `保存しました（写真${uploadedCount}件アップロード）` : '保存しました';
          sessionStorage.setItem('empFlashMessage', msg);
        } catch (e) { /* bỏ qua lỗi */ }
        try {
          const listKeys = ['q','dept','employmentType','role','status','hireFrom','hireTo','sortKey','sortDir','page','code','showAll'];
          const keep = new URLSearchParams();
          for (const k of listKeys) { const v = params.get(k); if (v) keep.set(k, v); }
          const qsKeep = keep.toString();
          history.replaceState(null, '', `/admin/employees${qsKeep ? '?' + qsKeep : ''}#list`);
        } catch (e) { /* bỏ qua lỗi */ }
        await renderEmployees(profile);
      } catch (err) {
        window.alert(String(err?.message || '保存に失敗しました'));
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = '更新';
        }
      }
    });
    const galleryEl = formEdit.querySelector('#empAvatarGallery');
    const selectedPreviewEl = formEdit.querySelector('#empAvatarSelectedPreview');
    const renderSelectedPreview = (files) => {
      if (!selectedPreviewEl) return;
      const list = Array.isArray(files) ? files : [];
      // Cập nhật label tên file và hiện/ẩn hàng upload
      const fileLabel = formEdit.querySelector('#empFileLabel');
      const rowUpload = formEdit.querySelector('#rowUpload');
      if (fileLabel) fileLabel.textContent = list.length ? list.map(f => f.name).join(', ') : '選択されていません';
      if (rowUpload) rowUpload.style.display = list.length ? '' : 'none';
      // Reset status khi chọn file mới
      const statusEl = formEdit.querySelector('#avatarUploadStatus');
      if (statusEl && list.length) statusEl.textContent = '';
      if (!list.length) {
        selectedPreviewEl.innerHTML = `<span style="color:#94a3b8;">選択中の画像はありません</span>`;
        return;
      }
      selectedPreviewEl.innerHTML = list.map((f) => {
        const name = String(f?.name || '').trim() || 'photo';
        const url = URL.createObjectURL(f);
        const safeUrl = encodeURI(url);
        return `
          <a href="${safeUrl}" target="_blank" rel="noopener noreferrer" style="border:1px solid #cbd5e1;border-radius:8px;padding:6px;background:#fff;text-decoration:none;">
            <img src="${safeUrl}" alt="${name}" style="width:72px;height:72px;object-fit:cover;border-radius:6px;display:block;">
            <div style="max-width:96px;font-size:11px;color:#334155;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:4px;" title="${name}">${name}</div>
          </a>
        `;
      }).join('');
    };
    renderSelectedPreview([]);
    const renderAvatarGallery = (rows) => {
      if (!galleryEl) return;
      const list = Array.isArray(rows) ? rows : [];
      if (!list.length) {
        galleryEl.innerHTML = `<span style="color:#64748b;">保存済み写真はありません</span>`;
        return;
      }
      galleryEl.innerHTML = list.map((it) => {
        const id = String(it?.id || '');
        const url = String(it?.url || '').trim();
        const safeUrl = encodeURI(url);
        const name = String(it?.originalName || '').trim();
        return `
          <div style="border:1px solid #cbd5e1;border-radius:8px;padding:6px;background:#fff;">
            <a href="${safeUrl}" target="_blank" rel="noopener noreferrer">
              <img src="${safeUrl}" alt="${name || 'photo'}" style="width:72px;height:72px;object-fit:cover;border-radius:6px;display:block;">
            </a>
            <div style="max-width:96px;font-size:11px;color:#334155;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:4px;" title="${name}">${name || 'photo'}</div>
            <button type="button" class="btn-avatar-del" data-photo-id="${id}" style="margin-top:4px;font-size:11px;">削除</button>
          </div>
        `;
      }).join('');
      galleryEl.querySelectorAll('.btn-avatar-del').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
          const pid = String(e.currentTarget?.dataset?.photoId || '').trim();
          if (!pid) return;
          if (!window.confirm('この写真を削除しますか？')) return;
          try {
            await fetchJSONAuth(`${photoApiBase}/employees/${encodeURIComponent(String(u.id))}/photos/${encodeURIComponent(pid)}`, { method: 'DELETE' });
            await loadAvatarGallery();
          } catch (err) {
            window.alert(String(err?.message || '削除に失敗しました'));
          }
        });
      });
    };
    const loadAvatarGallery = async () => {
      try {
        const rows = await fetchJSONAuth(`${photoApiBase}/employees/${encodeURIComponent(String(u.id))}/photos`);
        renderAvatarGallery(rows);
      } catch {
        renderAvatarGallery([]);
      }
    };
    await loadAvatarGallery();
    const fileElForPreview = formEdit.querySelector('#empAvatarFile');
    if (fileElForPreview) {
      fileElForPreview.addEventListener('change', () => {
        const files = fileElForPreview.files ? Array.from(fileElForPreview.files) : [];
        renderSelectedPreview(files);
      });
    }
    const btnAvatar = formEdit.querySelector('#btnAvatarUpload');
    if (btnAvatar) {
      btnAvatar.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
          const fileEl = formEdit.querySelector('#empAvatarFile');
          const statusEl = formEdit.querySelector('#avatarUploadStatus');
          const files = fileEl && fileEl.files ? Array.from(fileEl.files) : [];
          if (!files.length) { if (statusEl) statusEl.textContent = 'ファイル未選択'; return; }
          const fd = new FormData();
          files.forEach((f) => fd.append('files', f));
          const out = await fetchJSONAuth(`${photoApiBase}/employees/${encodeURIComponent(String(u.id))}/photos`, {
            method: 'POST',
            body: fd
          });
          if (statusEl) statusEl.textContent = `アップロード完了 (${Number(out?.count || files.length)}件)`;
          try { fileEl.value = ''; } catch (e) { /* bỏ qua lỗi */ }
          renderSelectedPreview([]);
          // Ẩn hàng upload sau khi xong
          const rowUp = formEdit.querySelector('#rowUpload');
          if (rowUp) rowUp.style.display = 'none';
          await loadAvatarGallery();
        } catch (err) {
          const statusEl = formEdit.querySelector('#avatarUploadStatus');
          if (statusEl) statusEl.textContent = String(err?.message || 'アップロード失敗');
        }
      });
    }
    formEdit.querySelector('#editBack').addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        const listKeys = ['q','dept','employmentType','role','status','hireFrom','hireTo','sortKey','sortDir','page','code','showAll'];
        const keep = new URLSearchParams();
        for (const k of listKeys) { const v = params.get(k); if (v) keep.set(k, v); }
        const qsKeep = keep.toString();
        history.replaceState(null, '', `/admin/employees${qsKeep ? '?' + qsKeep : ''}#list`);
      } catch (e) { /* bỏ qua lỗi */ }
      await renderEmployees(profile);
    });
    formEdit.querySelector('#btnCancelEdit').addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        const listKeys = ['q','dept','employmentType','role','status','hireFrom','hireTo','sortKey','sortDir','page','code','showAll'];
        const keep = new URLSearchParams();
        for (const k of listKeys) { const v = params.get(k); if (v) keep.set(k, v); }
        const qsKeep = keep.toString();
        history.replaceState(null, '', `/admin/employees${qsKeep ? '?' + qsKeep : ''}#list`);
      } catch (e) { /* bỏ qua lỗi */ }
      await renderEmployees(profile);
    });
    // ─── シフト割当 / 契約内容・業務内容 (thêm/sửa/xóa cho nhân viên đang chỉnh) ───
    // Dùng chính u.id làm userId; gọi API /api/attendance/shifts + work-details (admin có toàn quyền).
    const wsUid = String(u.id);
    const wsQ = (sel) => formEdit.querySelector(sel);
    const wsSetSaStatus = (t) => { const el = wsQ('#saStatus'); if (el) el.textContent = t || ''; };
    const wsSetWdStatus = (t) => { const el = wsQ('#wdStatus'); if (el) el.textContent = t || ''; };
    const wsVal = (sel) => String(wsQ(sel)?.value || '').trim();
    const wsNormDate = (s) => { const v = String(s || '').slice(0, 10); return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : ''; };
    // --- シフト割当 ---
    const wsLoadShiftDefs = async () => {
      const sel = wsQ('#saShift');
      if (!sel) return;
      try {
        const defs = await fetchJSONAuth('/api/attendance/shifts/definitions');
        const rows = Array.isArray(defs) ? defs : [];
        sel.innerHTML = `<option value="">シフト</option>${rows.map((d) => `<option value="${d.id}">${d.name} ${d.start_time}-${d.end_time}</option>`).join('')}`;
      } catch (e) {
        sel.innerHTML = '<option value="">シフト</option>';
      }
    };
    wsQ('#btnSaAdd')?.addEventListener('click', async () => {
      const shiftId = wsVal('#saShift');
      const startDate = wsVal('#saStart');
      const endDate = wsVal('#saEnd');
      if (!shiftId || !startDate) { wsSetSaStatus('シフト/適用開始日を入力してください'); return; }
      wsSetSaStatus('保存中...');
      try {
        await fetchJSONAuth('/api/attendance/shifts/assign', {
          method: 'POST',
          body: JSON.stringify({ userId: wsUid, shiftId, startDate, endDate: endDate || null })
        });
        ['#saShift', '#saStart', '#saEnd'].forEach(id => { const el = wsQ(id); if (el) el.value = ''; });
        wsSetSaStatus('保存しました');
      } catch (e) {
        wsSetSaStatus(String(e?.message || '保存失敗'));
      }
    });

    // --- 契約内容・業務内容 ---
    const wsIsISODate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || '').slice(0, 10));
    wsQ('#btnWdAdd')?.addEventListener('click', async () => {
      const payload = {
        userId: wsUid,
        startDate: wsNormDate(wsVal('#wdStart')),
        endDate: wsNormDate(wsVal('#wdEnd')) || null,
        companyName: wsVal('#wdCompany'),
        workPlaceAddress: wsVal('#wdAddr'),
        workContent: wsVal('#wdWork'),
        roleTitle: wsVal('#wdRole'),
        responsibilityLevel: wsVal('#wdResp')
      };
      if (!payload.startDate) { wsSetWdStatus('開始日を入力してください'); return; }
      if (!wsIsISODate(payload.startDate) || (payload.endDate && !wsIsISODate(payload.endDate))) { wsSetWdStatus('日付はYYYY-MM-DD形式で入力してください'); return; }
      wsSetWdStatus('保存中...');
      try {
        await fetchJSONAuth('/api/attendance/work-details', { method: 'POST', body: JSON.stringify(payload) });
        ['#wdStart','#wdEnd','#wdCompany','#wdAddr','#wdWork','#wdRole','#wdResp'].forEach(id => { const el = wsQ(id); if (el) el.value = ''; });
        wsSetWdStatus('保存しました');
      } catch (e) {
        wsSetWdStatus(String(e?.message || '保存失敗'));
      }
    });

    // シフト定義のみロード（リスト取得なし）
    wsLoadShiftDefs().catch(() => { });

    content.appendChild(formEdit);
    hideNavSpinner();
    return;
  }

  if (mode === 'edit') {
    content.innerHTML = ``;
    const prompt = document.createElement('form');
    prompt.innerHTML = `
      <div class="form-card form-compact form-sm form-narrow">
        <div class="form-title">【社員編集】</div>
        <div class="form-sep"></div>
        <div class="form-grid">
          <div class="form-label">社員番号</div>
          <div class="form-input">
            <span class="bracket"><input id="editKey" placeholder="EMP001 または ID 数字"></span>
          </div>
        </div>
        <div id="editKeyErr" style="color:#b00020;display:none;margin-top:8px;"></div>
        <div class="form-actions" style="margin-top:8px;">
          <button type="submit">編集へ</button>
        </div>
      </div>
    `;
    prompt.addEventListener('submit', async (e) => {
      e.preventDefault();
      const errEl = prompt.querySelector('#editKeyErr');
      const key = (document.querySelector('#editKey').value || '').trim();
      if (!key) {
        if (errEl) { errEl.style.display = 'block'; errEl.textContent = '社員番号を入力してください。'; }
        try { const el = document.querySelector('#editKey'); if (el && el.focus) el.focus(); } catch (e) { /* bỏ qua lỗi */ }
        return;
      }
      if (errEl) { errEl.style.display = 'none'; errEl.textContent = ''; }
      let id = null;
      if (/^\d+$/.test(key)) {
        id = parseInt(key, 10);
      } else {
        try {
          showNavSpinner();
          let list = await Promise.race([
            fetchJSONAuth(role2 === 'manager' ? '/api/manager/users' : '/api/admin/employees'),
            new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 8000))
          ]);
          list = (list && list.rows) || list;
          const f = list.find(u => {
            const code = String(u.employee_code || '').toUpperCase();
            const gen = ('EMP' + String(u.id).padStart(3,'0')).toUpperCase();
            return code === key.toUpperCase() || gen === key.toUpperCase();
          });
          if (f) id = f.id;
        } catch (err) {
          alert(String((err && err.message) ? err.message : '読み込みエラー'));
        } finally {
          hideNavSpinner();
        }
      }
      if (!id) return alert('対象が見つかりません');
      window.location.href = `/admin/employees?edit=${id}`;
    });
    content.appendChild(prompt);
    try { const el = document.querySelector('#editKey'); if (el && el.focus) el.focus(); } catch (e) { /* bỏ qua lỗi */ }
    hideNavSpinner();
    return;
  }

  if (mode === 'add') {
    const form = document.createElement('form');
    form.id = 'add';
    let managers = [];
    if (role2 !== 'manager') {
      try { managers = extractRows(await listUsers()); } catch { managers = []; }
    }
    if (seq !== employeesRenderSeq) return;
    const managerOptions = (role2 !== 'manager' ? managers.filter(m => String(m.role) === 'manager') : []).map(m => `<option value="${m.id}">${m.username || m.email}</option>`).join('');
    form.innerHTML = `
      <style>
        .emp-add-form td input, .emp-add-form td select { transition: border-color .15s, box-shadow .15s; outline:none; }
        .emp-add-form td input:focus, .emp-add-form td select:focus { border-color:#2563eb; box-shadow:0 0 0 2px rgba(37,99,235,.12); }
        .emp-add-form .section-header { background:#f1f5f9; padding:12px 20px; font-weight:700; font-size:14px; color:#0f172a; border-bottom:1px solid #d1d5db; letter-spacing:0.3px; }
        .emp-add-form .field-label { width:130px; padding:12px 20px; border-bottom:1px solid #e5e7eb; font-size:13px; font-weight:500; color:#374151; background:#f8fafc; vertical-align:middle; }
        .emp-add-form .field-value { padding:10px 16px; border-bottom:1px solid #e5e7eb; vertical-align:middle; }
        .emp-add-form .field-value input, .emp-add-form .field-value select { width:100%; max-width:420px; height:34px; border:1px solid #d1d5db; padding:0 10px; font-size:14px; box-sizing:border-box; background:#fff; color:#0f172a; }
        .emp-add-form .field-value select { cursor:pointer; }
        .emp-add-form tr:last-child .field-label, .emp-add-form tr:last-child .field-value { border-bottom:none; }

        /* Dark mode */
        :root[data-theme='dark'] .emp-add-form { border-color:#334155 !important; background:#111827 !important; }
        :root[data-theme='dark'] .emp-add-form .section-header { background:#1e293b !important; color:#93c5fd !important; border-color:#334155 !important; font-size:15px !important; }
        :root[data-theme='dark'] .emp-add-form .field-label { background:#111827 !important; color:#ffffff !important; border-color:#1e293b !important; font-weight:600 !important; }
        :root[data-theme='dark'] .emp-add-form .field-value { border-color:#1e293b !important; background:#111827 !important; }
        :root[data-theme='dark'] .emp-add-form .field-value input,
        :root[data-theme='dark'] .emp-add-form .field-value select { background:#1e293b !important; color:#f1f5f9 !important; border-color:#475569 !important; border-radius:6px !important; }
        :root[data-theme='dark'] .emp-add-form .field-value input:focus,
        :root[data-theme='dark'] .emp-add-form .field-value select:focus { border-color:#3b82f6 !important; box-shadow:0 0 0 2px rgba(59,130,246,.2) !important; }
        :root[data-theme='dark'] .emp-add-form .field-value input::placeholder { color:#64748b !important; }
        :root[data-theme='dark'] .emp-add-form div[style*="border-right"] { border-color:#334155 !important; }
      </style>
      <div style="margin-bottom:20px;"><a id="addBack" class="btn" href="#list" style="color:#475569;text-decoration:none;font-size:13px;display:inline-flex;align-items:center;gap:4px;">← 社員一覧へ戻る</a></div>
      
      <!-- Step Indicator -->
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:20px;flex-wrap:wrap;">
        <div id="stepInd1" style="display:flex;align-items:center;gap:6px;">
          <span style="width:28px;height:28px;border-radius:50%;background:#0f172a;color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;">1</span>
          <span style="font-size:13px;font-weight:600;color:#0f172a;">基本情報</span>
        </div>
        <div style="flex:0 0 40px;height:2px;background:#cbd5e1;"></div>
        <div id="stepInd2" style="display:flex;align-items:center;gap:6px;opacity:0.4;">
          <span style="width:28px;height:28px;border-radius:50%;background:#94a3b8;color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;">2</span>
          <span style="font-size:13px;font-weight:600;color:#64748b;">職務情報</span>
        </div>
        <div style="flex:0 0 40px;height:2px;background:#cbd5e1;"></div>
        <div id="stepInd3" style="display:flex;align-items:center;gap:6px;opacity:0.4;">
          <span style="width:28px;height:28px;border-radius:50%;background:#94a3b8;color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;">3</span>
          <span style="font-size:13px;font-weight:600;color:#64748b;">シフト割当</span>
        </div>
        <div style="flex:0 0 40px;height:2px;background:#cbd5e1;"></div>
        <div id="stepInd4" style="display:flex;align-items:center;gap:6px;opacity:0.4;">
          <span style="width:28px;height:28px;border-radius:50%;background:#94a3b8;color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;">4</span>
          <span style="font-size:13px;font-weight:600;color:#64748b;">契約内容</span>
        </div>
      </div>

      <!-- Step 1: 基本情報 -->
      <div id="step1" class="emp-add-form" style="border:1px solid #cbd5e1; margin-bottom:20px; box-shadow:0 1px 3px rgba(0,0,0,.04);">
        <div class="section-header">基本情報</div>
        <table style="width:100%;border-collapse:collapse;">
          <tr><td class="field-label">所属会社 <span style="color:#ef4444">*</span></td><td class="field-value"><select id="empTenantSelect" style="font-weight:600;"><option value="">読み込み中...</option></select></td></tr>
          <tr><td class="field-label">社員番号 <span style="color:#ef4444">*</span></td><td class="field-value"><input id="empCode" placeholder="例: EMP001"></td></tr>
          <tr><td class="field-label">氏名 <span style="color:#ef4444">*</span></td><td class="field-value"><input id="empName" placeholder="山田 太郎"></td></tr>
          <tr><td class="field-label">メール <span style="color:#ef4444">*</span></td><td class="field-value"><input id="empEmail" type="email" placeholder="example@company.com"></td></tr>
          <tr><td class="field-label">パスワード <span style="color:#ef4444">*</span></td><td class="field-value"><input id="empPass" type="password" placeholder="6文字以上" autocomplete="new-password"></td></tr>
          <tr><td class="field-label">生年月日</td><td class="field-value"><input id="empBirth" type="date"></td></tr>
          <tr><td class="field-label">性別</td><td class="field-value"><select id="empGender"><option value="">未選択</option><option value="male">男性</option><option value="female">女性</option><option value="other">その他</option></select></td></tr>
          <tr><td class="field-label">電話番号</td><td class="field-value"><input id="empPhone" placeholder="080-1234-5678"></td></tr>
          <tr><td class="field-label">住所</td><td class="field-value"><input id="empAddr" placeholder="東京都..."></td></tr>
        </table>
        <div style="display:flex;justify-content:flex-end;padding:16px 20px;border-top:1px solid #e2e8f0;align-items:center;gap:12px;">
          <div id="empStepMsg" style="color:#ef4444;font-weight:500;font-size:13px;display:none;flex:1;"></div>
          <button type="button" id="btnNext" style="height:38px;padding:0 24px;background:#0f172a;color:#fff;border:none;font-size:13px;font-weight:600;cursor:pointer;border-radius:4px;display:inline-flex;align-items:center;gap:6px;transition:background .15s ease, box-shadow .15s ease;" onmouseover="this.style.background='#1e3a5f';this.style.boxShadow='0 2px 8px rgba(15,23,42,.2)'" onmouseout="this.style.background='#0f172a';this.style.boxShadow=''">
            次へ →
          </button>
        </div>
      </div>

      <!-- Step 2: 職務情報 -->
      <div id="step2" class="emp-add-form" style="border:1px solid #cbd5e1; margin-bottom:20px; box-shadow:0 1px 3px rgba(0,0,0,.04); display:none;">
        <div class="section-header">職務情報</div>
        <table style="width:100%;border-collapse:collapse;">
          <tr><td class="field-label">支店</td><td class="field-value"><select id="empBranch"><option value="">未設定</option></select></td></tr>
          <tr><td class="field-label">部署</td><td class="field-value"><select id="empDept"><option value="">未設定</option>${depts.map(d=>`<option value="${d.id}">${d.name}</option>`).join('')}</select></td></tr>
          <tr><td class="field-label">役割 <span style="color:#ef4444">*</span></td><td class="field-value"><select id="empRole"><option value="employee">従業員</option><option value="manager">マネージャー</option><option value="admin">管理者</option></select></td></tr>
          <tr><td class="field-label">マネージャー</td><td class="field-value"><select id="empManager"><option value="">未設定</option>${managerOptions}</select></td></tr>
          <tr><td class="field-label">レベル</td><td class="field-value"><input id="empLevel" placeholder="例: L1/L2/Senior"></td></tr>
          <tr><td class="field-label">雇用形態 <span style="color:#ef4444">*</span></td><td class="field-value"><select id="empType"><option value="full_time">正社員</option><option value="part_time">パート・アルバイト</option><option value="contract">契約社員</option></select></td></tr>
          <tr><td class="field-label">入社日</td><td class="field-value"><input id="empJoinDate" type="date"></td></tr>
          <tr><td class="field-label">試用開始</td><td class="field-value"><input id="empProbDate" type="date"></td></tr>
          <tr><td class="field-label">正社員化</td><td class="field-value"><input id="empOfficialDate" type="date"></td></tr>
          <tr><td class="field-label">契約終了日</td><td class="field-value"><input id="empContractEnd" type="date"></td></tr>
          <tr><td class="field-label">基本給</td><td class="field-value"><input id="empBaseSalary" type="number" step="0.01" placeholder="円"></td></tr>
          <tr><td class="field-label">状態 <span style="color:#ef4444">*</span></td><td class="field-value"><select id="empStatus"><option value="active">在職</option><option value="inactive">休職/無効</option><option value="retired">退職</option></select></td></tr>
          <tr><td class="field-label">画像</td><td class="field-value"><input id="empAvatarUrl" placeholder="画像URL (任意)"><input id="empAvatarFile" type="file" accept="image/*" multiple style="margin-top:8px;font-size:12px;"></td></tr>
        </table>

        <div style="display:flex;justify-content:space-between;padding:16px 20px;border-top:1px solid #e2e8f0;">
          <button type="button" id="btnPrev" style="height:38px;padding:0 24px;background:#f1f5f9;color:#475569;border:1px solid #cbd5e1;font-size:13px;font-weight:600;cursor:pointer;border-radius:4px;display:inline-flex;align-items:center;gap:6px;">
            ← 戻る
          </button>
          <button type="button" id="btnNext2" style="height:38px;padding:0 24px;background:#0f172a;color:#fff;border:none;font-size:13px;font-weight:600;cursor:pointer;border-radius:4px;display:inline-flex;align-items:center;gap:6px;">
            次へ →
          </button>
        </div>
      </div>

      <!-- Step 3: シフト割当 (任意) -->
      <div id="step3" class="emp-add-form" style="border:1px solid #cbd5e1; margin-bottom:20px; box-shadow:0 1px 3px rgba(0,0,0,.04); display:none;">
        <div class="section-header">シフト割当（任意）</div>
        <table style="width:100%;border-collapse:collapse;">
          <tr><td class="field-label">シフト</td><td class="field-value"><select id="empShiftAssign"><option value="">シフト</option></select></td></tr>
          <tr><td class="field-label">開始日</td><td class="field-value"><input id="empShiftStart" type="date"></td></tr>
          <tr><td class="field-label">終了日</td><td class="field-value"><input id="empShiftEnd" type="date"></td></tr>
        </table>
        <div style="display:flex;justify-content:space-between;padding:16px 20px;border-top:1px solid #e2e8f0;">
          <button type="button" id="btnPrev3" style="height:38px;padding:0 24px;background:#f1f5f9;color:#475569;border:1px solid #cbd5e1;font-size:13px;font-weight:600;cursor:pointer;border-radius:4px;display:inline-flex;align-items:center;gap:6px;">
            ← 戻る
          </button>
          <button type="button" id="btnNext3" style="height:38px;padding:0 24px;background:#0f172a;color:#fff;border:none;font-size:13px;font-weight:600;cursor:pointer;border-radius:4px;display:inline-flex;align-items:center;gap:6px;">
            次へ →
          </button>
        </div>
      </div>

      <!-- Step 4: 契約内容・業務内容 (任意) -->
      <div id="step4" class="emp-add-form" style="border:1px solid #cbd5e1; margin-bottom:20px; box-shadow:0 1px 3px rgba(0,0,0,.04); display:none;">
        <div class="section-header">契約内容・業務内容（任意）</div>
        <table style="width:100%;border-collapse:collapse;">
          <tr><td class="field-label">開始日</td><td class="field-value"><input id="empWdStart" type="date"></td></tr>
          <tr><td class="field-label">終了日</td><td class="field-value"><input id="empWdEnd" type="date"></td></tr>
          <tr><td class="field-label">企業名</td><td class="field-value"><input id="empWdCompany" placeholder="企業名"></td></tr>
          <tr><td class="field-label">就業先住所</td><td class="field-value"><input id="empWdAddr" placeholder="住所"></td></tr>
          <tr><td class="field-label">業務内容</td><td class="field-value"><input id="empWdWork" placeholder="業務内容"></td></tr>
          <tr><td class="field-label">役職</td><td class="field-value"><input id="empWdRole" placeholder="役職"></td></tr>
          <tr><td class="field-label">責任程度</td><td class="field-value"><input id="empWdResp" placeholder="責任程度"></td></tr>
        </table>
        <div style="display:flex;justify-content:space-between;padding:16px 20px;border-top:1px solid #e2e8f0;">
          <button type="button" id="btnPrev4" style="height:38px;padding:0 24px;background:#f1f5f9;color:#475569;border:1px solid #cbd5e1;font-size:13px;font-weight:600;cursor:pointer;border-radius:4px;display:inline-flex;align-items:center;gap:6px;">
            ← 戻る
          </button>
          <div style="display:flex;align-items:center;gap:12px;">
            <div id="empCreateMsg" style="color:#ef4444;font-weight:500;font-size:13px;display:none;"></div>
            <button type="submit" style="height:38px;padding:0 24px;background:#0f172a;color:#fff;border:none;font-size:13px;font-weight:600;cursor:pointer;border-radius:4px;display:inline-flex;align-items:center;gap:6px;">
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
              社員を作成
            </button>
          </div>
        </div>
      </div>
`;
    form.querySelector('#addBack').addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        const listKeys = ['q','dept','employmentType','role','status','hireFrom','hireTo','sortKey','sortDir','page','code','showAll'];
        const keep = new URLSearchParams();
        for (const k of listKeys) { const v = params.get(k); if (v) keep.set(k, v); }
        const qsKeep = keep.toString();
        history.replaceState(null, '', `/admin/employees${qsKeep ? '?' + qsKeep : ''}#list`);
      } catch (e) { /* bỏ qua lỗi */ }
      await renderEmployees(profile);
    });

    // Đổ dropdown chi nhánh cho form tạo mới
    try {
      const brSelCreate = form.querySelector('#empBranch');
      if (brSelCreate && branches.length) {
        brSelCreate.innerHTML = '<option value="">未設定</option>' + branches.map(br => `<option value="${br.id}">${br.name}</option>`).join('');
      }
    } catch (e) { /* bỏ qua lỗi */ }

    // Đổ dropdown シフト cho khối シフト割当 (tùy chọn) trong form tạo mới
    try {
      const shiftSel = form.querySelector('#empShiftAssign');
      if (shiftSel) {
        const defs = await fetchJSONAuth('/api/attendance/shifts/definitions').catch(() => []);
        const opts = (Array.isArray(defs) ? defs : []).map(d => `<option value="${d.id}">${d.name} ${d.start_time || ''}-${d.end_time || ''}</option>`).join('');
        shiftSel.innerHTML = `<option value="">シフト</option>${opts}`;
      }
    } catch (e) { /* bỏ qua lỗi */ }

    // Đổ dropdown tenant cho sysadmin
    try {
      const tenantSel = form.querySelector('#empTenantSelect');
      if (tenantSel) {
        if (isSysRole && tenantsList.length > 0) {
          // Sysadmin: hiện tất cả tenant
          const currentTid = String(profile?.tenantId || '');
          tenantSel.innerHTML = '<option value="">選択してください</option>' +
            tenantsList.map(t => `<option value="${t.id}"${String(t.id) === currentTid ? ' selected' : ''}>${t.name}</option>`).join('');
        } else {
          // Admin/Manager: lấy thông tin tenant của chính họ từ /api/auth/me hoặc dùng profile
          let tid = profile?.tenantId || '';
          let tName = profile?.tenantName || '';
          if (!tid) {
            try {
              const me = await fetchJSONAuth('/api/auth/me');
              tid = me?.tenantId || me?.tenant_id || '';
              tName = me?.tenantName || me?.tenant_name || '';
              // Thử luôn danh sách tenant từ ngữ cảnh user
              if (!tid && me?.tenants && me.tenants.length > 0) {
                tid = me.tenants[0].id || '';
                tName = me.tenants[0].name || '';
              }
            } catch (e) { /* bỏ qua lỗi */ }
          }
          if (!tid) {
            // Phương án cuối: lấy từ payload JWT
            try {
              const token = sessionStorage.getItem('accessToken') || '';
              if (token) {
                const payload = JSON.parse(atob(token.split('.')[1]));
                tid = payload.tid || payload.tenant_id || '';
              }
            } catch (e) { /* bỏ qua lỗi */ }
          }
          if (!tid) {
            // Dự phòng cuối cùng: gọi API tenants mà luồng chọn công ty dùng
            try {
              const data = await fetchJSONAuth('/api/auth/my-tenants');
              const list = data?.tenants || data || [];
              if (Array.isArray(list) && list.length > 0) {
                tenantSel.innerHTML = list.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
              } else {
                tenantSel.innerHTML = '<option value="">テナント未設定</option>';
              }
            } catch (e) {
              tenantSel.innerHTML = '<option value="">テナント未設定</option>';
            }
          } else {
            tenantSel.innerHTML = `<option value="${tid}" selected>${tName || '会社 #' + tid}</option>`;
          }
        }
      }
      // Khi đổi tenant, tải lại danh sách phòng ban của tenant đó
      const tenantSel2 = form.querySelector('#empTenantSelect');
      if (tenantSel2) {
        tenantSel2.addEventListener('change', async () => {
          const tid = tenantSel2.value;
          const deptSel = form.querySelector('#empDept');
          if (!deptSel) return;
          deptSel.innerHTML = '<option value="">読み込み中...</option>';
          try {
            const headers = tid ? { 'X-Tenant-Id': tid } : {};
            const deptsData = await fetchJSONAuth('/api/admin/departments', { headers });
            const list = Array.isArray(deptsData) ? deptsData : (deptsData?.rows || deptsData?.departments || []);
            deptSel.innerHTML = '<option value="">未設定</option>' + list.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
          } catch (e) {
            deptSel.innerHTML = '<option value="">未設定</option>';
          }
          // Tải lại luôn chi nhánh cho tenant được chọn
          const brSel = form.querySelector('#empBranch');
          if (brSel) {
            try {
              const headers = tid ? { 'X-Tenant-Id': tid } : {};
              const brData = await fetchJSONAuth('/api/branches', { headers });
              const brList = Array.isArray(brData) ? brData : (brData?.data || []);
              brSel.innerHTML = '<option value="">未設定</option>' + brList.map(br => `<option value="${br.id}">${br.name}</option>`).join('');
            } catch (e) {
              brSel.innerHTML = '<option value="">未設定</option>';
            }
          }
        });
      }
    } catch (e) { /* bỏ qua lỗi */ }

    // Logic điều hướng giữa các bước (4 bước: 基本情報 → 職務情報 → シフト割当 → 契約内容)
    const stepEls = [1, 2, 3, 4].map((n) => form.querySelector(`#step${n}`));
    const indEls = [1, 2, 3, 4].map((n) => form.querySelector(`#stepInd${n}`));
    const btnNext = form.querySelector('#btnNext');
    const btnPrev = form.querySelector('#btnPrev');

    // Hiển thị bước thứ n (1-4) và cập nhật chỉ báo tiến trình.
    const showStep = (n) => {
      stepEls.forEach((el, i) => { if (el) el.style.display = (i === n - 1) ? 'block' : 'none'; });
      indEls.forEach((el, i) => {
        if (!el) return;
        const active = i === n - 1;
        el.style.opacity = active ? '1' : '0.4';
        const dot = el.querySelector('span');
        if (dot) dot.style.background = active ? '#0f172a' : '#94a3b8';
      });
    };

    // Bước 1 → 2: kiểm tra các trường bắt buộc của 基本情報 trước khi chuyển.
    const goToStep2 = () => {
      const tenantVal = form.querySelector('#empTenantSelect')?.value;
      const code = form.querySelector('#empCode')?.value?.trim();
      const name = form.querySelector('#empName')?.value?.trim();
      const email = form.querySelector('#empEmail')?.value?.trim();
      const pass = form.querySelector('#empPass')?.value;
      const missing = [];
      if (!tenantVal) missing.push('所属会社');
      if (!code) missing.push('社員番号');
      if (!name) missing.push('氏名');
      if (!email) missing.push('メール');
      if (!pass) missing.push('パスワード');
      if (missing.length > 0) {
        const msgEl = form.querySelector('#empStepMsg');
        if (msgEl) {
          msgEl.textContent = `${missing.join('、')} は必須です。`;
          msgEl.style.display = 'block';
        } else {
          alert(`${missing.join('、')} は必須です。`);
        }
        return;
      }
      const msgEl2 = form.querySelector('#empStepMsg');
      if (msgEl2) msgEl2.style.display = 'none';
      showStep(2);
    };
    const goToStep1 = () => showStep(1);
    const goToStep3 = () => showStep(3);
    const goToStep4 = () => showStep(4);

    if (form.querySelector('#btnNext2')) form.querySelector('#btnNext2').addEventListener('click', goToStep3);
    if (form.querySelector('#btnPrev3')) form.querySelector('#btnPrev3').addEventListener('click', goToStep2);
    if (form.querySelector('#btnNext3')) form.querySelector('#btnNext3').addEventListener('click', goToStep4);
    if (form.querySelector('#btnPrev4')) form.querySelector('#btnPrev4').addEventListener('click', goToStep3);
    if (btnNext) btnNext.addEventListener('click', goToStep2);
    if (btnPrev) btnPrev.addEventListener('click', goToStep1);

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const msgEl = form.querySelector('#empCreateMsg');
      const btn = form.querySelector('button[type="submit"]');
      const b = {
        employeeCode: document.querySelector('#empCode').value.trim(),
        username: document.querySelector('#empName').value.trim(),
        email: document.querySelector('#empEmail').value.trim(),
        password: document.querySelector('#empPass').value,
        role: document.querySelector('#empRole').value,
        branchId: document.querySelector('#empBranch').value ? parseInt(document.querySelector('#empBranch').value,10) : null,
        departmentId: document.querySelector('#empDept').value ? parseInt(document.querySelector('#empDept').value,10) : null,
        level: (document.querySelector('#empLevel').value || '').trim() || null,
        managerId: document.querySelector('#empManager').value ? parseInt(document.querySelector('#empManager').value,10) : null,
        employmentType: document.querySelector('#empType').value,
        hireDate: document.querySelector('#empJoinDate').value.trim() || null,
        probationDate: document.querySelector('#empProbDate').value.trim() || null,
        officialDate: document.querySelector('#empOfficialDate').value.trim() || null,
        contractEnd: document.querySelector('#empContractEnd').value.trim() || null,
        baseSalary: (document.querySelector('#empBaseSalary').value || '').trim() || null,
        birthDate: document.querySelector('#empBirth').value.trim() || null,
        gender: document.querySelector('#empGender').value || null,
        phone: (document.querySelector('#empPhone').value || '').trim() || null,
        address: (document.querySelector('#empAddr').value || '').trim() || null,
        employmentStatus: document.querySelector('#empStatus').value,
        avatarUrl: (document.querySelector('#empAvatarUrl').value || '').trim() || null
      };
      if (!b.username || !b.email || !b.password) {
          if (msgEl) { msgEl.style.display = 'block'; msgEl.style.color = '#f87171'; msgEl.textContent = '氏名・メール・パスワードは必須です。'; }
          return;
        }
      if (msgEl) msgEl.style.display = 'none';
      const ok = window.confirm('作成しますか？');
      if (!ok) return;
      // Gửi tenant được chọn qua header X-Tenant-Id để hỗ trợ multi-tenant
      const selectedTenantId = document.querySelector('#empTenantSelect')?.value || '';
      const createOpts = selectedTenantId ? { headers: { 'X-Tenant-Id': selectedTenantId } } : undefined;
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg> <span>作成中...</span>`;
      }
      try {
        const r = await createEmployee(b, createOpts);

        // Nếu admin có nhập シフト割当 / 契約内容 thì tạo luôn cho nhân viên mới.
        // Bảng tháng sẽ tự đọc từ user_shift_assignments / user_work_details và hiển thị.
        try {
          if (r && r.id) {
            const jsonOpts = selectedTenantId
              ? { headers: { 'X-Tenant-Id': selectedTenantId } }
              : {};
            const shiftId = (document.querySelector('#empShiftAssign')?.value || '').trim();
            const shiftStart = (document.querySelector('#empShiftStart')?.value || '').trim();
            const shiftEnd = (document.querySelector('#empShiftEnd')?.value || '').trim();
            if (shiftId && shiftStart) {
              await fetchJSONAuth('/api/attendance/shifts/assign', {
                ...jsonOpts,
                method: 'POST',
                body: JSON.stringify({ userId: r.id, shiftId, startDate: shiftStart, endDate: shiftEnd || null })
              }).catch(() => {});
            }
            const wdStart = (document.querySelector('#empWdStart')?.value || '').trim();
            const wdEnd = (document.querySelector('#empWdEnd')?.value || '').trim();
            const wdCompany = (document.querySelector('#empWdCompany')?.value || '').trim();
            const wdAddr = (document.querySelector('#empWdAddr')?.value || '').trim();
            const wdWork = (document.querySelector('#empWdWork')?.value || '').trim();
            const wdRole = (document.querySelector('#empWdRole')?.value || '').trim();
            const wdResp = (document.querySelector('#empWdResp')?.value || '').trim();
            const hasWd = wdCompany || wdAddr || wdWork || wdRole || wdResp;
            if (hasWd) {
              const wdStartFinal = wdStart || b.hireDate || shiftStart || '';
              if (wdStartFinal) {
                await fetchJSONAuth('/api/attendance/work-details', {
                  ...jsonOpts,
                  method: 'POST',
                  body: JSON.stringify({
                    userId: r.id,
                    startDate: wdStartFinal,
                    endDate: wdEnd || null,
                    companyName: wdCompany,
                    workPlaceAddress: wdAddr,
                    workContent: wdWork,
                    roleTitle: wdRole,
                    responsibilityLevel: wdResp
                  })
                }).catch(() => {});
              }
            }
          }
        } catch (e) { /* bỏ qua lỗi tạo シフト/契約 - không chặn việc tạo nhân viên */ }

        try {
          const fileEl = document.querySelector('#empAvatarFile');
          if (fileEl && fileEl.files && fileEl.files.length && r && r.id) {
            const fd = new FormData();
            Array.from(fileEl.files).forEach((f) => fd.append('files', f));
            await fetchJSONAuth(`${photoApiBase}/employees/${encodeURIComponent(String(r.id))}/photos`, {
              method: 'POST',
              body: fd
            });
          }
        } catch (e) { /* bỏ qua lỗi */ }
        if (btn) {
          btn.style.background = 'transparent';
          btn.style.borderColor = 'transparent';
          btn.style.color = '#10b981';
          btn.innerHTML = `<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg> <span>作成成功</span>`;
        }
        try { sessionStorage.setItem('navSpinner', '1'); } catch (e) { /* bỏ qua lỗi */ }
        setTimeout(() => { window.location.href = '/admin/employees#list'; }, 1000);
        return;
      } catch (err) {
          const m = String((err && err.message) ? err.message : '');
          const low = m.toLowerCase();
          if (msgEl) {
            msgEl.style.display = 'block';
            msgEl.style.color = '#f87171';
            if (m.includes('社員番号') || low.includes('uniq_employee_code') || low.includes('duplicate entry')) {
              msgEl.textContent = '社員番号が既に存在します。別の番号を入力してください。';
              try { const el = document.querySelector('#empCode'); if (el && el.focus) el.focus(); } catch (e) { /* bỏ qua lỗi */ }
            } else if (m.includes('Email') || low.includes('email')) {
              msgEl.textContent = m;
              try { const el = document.querySelector('#empEmail'); if (el && el.focus) el.focus(); } catch (e) { /* bỏ qua lỗi */ }
            } else {
              msgEl.textContent = '作成失敗: ' + (m || 'error');
            }
          }
        } finally {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = `<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg> <span>作成</span>`;
        }
      }
    });
    if (seq !== employeesRenderSeq) return;
    content.appendChild(form);
    hideNavSpinner();
    return;
  }

  const filterWrap = document.createElement('div');
  filterWrap.style.margin = mode === 'delete' ? '0 0 8px' : '4px 0 12px';
  filterWrap.className = mode === 'delete' ? 'emp-filters emp-del-wrap' : 'emp-filters filter-bar';
  let listHeader = null;
  if (mode === 'delete') {
    filterWrap.innerHTML = `
      <table class="excel-table emp-del-filter" style="margin:0 0 10px; width:720px; min-width:680px;">
        <thead>
          <tr>
            <th colspan="2">
              <div class="del-head"><div class="form-title">【社員削除】</div></div>
            </th>
          </tr>
          <tr>
            <th colspan="2">
              <div class="del-tabs">
                <button type="button" id="tabSearch" class="tab active">社員検索</button>
                <button type="button" id="tabShowAll" class="tab">全員表示</button>
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="width:120px;">社員番号</td>
            <td><input id="empSearchCode" placeholder="EMP番号/コード"></td>
          </tr>
          <tr>
            <td style="width:120px;">名前</td>
            <td><input id="empSearchName" placeholder="名前"></td>
          </tr>
          <tr>
            <td></td>
            <td class="actions"><button type="button" id="btnEmpSearch" class="btn btn-search">検索</button></td>
          </tr>
        </tbody>
      </table>
      <div id="empListBox" style="display:none"></div>
    `;
  } else {
    filterWrap.innerHTML = `
      <div class="fi">
        <div class="fi-label">社員番号</div>
        <input id="empSearchCode" class="fi-code" placeholder="EMP番号/コード">
      </div>
      <div class="fi">
        <div class="fi-label">キーワード</div>
        <input id="empSearchKeyword" class="fi-name" placeholder="氏名・メール">
      </div>
      <div class="fi">
        <div class="fi-label">支店</div>
        <select id="empFilterBranch" class="fi-select"><option value="">全支店</option>${branches.map(br => `<option value="${br.id}">${br.name}</option>`).join('')}</select>
      </div>
      <div class="fi fi-action">
        <button type="button" id="btnEmpSearch" class="btn">検索</button>
      </div>
    `;
  }
  content.appendChild(filterWrap);
  if (mode === 'delete') {
    try {
      let style = document.querySelector('#empDelFilterStyle');
      if (!style) {
        style = document.createElement('style');
        style.id = 'empDelFilterStyle';
        style.textContent = `
          html.emp-delete-mode, body.emp-delete-mode { height: 100%; overflow: hidden; }
          .admin.emp-delete-mode .content { height: 100vh; overflow: hidden; box-sizing: border-box; }
          .admin.emp-delete-mode #adminContent { height: calc(100vh - var(--topbar-height) - 24px); overflow: hidden; }
          .emp-del-wrap { display: flex; flex-direction: column; max-width: 1300px; width: 100%; margin: 0 auto; padding: 8px 12px; height: 100%; box-sizing: border-box; }
          .del-head { display: inline-flex; margin-bottom: 0; }
          .del-tabs { display: inline-flex; gap: 8px; margin-bottom: 0; }
          .del-tabs .tab { height: 28px; padding: 0 10px; border-radius: 8px; border: 1px solid #d0d8e4; background: #f3f6fb; color: #1f3b63; }
          .del-tabs .tab.active { background: #2b6cb0; color: #fff; border-color: #1e4e8c; }
          .emp-del-filter { table-layout: fixed; border-collapse: separate; border-spacing: 0; background: #fff; border: 1px solid #e5eaf0; border-radius: 10px; overflow: hidden; box-shadow: 0 1px 2px rgba(16,24,40,.06); }
          .emp-del-filter thead th { background: #eaf2ff; color:#0d2c5b; font-weight:600; border-bottom:1px solid #e1e8f5; }
          .emp-del-filter tbody tr { height: 42px; }
          .emp-del-filter tbody tr td:first-child { width: 140px; white-space: nowrap; color: #0d2c5b; background:#f8fbff; border-right:1px solid #e3edf8; }
          .emp-del-filter tbody tr td:not(.actions) > * { width: 100%; }
          .emp-del-filter tbody td { padding: 10px 12px; vertical-align: middle; border-top: 1px solid #eef2f7; }
          .emp-del-filter input,
          .emp-del-filter select { height: 36px; border-radius: 0; background: #fcfdff; border: 1.5px solid #bcd0e6; padding: 6px 12px; box-sizing: border-box; display: block; }
          .emp-del-filter input::placeholder { color: #94a3b8; }
          .emp-del-filter input:focus,
          .emp-del-filter select:focus { border-color: #2b67b3; box-shadow: 0 0 0 3px rgba(43,103,179,.12); outline: none; }
          .emp-del-filter td.actions { text-align: center; }
          .emp-del-filter .date-range { display: flex; align-items: center; gap: 6px; }
          .emp-del-filter .date-range input { flex: 1 1 0; display: inline-block; min-width: 160px; }
          .emp-del-filter .date-range .tilde { width: 12px; text-align: center; color: #64748b; }
          .emp-del-filter .btn-search { height: 36px; border-radius: 0; padding: 0 16px; background: #2b6cb0; border: 1px solid #1e4e8c; color: #fff; transition: background-color .15s ease, border-color .15s ease; }
          .emp-del-filter .btn-search:hover { background: #255ea7; border-color: #1e4e8c; }
          .emp-del-filter .btn-search:active { background: #1f4e8a; border-color: #163b6e; }
          #empListBox { display:block; width:100%; margin-top:0; overflow: auto; flex: 1 1 auto; min-height: 0; }
          .emp-del-list thead { position: sticky; top: 0; z-index: 199; }
          .emp-del-list thead th { position: sticky; top: 0; z-index: 200; }
          .emp-del-toolbar { display: flex; justify-content: flex-end; margin: 8px 0 0; position: static; top: auto; z-index: auto; background: transparent; }
          .emp-bulk-disable { height: 36px; border-radius: 10px; padding: 0 16px; background: linear-gradient(180deg, #2b6cb0 0%, #255ea7 100%); border: 1px solid #1e4e8c; color: #fff; font-weight: 600; letter-spacing: .03em; box-shadow: 0 1px 2px rgba(16,24,40,.06); transition: background-color .15s ease, border-color .15s ease, transform .02s ease; }
          .emp-bulk-disable:hover { background: linear-gradient(180deg, #336fb3 0%, #2b62a9 100%); border-color: #1e4e8c; }
          .emp-bulk-disable:active { transform: translateY(1px); }
          .emp-bulk-disable:focus { outline: 3px solid rgba(43,103,179,.20); outline-offset: 2px; }
        `;
        document.head.appendChild(style);
      }
    } catch (e) { /* bỏ qua lỗi */ }
  }

  const state = { showAll: false, searchVisible: false, code: '', q: '', branch: '', dept: '', employmentType: '', status: '', sortKey: 'id', sortDir: 'asc', page: 1, pageSize: 10 };
  let noResultBackTimer = null;
  try {
    state.showAll = ((params.get('showAll') || '') === '1' || (params.get('showAll') || '').toLowerCase() === 'true');
    state.searchVisible = ((params.get('search') || '') === '1' || (params.get('search') || '').toLowerCase() === 'true');
    state.code = (params.get('code') || '').trim().toLowerCase();
    state.q = (params.get('q') || '').trim().toLowerCase();
    state.branch = (params.get('branch') || '').trim();
    state.dept = (params.get('dept') || '').trim();
    state.employmentType = (params.get('employmentType') || params.get('type') || '').trim().toLowerCase();
    state.status = (params.get('status') || '').trim().toLowerCase();
    state.sortKey = params.get('sortKey') || state.sortKey;
    state.sortDir = params.get('sortDir') || state.sortDir;
    state.page = parseInt(params.get('page') || String(state.page), 10) || state.page;
  } catch (e) { /* bỏ qua lỗi */ }
  const updateUrl = (hashValue) => {
    try {
      const p = new URLSearchParams();
      if (state.code) p.set('code', state.code);
      if (mode === 'delete' && state.showAll) p.set('showAll', '1');
      if (mode === 'delete' && state.searchVisible) p.set('search', '1');
      if (state.q) p.set('q', state.q);
      if (state.dept) p.set('dept', state.dept);
      if (state.employmentType) p.set('employmentType', state.employmentType);
      if (state.status) p.set('status', state.status);
      if (state.sortKey && state.sortKey !== 'id') p.set('sortKey', state.sortKey);
      if (state.sortDir && state.sortDir !== 'asc') p.set('sortDir', state.sortDir);
      if (state.page && state.page > 1) p.set('page', String(state.page));
      const qs = p.toString();
      history.replaceState(null, '', `/admin/employees${qs ? '?' + qs : ''}${hashValue || ''}`);
    } catch (e) { /* bỏ qua lỗi */ }
  };

  const searchHint = document.createElement('div');
  searchHint.id = 'empSearchHint';
  searchHint.style.display = 'none';
  searchHint.style.color = '#b00020';
  searchHint.style.fontWeight = '700';
  searchHint.style.marginTop = '6px';
  searchHint.textContent = '検索条件を入力してください';
  try {
    const tbl = filterWrap.querySelector('table');
    const act = filterWrap.querySelector('.fi-action');
    if (tbl && mode === 'delete') tbl.after(searchHint);
    else if (act) act.after(searchHint);
    else filterWrap.appendChild(searchHint);
  } catch (e) { /* bỏ qua lỗi */ }

  const table = document.createElement('table');
  table.id = 'list';
  table.className = 'excel-table' + (mode === 'delete' ? ' emp-del-list' : '');
  table.style.tableLayout = 'auto';
  table.style.width = '100%';
  table.style.minWidth = mode === 'delete' ? '100%' : '100%';
  table.innerHTML = `
    <thead>
      <tr>
        ${mode==='delete' ? '<th class="sel-col" style="min-width:40px;">選択</th>' : ''}
        <th data-sort="id" style="min-width:90px;">社員番号</th>
        <th data-sort="username" style="min-width:80px;">氏名</th>
        <th data-sort="email" style="min-width:180px;">メール</th>
        <th data-sort="branch" style="min-width:80px;">支店</th>
        <th data-sort="department" style="min-width:80px;">部署</th>
        <th data-sort="role" style="min-width:80px;">役割</th>
        <th data-sort="employment_type" style="min-width:100px;">雇用形態</th>
        <th data-sort="employment_status" style="min-width:60px;">状態</th>
        <th data-sort="hire_date" style="min-width:90px;">入社日</th>
        <th data-sort="created_at" style="min-width:90px;">作成日</th>
      </tr>
    </thead>
  `;
  const tbody = document.createElement('tbody');
  table.appendChild(tbody);

  const tableScrollWrap = document.createElement('div');
  tableScrollWrap.className = 'emp-list-scroll-wrap';
  tableScrollWrap.appendChild(table);
  const isMobileFlatMode = () => {
    try {
      if (!window.matchMedia) return false;
      return window.matchMedia('(max-width: 576px)').matches;
    } catch {
      return false;
    }
  };
  let lastMobileFlatMode = null;
  const syncPinnedColumnsSticky = () => {
    try {
      const removeOverlay = () => {
        try { tableScrollWrap.classList.remove('has-freeze-overlay'); } catch (e) { /* bỏ qua lỗi */ }
        try {
          const el = tableScrollWrap.querySelector('.emp-freeze-overlay');
          if (el) el.remove();
        } catch (e) { /* bỏ qua lỗi */ }
      };
      try {
        tableScrollWrap.classList.remove('use-pin-overlay');
        const legacyPanel = tableScrollWrap.querySelector('.emp-pin-panel');
        if (legacyPanel) legacyPanel.remove();
      } catch (e) { /* bỏ qua lỗi */ }
      removeOverlay();
      const isMobile = !!(window.matchMedia && window.matchMedia('(max-width: 768px)').matches);
      const isNarrowMobile = isMobileFlatMode();
      const canPin = mode !== 'delete' && isMobile && !isNarrowMobile;
      if (!canPin) {
        return;
      }
      const srcHead = table.querySelector('thead tr');
      if (!srcHead) return;
      const cells = Array.from(srcHead.children);
      if (cells.length < 2) return;
      const w1 = Math.max(72, Math.ceil(cells[0].getBoundingClientRect().width || 0));
      const w2 = Math.max(88, Math.ceil(cells[1].getBoundingClientRect().width || 0));
      tableScrollWrap.style.setProperty('--pin-col-1', `${w1}px`);
      tableScrollWrap.style.setProperty('--pin-col-2', `${w2}px`);
      const setWidth = (el, w) => {
        if (!el) return;
        el.style.width = `${w}px`;
        el.style.minWidth = `${w}px`;
        el.style.maxWidth = `${w}px`;
      };
      setWidth(cells[0], w1);
      setWidth(cells[1], w2);
      Array.from(tbody.querySelectorAll('tr')).forEach((r) => {
        const tds = r.children;
        setWidth(tds[0], w1);
        setWidth(tds[1], w2);
      });

    } catch (e) { /* bỏ qua lỗi */ }
  };
  if (!tableScrollWrap.dataset.pinBound) {
    tableScrollWrap.dataset.pinBound = '1';
    try { window.addEventListener('resize', () => { try { syncPinnedColumnsSticky(); } catch (e) { /* bỏ qua lỗi */ } }); } catch (e) { /* bỏ qua lỗi */ }
    try { window.addEventListener('orientationchange', () => { try { syncPinnedColumnsSticky(); } catch (e) { /* bỏ qua lỗi */ } }); } catch (e) { /* bỏ qua lỗi */ }
  }

  const pager = document.createElement('div');
  pager.style.margin = '8px 0';
  pager.style.display = 'flex';
  pager.style.alignItems = 'center';
  pager.style.justifyContent = 'space-between';
  pager.innerHTML = `
    <div class="pager-left">
      <button type="button" id="empPrev">前へ</button>
      <span id="empPageInfo" style="margin:0 8px;"></span>
      <button type="button" id="empNext">次へ</button>
    </div>
    <div class="pager-right">
      <label for="empPageSize">表示件数:</label>
      <select id="empPageSize">
        <option value="10">10</option>
        <option value="25">25</option>
        <option value="50">50</option>
        <option value="100">100</option>
      </select>
    </div>
  `;

  if (mode === 'delete') {
    const toolbar = document.createElement('div');
    toolbar.className = 'emp-del-toolbar';
    toolbar.innerHTML = '<div class="pager-right" id="empBulkBox"><button type="button" id="empBulkDisable" class="emp-bulk-disable" aria-label="選択を無効化">選択を無効化</button></div>';
    toolbar.style.display = '';
    const listBox = filterWrap.querySelector('#empListBox');
    if (listBox) {
      listBox.appendChild(tableScrollWrap);
      listBox.appendChild(pager);
      filterWrap.appendChild(toolbar);
    } else {
      filterWrap.appendChild(tableScrollWrap);
      filterWrap.appendChild(pager);
      filterWrap.appendChild(toolbar);
    }
  } else {
    // Tiêu đề đã được hiển thị trên Sidebar/Header, ẩn đi cho đỡ rườm rà
    content.appendChild(tableScrollWrap);
    content.appendChild(pager);
  }

  const noResultCenter = document.createElement('div');
  noResultCenter.id = 'empNoResultCenter';
  noResultCenter.style.display = 'none';
  noResultCenter.style.minHeight = '52vh';
  noResultCenter.style.alignItems = 'center';
  noResultCenter.style.justifyContent = 'center';
  noResultCenter.style.textAlign = 'center';
  noResultCenter.style.fontWeight = '800';
  noResultCenter.style.fontSize = '20px';
  noResultCenter.style.color = '#0b2c66';
  noResultCenter.textContent = '該当データがありません';
  content.appendChild(noResultCenter);
  const hideFilterWrap = () => {
    try { filterWrap.style.setProperty('display', 'none', 'important'); } catch (e) { /* bỏ qua lỗi */ }
  };
  const showFilterWrap = () => {
    try { filterWrap.style.removeProperty('display'); } catch (e) { /* bỏ qua lỗi */ }
  };

  const fmtEmpNo = (id) => 'EMP' + String(id).padStart(3, '0');
  const deptName = (id) => {
    const d = depts.find(x => String(x.id) === String(id));
    return d ? d.name : '';
  };
  const statusJa = (s) => {
    const v = String(s || '').toLowerCase();
    if (v === 'inactive') return '無効';
    if (v === 'retired') return '退職';
    return '在職';
  };
  const statusPill = (s) => {
    const v = String(s || '').toLowerCase();
    const cls = v === 'inactive' ? 'inactive' : (v === 'retired' ? 'retired' : 'active');
    return `<span class="status-pill ${cls}">${statusJa(v)}</span>`;
  };
  const roleJa = (r) => {
    const v = String(r || '').toLowerCase();
    if (v === 'admin') return '管理者';
    if (v === 'manager') return 'マネージャー';
    if (v === 'employee') return '従業員';
    return r || '';
  };
  const empTypeJa = (t) => {
    const v = String(t || '').toLowerCase();
    if (v === 'full_time') return '正社員';
    if (v === 'part_time') return 'パート・アルバイト';
    if (v === 'contract') return '契約社員';
    return t || '';
  };
  const rolePill = (r) => {
    const v = String(r || '').toLowerCase();
    const cls = v === 'admin' ? 'admin' : (v === 'manager' ? 'manager' : 'employee');
    return `<span class="role-pill ${cls}">${roleJa(v)}</span>`;
  };
  const typePill = (t) => {
    const v = String(t || '').toLowerCase();
    const cls = v === 'full_time' ? 'full' : (v === 'part_time' ? 'part' : (v === 'contract' ? 'contract' : 'other'));
    return `<span class="type-pill ${cls}">${empTypeJa(v)}</span>`;
  };
  const normText = (v) => {
    if (v === null || v === undefined) return '';
    const s = String(v).trim();
    return (s && s !== '-') ? s : '';
  };
  const dispOrUnreg = (v) => {
    const s = normText(v);
    return s ? s : `<span class="unreg" title="未登録">—</span>`;
  };
  const escAttr = (v) => String(v)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const fmtDate = (d) => {
    if (!d || String(d) === '-' || String(d) === '0000-00-00') return `<span class="unreg" title="未登録">—</span>`;
    const raw = String(d);
    const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[1]}/${m[2]}/${m[3]}`;
    try {
      const x = new Date(raw);
      if (!isNaN(x.getTime())) return `${x.getFullYear()}/${String(x.getMonth()+1).padStart(2,'0')}/${String(x.getDate()).padStart(2,'0')}`;
    } catch (e) { /* bỏ qua lỗi */ }
    return raw;
  };
  const normalizeSearchText = (v) => String(v || '').trim().replace(/\s+/g, ' ').toLowerCase();
  const buildSearchSummaryJa = () => {
    const parts = [];
    if (state.code) parts.push(`社員番号:${state.code}`);
    if (state.q) parts.push(`KW:${state.q}`);
    if (state.dept) parts.push(`部署:${deptName(state.dept) || state.dept}`);
    if (state.employmentType) parts.push(`雇用形態:${empTypeJa(state.employmentType) || state.employmentType}`);
    if (state.status) parts.push(`状態:${statusJa(state.status) || state.status}`);
    return parts.join(' / ');
  };
  const applyFilterSort = () => {
    let arr = users.slice();
    if (state.branch) {
      arr = arr.filter(u => String(u.branch_id || '') === String(state.branch));
    }
    if (state.dept) {
      arr = arr.filter(u => String(u.departmentId || '') === String(state.dept));
    }
    if (state.employmentType) {
      arr = arr.filter(u => String(u.employment_type || '').toLowerCase() === state.employmentType);
    }
    if (state.status) {
      arr = arr.filter(u => String(u.employment_status || '').toLowerCase() === state.status);
    }
    if (state.code) {
      arr = arr.filter(u => {
        const raw = normalizeSearchText(u.employee_code);
        const gen = normalizeSearchText('emp' + String(u.id).padStart(3,'0'));
        return raw === state.code || gen === state.code;
      });
    }
    if (state.q) {
      arr = arr.filter((u) => {
        const name = normalizeSearchText(u.username);
        const email = normalizeSearchText(u.email);
        return name.includes(state.q) || email.includes(state.q);
      });
    }
    const key = state.sortKey;
    const dir = state.sortDir === 'asc' ? 1 : -1;
    arr.sort((a,b) => {
      const codeOf = (u) => String((u && (u.employee_code || fmtEmpNo(u.id))) || '').toUpperCase();
      if (key === 'hire_date') {
        const da = String((a && a.hire_date) || '');
        const db = String((b && b.hire_date) || '');
        if (da !== db) {
          if (!da) return 1;
          if (!db) return -1;
          return da.localeCompare(db) * dir;
        }
        const codeCmp = codeOf(a).localeCompare(codeOf(b));
        if (codeCmp !== 0) return codeCmp;
        return Number(a?.id || 0) - Number(b?.id || 0);
      }
      const va = key === 'department' ? deptName(a.departmentId) : (key === 'id' ? codeOf(a) : (a[key]||''));
      const vb = key === 'department' ? deptName(b.departmentId) : (key === 'id' ? codeOf(b) : (b[key]||''));
      return String(va).localeCompare(String(vb)) * dir;
    });
    return arr;
  };
  const renderRows = () => {
    const all = applyFilterSort();
    const total = all.length;
    const hasSearch = !!(state.code || state.q || state.dept || state.employmentType || state.status);
    syncTopbarSearchKeyword(state.q || state.code);
    const start = (state.page - 1) * state.pageSize;
    const pageItems = all.slice(start, start + state.pageSize);
    const isNarrowMobile = isMobileFlatMode();
    lastMobileFlatMode = isNarrowMobile;
    tbody.innerHTML = '';
    if (!total) {
      if (hasSearch) {
        const noResultMsg = buildSearchSummaryJa()
          ? `「${buildSearchSummaryJa()}」は見つかりません`
          : '該当データがありません';
        noResultCenter.textContent = noResultMsg;
        try { noResultCenter.style.display = 'flex'; } catch (e) { /* bỏ qua lỗi */ }
        hideFilterWrap();
        try { if (listHeader) listHeader.style.display = 'none'; } catch (e) { /* bỏ qua lỗi */ }
      } else {
        try { noResultCenter.style.display = 'none'; } catch (e) { /* bỏ qua lỗi */ }
        showFilterWrap();
        try { if (listHeader) listHeader.style.display = ''; } catch (e) { /* bỏ qua lỗi */ }
      }
      clearTopbarNoResultState();
      try { table.style.display = 'none'; } catch (e) { /* bỏ qua lỗi */ }
      try { tableScrollWrap.style.display = 'none'; } catch (e) { /* bỏ qua lỗi */ }
      try { pager.style.display = 'none'; } catch (e) { /* bỏ qua lỗi */ }
      const pageInfo0 = content.querySelector('#empPageInfo');
      if (pageInfo0) pageInfo0.textContent = '';
      return;
    }
    try { noResultCenter.style.display = 'none'; } catch (e) { /* bỏ qua lỗi */ }
    showFilterWrap();
    try { if (listHeader) listHeader.style.display = ''; } catch (e) { /* bỏ qua lỗi */ }
    clearTopbarNoResultState();
    try { table.style.display = ''; } catch (e) { /* bỏ qua lỗi */ }
    try { tableScrollWrap.style.display = ''; } catch (e) { /* bỏ qua lỗi */ }
    try { pager.style.display = ''; } catch (e) { /* bỏ qua lỗi */ }
    for (const u of pageItems) {
      const tr = document.createElement('tr');
      const rowStatus = String(u.employment_status || '').toLowerCase();
      tr.className = `emp-row ${rowStatus || 'active'}`;
      // Cho phép nhấp vào hàng để mở 詳細 (trừ chế độ chọn xóa hàng loạt).
      if (mode !== 'delete') {
        tr.classList.add('emp-row-clickable');
        tr.dataset.detailId = String(u.id);
      }
      const emailVal = normText(u.email);
      const deptVal = normText(deptName(u.departmentId));

      if (isNarrowMobile && mode !== 'delete') {
        tr.classList.add('mobile-flat');
        tr.innerHTML = `
          <td class="m-code-cell">
            <div class="m-code-label">社員番号</div>
            <div class="m-code-value">${u.employee_code || fmtEmpNo(u.id)}</div>
          </td>
          <td class="m-main-cell" colspan="8">
            <div class="m-line"><span class="m-k">氏名:</span> <span class="m-v"><a class="emp-name-link" href="/admin/employees?detail=${u.id}">${u.username||''}</a></span></div>
            <div class="m-line"${emailVal ? ` title="${escAttr(emailVal)}"` : ''}><span class="m-k">メール:</span> <span class="m-v">${dispOrUnreg(emailVal)}</span></div>
            <div class="m-line"${deptVal ? ` title="${escAttr(deptVal)}"` : ''}><span class="m-k">部署:</span> <span class="m-v">${dispOrUnreg(deptVal)}</span></div>
            <div class="m-line"><span class="m-k">役割:</span> <span class="m-v">${roleJa(u.role)}</span></div>
            <div class="m-line"><span class="m-k">雇用形態:</span> <span class="m-v">${typePill(u.employment_type)}</span></div>
            <div class="m-line"><span class="m-k">状態:</span> <span class="m-v">${statusJa(u.employment_status)}</span></div>
            <div class="m-line"><span class="m-k">入社日:</span> <span class="m-v">${fmtDate(u.hire_date)}</span></div>
          </td>
        `;
      } else {
        tr.innerHTML = `
        ${mode==='delete' ? `<td class="sel-col" data-label="選択"><input type="checkbox" class="empSel" value="${u.id}"></td>` : ''}
        <td class="col-code" data-label="社員番号" style="font-weight:600;">${u.employee_code || fmtEmpNo(u.id)}</td>
        <td class="col-name" data-label="氏名"><a class="emp-name-link" href="/admin/employees?detail=${u.id}">${u.username||''}</a></td>
        <td class="col-email" data-label="メール"${emailVal ? ` title="${escAttr(emailVal)}"` : ''}>${dispOrUnreg(emailVal)}</td>
        <td class="col-branch" data-label="支店">${(branches.find(br => String(br.id) === String(u.branch_id)) || {}).name || '—'}</td>
        <td class="col-dept" data-label="部署"${deptVal ? ` title="${escAttr(deptVal)}"` : ''}>${dispOrUnreg(deptVal)}</td>
        <td data-label="役割">${rolePill(u.role)}</td>
        <td data-label="雇用形態">${typePill(u.employment_type)}</td>
        <td data-label="状態">${statusPill(u.employment_status)}</td>
        <td data-label="入社日">${fmtDate(u.hire_date)}</td>
        <td data-label="作成日">${fmtDate(u.created_at)}</td>
      `;
      }
      tbody.appendChild(tr);
    }

    // Nhấp vào hàng nhân viên để mở 詳細. Bỏ qua khi nhấp vào nút/link/ô chọn
    // để không nuốt thao tác 編集/無効化/削除. Chỉ gắn listener một lần cho tbody.
    if (!tbody.dataset.rowClickWired) {
      tbody.dataset.rowClickWired = '1';
      tbody.addEventListener('click', (e) => {
        const t = e.target;
        if (t.closest('a, button, input, select, label')) return;
        const row = t.closest('tr.emp-row-clickable');
        if (!row || !row.dataset.detailId) return;
        window.location.href = `/admin/employees?detail=${encodeURIComponent(row.dataset.detailId)}`;
      });
    }

    const from = total ? Math.min(total, start + 1) : 0;
    const to = Math.min(total, start + pageItems.length);
    const pageInfo = content.querySelector('#empPageInfo');
    const prevEl = content.querySelector('#empPrev');
    const nextEl = content.querySelector('#empNext');
    if (pageInfo) {
      const maxPage = Math.max(1, Math.ceil(total / state.pageSize));
      pageInfo.textContent = `${from}-${to} / ${total} (${maxPage}ページ)`;
      
      // Cập nhật trạng thái nút
      if (prevEl) {
        prevEl.disabled = state.page <= 1;
        prevEl.style.display = '';
      }
      if (nextEl) {
        nextEl.disabled = state.page >= maxPage;
        nextEl.style.display = '';
      }
      
      // Ẩn/hiện thông tin trang
      if (total === 0) {
        pageInfo.style.display = 'none';
      } else {
        pageInfo.style.display = '';
      }
    }
    if (!isNarrowMobile) {
      syncPinnedColumnsSticky();
      try { setTimeout(() => syncPinnedColumnsSticky(), 80); } catch (e) { /* bỏ qua lỗi */ }
      try { setTimeout(() => syncPinnedColumnsSticky(), 220); } catch (e) { /* bỏ qua lỗi */ }
    } else {
      try {
        tableScrollWrap.style.removeProperty('--pin-col-1');
        tableScrollWrap.style.removeProperty('--pin-col-2');
      } catch (e) { /* bỏ qua lỗi */ }
    }
  };
  const handleViewportLayoutChange = () => {
    try {
      const now = isMobileFlatMode();
      if (lastMobileFlatMode === null) return;
      if (now === lastMobileFlatMode) return;
      renderRows();
    } catch (e) { /* bỏ qua lỗi */ }
  };
  if (!tableScrollWrap.dataset.layoutBound) {
    tableScrollWrap.dataset.layoutBound = '1';
    try { window.addEventListener('resize', handleViewportLayoutChange, { passive: true }); } catch (e) { /* bỏ qua lỗi */ }
    try { window.addEventListener('orientationchange', handleViewportLayoutChange); } catch (e) { /* bỏ qua lỗi */ }
  }
  renderRows();
  if (mode === 'delete') {
    try {
      const listBox = filterWrap.querySelector('#empListBox');
      const formBody = filterWrap.querySelector('.emp-del-filter tbody');
      const tb = filterWrap.querySelector('.emp-del-toolbar');
      const hasList = state.showAll || state.searchVisible;
      if (listBox) listBox.style.display = hasList ? '' : 'none';
      table.style.display = hasList ? '' : 'none';
      pager.style.display = hasList ? '' : 'none';
      if (tb) tb.style.display = hasList ? '' : 'none';
      if (formBody) formBody.style.display = '';

      const tabSearch = filterWrap.querySelector('#tabSearch');
      const tabShowAll = filterWrap.querySelector('#tabShowAll');
      const setActive = () => {
        const has = state.showAll || state.searchVisible;
        if (state.showAll) {
          if (tabSearch) tabSearch.classList.remove('active');
          if (tabShowAll) tabShowAll.classList.add('active');
        } else {
          if (tabSearch) tabSearch.classList.add('active');
          if (tabShowAll) tabShowAll.classList.remove('active');
        }
        if (listBox) listBox.style.display = has ? '' : 'none';
        table.style.display = has ? '' : 'none';
        pager.style.display = has ? '' : 'none';
        if (tb) tb.style.display = has ? '' : 'none';
        if (formBody) formBody.style.display = '';
      };
      setActive();
      if (tabSearch) tabSearch.addEventListener('click', () => {
        state.showAll = false;
        state.searchVisible = false;
        try { searchHint.style.display = 'none'; } catch (e) { /* bỏ qua lỗi */ }
        setActive();
        updateUrl('#delete');
      });
      if (tabShowAll) tabShowAll.addEventListener('click', () => {
        state.showAll = true;
        state.searchVisible = false;
        state.page = 1;
        try { searchHint.style.display = 'none'; } catch (e) { /* bỏ qua lỗi */ }
        setActive();
        renderRows();
        updateUrl('#delete');
      });
    } catch (e) { /* bỏ qua lỗi */ }
  }

  try {
    const codeEl = filterWrap.querySelector('#empSearchCode'); if (codeEl) codeEl.value = (params.get('code') || '');
    const keywordEl = filterWrap.querySelector('#empSearchKeyword') || filterWrap.querySelector('#empSearchName');
    if (keywordEl) keywordEl.value = (params.get('q') || '');
    const deptEl = filterWrap.querySelector('#empFilterDept'); if (deptEl) deptEl.value = state.dept;
    const typeEl = filterWrap.querySelector('#empFilterType'); if (typeEl) typeEl.value = state.employmentType;
    const statusEl = filterWrap.querySelector('#empFilterStatus'); if (statusEl) statusEl.value = state.status;
    if (searchHint) {
      const hasAny0 = !!((params.get('code') || '').trim() || (params.get('q') || '').trim() || state.dept || state.employmentType || state.status);
      searchHint.style.display = hasAny0 ? 'none' : 'none';
    }
  } catch (e) { /* bỏ qua lỗi */ }

  filterWrap.querySelector('#btnEmpSearch').addEventListener('click', () => {
    const codeEl2 = filterWrap.querySelector('#empSearchCode');
    const keywordEl2 = filterWrap.querySelector('#empSearchKeyword') || filterWrap.querySelector('#empSearchName');
    const branchEl2 = filterWrap.querySelector('#empFilterBranch');
    const deptEl2 = filterWrap.querySelector('#empFilterDept');
    const typeEl2 = filterWrap.querySelector('#empFilterType');
    const statusEl2 = filterWrap.querySelector('#empFilterStatus');
    state.code = String((codeEl2 && codeEl2.value != null) ? codeEl2.value : '').trim().toLowerCase();
    state.q = String((keywordEl2 && keywordEl2.value != null) ? keywordEl2.value : '').trim().toLowerCase();
    state.branch = String((branchEl2 && branchEl2.value != null) ? branchEl2.value : '').trim();
    state.dept = String((deptEl2 && deptEl2.value != null) ? deptEl2.value : '').trim();
    state.employmentType = String((typeEl2 && typeEl2.value != null) ? typeEl2.value : '').trim().toLowerCase();
    state.status = String((statusEl2 && statusEl2.value != null) ? statusEl2.value : '').trim().toLowerCase();
    state.page = 1;
    const hasAny = !!(state.code || state.q || state.branch || state.dept || state.employmentType || state.status);
    if (!hasAny && !(mode === 'delete' && state.showAll)) {
      syncTopbarSearchKeyword('');
      clearTopbarNoResultState();
      try { searchHint.style.display = 'block'; } catch (e) { /* bỏ qua lỗi */ }
      try { const el = filterWrap.querySelector('#empSearchCode'); if (el && el.focus) el.focus(); } catch (e) { /* bỏ qua lỗi */ }
      if (mode === 'delete') {
        try {
          const listBox = filterWrap.querySelector('#empListBox');
          if (listBox) listBox.style.display = 'none';
          table.style.display = 'none';
          pager.style.display = 'none';
          const tb = filterWrap.querySelector('.emp-del-toolbar');
          if (tb) tb.style.display = 'none';
        } catch (e) { /* bỏ qua lỗi */ }
      }
      return;
    }
    try { searchHint.style.display = 'none'; } catch (e) { /* bỏ qua lỗi */ }
    if (mode === 'delete') {
      state.searchVisible = hasAny;
      if (!hasAny && !state.showAll) {
        try {
          const listBox = filterWrap.querySelector('#empListBox');
          if (listBox) listBox.style.display = 'none';
          table.style.display = 'none';
          pager.style.display = 'none';
          const tb = filterWrap.querySelector('.emp-del-toolbar');
          if (tb) tb.style.display = 'none';
        } catch (e) { /* bỏ qua lỗi */ }
        return;
      }
      try {
        const listBox = filterWrap.querySelector('#empListBox');
        if (listBox) listBox.style.display = '';
        table.style.display = '';
        pager.style.display = '';
        const tb = filterWrap.querySelector('.emp-del-toolbar');
        if (tb) tb.style.display = '';
      } catch (e) { /* bỏ qua lỗi */ }
    }
    if (mode !== 'delete' && hasAny) {
      const matchedCount = applyFilterSort().length;
      if (!matchedCount) {
        renderRows();
        updateUrl('#list');
        try {
          if (noResultBackTimer) clearTimeout(noResultBackTimer);
        } catch (e) { /* bỏ qua lỗi */ }
        noResultBackTimer = setTimeout(() => {
          state.code = '';
          state.q = '';
          state.dept = '';
          state.employmentType = '';
          state.status = '';
          state.page = 1;
          try { if (codeEl2) codeEl2.value = ''; } catch (e) { /* bỏ qua lỗi */ }
          try { if (keywordEl2) keywordEl2.value = ''; } catch (e) { /* bỏ qua lỗi */ }
          try { if (deptEl2) deptEl2.value = ''; } catch (e) { /* bỏ qua lỗi */ }
          try { if (typeEl2) typeEl2.value = ''; } catch (e) { /* bỏ qua lỗi */ }
          try { if (statusEl2) statusEl2.value = ''; } catch (e) { /* bỏ qua lỗi */ }
          renderRows();
          updateUrl('#list');
        }, 1500);
        return;
      }
    }
    renderRows();
    updateUrl(mode === 'delete' ? '#delete' : '#list');
  });

  const prev = pager.querySelector('#empPrev');
  const next = pager.querySelector('#empNext');
  const pageSizeSelect = pager.querySelector('#empPageSize');
  
  // Khởi tạo select số dòng mỗi trang
  if (pageSizeSelect) {
    pageSizeSelect.value = state.pageSize;
    pageSizeSelect.addEventListener('change', (e) => {
      state.pageSize = parseInt(e.target.value, 10);
      state.page = 1; // Quay về trang đầu khi đổi số dòng mỗi trang
      renderRows();
      updateUrl(mode === 'delete' ? '#delete' : '#list');
    });
  }
  
  prev.addEventListener('click', () => {
    if (state.page > 1) {
      state.page -= 1;
      renderRows();
      updateUrl(mode === 'delete' ? '#delete' : '#list');
    }
  });
  
  next.addEventListener('click', () => {
    const total = applyFilterSort().length;
    const maxPage = Math.max(1, Math.ceil(total / state.pageSize));
    if (state.page < maxPage) {
      state.page += 1;
      renderRows();
      updateUrl(mode === 'delete' ? '#delete' : '#list');
    }
  });

  if (mode === 'delete') {
    table.addEventListener('click', (e) => {
      const t = e && e.target;
      const td = (t && t.closest) ? t.closest('td') : null;
      if (!td) return;
      if (t && t.closest && t.closest('.emp-ops-wrap')) return;
      if (t && t.closest && t.closest('a')) return;
      if (t && t.matches && t.matches('input, button, select, label')) return;
      const tr = td.closest('tr');
      const cb = tr ? tr.querySelector('.empSel') : null;
      if (cb) cb.checked = !cb.checked;
    });

    const bulkHandler = async (e) => {
      if (!(e.target && e.target.id === 'empBulkDisable')) return;
      const ids = Array.from(content.querySelectorAll('.empSel:checked')).map(i => i.value);
      if (!ids.length) { alert('対象を選択してください'); return; }
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      const modal = document.createElement('div');
      modal.className = 'modal';
      const listRows = ids.map(id => {
        const u = users.find(x => String(x.id) === String(id));
        const code = (u && u.employee_code) ? u.employee_code : fmtEmpNo(id);
        const name = (u && u.username) ? u.username : '';
        const dept = deptName((u && u.departmentId) ? u.departmentId : null);
        return `<div class="row"><div>${code}</div><div>${name}　${dept}</div></div>`;
      }).join('');
      modal.innerHTML = `
        <div class="modal-head">⚠️　社員無効化の確認</div>
        <div class="modal-body">
          <div>以下の社員を無効化しますか？</div>
          <div class="modal-list">${listRows}</div>
          <div>この操作は取り消すことができません。</div>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn" id="modalConfirmDisable">無効化する</button>
          <button type="button" class="btn" id="modalCancelDisable">キャンセル</button>
        </div>
      `;
      overlay.appendChild(modal);
      document.body.appendChild(overlay);
      const close = () => { try { document.body.removeChild(overlay); } catch (e) { /* bỏ qua lỗi */ } };
      overlay.addEventListener('click', (ev) => { if (ev.target === overlay) close(); });
      modal.querySelector('#modalCancelDisable').addEventListener('click', close);
      modal.querySelector('#modalConfirmDisable').addEventListener('click', async () => {
        const btn = modal.querySelector('#modalConfirmDisable');
        btn.disabled = true;
        try {
          for (const id of ids) {
            try { await deleteEmployee(id); } catch (e) { /* bỏ qua lỗi */ }
          }
          for (const id of ids) {
            const u = users.find(x => String(x.id) === String(id));
            if (u) u.employment_status = 'inactive';
          }
          renderRows();
        } finally {
          close();
          alert('無効化しました（状態: 無効/休職）');
        }
      });
    };
    filterWrap.addEventListener('click', bulkHandler);
    pager.addEventListener('click', bulkHandler);
  }

  content.addEventListener('click', async (e) => {
    const t = e && e.target;
    const a = (t && t.closest) ? t.closest('a') : null;
    if (a) {
      const href = a.getAttribute('href') || '';
      if (href.startsWith('/admin/employees?detail=') || href.startsWith('/admin/employees?edit=')) {
        e.preventDefault();
        const url = new URL(href, window.location.origin);
        const keepKeys = ['q','dept','employmentType','role','status','hireFrom','hireTo','sortKey','sortDir','page','code'];
        for (const k of keepKeys) {
          const v = params.get(k);
          if (v && !url.searchParams.get(k)) url.searchParams.set(k, v);
        }
        window.location.href = url.pathname + '?' + url.searchParams.toString() + (url.hash || '');
        return;
      }
    }
    const t2 = e && e.target;
    const delId = (t2 && t2.getAttribute) ? t2.getAttribute('data-delete') : null;
    if (delId) {
      if (confirm('この社員を無効化しますか？')) {
        try {
          await deleteEmployee(delId);
          const u = users.find(x => String(x.id) === String(delId));
          if (u) u.employment_status = 'inactive';
          alert('無効化しました（状態: 無効/休職）');
          renderRows();
        } catch (err) {
          alert(String((err && err.message) ? err.message : '無効化に失敗しました'));
        }
      }
      return;
    }
    const hardId = (t2 && t2.getAttribute) ? t2.getAttribute('data-hard-delete') : null;
    if (hardId) {
      if (confirm('この社員を完全に削除しますか？この操作は取り消せません。')) {
        try {
          await deleteUserHard(hardId);
          users = users.filter(x => String(x.id) !== String(hardId));
          renderRows();
        } catch (err) {
          alert(String((err && err.message) ? err.message : '削除に失敗しました'));
        }
      }
    }
  });

  hideNavSpinner();
}

let cachedProfile = null;

export async function mount(opt) { const c = opt && opt.content;
  if (!cachedProfile) {
    cachedProfile = await requireAdmin();
  }
  const profile = cachedProfile;
  if (!profile) return;
  try {
    const userName = document.querySelector('#userName');
    if (userName) userName.textContent = profile.username || profile.email || '管理者';
  } catch (e) { /* bỏ qua lỗi */ }

  const status = $('#status');
  if (status) status.textContent = '';

  const content = c || $('#adminContent');
  if (content && !c) content.className = 'card wide';

  await renderEmployees(profile, content);

  const onRouteUpdate = () => {
    try {
      if (!isEmployeesPath(location.pathname)) return;
      renderEmployees(profile, content);
    } catch (e) { /* bỏ qua lỗi */ }
  };
  window.addEventListener('hashchange', onRouteUpdate);
  window.addEventListener('popstate', onRouteUpdate);
  return () => {
    try { window.removeEventListener('hashchange', onRouteUpdate); } catch (e) { /* bỏ qua lỗi */ }
    try { window.removeEventListener('popstate', onRouteUpdate); } catch (e) { /* bỏ qua lỗi */ }
    try {
      document.body.classList.remove('emp-delete-mode');
      document.documentElement.classList.remove('emp-delete-mode');
    } catch (e) { /* bỏ qua lỗi */ }
  };
}

import { fetchJSONAuth } from '../../api/http.api.js';
import { listUsers } from '../../api/users.api.js';
import { listDepartments } from '../../api/departments.api.js';
import { createPayrollService } from './editor.service.js';
import { escapeHtml, employeeCode, yenPlain as yen, ensureStylesheet as ensurePayrollStylesheet, openPdf } from './shared.js';

// Dùng /api/admin/employees/:id (permit('employees','manage'), cho phép cả
// admin lẫn manager) thay vì /api/admin/users/:id (chỉ authorize('admin'))
// — nhất quán với phần còn lại của trang lương vốn cho phép cả 2 vai trò.
function updateEmployee(id, data) {
  return fetchJSONAuth(`/api/admin/employees/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  });
}

const taxCategoryLabel = (v) => (String(v || 'kou') === 'otsu' ? '乙欄' : '甲欄');

const monthLabel = (m) => {
  const match = /^(\d{4})-(\d{2})$/.exec(String(m || ''));
  return match ? `${match[1]}年${match[2]}月分` : String(m || '');
};

const currentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

function ensureStylesheet() {
  ensurePayrollStylesheet('payrollEditorStyle', '/static/css/payroll-editor.css?v=6');
  ensurePayrollStylesheet('payrollLedgerStyle', '/static/css/payroll-ledger.css?v=4');
}

function hideAdminChrome() {
  try {
    const chrome = document.querySelector('#adminChrome');
    if (chrome) chrome.style.setProperty('display', 'none', 'important');
    document.body.style.setProperty('padding', '0', 'important');
    document.body.style.setProperty('margin', '0', 'important');
    document.body.style.setProperty('overflow', 'hidden', 'important');
    const main = document.querySelector('main.content');
    if (main) { main.style.setProperty('padding', '0', 'important'); main.style.setProperty('margin', '0', 'important'); }
  } catch { /* ignore */ }
}

async function deactivateEmployee(id) {
  return fetchJSONAuth(`/api/admin/employees/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

// ---------------------------------------------------------------------------
// App shell
// ---------------------------------------------------------------------------

const SECTIONS = [
  { id: 'employees', label: '従業員', icon: '\u{1F464}' },
  { id: 'calc', label: '給与計算', icon: '\u{1F5C2}️' },
  { id: 'payslip', label: '明細書', icon: '\u{1F4C4}' },
  { id: 'settings', label: '設定', icon: '⚙️' }
];

async function mount({ content } = {}) {
  ensureStylesheet();
  hideAdminChrome();
  const host = content || document.querySelector('#adminContent');
  if (!host) return;

  host.innerHTML = '<div style="padding:60px;text-align:center;color:#9b8f72;">読み込み中...</div>';

  const service = createPayrollService({ fetchJSONAuth });
  const year = new Date().getFullYear();

  let employees = [];
  let departments = [];
  let config = null;
  try {
    const [usersRes, deptsRes, configRes] = await Promise.allSettled([
      listUsers(),
      listDepartments(),
      service.getConfig({ year })
    ]);
    if (usersRes.status === 'fulfilled') {
      employees = (Array.isArray(usersRes.value) ? usersRes.value : []).filter((u) => {
        const role = String(u.role || '').toLowerCase();
        return role !== 'admin' && role !== 'manager';
      });
    }
    if (deptsRes.status === 'fulfilled') departments = Array.isArray(deptsRes.value) ? deptsRes.value : [];
    if (configRes.status === 'fulfilled') config = configRes.value;
  } catch { /* ignore, render with whatever loaded */ }

  const deptName = (id) => {
    const d = departments.find((x) => String(x.id) === String(id));
    return d ? d.name : '';
  };

  const params = new URLSearchParams(window.location.search);
  let section = SECTIONS.some((s) => s.id === params.get('section')) ? params.get('section') : 'employees';

  const root = document.createElement('div');
  root.className = 'pl-root';
  root.innerHTML = `
    <nav class="pl-nav">
      <div class="pl-brand">
        <div class="t">給与元帳</div>
        <div class="s">${escapeHtml(config?.companyName || '')}</div>
      </div>
      <div class="pl-navlist">
        ${SECTIONS.map((s) => `
          <button type="button" class="pl-navitem${s.id === section ? ' active' : ''}" data-section="${s.id}">
            <span class="pl-navicon">${s.icon}</span><span>${s.label}</span>
          </button>
        `).join('')}
      </div>
      <div class="pl-navfoot"><span class="dot"></span>同期済み</div>
    </nav>
    <main class="pl-main"></main>
  `;
  host.innerHTML = '';
  host.appendChild(root);

  const mainEl = root.querySelector('.pl-main');

  const setSection = (id) => {
    section = id;
    root.querySelectorAll('.pl-navitem').forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-section') === id);
    });
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('section', id);
      history.replaceState(null, '', url.pathname + url.search);
    } catch { /* ignore */ }
    renderSection();
  };

  root.querySelectorAll('.pl-navitem').forEach((btn) => {
    btn.addEventListener('click', () => setSection(btn.getAttribute('data-section')));
  });

  const ctx = { service, employees, departments, deptName, config, year, refreshEmployees: async () => {
    try {
      const rows = await listUsers();
      ctx.employees = (Array.isArray(rows) ? rows : []).filter((u) => {
        const role = String(u.role || '').toLowerCase();
        return role !== 'admin' && role !== 'manager';
      });
    } catch { /* ignore */ }
  } };

  function renderSection() {
    mainEl.innerHTML = '';
    if (section === 'employees') return renderEmployeesSection(mainEl, ctx, renderSection);
    if (section === 'calc') return renderCalcSection(mainEl, ctx);
    if (section === 'payslip') return renderPayslipSection(mainEl, ctx);
    if (section === 'settings') return renderSettingsSection(mainEl, ctx);
  }

  renderSection();
}

// ---------------------------------------------------------------------------
// 従業員 (employee master)
// ---------------------------------------------------------------------------

function renderEmployeesSection(mainEl, ctx, rerender) {
  const { employees, deptName } = ctx;
  mainEl.innerHTML = `
    <div class="pl-head">
      <div>
        <div class="pl-eyebrow">EMPLOYEES</div>
        <h1>従業員</h1>
        <p>給与計算の対象となる従業員を登録します</p>
      </div>
    </div>
    <div class="pl-card" style="padding:14px 16px;margin-bottom:12px;">
      <input type="text" class="pl-input" id="empSearch" placeholder="氏名・社員番号・部署で検索" style="width:100%;" autocomplete="off">
    </div>
    <div class="pl-card" style="overflow-x:auto;">
      <table class="pl-table">
        <thead>
          <tr>
            <th>氏名</th><th>社員番号</th><th>部署</th>
            <th class="num">基礎給</th><th class="num">就業手当</th><th class="num">通勤手当</th>
            <th class="center">扶養</th><th class="center">区分</th><th></th>
          </tr>
        </thead>
        <tbody id="empBody"></tbody>
      </table>
      <div id="empEmpty" class="pl-empty" style="display:none;">従業員がいません</div>
    </div>
  `;

  const tbody = mainEl.querySelector('#empBody');
  const emptyEl = mainEl.querySelector('#empEmpty');

  const bindRowActions = () => {
    tbody.querySelectorAll('.btn-edit-emp').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.closest('tr').getAttribute('data-id');
        const emp = employees.find((u) => String(u.id) === String(id));
        if (emp) openEmployeeEditModal(emp, ctx, rerender);
      });
    });
    tbody.querySelectorAll('.btn-del-emp').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.closest('tr').getAttribute('data-id');
        const emp = employees.find((u) => String(u.id) === String(id));
        if (!window.confirm(`${emp?.username || 'この従業員'}を無効化しますか？（データは保持されます）`)) return;
        try {
          await deactivateEmployee(id);
          await ctx.refreshEmployees();
          rerender();
        } catch (err) {
          window.alert(String(err?.message || '削除に失敗しました'));
        }
      });
    });
  };

  const renderRows = (rows) => {
    if (!rows.length) {
      tbody.innerHTML = '';
      emptyEl.style.display = 'block';
      emptyEl.textContent = employees.length ? '該当する従業員が見つかりません' : '従業員がいません';
      return;
    }
    emptyEl.style.display = 'none';
    tbody.innerHTML = rows.map((u) => `
      <tr data-id="${escapeHtml(u.id)}">
        <td>${escapeHtml(u.username || u.email || '')}</td>
        <td>${escapeHtml(employeeCode(u))}</td>
        <td>${escapeHtml(deptName(u.departmentId) || '—')}</td>
        <td class="num">${yen(u.base_salary)}</td>
        <td class="num">${yen(u.qualification_allowance)}</td>
        <td class="num">${yen(u.allowance_transport)}</td>
        <td class="center">${Number(u.dependents_count || 0)}</td>
        <td class="center"><span class="pl-badge tan">${taxCategoryLabel(u.tax_category)}</span></td>
        <td style="text-align:right;white-space:nowrap;">
          <button type="button" class="pl-link btn-edit-emp">編集</button>
          &nbsp;·&nbsp;
          <button type="button" class="pl-link danger btn-del-emp">削除</button>
        </td>
      </tr>
    `).join('');
    bindRowActions();
  };

  renderRows(employees);

  mainEl.querySelector('#empSearch').addEventListener('input', (ev) => {
    const q = ev.target.value.trim().toLowerCase();
    if (!q) { renderRows(employees); return; }
    renderRows(employees.filter((u) => {
      const hay = `${employeeCode(u)} ${u.username || ''} ${u.email || ''} ${deptName(u.departmentId) || ''}`.toLowerCase();
      return hay.includes(q);
    }));
  });

}

function openEmployeeEditModal(emp, ctx, rerender) {
  const overlay = document.createElement('div');
  overlay.className = 'pl-overlay';
  overlay.innerHTML = `
    <div class="pl-modal">
      <h2 style="margin:0 0 22px;">従業員を編集</h2>
      <div class="pl-form-grid">
        <div class="pl-field"><label>氏名 *</label><input class="pl-input" id="fUsername" value="${escapeHtml(emp.username || '')}"></div>
        <div class="pl-field"><label>社員番号</label><input class="pl-input" id="fCode" value="${escapeHtml(employeeCode(emp))}"></div>
        <div class="pl-field">
          <label>部署</label>
          <select class="pl-select" id="fDept">
            <option value="">—</option>
            ${ctx.departments.map((d) => `<option value="${d.id}" ${String(d.id) === String(emp.departmentId) ? 'selected' : ''}>${escapeHtml(d.name)}</option>`).join('')}
          </select>
        </div>
        <div class="pl-field">
          <label>源泉区分</label>
          <select class="pl-select" id="fTaxCat">
            <option value="kou" ${String(emp.tax_category || 'kou') === 'kou' ? 'selected' : ''}>甲欄（扶養控除等申告書あり）</option>
            <option value="otsu" ${emp.tax_category === 'otsu' ? 'selected' : ''}>乙欄（複数勤務先など）</option>
          </select>
        </div>
        <div class="pl-field"><label>基礎給（月額・円）*</label><input class="pl-input" id="fBase" type="number" min="0" value="${Number(emp.base_salary || 0)}"></div>
        <div class="pl-field"><label>就業手当（月額・円）</label><input class="pl-input" id="fQual" type="number" min="0" value="${Number(emp.qualification_allowance || 0)}"></div>
        <div class="pl-field"><label>通勤手当（月額・円）</label><input class="pl-input" id="fCommute" type="number" min="0" value="${Number(emp.allowance_transport || 0)}"></div>
        <div class="pl-field">
          <label>通勤手段（非課税枠の判定用）</label>
          <select class="pl-select" id="fCommuteMethod">
            <option value="transit" ${String(emp.commute_method || 'transit') === 'transit' ? 'selected' : ''}>電車・バス（上限あり）</option>
            <option value="vehicle" ${emp.commute_method === 'vehicle' ? 'selected' : ''}>マイカー・バイク等（距離別）</option>
          </select>
        </div>
        <div class="pl-field" id="fCommuteDistanceField" style="${emp.commute_method === 'vehicle' ? '' : 'display:none;'}">
          <label>片道距離（km）</label>
          <input class="pl-input" id="fCommuteDistance" type="number" min="0" step="0.1" value="${emp.commute_distance_km != null ? Number(emp.commute_distance_km) : ''}">
        </div>
        <div class="pl-field"><label>扶養人数</label><input class="pl-input" id="fDep" type="number" min="0" value="${Number(emp.dependents_count || 0)}"></div>
        <div class="pl-field full"><label>生年月日（介護保険40～64歳判定用）</label><input class="pl-input" id="fBirth" type="date" value="${emp.birth_date ? String(emp.birth_date).slice(0, 10) : ''}"></div>
      </div>
      <div id="modalMsg" style="margin-top:10px;font-size:12.5px;color:#a13c2e;"></div>
      <div class="pl-modal-actions">
        <button type="button" class="pl-btn" id="btnCancel">キャンセル</button>
        <button type="button" class="pl-btn primary" id="btnSave">保存</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', (ev) => { if (ev.target === overlay) overlay.remove(); });
  overlay.querySelector('#btnCancel').addEventListener('click', () => overlay.remove());
  overlay.querySelector('#fCommuteMethod').addEventListener('change', (ev) => {
    const distanceField = overlay.querySelector('#fCommuteDistanceField');
    distanceField.style.display = ev.target.value === 'vehicle' ? '' : 'none';
  });
  overlay.querySelector('#btnSave').addEventListener('click', async () => {
    const msg = overlay.querySelector('#modalMsg');
    const username = overlay.querySelector('#fUsername').value.trim();
    const baseSalary = overlay.querySelector('#fBase').value;
    if (!username || baseSalary === '') {
      msg.textContent = '氏名と基礎給は必須です';
      return;
    }
    const btn = overlay.querySelector('#btnSave');
    btn.disabled = true;
    try {
      await updateEmployee(emp.id, {
        username,
        employeeCode: overlay.querySelector('#fCode').value.trim() || null,
        departmentId: overlay.querySelector('#fDept').value || null,
        taxCategory: overlay.querySelector('#fTaxCat').value,
        baseSalary: Number(baseSalary) || 0,
        qualificationAllowance: Number(overlay.querySelector('#fQual').value) || 0,
        allowanceTransport: Number(overlay.querySelector('#fCommute').value) || 0,
        commuteMethod: overlay.querySelector('#fCommuteMethod').value,
        commuteDistanceKm: overlay.querySelector('#fCommuteMethod').value === 'vehicle'
          ? (Number(overlay.querySelector('#fCommuteDistance').value) || 0)
          : null,
        dependentsCount: Number(overlay.querySelector('#fDep').value) || 0,
        birthDate: overlay.querySelector('#fBirth').value || null
      });
      await ctx.refreshEmployees();
      msg.style.color = '#3f6b2c';
      msg.textContent = '✓ 保存しました';
      btn.textContent = '保存しました';
      rerender();
      setTimeout(() => overlay.remove(), 700);
    } catch (err) {
      msg.style.color = '#a13c2e';
      msg.textContent = String(err?.message || '保存に失敗しました');
      btn.disabled = false;
    }
  });
}

// ---------------------------------------------------------------------------
// 給与計算 (monthly payroll list + detail preview)
// ---------------------------------------------------------------------------

function monthOptions(centerMonth) {
  const [cy, cm] = centerMonth.split('-').map(Number);
  const out = [];
  for (let i = -6; i <= 3; i++) {
    const d = new Date(cy, cm - 1 + i, 1);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return out;
}

async function renderCalcSection(mainEl, ctx) {
  const { employees, deptName, service } = ctx;
  let month = currentMonth();

  mainEl.innerHTML = `
    <div class="pl-head">
      <div>
        <div class="pl-eyebrow">PAYROLL CALCULATION</div>
        <h1>給与計算</h1>
        <p>対象月を選び、各従業員の「詳細プレビュー」から勤怠・支給・控除を入力します</p>
      </div>
      <select class="pl-select" id="monthSel">
        ${monthOptions(month).map((m) => `<option value="${m}" ${m === month ? 'selected' : ''}>${monthLabel(m)}</option>`).join('')}
      </select>
    </div>
    <div class="pl-card" style="overflow-x:auto;">
      <table class="pl-table">
        <thead>
          <tr>
            <th>氏名</th><th>部署</th><th class="center">自動計算</th>
            <th class="num">出勤日数</th><th class="num">欠勤日数</th>
            <th class="num">総支給額</th><th class="num">総控除額</th><th class="num">差引支給額</th>
            <th class="center">支払方法照合</th><th></th>
          </tr>
        </thead>
        <tbody id="calcBody"></tbody>
      </table>
    </div>
    <div class="pl-note">※ 社会保険料は概算料率、所得税は商易概算です。正式運用前に国税庁の源泉徴収税額表・社会保険料額表で必ず確認してください。「詳細プレビュー」内の金額は自動計算OFFで手入力に切り替えられます。</div>
  `;

  const tbody = mainEl.querySelector('#calcBody');

  const loadRows = async () => {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;color:#9b8f72;padding:24px;">読み込み中...</td></tr>`;
    if (!employees.length) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;color:#9b8f72;padding:24px;">従業員がいません</td></tr>`;
      return;
    }
    const rows = new Array(employees.length).fill(null);
    const BATCH = 4;
    for (let i = 0; i < employees.length; i += BATCH) {
      const batch = employees.slice(i, i + BATCH);
      const results = await Promise.all(batch.map(async (u) => {
        try {
          const input = await service.loadInput({ userId: u.id, month }).catch(() => null);
          const payload = input && input.payload ? input.payload : {};
          const emp = await service.computeEmp({ userId: u.id, month, payload });
          return { u, emp, ok: true, autoCalc: payload.autoCalcDeductions !== false };
        } catch {
          return { u, emp: null, ok: false, autoCalc: true };
        }
      }));
      results.forEach((r, idx) => { rows[i + idx] = r; });
      tbody.innerHTML = rows.map((r) => r ? renderCalcRow(r, deptName) : '<tr><td colspan="9"></td></tr>').join('');
      bindCalcRowActions(tbody, rows, ctx, month);
    }
  };

  function renderCalcRow(r, deptName) {
    const { u, emp, ok, autoCalc } = r;
    const gross = ok ? emp?.合計?.総支給額 : null;
    const deduct = ok ? emp?.合計?.総控除額 : null;
    const net = ok ? emp?.合計?.差引支給額 : null;
    const paySum = ok ? Number(emp?.支払?.振込支給額 || 0) + Number(emp?.支払?.現金支給額 || 0) + Number(emp?.支払?.現物支給額 || 0) : null;
    const match = ok && paySum != null && net != null ? Math.round(paySum) === Math.round(net) : null;
    return `
      <tr data-id="${escapeHtml(u.id)}">
        <td>${escapeHtml(u.username || u.email || '')}</td>
        <td>${escapeHtml(deptName(u.departmentId) || '—')}</td>
        <td class="center">${autoCalc ? '<span class="pl-badge green">自動計算ON</span>' : '<span class="pl-badge tan">自動計算OFF</span>'}</td>
        <td class="num">${ok ? Number(emp?.勤怠?.出勤日数 || 0) : '—'}</td>
        <td class="num">${ok ? Number(emp?.勤怠?.欠勤日数 || 0) : '—'}</td>
        <td class="num">${ok ? '¥' + yen(gross) : '—'}</td>
        <td class="num">${ok ? '¥' + yen(deduct) : '—'}</td>
        <td class="num" style="font-weight:800;">${ok ? '¥' + yen(net) : '—'}</td>
        <td class="center">${ok ? (match ? '<span class="pl-badge green">一致</span>' : '<span class="pl-badge tan">未設定</span>') : '—'}</td>
        <td><button type="button" class="pl-btn btn-preview">詳細プレビュー</button></td>
      </tr>
    `;
  }

  function bindCalcRowActions(tbody, rows, ctx, month) {
    tbody.querySelectorAll('.btn-preview').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.closest('tr').getAttribute('data-id');
        const r = rows.find((x) => x && String(x.u.id) === String(id));
        if (r) openCalcPreviewModal(r.u, month, ctx, loadRows);
      });
    });
  }

  mainEl.querySelector('#monthSel').addEventListener('change', (ev) => {
    month = ev.target.value;
    loadRows();
  });

  await loadRows();
}

function fieldNum(label, id, value, disabled) {
  return `
    <div class="pl-preview-row">
      <label>${label}</label>
      <input class="pl-input" id="${id}" type="number" value="${value != null ? value : ''}" ${disabled ? 'disabled placeholder="0"' : ''}>
    </div>
  `;
}

async function openCalcPreviewModal(user, month, ctx, onSaved) {
  const { service } = ctx;
  const overlay = document.createElement('div');
  overlay.className = 'pl-overlay';
  overlay.innerHTML = `<div class="pl-modal wide"><div style="text-align:center;padding:40px;color:#9b8f72;">読み込み中...</div></div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', (ev) => { if (ev.target === overlay) overlay.remove(); });

  let input = null;
  try { input = await service.loadInput({ userId: user.id, month }); } catch { /* ignore */ }
  const payload = (input && input.payload && typeof input.payload === 'object') ? input.payload : {};
  let isPublished = !!input?.is_published;
  let autoCalc = payload.autoCalcDeductions !== false;
  let emp = null;
  try { emp = await service.computeEmp({ userId: user.id, month, payload: { ...payload, autoCalcDeductions: autoCalc } }); } catch { /* ignore */ }

  const toItemList = (v) => Array.isArray(v)
    ? v.map((it) => ({ label: String(it?.label || ''), amount: Number(it?.amount) || 0 }))
    : (v && typeof v === 'object' ? Object.entries(v).map(([label, amount]) => ({ label, amount: Number(amount) || 0 })) : []);
  let extraEarningsList = toItemList(payload.extraEarnings);
  let extraDeductionsList = toItemList(payload.extraDeductions);

  const renderItemRows = (containerId, list) => {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = list.map((it, idx) => `
      <div class="pl-item-row" data-idx="${idx}">
        <input class="pl-item-label" type="text" placeholder="項目名" value="${escapeHtml(it.label)}">
        <input class="pl-item-amount" type="number" value="${it.amount}">
        <button type="button" class="pl-item-remove" title="削除">×</button>
      </div>
    `).join('');
    el.querySelectorAll('.pl-item-label').forEach((inp, idx) => inp.addEventListener('input', () => { list[idx].label = inp.value; }));
    el.querySelectorAll('.pl-item-amount').forEach((inp, idx) => inp.addEventListener('input', () => { list[idx].amount = Number(inp.value) || 0; }));
    el.querySelectorAll('.pl-item-remove').forEach((btn, idx) => btn.addEventListener('click', () => { list.splice(idx, 1); renderItemRows(containerId, list); }));
  };

  const fieldText = (label, id, value, disabled) => `
    <div class="pl-preview-row">
      <label>${label}</label>
      <input class="pl-input" id="${id}" type="text" value="${escapeHtml(value != null ? value : '')}" ${disabled ? 'disabled' : ''}>
    </div>
  `;

  const modal = overlay.querySelector('.pl-modal');
  const draw = () => {
    const k = emp?.勤怠 || {};
    const s = emp?.支給 || {};
    const d = emp?.控除 || {};
    const p = emp?.支払 || {};
    const t = emp?.合計 || {};
    const bonus = Number((payload?.overrideEarnings || {})['賞与・臨時'] || 0);
    const absentDeduct = Number(payload?.overrideEarnings?.欠勤控除 ?? s.欠勤控除 ?? 0);
    modal.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;">
        <div style="display:flex;align-items:center;gap:14px;">
          <div style="flex:0 0 auto;width:40px;height:40px;border-radius:50%;background:#1c2b45;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:15px;">${escapeHtml(String(user.username || '?').trim().charAt(0).toUpperCase())}</div>
          <div>
            <h2 style="margin:0;">給与明細書（プレビュー）</h2>
            <div class="pl-modal-sub" style="margin:2px 0 0;">${monthLabel(month)} ／ ${escapeHtml(user.username || '')}（${escapeHtml(employeeCode(user))}）</div>
          </div>
        </div>
        <label class="pl-toggle"><input type="checkbox" id="fAutoCalc" ${autoCalc ? 'checked' : ''} ${isPublished ? 'disabled' : ''}><span class="pl-toggle-label">自動計算${autoCalc ? 'ON' : 'OFF'}</span><span class="pl-toggle-switch"></span></label>
      </div>
      ${isPublished ? `
        <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;background:#fdecec;border:1px solid #e6b3ad;border-radius:8px;padding:10px 14px;margin-bottom:16px;">
          <div style="font-size:12.5px;color:#a13c2e;font-weight:700;">🔒 送信済みのためロック中です。編集するには送信を取り消してください。</div>
          <button type="button" class="pl-btn danger" id="btnUnlock" style="flex:0 0 auto;">送信を取り消してロック解除</button>
        </div>
      ` : ''}
      <div class="pl-preview-grid" style="${isPublished ? 'opacity:.55;pointer-events:none;' : ''}">
        <div class="pl-preview-section">
          <h3>勤怠</h3>
          ${fieldNum('出勤日数', 'kAttend', k.出勤日数, false)}
          ${fieldNum('休日出勤日数', 'kHolidayAttend', k.休日出勤日数, false)}
          ${fieldNum('半日出勤日数', 'kHalf', k.半日出勤日数, false)}
          ${fieldNum('欠勤日数', 'kAbsent', k.欠勤日数, false)}
          ${fieldNum('有給休暇', 'kPaidLeave', k.有給休暇, false)}
          <div class="pl-preview-row static"><label>就業時間（概算）</label><span class="val">${escapeHtml(k.就業時間 || '0:00')}</span></div>
          ${fieldText('時間外（法定外）', 'kOt', k.法外時間外, false)}
          ${fieldText('週40時間超', 'kW40', k.週40超時間, false)}
          ${fieldText('月60時間超', 'kM60', k.月60超時間, false)}
          ${fieldText('深夜勤務時間', 'kNight', k.深夜勤時間, false)}
        </div>
        <div class="pl-preview-section">
          <h3>支払方法</h3>
          ${fieldNum('振込', 'pBank', p.振込支給額, false)}
          ${fieldNum('現金', 'pCash', p.現金支給額, false)}
          ${fieldNum('現物', 'pKind', p.現物支給額, false)}
          <div class="pl-preview-total"><span>合計</span><span id="paySumVal">¥${yen(Number(p.振込支給額 || 0) + Number(p.現金支給額 || 0) + Number(p.現物支給額 || 0))}</span></div>
          <div id="payMatchMsg" style="font-size:12px;margin-top:4px;"></div>
          <button type="button" class="pl-btn" id="btnReflectNet" style="margin-top:10px;width:100%;">差引支給額を振込に一括反映</button>
        </div>
        <div class="pl-preview-section">
          <h3>支給</h3>
          ${fieldNum('基礎給', 'sBase', s.基礎給, true)}
          ${fieldNum('就業手当', 'sQual', s.就業手当, true)}
          ${fieldNum('時間外手当', 'sOt', s.時間外手当, autoCalc)}
          ${fieldNum('週40超手当', 'sW40', s.週40超手当, autoCalc)}
          ${fieldNum('月60超手当', 'sM60', s.月60超手当, autoCalc)}
          ${fieldNum('所休出手当', 'sHoliday', s.所休出手当, autoCalc)}
          ${fieldNum('深夜勤手当', 'sNight', s.深夜勤手当, autoCalc)}
          ${fieldNum('賞与・臨時', 'sBonus', bonus, false)}
          ${fieldNum('欠勤控除', 'sAbsentDeduct', absentDeduct, false)}
          <div id="extraEarningsList"></div>
          <button type="button" class="pl-btn-add" id="btnAddEarn" style="display:inline-flex;align-items:center;gap:4px;height:26px;padding:0 8px;border:1px dashed #d9d0b8;border-radius:6px;background:none;color:#1c2b45;font-size:11.5px;font-weight:700;cursor:pointer;width:100%;justify-content:center;margin-top:4px;">+ 支給項目を追加</button>
          <div class="pl-preview-total"><span>総支給額</span><span>¥${yen(t.総支給額)}</span></div>
        </div>
        <div class="pl-preview-section">
          <h3>控除</h3>
          ${fieldNum('健康保険料', 'dHealth', d.健康保険料, autoCalc)}
          ${fieldNum('介護保険料', 'dCare', d.介護保険料, autoCalc)}
          ${fieldNum('厚生年金保険', 'dPension', d.厚生年金保険, autoCalc)}
          ${fieldNum('雇用保険料', 'dEmp', d.雇用保険料, autoCalc)}
          ${fieldNum('所得税（概算）', 'dTax', d.所得税, autoCalc)}
          ${fieldNum('住民税', 'dResident', d.住民税, false)}
          ${fieldNum('立替家賃', 'dRent', d.立替家賃, false)}
          <div id="extraDeductionsList"></div>
          <button type="button" class="pl-btn-add" id="btnAddDed" style="display:inline-flex;align-items:center;gap:4px;height:26px;padding:0 8px;border:1px dashed #d9d0b8;border-radius:6px;background:none;color:#1c2b45;font-size:11.5px;font-weight:700;cursor:pointer;width:100%;justify-content:center;margin-top:4px;">+ 控除項目を追加</button>
          <div class="pl-preview-total"><span>控除合計</span><span>¥${yen(t.総控除額)}</span></div>
        </div>
      </div>
      <div class="pl-highlight">
        <span class="l">差引支給額（手取り）</span>
        <span class="v">¥${yen(t.差引支給額)}</span>
      </div>
      <div id="modalMsg" style="margin-top:10px;font-size:12.5px;color:#a13c2e;"></div>
      <div class="pl-modal-actions">
        <button type="button" class="pl-btn" id="btnClose">閉じる</button>
        ${isPublished ? '' : '<button type="button" class="pl-btn primary" id="btnSavePrev">保存</button>'}
      </div>
    `;

    renderItemRows('extraEarningsList', extraEarningsList);
    renderItemRows('extraDeductionsList', extraDeductionsList);
    const btnAddEarn = modal.querySelector('#btnAddEarn');
    if (btnAddEarn) btnAddEarn.addEventListener('click', () => { extraEarningsList.push({ label: '', amount: 0 }); renderItemRows('extraEarningsList', extraEarningsList); });
    const btnAddDed = modal.querySelector('#btnAddDed');
    if (btnAddDed) btnAddDed.addEventListener('click', () => { extraDeductionsList.push({ label: '', amount: 0 }); renderItemRows('extraDeductionsList', extraDeductionsList); });

    const netAmount = yen(t.差引支給額);
    const updatePaySum = () => {
      const bank = Number(modal.querySelector('#pBank').value) || 0;
      const cash = Number(modal.querySelector('#pCash').value) || 0;
      const kind = Number(modal.querySelector('#pKind').value) || 0;
      const sum = bank + cash + kind;
      modal.querySelector('#paySumVal').textContent = `¥${yen(sum)}`;
      const matchEl = modal.querySelector('#payMatchMsg');
      if (sum === netAmount) {
        matchEl.style.color = '#3f6b2c';
        matchEl.textContent = '✓ 支払方法合計は差引支給額と一致しています';
      } else {
        matchEl.style.color = '#a13c2e';
        matchEl.textContent = `⚠ 差引支給額（¥${yen(netAmount)}）と一致しません`;
      }
    };
    ['#pBank', '#pCash', '#pKind'].forEach((sel) => {
      modal.querySelector(sel).addEventListener('input', updatePaySum);
    });
    modal.querySelector('#btnReflectNet').addEventListener('click', () => {
      const cash = Number(modal.querySelector('#pCash').value) || 0;
      const kind = Number(modal.querySelector('#pKind').value) || 0;
      modal.querySelector('#pBank').value = Math.max(0, netAmount - cash - kind);
      updatePaySum();
    });
    updatePaySum();

    modal.querySelector('#fAutoCalc').addEventListener('change', async (ev) => {
      autoCalc = ev.target.checked;
      try { emp = await service.computeEmp({ userId: user.id, month, payload: { ...payload, autoCalcDeductions: autoCalc } }); } catch { /* ignore */ }
      draw();
    });
    modal.querySelector('#btnClose').addEventListener('click', () => overlay.remove());
    const unlockBtn = modal.querySelector('#btnUnlock');
    if (unlockBtn) {
      unlockBtn.addEventListener('click', async () => {
        if (!window.confirm('送信を取り消しますか？取り消すと従業員のマイページから見えなくなり、再び編集できるようになります。')) return;
        unlockBtn.disabled = true;
        try {
          await service.publishPayslip({ userId: user.id, month, is_published: false });
          isPublished = false;
          draw();
        } catch (err) {
          window.alert(String(err?.message || '取り消しに失敗しました'));
          unlockBtn.disabled = false;
        }
      });
    }
    const saveBtn = modal.querySelector('#btnSavePrev');
    if (saveBtn) saveBtn.addEventListener('click', async () => {
      const msg = modal.querySelector('#modalMsg');
      const btn = saveBtn;
      btn.disabled = true;
      const textOrUndef = (id) => {
        const v = modal.querySelector(id).value.trim();
        return v === '' ? undefined : v;
      };
      const kintai = {};
      const setK = (key, v) => { if (v !== undefined && v !== '') kintai[key] = v; };
      setK('出勤日数', Number(modal.querySelector('#kAttend').value) || 0);
      setK('休日出勤日数', Number(modal.querySelector('#kHolidayAttend').value) || 0);
      setK('半日出勤日数', Number(modal.querySelector('#kHalf').value) || 0);
      setK('欠勤日数', Number(modal.querySelector('#kAbsent').value) || 0);
      setK('有給休暇付与', Number(modal.querySelector('#kPaidLeave').value) || 0);
      setK('法外時間外', textOrUndef('#kOt'));
      setK('週40超時間', textOrUndef('#kW40'));
      setK('月60超時間', textOrUndef('#kM60'));
      setK('深夜勤時間', textOrUndef('#kNight'));
      const newPayload = {
        ...payload,
        autoCalcDeductions: autoCalc,
        kintai,
        rentDeduction: Number(modal.querySelector('#dRent').value) || 0,
        payment: {
          振込支給額: Number(modal.querySelector('#pBank').value) || 0,
          現金支給額: Number(modal.querySelector('#pCash').value) || 0,
          現物支給額: Number(modal.querySelector('#pKind').value) || 0
        },
        overrideDeductions: {
          ...(autoCalc ? {} : {
            健康保険料: Number(modal.querySelector('#dHealth').value) || 0,
            介護保険料: Number(modal.querySelector('#dCare').value) || 0,
            厚生年金保険: Number(modal.querySelector('#dPension').value) || 0,
            雇用保険料: Number(modal.querySelector('#dEmp').value) || 0,
            所得税: Number(modal.querySelector('#dTax').value) || 0
          }),
          住民税: Number(modal.querySelector('#dResident').value) || 0
        },
        overrideEarnings: {
          ...(autoCalc ? {} : {
            時間外手当: Number(modal.querySelector('#sOt').value) || 0,
            週40超手当: Number(modal.querySelector('#sW40').value) || 0,
            月60超手当: Number(modal.querySelector('#sM60').value) || 0,
            所休出手当: Number(modal.querySelector('#sHoliday').value) || 0,
            深夜勤手当: Number(modal.querySelector('#sNight').value) || 0
          }),
          '賞与・臨時': Number(modal.querySelector('#sBonus').value) || 0,
          欠勤控除: -Math.abs(Number(modal.querySelector('#sAbsentDeduct').value) || 0)
        },
        extraEarnings: extraEarningsList.filter((it) => it.label.trim() && it.amount),
        extraDeductions: extraDeductionsList.filter((it) => it.label.trim() && it.amount)
      };
      try {
        await service.persistPayload({ userId: user.id, month, payload: newPayload });
        msg.style.color = '#3f6b2c';
        msg.textContent = '✓ 保存しました';
        btn.textContent = '保存しました';
        if (onSaved) onSaved();
        setTimeout(() => overlay.remove(), 700);
      } catch (err) {
        msg.style.color = '#a13c2e';
        msg.textContent = String(err?.message || '保存に失敗しました');
        btn.disabled = false;
      }
    });
  };
  draw();
}

// ---------------------------------------------------------------------------
// 明細書 (printable payslip preview — real PDF still uses the existing template)
// ---------------------------------------------------------------------------

async function renderPayslipSection(mainEl, ctx) {
  const { employees, service, config } = ctx;
  let userId = employees[0] ? String(employees[0].id) : '';
  let month = currentMonth();

  mainEl.innerHTML = `
    <div style="display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap;margin-bottom:16px;">
      <select class="pl-select" id="pEmp">
        ${employees.map((u) => `<option value="${u.id}">${escapeHtml(u.username || u.email || '')} (${escapeHtml(employeeCode(u))})</option>`).join('')}
      </select>
      <select class="pl-select" id="pMonth">
        ${monthOptions(month).map((m) => `<option value="${m}" ${m === month ? 'selected' : ''}>${monthLabel(m)}</option>`).join('')}
      </select>
      <button type="button" class="pl-btn" id="btnPdf">PDF作成・プレビュー</button>
      <button type="button" class="pl-btn primary" id="btnSend">給与明細を送信</button>
      <a id="linkHistory" href="/admin/payroll/employees?standalone=1" target="_blank" rel="noopener" class="pl-btn" style="text-decoration:none;">送信履歴を見る</a>
    </div>
    <div class="pl-head">
      <div>
        <div class="pl-eyebrow">PAYSLIP</div>
        <h1>明細書</h1>
        <p>従業員と対象月を選んで明細を表示し、PDF作成・送信は従来のテンプレートを使用します</p>
      </div>
    </div>
    <div id="payslipMsg" style="margin-bottom:10px;font-size:12.5px;font-weight:700;"></div>
    <div id="payslipHost"></div>
  `;

  const host = mainEl.querySelector('#payslipHost');

  const parseHmToMin = (hm) => {
    if (!hm && hm !== 0) return 0;
    if (typeof hm === 'number') return hm;
    const pts = String(hm).split(':');
    if (pts.length === 2) return parseInt(pts[0], 10) * 60 + parseInt(pts[1], 10);
    return Number(hm) || 0;
  };
  const timeHrs = (v) => {
    if (!v && v !== 0) return '';
    if (v === '0.00' || v === '0:00' || v === '00:00' || v === '0' || v === 0) return '';
    const min = parseHmToMin(v);
    if (min === 0) return String(v);
    const val = (min / 60).toFixed(2);
    return val === '0.00' ? '' : val;
  };
  const countZero = (v) => Number(v || 0).toFixed(2);

  const gridBlock = (title, cols, rows, slots) => {
    const cells = slots.map((it) => `
      <div class="pl-grid-cell">
        <div class="l">${it ? escapeHtml(it.label) : ''}</div>
        <div class="v">${it ? escapeHtml(it.value ?? '') : ''}</div>
      </div>
    `).join('');
    return `
      <div class="pl-grid-block" style="grid-template-columns:26px repeat(${cols},1fr);">
        <div class="sec-label" style="grid-row:1 / span ${rows};">${title.split('').join('<br>')}</div>
        ${cells}
      </div>
    `;
  };

  const draw = async () => {
    host.innerHTML = `<div style="padding:40px;text-align:center;color:#9b8f72;">読み込み中...</div>`;
    const user = employees.find((u) => String(u.id) === String(userId));
    if (!user) { host.innerHTML = `<div class="pl-empty">従業員を選択してください</div>`; return; }
    let input = null;
    try { input = await service.loadInput({ userId, month }); } catch { /* ignore */ }
    const payload = (input && input.payload && typeof input.payload === 'object') ? input.payload : {};
    let emp = null;
    try { emp = await service.computeEmp({ userId, month, payload }); } catch { /* ignore */ }
    if (!emp) { host.innerHTML = `<div class="pl-empty">データを取得できませんでした</div>`; return; }
    const k = emp.勤怠 || {}; const s = emp.支給 || {}; const d = emp.控除 || {}; const t = emp.合計 || {};
    const [y, mo] = month.split('-');

    const attSlots = Array(21).fill(null);
    attSlots[0] = { label: '出勤日数', value: countZero(k.出勤日数) };
    attSlots[1] = { label: '有給休暇', value: countZero(k.有給休暇) };
    attSlots[4] = { label: '欠勤日数', value: countZero(k.欠勤日数) };
    attSlots[7] = { label: '就業時間', value: timeHrs(k.就業時間) };
    attSlots[8] = { label: '法外時間外', value: timeHrs(k.法外時間外 ?? 0) };
    attSlots[9] = { label: '所定休出勤', value: countZero(k.所定休出勤 ?? k.休日出勤日数 ?? 0) };
    attSlots[10] = { label: '週40超時間', value: timeHrs(k.週40超時間 ?? 0) };
    attSlots[11] = { label: '月60超時間', value: timeHrs(k.月60超時間 ?? 0) };
    attSlots[12] = { label: '法定休出勤', value: countZero(k.法定休出勤 ?? 0) };
    attSlots[13] = { label: '深夜勤時間', value: timeHrs(k.深夜勤時間 ?? 0) };
    attSlots[14] = { label: '前月有休残', value: countZero(k.前月有休残 ?? 0) };

    const earnSlots = Array(42).fill(null);
    earnSlots[0] = { label: '基礎給', value: yen(s.基礎給) };
    earnSlots[1] = { label: '就業手当', value: yen(s.就業手当) };
    earnSlots[14] = { label: '欠勤控除', value: yen(s.欠勤控除 ?? 0) };
    earnSlots[28] = { label: '時間外手当', value: yen(s.時間外手当 ?? 0) };
    earnSlots[29] = { label: '所休出手当', value: yen(s.所休出手当 ?? 0) };
    earnSlots[30] = { label: '週40超手当', value: yen(s.週40超手当 ?? 0) };
    earnSlots[31] = { label: '月60超手当', value: yen(s.月60超手当 ?? 0) };
    earnSlots[32] = { label: '法休出手当', value: yen(s.法休出手当 ?? 0) };
    earnSlots[33] = { label: '深夜勤手当', value: yen(s.深夜勤手当 ?? 0) };
    const standardE = new Set(['基礎給', '就業手当', '欠勤控除', '時間外手当', '所休出手当', '週40超手当', '月60超手当', '法休出手当', '深夜勤手当']);
    let eIdx = 2;
    for (const [key, v] of Object.entries(s)) {
      if (!standardE.has(key) && Number(v)) {
        while (earnSlots[eIdx] && eIdx < 42) eIdx++;
        if (eIdx < 42) earnSlots[eIdx] = { label: key, value: yen(v) };
      }
    }

    const dedSlots = Array(35).fill(null);
    dedSlots[0] = { label: '健康保険', value: yen(d.健康保険料 ?? 0) };
    dedSlots[1] = { label: '介護保険', value: yen(d.介護保険料 ?? 0) };
    dedSlots[2] = { label: '厚生年金', value: yen(d.厚生年金保険 ?? 0) };
    dedSlots[3] = { label: '雇用保険', value: yen(d.雇用保険料 ?? 0) };
    dedSlots[4] = { label: '社会保険計額', value: yen(d.社保合計額 ?? 0) };
    dedSlots[5] = { label: '課税対象額', value: yen(d.課税対象額 ?? 0) };
    dedSlots[7] = { label: '所得税', value: yen(d.所得税 ?? 0) };
    dedSlots[9] = { label: '立替家賃', value: yen(d.立替家賃 ?? 0) };
    dedSlots[10] = { label: '住民税', value: yen(d.住民税 ?? 0) };

    host.innerHTML = `
      <div class="pl-payslip-doc">
        <div class="company">${escapeHtml(config?.companyName || '会社名未設定')}</div>
        <table class="pl-payslip-info"><tbody>
          <tr><td>支給日</td><td>${escapeHtml(new Date().toISOString().slice(0, 10))}</td></tr>
          <tr><td>No</td><td>${escapeHtml(employeeCode(user))}</td></tr>
          <tr><td>氏名</td><td>${escapeHtml(user.username || '')}</td></tr>
        </tbody></table>
        <h2>給与支給明細書　${y}年${mo}月</h2>
        ${gridBlock('勤怠', 7, 3, attSlots)}
        ${gridBlock('支給', 7, 6, earnSlots)}
        ${gridBlock('控除', 7, 5, dedSlots)}
        <div class="pl-payslip-totrow">
          <div><div class="l">総支給額</div><div class="v">${yen(t.総支給額)}</div></div>
          <div><div class="l">総控除額</div><div class="v">${yen(t.総控除額)}</div></div>
          <div><div class="l">差引支給額</div><div class="v">${yen(t.差引支給額)}</div></div>
        </div>
        <div class="pl-payslip-bank">
          振込銀行　${escapeHtml(emp.振込口座 || emp.振込銀行 || '—')}
        </div>
        <div style="margin-top:10px;font-size:10.5px;color:#8a8168;">※ 所得税は商易概算です。実際の源泉徴収額は国税庁の税額表でご確認ください。</div>
      </div>
    `;
  };

  const msgEl = mainEl.querySelector('#payslipMsg');
  const setMsg = (text, ok) => {
    msgEl.textContent = text || '';
    msgEl.style.color = ok ? '#3f6b2c' : '#a13c2e';
  };

  const updateHistoryLink = () => {
    mainEl.querySelector('#linkHistory').href = `/admin/payroll/employees?standalone=1&empId=${encodeURIComponent(userId)}`;
  };
  updateHistoryLink();
  mainEl.querySelector('#pEmp').addEventListener('change', (ev) => { userId = ev.target.value; setMsg(''); updateHistoryLink(); draw(); });
  mainEl.querySelector('#pMonth').addEventListener('change', (ev) => { month = ev.target.value; setMsg(''); draw(); });
  mainEl.querySelector('#btnPdf').addEventListener('click', async () => {
    try {
      const res = await service.generatePayslip({ userId, month });
      if (res && res.secureUrl) {
        await openPdf(res.secureUrl);
      } else {
        window.alert('PDF作成に失敗しました。');
      }
    } catch (err) {
      window.alert(String(err?.message || 'PDF作成に失敗しました'));
    }
  });
  mainEl.querySelector('#btnSend').addEventListener('click', async () => {
    const user = employees.find((u) => String(u.id) === String(userId));
    if (!user) return;
    if (!window.confirm(`${user.username || userId} 様（${monthLabel(month)}）の給与明細を送信しますか？\n公開すると、社員はマイページから給与明細を確認できるようになります。`)) return;
    const btn = mainEl.querySelector('#btnSend');
    btn.disabled = true;
    setMsg('送信中...', true);
    try {
      await service.generatePayslip({ userId, month });
      await service.publishPayslip({ userId, month, is_published: true });
      setMsg('送信しました', true);
    } catch (err) {
      setMsg(String(err?.message || '送信に失敗しました'), false);
    } finally {
      btn.disabled = false;
    }
  });

  await draw();
}

// ---------------------------------------------------------------------------
// 設定 (company + insurance/tax rate config — the previously-missing piece)
// ---------------------------------------------------------------------------

function renderSettingsSection(mainEl, ctx) {
  const { service, year } = ctx;
  const c = ctx.config || {};
  mainEl.innerHTML = `
    <div class="pl-head">
      <div>
        <div class="pl-eyebrow">SETTINGS</div>
        <h1>設定</h1>
        <p>会社情報・保険料率・割増賃金の基準を設定します（${c.isDefault ? '初期値は未設定 — 下記は参考値' : year + '年度の設定'}）</p>
      </div>
    </div>
    <div class="pl-card" style="padding:24px 28px;">
      <h3 style="margin:0 0 14px;font-size:13px;color:#9b8f72;font-weight:800;">会社情報</h3>
      <div class="pl-form-grid">
        <div class="pl-field"><label>会社名</label><input class="pl-input" id="sCompany" value="${escapeHtml(c.companyName || '')}"></div>
        <div class="pl-field"><label>都道府県（表示用）</label><input class="pl-input" id="sPref" value="${escapeHtml(c.prefecture || '東京都')}"></div>
      </div>
      <h3 style="margin:22px 0 14px;font-size:13px;color:#9b8f72;font-weight:800;">社会保険料率（従業員負担分・年率%）</h3>
      <div class="pl-form-grid">
        <div class="pl-field"><label>健康保険料率（本人負担・1/2）</label><input class="pl-input" id="sHealth" type="number" step="0.0001" value="${(Number(c.healthInsuranceRate) * 100).toFixed(3)}"></div>
        <div class="pl-field"><label>介護保険料率（本人負担・1/2・40～64歳）</label><input class="pl-input" id="sCare" type="number" step="0.0001" value="${(Number(c.careInsuranceRate) * 100).toFixed(3)}"></div>
        <div class="pl-field"><label>厚生年金保険料率（本人負担・1/2）</label><input class="pl-input" id="sPension" type="number" step="0.0001" value="${(Number(c.pensionRate) * 100).toFixed(3)}"></div>
        <div class="pl-field"><label>雇用保険料率（本人負担）</label><input class="pl-input" id="sEmp" type="number" step="0.0001" value="${(Number(c.employmentInsuranceRate) * 100).toFixed(3)}"></div>
        <div class="pl-field"><label>所定労働時間（月・時給換算）</label><input class="pl-input" id="sHours" type="number" value="${Math.round(Number(c.workingMinutesPerMonth || 9600) / 60)}"></div>
        <div class="pl-field"><label>所定労働日数（月・日給換算）</label><input class="pl-input" id="sDays" type="number" step="0.01" value="${Number(c.standardDaysPerMonth || 21.75)}"></div>
      </div>
      <h3 style="margin:22px 0 14px;font-size:13px;color:#9b8f72;font-weight:800;">割増賃金率</h3>
      <div class="pl-form-grid">
        <div class="pl-field"><label>時間外（週40h超・月60h超）</label><input class="pl-input" id="sOtRate" type="number" step="0.01" value="${Number(c.overtimeRate || 1.25)}"></div>
        <div class="pl-field"><label>休日出勤</label><input class="pl-input" id="sHolRate" type="number" step="0.01" value="${Number(c.holidayRate || 1.35)}"></div>
        <div class="pl-field"><label>深夜勤務</label><input class="pl-input" id="sNightRate" type="number" step="0.01" value="${Number(c.lateNightRate || 1.25)}"></div>
        <div class="pl-field"><label>通勤手当 非課税上限（月額・円）</label><input class="pl-input" id="sCommuteLimit" type="number" value="${Number(c.commuteAllowanceTaxFreeLimit || 150000)}"></div>
      </div>
      <div id="settingsMsg" style="margin-top:14px;font-size:12.5px;"></div>
      <button type="button" class="pl-btn primary" id="btnSaveSettings" style="margin-top:6px;">設定を保存</button>
      <div class="pl-note">料率の初期値は 2026年3月分（4月納付分）から適用の東京都・協会けんぽ数値（健康保険9.91％・介護保険1.62％）、厚生年金保険料率18.3％をもとにしています。事業所の所在地・業種で異なるため、最新の料率は必ずご自身で確認のうえ調整してください。</div>
    </div>
  `;

  mainEl.querySelector('#btnSaveSettings').addEventListener('click', async () => {
    const msg = mainEl.querySelector('#settingsMsg');
    const btn = mainEl.querySelector('#btnSaveSettings');
    btn.disabled = true;
    msg.style.color = '#6b6250';
    msg.textContent = '保存中...';
    try {
      const val = (id) => Number(mainEl.querySelector(id).value) || 0;
      const companyName = mainEl.querySelector('#sCompany').value.trim();
      const prefecture = mainEl.querySelector('#sPref').value.trim();
      await service.updateConfig({
        year,
        healthInsuranceRate: val('#sHealth') / 100,
        careInsuranceRate: val('#sCare') / 100,
        pensionRate: val('#sPension') / 100,
        employmentInsuranceRate: val('#sEmp') / 100,
        taxRate: Number(c.taxRate) || 0,
        overtimeRate: val('#sOtRate'),
        holidayRate: val('#sHolRate'),
        lateNightRate: val('#sNightRate'),
        workingMinutesPerMonth: val('#sHours') * 60,
        standardDaysPerMonth: val('#sDays'),
        commuteAllowanceTaxFreeLimit: val('#sCommuteLimit'),
        companyName,
        prefecture
      });
      ctx.config = {
        ...c,
        isDefault: false,
        companyName,
        prefecture,
        healthInsuranceRate: val('#sHealth') / 100,
        careInsuranceRate: val('#sCare') / 100,
        pensionRate: val('#sPension') / 100,
        employmentInsuranceRate: val('#sEmp') / 100,
        overtimeRate: val('#sOtRate'),
        holidayRate: val('#sHolRate'),
        lateNightRate: val('#sNightRate'),
        workingMinutesPerMonth: val('#sHours') * 60,
        standardDaysPerMonth: val('#sDays'),
        commuteAllowanceTaxFreeLimit: val('#sCommuteLimit')
      };
      const brandSub = document.querySelector('.pl-brand .s');
      if (brandSub) brandSub.textContent = companyName || '';
      msg.style.color = '#3f6b2c';
      msg.textContent = '保存しました';
    } catch (err) {
      msg.style.color = '#a13c2e';
      msg.textContent = String(err?.message || '保存に失敗しました');
    } finally {
      btn.disabled = false;
    }
  });
}

export { mount };

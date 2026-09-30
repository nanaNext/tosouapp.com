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

const fmtDateTime = (v) => {
  const d = new Date(v);
  if (!v || Number.isNaN(d.getTime())) return String(v || '');
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

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
  { id: 'calc', label: '給与', icon: '\u{1F5C2}️' },
  { id: 'employees', label: '従業員情報', icon: '\u{1F464}' },
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
  let section = SECTIONS.some((s) => s.id === params.get('section')) ? params.get('section') : 'calc';

  const root = document.createElement('div');
  root.className = 'pl-root';
  root.innerHTML = `
    <nav class="pl-nav">
      <div class="pl-brand">
        <div class="t">給与</div>
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
            <th class="num">基本給（月給）</th><th class="num">就業手当</th><th class="num">通勤手当</th>
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
        <div class="pl-field"><label>基本給（月給・円）*</label><input class="pl-input" id="fBase" type="number" min="0" value="${Number(emp.base_salary || 0)}"></div>
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
      msg.textContent = '氏名と基本給（月給）は必須です';
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
  let rows = [];
  let filter = 'all';
  const selected = new Set();

  // 状態: 未入力（保存なし）→ 入力済み（保存済み・未送信）→ 送信済み → 確認済み（従業員がPDFを開いた）
  const STATUS = {
    none: { label: '未入力', cls: 'gray' },
    saved: { label: '入力済み', cls: 'tan' },
    sent: { label: '送信済み', cls: 'green' }
  };

  mainEl.innerHTML = `
    <div class="pl-head">
      <div>
        <div class="pl-eyebrow">PAYROLL</div>
        <h1>給与</h1>
        <p>対象月の全従業員です。「開く」で入力・PDF確認・送信までできます。チェックを付けてまとめて送信もできます。</p>
      </div>
      <select class="pl-select" id="monthSel">
        ${monthOptions(month).map((m) => `<option value="${m}" ${m === month ? 'selected' : ''}>${monthLabel(m)}</option>`).join('')}
      </select>
    </div>
    <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:10px;">
      <div id="calcSummary" style="display:flex;gap:8px;flex-wrap:wrap;"></div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
        <select class="pl-select" id="calcFilter">
          <option value="all">すべて</option>
          <option value="none">未入力</option>
          <option value="saved">入力済み（未送信）</option>
          <option value="sent">送信済み</option>
        </select>
        <button type="button" class="pl-btn primary" id="btnBulkSend" disabled>選択した人に送信</button>
      </div>
    </div>
    <div id="bulkMsg" style="font-size:12.5px;font-weight:700;margin-bottom:8px;white-space:pre-line;"></div>
    <div class="pl-card" style="overflow-x:auto;">
      <table class="pl-table">
        <thead>
          <tr>
            <th class="center" style="width:34px;"><input type="checkbox" id="chkAll" aria-label="すべて選択"></th>
            <th>社員コード</th><th>氏名</th><th>部署</th>
            <th class="num">総支給額</th><th class="num">総控除額</th><th class="num">差引支給額</th>
            <th class="center">状態</th><th></th>
          </tr>
        </thead>
        <tbody id="calcBody"></tbody>
      </table>
    </div>
    <div class="pl-note">※ 所得税は国税庁の月額表（令和8年分）で自動計算します（送信済みの明細は送信時の金額のまま）。社会保険料は「設定」の料率による計算です。「開く」の中で自動計算OFFにすると手入力に切り替えられます。</div>
  `;

  const tbody = mainEl.querySelector('#calcBody');
  const summaryEl = mainEl.querySelector('#calcSummary');
  const bulkBtn = mainEl.querySelector('#btnBulkSend');
  const bulkMsg = mainEl.querySelector('#bulkMsg');
  const chkAll = mainEl.querySelector('#chkAll');

  const statusOf = (r) => (r.input?.is_published ? 'sent' : (r.input?.payload ? 'saved' : 'none'));
  const visibleRows = () => rows.filter((r) => r && (filter === 'all' || r.status === filter));

  const drawSummary = () => {
    const loaded = rows.filter(Boolean);
    const count = (st) => loaded.filter((r) => r.status === st).length;
    const read = loaded.filter((r) => r.status === 'sent' && r.delivery?.isRead).length;
    const chip = (label, n, color, bg) => `<div style="background:${bg};color:${color};border-radius:8px;padding:6px 12px;font-size:12.5px;font-weight:800;">${label} ${n}名</div>`;
    summaryEl.innerHTML = chip('対象', employees.length, '#1c2b45', '#eef1f5')
      + chip('未入力', count('none'), '#6b6250', '#efece4')
      + chip('入力済み', count('saved'), '#8a5a14', '#fdf3e1')
      + chip('送信済み', count('sent'), '#2f6b3a', '#e3f2e6')
      + chip('確認済み', read, '#1e3a8a', '#dbeafe');
  };

  const updateBulk = () => {
    const n = [...selected].filter((id) => rows.some((r) => r && String(r.u.id) === id)).length;
    bulkBtn.disabled = n === 0;
    bulkBtn.textContent = n ? `選択した人に送信（${n}名）` : '選択した人に送信';
    const vis = visibleRows();
    chkAll.checked = vis.length > 0 && vis.every((r) => selected.has(String(r.u.id)));
  };

  const renderRow = (r) => {
    const { u, emp, ok, status, delivery } = r;
    const t = emp?.合計 || {};
    const net = ok ? t.差引支給額 : null;
    const paySum = ok ? Number(emp?.支払?.振込支給額 || 0) + Number(emp?.支払?.現金支給額 || 0) + Number(emp?.支払?.現物支給額 || 0) : null;
    const mismatch = ok && net != null && Math.round(paySum) !== Math.round(net);
    const st = STATUS[status] || STATUS.none;
    const id = String(u.id);
    return `
      <tr data-id="${escapeHtml(id)}">
        <td class="center"><input type="checkbox" class="row-chk" ${selected.has(id) ? 'checked' : ''} aria-label="${escapeHtml(u.username || '')}を選択"></td>
        <td style="color:#6b6250;font-weight:700;">${escapeHtml(employeeCode(u))}</td>
        <td style="font-weight:700;">${escapeHtml(u.username || u.email || '')}</td>
        <td>${escapeHtml(deptName(u.departmentId) || '—')}</td>
        <td class="num">${ok ? '¥' + yen(t.総支給額) : '—'}</td>
        <td class="num">${ok ? '¥' + yen(t.総控除額) : '—'}</td>
        <td class="num" style="font-weight:800;">${ok ? '¥' + yen(net) : '—'}${mismatch ? ' <span class="pl-badge tan" title="支払方法（振込・現金・現物）の合計が差引支給額と一致しません">支払方法</span>' : ''}</td>
        <td class="center"><span class="pl-badge ${st.cls}">${st.label}</span>${status === 'sent' && delivery?.isRead ? ' <span class="pl-badge green" title="従業員が明細を確認しました">確認済み</span>' : ''}</td>
        <td><button type="button" class="pl-btn btn-open">開く</button></td>
      </tr>
    `;
  };

  const drawRows = () => {
    const vis = visibleRows();
    if (!rows.some(Boolean)) return;
    tbody.innerHTML = vis.length
      ? vis.map(renderRow).join('')
      : '<tr><td colspan="9" style="text-align:center;color:#9b8f72;padding:24px;">該当する従業員がいません</td></tr>';
    tbody.querySelectorAll('.row-chk').forEach((chk) => chk.addEventListener('change', () => {
      const id = chk.closest('tr').getAttribute('data-id');
      if (chk.checked) selected.add(id); else selected.delete(id);
      updateBulk();
    }));
    tbody.querySelectorAll('.btn-open').forEach((btn) => btn.addEventListener('click', () => {
      const id = btn.closest('tr').getAttribute('data-id');
      const r = rows.find((x) => x && String(x.u.id) === id);
      if (r) openCalcPreviewModal(r.u, month, ctx, loadRows, { delivery: r.delivery });
    }));
    drawSummary();
    updateBulk();
  };

  const loadRows = async () => {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;color:#9b8f72;padding:24px;">読み込み中...</td></tr>`;
    summaryEl.innerHTML = '';
    if (!employees.length) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;color:#9b8f72;padding:24px;">従業員がいません</td></tr>`;
      return;
    }
    const loadingMonth = month;
    // 送信履歴（同じ月に複数回送信した場合は最新を採用。未確認でも過去の送信が確認済みなら確認済み）
    const deliveries = new Map();
    try {
      const res = await service.listDeliveries({ month });
      for (const it of (Array.isArray(res?.items) ? res.items : [])) {
        const key = String(it.userId);
        const prev = deliveries.get(key);
        if (!prev) deliveries.set(key, { ...it });
        else if (it.isRead) prev.isRead = true;
      }
    } catch { /* ignore */ }
    rows = new Array(employees.length).fill(null);
    const BATCH = 4;
    for (let i = 0; i < employees.length; i += BATCH) {
      const batch = employees.slice(i, i + BATCH);
      const results = await Promise.all(batch.map(async (u) => {
        const input = await service.loadInput({ userId: u.id, month }).catch(() => null);
        const payload = input && input.payload ? input.payload : {};
        let emp = null;
        try {
          // プレビュー（開く）と同じ条件で計算する: 未送信は所得税を月額表で、自動計算は未保存ならON
          emp = await service.computeEmp({ userId: u.id, month, payload: input?.is_published ? payload : { ...payload, taxMethod: 'table', autoCalcDeductions: payload.autoCalcDeductions !== false } });
        } catch { /* keep null */ }
        const r = { u, emp, ok: !!emp, input, delivery: deliveries.get(String(u.id)) || null };
        r.status = statusOf(r);
        return r;
      }));
      if (loadingMonth !== month) return;   // 読み込み中に月が変わった
      results.forEach((r, idx) => { rows[i + idx] = r; });
      drawRows();
    }
  };

  // まとめて送信（入力済みの人だけ。PDF作成→送信を1人ずつ順番に行う）
  bulkBtn.addEventListener('click', async () => {
    const picked = rows.filter((r) => r && selected.has(String(r.u.id)));
    const targets = picked.filter((r) => r.status === 'saved');
    const skippedNone = picked.filter((r) => r.status === 'none');
    const skippedSent = picked.filter((r) => r.status === 'sent');
    if (!targets.length) {
      bulkMsg.style.color = '#a13c2e';
      bulkMsg.textContent = '送信できる人がいません（未入力の人は「開く」で保存してから、送信済みの人は再送信不要です）';
      return;
    }
    const notes = [
      skippedNone.length ? `未入力 ${skippedNone.length}名は送信しません（先に「開く」で保存してください）` : '',
      skippedSent.length ? `送信済み ${skippedSent.length}名は対象外です` : ''
    ].filter(Boolean).join('\n');
    if (!window.confirm(`${monthLabel(month)}の給与明細を ${targets.length}名に送信します。\nPDFを作成して公開し、社員のマイページで見られるようになります。${notes ? '\n\n' + notes : ''}`)) return;
    bulkBtn.disabled = true;
    chkAll.disabled = true;
    const failed = [];
    let done = 0;
    for (const r of targets) {
      bulkMsg.style.color = '#6b6250';
      bulkMsg.textContent = `送信中... ${done + 1} / ${targets.length}（${r.u.username || r.u.id}）`;
      try {
        await service.generatePayslip({ userId: r.u.id, month });
        await service.publishPayslip({ userId: r.u.id, month, is_published: true });
        selected.delete(String(r.u.id));
        done++;
      } catch (err) {
        failed.push(`${r.u.username || r.u.id}: ${String(err?.message || '失敗しました')}`);
      }
    }
    chkAll.disabled = false;
    bulkMsg.style.color = failed.length ? '#a13c2e' : '#3f6b2c';
    bulkMsg.textContent = `${done}名に送信しました。` + (failed.length ? `\n送信できなかった人（${failed.length}名）:\n${failed.join('\n')}` : '') + (notes ? `\n${notes}` : '');
    await loadRows();
  });

  chkAll.addEventListener('change', () => {
    for (const r of visibleRows()) {
      if (chkAll.checked) selected.add(String(r.u.id)); else selected.delete(String(r.u.id));
    }
    drawRows();
  });
  mainEl.querySelector('#calcFilter').addEventListener('change', (ev) => { filter = ev.target.value; drawRows(); });
  mainEl.querySelector('#monthSel').addEventListener('change', (ev) => {
    month = ev.target.value;
    selected.clear();
    bulkMsg.textContent = '';
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

async function openCalcPreviewModal(user, month, ctx, onSaved, extra = {}) {
  const { service } = ctx;
  const overlay = document.createElement('div');
  overlay.className = 'pl-overlay';
  overlay.innerHTML = `<div class="pl-modal wide"><div style="text-align:center;padding:40px;color:#9b8f72;">読み込み中...</div></div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', (ev) => { if (ev.target === overlay) overlay.remove(); });

  let input = null;
  let history = null;
  let pdfList = null;
  [input, history, pdfList] = await Promise.all([
    service.loadInput({ userId: user.id, month }).catch(() => null),
    service.getInputHistory({ userId: user.id }).catch(() => null),
    fetchJSONAuth(`/api/payslips/admin/list?userId=${encodeURIComponent(user.id)}&month=${encodeURIComponent(month)}&pageSize=100`).catch(() => null)
  ]);
  // この月に作成済みのPDF（いちばん新しいもの）。「PDFを作成・確認」「送信」で作り直すと更新する
  let latestPdf = (Array.isArray(pdfList?.data) ? pdfList.data : [])
    .slice().sort((a, b) => String(b.uploadedAt || '').localeCompare(String(a.uploadedAt || '')))[0] || null;
  let opBusy = false;   // 保存・PDF作成・送信の処理中（自動再計算で画面を描き直さない）
  let payload = (input && input.payload && typeof input.payload === 'object') ? { ...input.payload } : {};
  let isPublished = !!input?.is_published;
  // 未送信の明細は、所得税を国税庁の月額表（令和8年分〜）で計算する。送信済みは保存時の計算方法のまま。
  if (!isPublished) payload.taxMethod = 'table';
  // 累計支給額（1月〜前月の送信済み明細の総支給額）。当月分は表示時に足す
  const [curY, curM] = String(month).split('-');
  const priorGross = (Array.isArray(history?.items) ? history.items : [])
    .filter((it) => it && it.isPublished && String(it.month || '').startsWith(`${curY}-`) && String(it.month) < String(month))
    .reduce((sum, it) => sum + (Number(it.gross) || 0), 0);
  let autoCalc = payload.autoCalcDeductions !== false;
  let emp = null;
  try { emp = await service.computeEmp({ userId: user.id, month, payload: { ...payload, autoCalcDeductions: autoCalc } }); } catch { /* ignore */ }
  // 勤怠の自動集計値（手入力の上書きなし）。保存時はこれと異なる項目だけを手入力として保存し、
  // 変更していない項目は勤怠と連動したままにする。
  let autoK = null;
  try { autoK = (await service.computeEmp({ userId: user.id, month, payload: { ...payload, kintai: {}, autoCalcDeductions: autoCalc } }))?.勤怠 || null; } catch { /* ignore */ }
  const hasKintaiOverride = () => Number(payload.kintaiVersion) === 2 && !!(payload.kintai && Object.keys(payload.kintai).length);

  const toItemList = (v) => Array.isArray(v)
    ? v.map((it) => ({ label: String(it?.label || ''), amount: Number(it?.amount) || 0 }))
    : (v && typeof v === 'object' ? Object.entries(v).map(([label, amount]) => ({ label, amount: Number(amount) || 0 })) : []);
  // 専用の入力欄がある項目。以前「項目を追加」で入れていた分は専用欄にまとめる（金額はサーバー集計値を初期値にする）
  const FIXED_EARN = ['非課税通勤費', '資格手当', '催事協力手当', '通信手当'];
  const FIXED_DED = ['水道光熱費等'];
  const YEC = '年末調整徴収';
  const YER = '年末調整還付';
  let extraEarningsList = toItemList(payload.extraEarnings).filter((it) => !FIXED_EARN.includes(it.label.trim()));
  let extraDeductionsList = toItemList(payload.extraDeductions).filter((it) => !FIXED_DED.includes(it.label.trim()));
  // 年末調整は otherItems に保存する（サーバーが 還付→支給・非課税、徴収→控除 に振り分ける）
  const otherItemsAll = toItemList(payload.otherItems);
  const otherItemsRest = otherItemsAll.filter((it) => it.label !== YEC && it.label !== YER);
  const sumOther = (label) => otherItemsAll.filter((it) => it.label === label).reduce((s0, it) => s0 + Math.abs(it.amount), 0);
  let yecAmount = sumOther(YEC);
  let yerAmount = sumOther(YER);

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
    const src = emp?.源泉 || {};
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
          ${hasKintaiOverride() ? `<div style="font-size:12px;color:#8a5a14;background:#fdf3e1;border:1px solid #ecd3a4;border-radius:6px;padding:6px 8px;margin-bottom:8px;">手入力値が保存されています（勤怠と連動していません）: ${escapeHtml(Object.keys(payload.kintai).join('、'))}<br><button type="button" class="pl-btn" id="btnResetKintai" style="margin-top:6px;">勤怠の自動集計に戻す</button></div>` : ''}
          ${fieldNum('出勤日数', 'kAttend', k.出勤日数, false)}
          ${fieldNum('休日出勤日数', 'kHolidayAttend', k.休日出勤日数, false)}
          ${fieldNum('半日出勤日数', 'kHalf', k.半日出勤日数, false)}
          ${fieldNum('欠勤日数', 'kAbsent', k.欠勤日数, false)}
          ${fieldNum('有給休暇', 'kPaidLeave', k.有給休暇, false)}
          <div class="pl-preview-row static"><label>半休(有給)</label><span class="val">${escapeHtml(Number(k['半休(有給)日数'] ?? 0).toFixed(1))}日</span></div>
          <div class="pl-preview-row static"><label>半休</label><span class="val">${escapeHtml(Number(k['半休日数'] ?? 0).toFixed(1))}日</span></div>
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
          ${fieldNum('基本給（月給）', 'sBase', s.基礎給, autoCalc)}
          ${fieldNum('就業手当', 'sQual', s.就業手当, autoCalc)}
          ${fieldNum('残業手当', 'sOt', s.時間外手当, autoCalc)}
          ${fieldNum('週40超手当', 'sW40', s.週40超手当, autoCalc)}
          ${fieldNum('月60超手当', 'sM60', s.月60超手当, autoCalc)}
          ${fieldNum('休日出勤手当', 'sHoliday', s.所休出手当, autoCalc)}
          ${fieldNum('夜間出勤手当', 'sNight', s.深夜勤手当, autoCalc)}
          ${fieldNum('非課税通勤費', 'sNonTaxCommute', s.非課税通勤費 ?? 0, false)}
          ${fieldNum('資格手当', 'sCert', s.資格手当 ?? 0, false)}
          ${fieldNum('催事協力手当', 'sEvent', s.催事協力手当 ?? 0, false)}
          ${fieldNum('通信手当', 'sComms', s.通信手当 ?? 0, false)}
          ${fieldNum('賞与・臨時', 'sBonus', bonus, false)}
          ${fieldNum('年末調整還付', 'sYer', yerAmount, false)}
          ${fieldNum('欠勤控除', 'sAbsentDeduct', absentDeduct, false)}
          <div id="extraEarningsList"></div>
          <button type="button" class="pl-btn-add" id="btnAddEarn" style="display:inline-flex;align-items:center;gap:4px;height:26px;padding:0 8px;border:1px dashed #d9d0b8;border-radius:6px;background:none;color:#1c2b45;font-size:11.5px;font-weight:700;cursor:pointer;width:100%;justify-content:center;margin-top:4px;">+ 支給項目を追加</button>
          <div class="pl-preview-total"><span>総支給額</span><span>¥${yen(t.総支給額)}</span></div>
        </div>
        <div class="pl-preview-section">
          <h3>控除</h3>
          <div class="pl-preview-row">
            <label>税額表</label>
            <select class="pl-input" id="dTaxCat">
              <option value="kou" ${src.税額表 !== '乙' ? 'selected' : ''}>甲欄</option>
              <option value="otsu" ${src.税額表 === '乙' ? 'selected' : ''}>乙欄</option>
            </select>
          </div>
          ${fieldNum('扶養人数', 'dDependents', src.扶養人数 ?? 0, src.税額表 === '乙')}
          ${fieldNum('健康保険料', 'dHealth', d.健康保険料, autoCalc)}
          ${fieldNum('介護保険料', 'dCare', d.介護保険料, autoCalc)}
          ${fieldNum('厚生年金保険', 'dPension', d.厚生年金保険, autoCalc)}
          ${fieldNum('雇用保険料', 'dEmp', d.雇用保険料, autoCalc)}
          ${fieldNum('所得税', 'dTax', d.所得税, autoCalc)}
          <div style="font-size:11px;color:#8a8168;margin:-2px 0 6px;">${autoCalc
            ? (src.計算方法 === '税額表' ? `国税庁の月額表（令和8年分・${src.税額表 === '乙' ? '乙欄' : '甲欄'}）で自動計算` : '送信済みの明細のため、送信時の概算率で計算')
            : '自動計算OFF：手入力'}</div>
          ${fieldNum('住民税', 'dResident', d.住民税, false)}
          ${fieldNum('立替家賃', 'dRent', d.立替家賃, false)}
          ${fieldNum('水道光熱費等', 'dUtility', d.水道光熱費等 ?? 0, false)}
          ${fieldNum('年末調整徴収', 'dYec', yecAmount, false)}
          <div id="extraDeductionsList"></div>
          <button type="button" class="pl-btn-add" id="btnAddDed" style="display:inline-flex;align-items:center;gap:4px;height:26px;padding:0 8px;border:1px dashed #d9d0b8;border-radius:6px;background:none;color:#1c2b45;font-size:11.5px;font-weight:700;cursor:pointer;width:100%;justify-content:center;margin-top:4px;">+ 控除項目を追加</button>
          <div class="pl-preview-total"><span>控除合計</span><span>¥${yen(t.総控除額)}</span></div>
        </div>
      </div>
      <div class="pl-highlight">
        <span class="l">差引支給額（手取り）</span>
        <span class="v">¥${yen(t.差引支給額)}</span>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;margin-top:10px;">
        ${[
          ['総支給額', t.総支給額],
          ['社会保険料', src.社会保険料 ?? d.社保合計額],
          ['所得税', d.所得税],
          ['控除合計', t.総控除額],
          ['現金支給額', p.現金支給額],
          ['現物支給額', p.現物支給額],
          [`累計支給額（${Number(curM)}月まで）`, priorGross + Number(t.総支給額 || 0)]
        ].map(([l, v]) => `
          <div style="border:1px solid #e7dfc9;border-radius:8px;padding:8px 10px;background:#fffdf7;">
            <div style="font-size:11px;color:#8a8168;font-weight:700;">${l}</div>
            <div style="font-size:15px;font-weight:800;color:#1c2b45;margin-top:2px;">¥${yen(v)}</div>
          </div>`).join('')}
      </div>
      <div style="font-size:11px;color:#8a8168;margin-top:4px;">累計支給額：${curY}年1月から前月までの送信済み明細の総支給額＋当月の総支給額</div>
      <div id="modalMsg" style="margin-top:10px;font-size:12.5px;color:#a13c2e;"></div>
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-top:14px;padding:10px 12px;border:1px solid #e7dfc9;border-radius:8px;background:#fffdf7;font-size:12.5px;color:#6b6250;">
        <div>📄 ${isPublished
          ? `送信済みの明細PDF${extra?.delivery?.sentAt ? `（送信日時 ${escapeHtml(fmtDateTime(extra.delivery.sentAt))}）` : ''}`
          : (latestPdf ? `作成済みPDF：${escapeHtml(fmtDateTime(latestPdf.uploadedAt))} 作成（まだ送信していません）` : 'この月のPDFはまだ作成していません')}</div>
        ${(isPublished ? extra?.delivery?.fileId : latestPdf?.id) ? '<button type="button" class="pl-btn" id="btnOpenPdf">PDFを開く</button>' : ''}
      </div>
      <div class="pl-modal-actions">
        <button type="button" class="pl-btn" id="btnClose">閉じる</button>
        ${isPublished ? '' : '<button type="button" class="pl-btn" id="btnSavePrev">保存</button>'}
        ${isPublished ? '' : '<button type="button" class="pl-btn" id="btnPdfCheck">PDFを作成・確認</button>'}
        ${isPublished ? '' : '<button type="button" class="pl-btn primary" id="btnSaveSend">送信</button>'}
      </div>
      ${isPublished ? '' : '<div style="text-align:right;font-size:11px;color:#8a8168;margin-top:6px;">※ 金額は入力欄を変更すると自動で再計算されます。「PDFを作成・確認」「送信」は入力内容を保存してから行います。</div>'}
    `;

    renderItemRows('extraEarningsList', extraEarningsList);
    renderItemRows('extraDeductionsList', extraDeductionsList);
    const btnAddEarn = modal.querySelector('#btnAddEarn');
    if (btnAddEarn) btnAddEarn.addEventListener('click', () => { extraEarningsList.push({ label: '', amount: 0 }); renderItemRows('extraEarningsList', extraEarningsList); });
    const btnAddDed = modal.querySelector('#btnAddDed');
    if (btnAddDed) btnAddDed.addEventListener('click', () => { extraDeductionsList.push({ label: '', amount: 0 }); renderItemRows('extraDeductionsList', extraDeductionsList); });

    const netAmount = Math.round(Number(t.差引支給額) || 0);   // 数値で比較する（yen() は桁区切りの文字列を返す）
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

    modal.querySelector('#fAutoCalc').addEventListener('change', (ev) => {
      autoCalc = ev.target.checked;
      recalc();   // 入力中の値を保ったまま計算し直す
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
          // 未送信に戻ったので、他の未送信の明細と同じく所得税は月額表で計算し直す
          payload.taxMethod = 'table';
          try { emp = await service.computeEmp({ userId: user.id, month, payload: { ...payload, autoCalcDeductions: autoCalc } }); } catch { /* keep */ }
          if (onSaved) onSaved();
          draw();
        } catch (err) {
          window.alert(String(err?.message || '取り消しに失敗しました'));
          unlockBtn.disabled = false;
        }
      });
    }
    const resetKBtn = modal.querySelector('#btnResetKintai');
    if (resetKBtn) resetKBtn.addEventListener('click', async () => {
      if (!window.confirm('保存されている勤怠の手入力値を削除し、勤怠の自動集計に戻しますか？（他の入力値はそのままです）')) return;
      resetKBtn.disabled = true;
      try {
        const np = { ...payload };
        delete np.kintai;
        delete np.kintaiVersion;
        await service.persistPayload({ userId: user.id, month, payload: np });
        if (onSaved) onSaved();
        overlay.remove();
      } catch (err) {
        window.alert(String(err?.message || '保存に失敗しました'));
        resetKBtn.disabled = false;
      }
    });
    // 画面の入力内容から保存用の payload を作る（保存・再計算で共通）
    const collectPayload = () => {
      const textOrUndef = (id) => {
        const v = modal.querySelector(id).value.trim();
        return v === '' ? undefined : v;
      };
      const kintai = {};
      const autoOf = { '有給休暇付与': autoK?.有給休暇 };
      const setK = (key, v) => {
        if (v === undefined || v === '') return;
        const a = Object.prototype.hasOwnProperty.call(autoOf, key) ? autoOf[key] : autoK?.[key];
        // 自動集計と同じ値は保存しない（勤怠と連動させる）。自動集計値が取れない場合は従来どおり保存。
        if (autoK && String(a ?? (typeof v === 'number' ? 0 : '')) === String(v)) return;
        kintai[key] = v;
      };
      setK('出勤日数', Number(modal.querySelector('#kAttend').value) || 0);
      setK('休日出勤日数', Number(modal.querySelector('#kHolidayAttend').value) || 0);
      setK('半日出勤日数', Number(modal.querySelector('#kHalf').value) || 0);
      setK('欠勤日数', Number(modal.querySelector('#kAbsent').value) || 0);
      setK('有給休暇付与', Number(modal.querySelector('#kPaidLeave').value) || 0);
      setK('法外時間外', textOrUndef('#kOt'));
      setK('週40超時間', textOrUndef('#kW40'));
      setK('月60超時間', textOrUndef('#kM60'));
      setK('深夜勤時間', textOrUndef('#kNight'));
      const num = (id) => Number(modal.querySelector(id).value) || 0;
      const yec = Math.abs(num('#dYec'));
      const yer = Math.abs(num('#sYer'));
      const taxCategory = modal.querySelector('#dTaxCat').value === 'otsu' ? 'otsu' : 'kou';
      return {
        ...payload,
        autoCalcDeductions: autoCalc,
        taxCategory,
        dependents: Math.max(0, Math.floor(num('#dDependents'))),
        kintai,
        kintaiVersion: 2,
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
          住民税: Number(modal.querySelector('#dResident').value) || 0,
          水道光熱費等: num('#dUtility')
        },
        overrideEarnings: {
          ...(autoCalc ? {} : {
            基礎給: Number(modal.querySelector('#sBase').value) || 0,
            就業手当: Number(modal.querySelector('#sQual').value) || 0,
            時間外手当: Number(modal.querySelector('#sOt').value) || 0,
            週40超手当: Number(modal.querySelector('#sW40').value) || 0,
            月60超手当: Number(modal.querySelector('#sM60').value) || 0,
            所休出手当: Number(modal.querySelector('#sHoliday').value) || 0,
            深夜勤手当: Number(modal.querySelector('#sNight').value) || 0
          }),
          非課税通勤費: num('#sNonTaxCommute'),
          資格手当: num('#sCert'),
          催事協力手当: num('#sEvent'),
          通信手当: num('#sComms'),
          '賞与・臨時': Number(modal.querySelector('#sBonus').value) || 0,
          欠勤控除: -Math.abs(Number(modal.querySelector('#sAbsentDeduct').value) || 0)
        },
        extraEarnings: extraEarningsList.filter((it) => it.label.trim() && it.amount),
        extraDeductions: extraDeductionsList.filter((it) => it.label.trim() && it.amount),
        otherItems: [
          ...otherItemsRest,
          ...(yec ? [{ label: YEC, amount: yec }] : []),
          ...(yer ? [{ label: YER, amount: yer }] : [])
        ]
      };
    };

    // 入力内容で計算し直して表示を更新する（保存はしない）
    const recalc = async () => {
      if (opBusy) return;
      const np = collectPayload();
      yecAmount = Math.abs(Number(modal.querySelector('#dYec').value) || 0);
      yerAmount = Math.abs(Number(modal.querySelector('#sYer').value) || 0);
      try {
        const next = await service.computeEmp({ userId: user.id, month, payload: np });
        if (opBusy || !overlay.isConnected) return;   // 保存・送信中に結果が届いた場合は画面を描き直さない
        // 入力中の欄のフォーカスを描き直し後も保つ
        const activeId = document.activeElement && modal.contains(document.activeElement) ? document.activeElement.id : '';
        payload = np;
        emp = next;
        draw();
        if (activeId) { const el = modal.querySelector('#' + activeId); if (el) el.focus(); }
      } catch (err) {
        const msg = modal.querySelector('#modalMsg');
        msg.style.color = '#a13c2e';
        msg.textContent = String(err?.message || '計算に失敗しました');
      }
    };
    // 入力欄を変更したら（欄を離れたとき）自動で計算し直す
    if (!isPublished) {
      modal.querySelector('.pl-preview-grid').addEventListener('change', (ev) => {
        if (ev.target && ev.target.id === 'fAutoCalc') return;
        recalc();
      });
    }

    // 保存 → PDF作成（→ 送信）。PDFは保存内容から作られるので必ず先に保存する
    const setModalMsg = (text, ok) => {
      const msg = modal.querySelector('#modalMsg');
      msg.style.color = ok ? '#3f6b2c' : '#a13c2e';
      msg.textContent = text;
    };
    const actionBtns = () => ['#btnSavePrev', '#btnPdfCheck', '#btnSaveSend'].map((sel) => modal.querySelector(sel)).filter(Boolean);
    const busy = (on) => { opBusy = on; actionBtns().forEach((b) => { b.disabled = on; }); };
    const pdfCheckBtn = modal.querySelector('#btnPdfCheck');
    if (pdfCheckBtn) pdfCheckBtn.addEventListener('click', async () => {
      busy(true);
      setModalMsg('保存してPDFを作成しています...', true);
      try {
        const np = collectPayload();
        await service.persistPayload({ userId: user.id, month, payload: np });
        const res = await service.generatePayslip({ userId: user.id, month });
        if (!res?.secureUrl) throw new Error('PDF作成に失敗しました');
        await openPdf(res.secureUrl);
        // 保存した内容と作成したPDFを画面に反映する
        payload = np;
        try { emp = await service.computeEmp({ userId: user.id, month, payload: np }); } catch { /* keep */ }
        latestPdf = { id: res.id, uploadedAt: new Date().toISOString() };
        opBusy = false;
        draw();
        setModalMsg('✓ 保存してPDFを作成しました。内容がよければ「送信」を押してください（まだ送信していません）', true);
        if (onSaved) onSaved();
      } catch (err) {
        setModalMsg(String(err?.message || 'PDF作成に失敗しました'), false);
        busy(false);
      }
    });
    const saveSendBtn = modal.querySelector('#btnSaveSend');
    if (saveSendBtn) saveSendBtn.addEventListener('click', async () => {
      if (!window.confirm(`${user.username || user.id} さん（${monthLabel(month)}）の給与明細を送信しますか？\n送信すると、社員はマイページから給与明細を確認できるようになります。`)) return;
      busy(true);
      setModalMsg('送信しています...', true);
      try {
        await service.persistPayload({ userId: user.id, month, payload: collectPayload() });
        await service.generatePayslip({ userId: user.id, month });
        await service.publishPayslip({ userId: user.id, month, is_published: true });
        setModalMsg('✓ 送信しました', true);
        if (onSaved) onSaved();
        setTimeout(() => overlay.remove(), 900);
      } catch (err) {
        setModalMsg(String(err?.message || '送信に失敗しました'), false);
        busy(false);
      }
    });
    const openPdfBtn = modal.querySelector('#btnOpenPdf');
    if (openPdfBtn) openPdfBtn.addEventListener('click', () => {
      const fileId = isPublished ? extra?.delivery?.fileId : latestPdf?.id;
      if (fileId) openPdf(`/api/payslips/admin/file/${encodeURIComponent(fileId)}`);
    });

    const saveBtn = modal.querySelector('#btnSavePrev');
    if (saveBtn) saveBtn.addEventListener('click', async () => {
      const msg = modal.querySelector('#modalMsg');
      const btn = saveBtn;
      btn.disabled = true;
      opBusy = true;
      const newPayload = collectPayload();
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
        opBusy = false;
      }
    });
  };
  draw();
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

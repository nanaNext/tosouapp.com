import { myPaidBalance, listMyRequests } from '../api/leave.api.js';
import { me } from '../api/auth.api.js';

const qs = (sel, root = document) => root.querySelector(sel);

function toYmd(v) {
  const s = String(v || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return '';
  return s;
}
function ymdToUtcDate(ymd) {
  const d = new Date(`${ymd}T00:00:00Z`);
  return Number.isFinite(d.getTime()) ? d : null;
}
function utcDateToYmd(dt) {
  return dt.toISOString().slice(0, 10);
}
function addDaysYmd(ymd, days) {
  const d = ymdToUtcDate(ymd);
  if (!d) return '';
  d.setUTCDate(d.getUTCDate() + Number(days || 0));
  return utcDateToYmd(d);
}
function addYearsYmd(ymd, years) {
  const d = ymdToUtcDate(ymd);
  if (!d) return '';
  d.setUTCFullYear(d.getUTCFullYear() + Number(years || 0));
  return utcDateToYmd(d);
}
function daysBetweenInclusiveYmd(a, b) {
  const d1 = ymdToUtcDate(a);
  const d2 = ymdToUtcDate(b);
  if (!d1 || !d2) return 0;
  const ms = 24 * 60 * 60 * 1000;
  return Math.max(0, Math.floor((d2 - d1) / ms) + 1);
}
function enumerateDatesYmd(startDate, endDate, max = 4000) {
  const s = ymdToUtcDate(startDate);
  const e = ymdToUtcDate(endDate);
  if (!s || !e || s > e) return [];
  const out = [];
  const cur = new Date(s);
  while (cur <= e) {
    out.push(utcDateToYmd(cur));
    if (out.length >= max) break;
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return out;
}
function fmtNum(n) {
  return Number(n || 0).toFixed(1);
}
function yearOfYmd(ymd) {
  const y = Number(String(ymd || '').slice(0, 4));
  return Number.isFinite(y) && y > 1900 ? y : null;
}
function el(tag, attrs) {
  const node = document.createElement(tag);
  if (attrs && typeof attrs === 'object') {
    for (const [k, v] of Object.entries(attrs)) {
      if (v === undefined || v === null) continue;
      if (k === 'class') node.className = String(v);
      else if (k === 'text') node.textContent = String(v);
      else if (k === 'hidden') node.hidden = !!v;
      else node.setAttribute(k, String(v));
    }
  }
  for (let i = 2; i < arguments.length; i++) {
    const c = arguments[i];
    if (c === undefined || c === null) continue;
    node.appendChild(c);
  }
  return node;
}

async function renderEmpInfo() {
  try {
    const token = sessionStorage.getItem('accessToken') || '';
    const u = await me(token);
    const empCode = qs('#empCode');
    const empName = qs('#empName');
    if (empCode) empCode.textContent = `${u.employeeCode || u.id}`;
    if (empName) empName.textContent = `${u.username || u.email || ''}`;
  } catch (e) {
    const empCode = qs('#empCode');
    const empName = qs('#empName');
    if (empCode) empCode.textContent = '';
    if (empName) empName.textContent = '';
  }
}

async function renderLedger() {
  const root = qs('#leaveLedgerApp');
  const statusEl = qs('#leaveLedgerStatus');
  const errorEl = qs('#leaveLedgerError');
  if (!root) return;

  const setStatus = (msg) => {
    if (!statusEl) return;
    const m = String(msg || '');
    statusEl.textContent = m;
    statusEl.hidden = !m;
  };
  const setError = (msg) => {
    if (!errorEl) return;
    const m = String(msg || '');
    errorEl.textContent = m;
    errorEl.hidden = !m;
  };

  const state = { balance: null, grants: [], requests: null };

  const buildOneRowTable = (headers, values) => {
    const tbl = document.createElement('table');
    const thead = document.createElement('thead');
    const trh = document.createElement('tr');
    for (const h of headers) {
      trh.appendChild(el('th', { text: h, scope: 'col' }));
    }
    thead.appendChild(trh);
    const tbody = document.createElement('tbody');
    const trv = document.createElement('tr');
    for (const v of values) {
      trv.appendChild(el('td', { text: v }));
    }
    tbody.appendChild(trv);
    tbl.appendChild(thead);
    tbl.appendChild(tbody);
    return tbl;
  };

  const buildDataTable = (headers, rows) => {
    const tbl = document.createElement('table');
    const thead = document.createElement('thead');
    const trh = document.createElement('tr');
    for (const h of headers) {
      trh.appendChild(el('th', { text: h, scope: 'col' }));
    }
    thead.appendChild(trh);
    const tbody = document.createElement('tbody');
    const list = Array.isArray(rows) ? rows : [];
    if (!list.length) {
      const tr = document.createElement('tr');
      const td = el('td', { text: 'データがありません。' });
      td.colSpan = headers.length;
      tr.appendChild(td);
      tbody.appendChild(tr);
    } else {
      for (const cols of list) {
        const tr = document.createElement('tr');
        for (const c of cols) {
          tr.appendChild(el('td', { text: c }));
        }
        tbody.appendChild(tr);
      }
    }
    tbl.appendChild(thead);
    tbl.appendChild(tbody);
    return tbl;
  };

  const buildCollapsibleSection = ({ title, bodyId, rightNode }) => {
    const section = el('section', { class: 'se-section' });
    const head = el('div', { class: 'se-section-head se-summary-head' });
    const titleWrap = el('div', { class: 'se-daily-title' });
    const toggle = el('button', {
      type: 'button',
      class: 'se-daily-switch',
      'aria-controls': bodyId,
      'aria-expanded': 'true',
      'aria-label': `${title} を折りたたむ`
    });
    const titleText = el('span', { class: 'se-daily-text', text: title });
    titleWrap.appendChild(toggle);
    titleWrap.appendChild(titleText);
    head.appendChild(titleWrap);
    if (rightNode) head.appendChild(rightNode);
    const body = el('div', { class: 'se-section-body', id: bodyId });
    section.appendChild(head);
    section.appendChild(body);
    toggle.addEventListener('click', () => {
      const nextCollapsed = !section.classList.contains('collapsed');
      section.classList.toggle('collapsed', nextCollapsed);
      toggle.setAttribute('aria-expanded', String(!nextCollapsed));
      toggle.setAttribute('aria-label', `${title} を${nextCollapsed ? '展開' : '折りたた'}む`);
    });
    return { section, body };
  };

  const ensureRequestsLoaded = async () => {
    if (state.requests) return state.requests;
    const reqs = await listMyRequests();
    state.requests = Array.isArray(reqs) ? reqs : [];
    return state.requests;
  };

  try {
    setError('');
    setStatus('読み込み中…');

    const balance = await myPaidBalance();
    const grants = Array.isArray(balance?.grants) ? balance.grants : [];
    state.balance = balance || {};
    state.grants = grants.map((g) => ({
      grantDate: toYmd(g?.grantDate),
      expiryDate: toYmd(g?.expiryDate),
      daysGranted: Number(g?.daysGranted || 0),
      daysRemaining: Number(g?.daysRemaining || 0)
    })).filter((g) => g.grantDate && g.expiryDate);

    const nowYear = new Date().getFullYear();
    const yearSet = new Set([nowYear]);
    for (const g of state.grants) {
      const y = yearOfYmd(g.grantDate);
      if (y) yearSet.add(y);
    }
    const years = Array.from(yearSet).sort((a, b) => b - a);
    const currentYear = years[0] || nowYear;

    const yearSelect = el('select', { id: 'targetYear', class: 'se-toolbar-select' });
    yearSelect.appendChild(el('option', { value: 'pre', text: '付与前・移行前' }));
    for (const y of years.slice(0, 12)) {
      yearSelect.appendChild(el('option', { value: String(y), text: `${y}年度` }));
    }
    yearSelect.value = String(currentYear);

    const yearField = el('div', { class: 'se-toolbar-field' });
    yearField.appendChild(el('label', { class: 'se-toolbar-label', for: 'targetYear', text: '対象年度' }));
    yearField.appendChild(yearSelect);

    const ledger = buildCollapsibleSection({
      title: '休暇欠勤台帳',
      bodyId: 'leaveLedgerBody',
      rightNode: yearField
    });
    const summaryWrap = el('div', { id: 'ledgerSummaryTable', class: 'se-summary' });
    ledger.body.appendChild(summaryWrap);

    const explain = buildCollapsibleSection({
      title: '項目説明',
      bodyId: 'leaveLedgerExplainBody',
      rightNode: null
    });
    const explainWrap = el('div', { id: 'ledgerExplainTable', class: 'se-summary' });
    explainWrap.style.maxWidth = '980px';
    explainWrap.style.width = '100%';
    explainWrap.style.margin = '0';
    explainWrap.style.overflowX = 'visible';
    explain.body.appendChild(explainWrap);

    let content = qs('#leaveLedgerContent', root);
    if (!content) {
      content = el('div', { id: 'leaveLedgerContent' });
      root.appendChild(content);
    }
    content.replaceChildren(ledger.section, explain.section);

    const renderExplainTable = () => {
      explainWrap.replaceChildren();
      const tbl = document.createElement('table');
      const tbody = document.createElement('tbody');
      const expItems = [
        ['対象期間', 'その年度における有休付与日から次回有休付与まで（有休付与がない年度の場合は入社日から次回有休付与まで）'],
        ['現在の有休残日数', '現時点で取得可能な有休の残日数の目安'],
        ['前年繰越有休日数', '前年から繰り越された有休残日数'],
        ['対象年度有休付与日数', '対象年度に付与された有休日数'],
        ['有休取得日数', '対象年度に取得した有休日数'],
        ['休日調整充当日数', '休日調整に充当した日数'],
        ['対象有休残日数', '対象年度分の有休残日数（前年繰越分と対象年度付与分の合計残日数）'],
        ['欠勤日数', '対象年度の欠勤日数'],
        ['無給休暇日数', '対象年度の無給休暇日数'],
        ['年度末有休消滅数', '年度末までに消滅する有休の見込み数']
      ];
      for (const [k, v] of expItems) {
        const tr = document.createElement('tr');
        tr.appendChild(el('td', { text: k }));
        tr.appendChild(el('td', { text: v }));
        tbody.appendChild(tr);
      }
      tbl.appendChild(tbody);
      explainWrap.appendChild(tbl);
    };

    const renderYear = async (y) => {
      const isPre = String(y) === 'pre' || Number.isNaN(Number(y));
      const yearNum = isPre ? null : Number(y);
      const jan1 = isPre ? '' : `${yearNum}-01-01`;
      const dec31 = isPre ? '' : `${yearNum}-12-31`;

      const grantEntries = isPre ? [] : state.grants.filter((g) => yearOfYmd(g.grantDate) === yearNum).slice().sort((a, b) => String(a.grantDate).localeCompare(String(b.grantDate)));
      const grantInYear = grantEntries[0] || null;
      const grantDate = grantInYear ? grantInYear.grantDate : '';
      const periodStart = isPre ? '' : (grantDate || jan1);
      const periodEnd = isPre ? '' : (grantDate ? addDaysYmd(addYearsYmd(grantDate, 1), -1) : dec31);
      const currentRemain = fmtNum(state.balance?.totalAvailable || 0);

      const topHeaders = ['対象年度', '対象年度付与日', '対象期間', '現在の有休残日数'];
      const topValues = [
        isPre ? '付与前・移行前' : `${yearNum}年度`,
        grantDate || '-',
        isPre ? '-' : `${periodStart} 〜 ${periodEnd}`,
        currentRemain
      ];

      let approvedReqs = [];
      let paidReqs = [];
      let usedDays = 0;
      if (!isPre) {
        const reqs = await ensureRequestsLoaded();
        approvedReqs = reqs
          .filter((r) => String(r?.status || '').toLowerCase() === 'approved')
          .map((r) => ({
            startDate: toYmd(r?.startDate),
            endDate: toYmd(r?.endDate),
            type: String(r?.type || '').toLowerCase(),
            reason: String(r?.reason || '')
          }))
          .filter((r) => r.startDate && r.endDate && r.endDate >= jan1 && r.startDate <= dec31);

        paidReqs = approvedReqs.filter((r) => r.type === 'paid');
        usedDays = paidReqs.reduce((sum, r) => {
          const s = r.startDate < jan1 ? jan1 : r.startDate;
          const e = r.endDate > dec31 ? dec31 : r.endDate;
          return sum + daysBetweenInclusiveYmd(s, e);
        }, 0);
      }

      const yearGranted = isPre ? 0 : state.grants.filter((g) => yearOfYmd(g.grantDate) === yearNum).reduce((s, g) => s + Number(g.daysGranted || 0), 0);
      const carryPrev = isPre ? 0 : state.grants
        .filter((g) => yearOfYmd(g.grantDate) < yearNum && g.expiryDate >= jan1)
        .reduce((s, g) => s + Math.max(0, Number(g.daysRemaining || 0)), 0);
      const yearRemaining = isPre ? 0 : state.grants
        .filter((g) => yearOfYmd(g.grantDate) === yearNum)
        .reduce((s, g) => s + Math.max(0, Number(g.daysRemaining || 0)), 0);
      const extinctAtYearEnd = isPre ? 0 : state.grants
        .filter((g) => g.expiryDate >= jan1 && g.expiryDate <= dec31)
        .reduce((s, g) => s + Math.max(0, Number(g.daysRemaining || 0)), 0);

      const bottomHeaders = ['前年繰越有休日数', '対象年度有休付与日数', '有休取得日数', '休日調整充当日数', '対象有休残日数', '欠勤日数', '無給休暇日数', '年度末有休消滅数'];
      const yearGrantedDisplay = isPre ? `${fmtNum(yearGranted)}(付与前)` : fmtNum(yearGranted);
      const bottomValues = [fmtNum(carryPrev), yearGrantedDisplay, fmtNum(usedDays), '0', fmtNum(yearRemaining), '0', '0', fmtNum(extinctAtYearEnd)];

      const frag = document.createDocumentFragment();
      const topTbl = buildOneRowTable(topHeaders, topValues);
      const bottomTbl = buildOneRowTable(bottomHeaders, bottomValues);
      bottomTbl.classList.add('metrics-table');
      frag.appendChild(topTbl);
      frag.appendChild(el('div', { style: 'height:6px' }));
      frag.appendChild(bottomTbl);

      const dayRows = [];
      if (!isPre) {
        for (const r of approvedReqs) {
          const s = r.startDate < jan1 ? jan1 : r.startDate;
          const e = r.endDate > dec31 ? dec31 : r.endDate;
          for (const d of enumerateDatesYmd(s, e)) {
            dayRows.push({ date: d, type: r.type, reason: r.reason });
          }
        }
      }
      dayRows.sort((a, b) => String(b.date).localeCompare(String(a.date)));
      const paidRows = dayRows.filter((r) => r.type === 'paid');
      const absentRows = dayRows.filter((r) => r.type !== 'paid');

      const usedWrap = el('div', { style: 'margin-top:10px;display:grid;gap:10px;max-width:520px' });
      if (paidRows.length) {
        usedWrap.appendChild(el('div', { text: '● 有休', style: 'font-weight:700;font-size:14px;margin:0' }));
        usedWrap.appendChild(buildDataTable(
          ['取得年月日', '全休/半休', '区分'],
          paidRows.map((r) => [r.date, '全休', '有給休暇'])
        ));
      }
      if (absentRows.length) {
        usedWrap.appendChild(el('div', { text: '● 欠勤', style: 'font-weight:700;font-size:14px;margin:0' }));
        usedWrap.appendChild(buildDataTable(
          ['取得年月日', '出勤区分', '事由'],
          absentRows.map((r) => [r.date, r.type === 'unpaid' ? '無給休暇' : '欠勤', r.reason || ''])
        ));
      }
      if (paidRows.length || absentRows.length) {
        frag.appendChild(usedWrap);
      }

      summaryWrap.replaceChildren(frag);
    };

    renderExplainTable();
    await renderYear(currentYear);
    yearSelect.addEventListener('change', async () => {
      setError('');
      setStatus('読み込み中…');
      try {
        const v = yearSelect.value;
        if (v === 'pre') await renderYear('pre');
        else await renderYear(parseInt(v, 10));
        setStatus('');
      } catch (e) {
        setStatus('');
        setError(String(e?.message || 'error'));
      }
    });

    setStatus('');
  } catch (e) {
    setStatus('');
    setError(String(e?.message || 'error'));
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  await renderEmpInfo();
  await renderLedger();
});

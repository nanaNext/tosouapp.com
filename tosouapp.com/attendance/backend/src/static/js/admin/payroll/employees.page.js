import { fetchJSONAuth } from '../../api/http.api.js';
import { listUsers } from '../../api/users.api.js';
import { createPayrollService } from './editor.service.js';
import { escapeHtml, employeeCode, yenWithUnit as yen, ensureStylesheet as ensurePayrollStylesheet, openPdf } from './shared.js';

const formatMonth = (m) => {
  const s = String(m || '');
  const match = /^(\d{4})-(\d{2})$/.exec(s);
  return match ? `${match[1]}年${match[2]}月` : (s || '—');
};

const formatDateTime = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

const isStandalone = () => {
  try { return window.location.search.includes('standalone=1') || window.location.search.includes('standalone=true'); }
  catch { return false; }
};

const withStandalone = (path) => {
  if (!isStandalone()) return path;
  if (path.includes('standalone=')) return path;
  return `${path}${path.includes('?') ? '&' : '?'}standalone=1`;
};

function goToEditorFor(userId) {
  try {
    localStorage.setItem('payroll.lastUserId', String(userId));
    const now = new Date();
    localStorage.setItem('payroll.lastMonth', `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  } catch { /* ignore */ }
  window.location.href = '/admin/payroll?standalone=1&tab=payroll_editor';
}

const TH = 'padding:8px 16px;font-size:12px;color:#6a6d70;border-bottom:1px solid #edeff0;';
const BTN = 'border:1px solid #d0d7de;background:#fff;color:#0b2c66;font-weight:600;border-radius:6px;padding:4px 12px;cursor:pointer;font-size:12px;';
const pill = (text, color, bg) => `<span style="color:${color};background:${bg};padding:2px 8px;border-radius:999px;font-size:12px;font-weight:600;white-space:nowrap;">${text}</span>`;

// 同じ月に複数回送信した場合は1行にまとめる（最新の送信を表示し、回数を添える）。
// items は送信日時の新しい順で届く前提。
function groupDeliveriesByUserMonth(items) {
  const map = new Map();
  for (const it of items) {
    const key = `${it.userId}|${it.month}`;
    const g = map.get(key);
    if (g) { g.count += 1; if (it.isRead) g.anyRead = true; }
    else map.set(key, { ...it, count: 1, anyRead: !!it.isRead });
  }
  return [...map.values()];
}

// 全従業員について、選択した月に給与明細を送信したかどうかを一覧する
async function renderMonthlyStatus(card, users, service) {
  card.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">
      <div class="pe-title" style="margin:0;border:none;padding:0;">月別 送信状況</div>
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
        <select id="stEmp" aria-label="従業員一覧" style="height:34px;max-width:240px;padding:0 10px;border:1px solid #d0d7de;border-radius:6px;font-size:13px;">
          <option value="">従業員一覧（${users.length}名）</option>
          ${users.map((u) => `<option value="${escapeHtml(u.id)}">${escapeHtml(userLabel(u))}</option>`).join('')}
        </select>
        <input type="month" id="stMonth" style="height:34px;padding:0 10px;border:1px solid #d0d7de;border-radius:6px;font-size:13px;">
        <select id="stFilter" style="height:34px;padding:0 10px;border:1px solid #d0d7de;border-radius:6px;font-size:13px;">
          <option value="all">すべて</option>
          <option value="sent">送信済み</option>
          <option value="unsent">未送信</option>
        </select>
      </div>
    </div>
    <div id="stSummary" style="display:flex;gap:10px;flex-wrap:wrap;margin:12px 0;"></div>
    <div style="overflow-x:auto;">
      <table style="width:100%;border-collapse:collapse;min-width:640px;">
        <thead>
          <tr style="background:#f8fafc;">
            <th style="text-align:left;${TH}">社員コード</th>
            <th style="text-align:left;${TH}">氏名</th>
            <th style="text-align:center;${TH}">状態</th>
            <th style="text-align:left;${TH}">送信日時／送信者</th>
            <th style="text-align:center;${TH}">従業員の確認</th>
            <th style="${TH}"></th>
          </tr>
        </thead>
        <tbody id="stBody"><tr><td colspan="6" style="text-align:center;padding:24px 16px;color:#6a6d70;">読み込み中...</td></tr></tbody>
      </table>
    </div>
  `;
  const monthEl = card.querySelector('#stMonth');
  const filterEl = card.querySelector('#stFilter');
  const body = card.querySelector('#stBody');
  const summary = card.querySelector('#stSummary');
  let rows = [];

  const draw = () => {
    const sent = rows.filter((r) => r.d);
    const read = sent.filter((r) => r.d.anyRead);
    const chip = (label, n, color, bg) => `<div style="background:${bg};color:${color};border-radius:8px;padding:6px 12px;font-size:13px;font-weight:700;">${label} ${n}名</div>`;
    summary.innerHTML = chip('対象', rows.length, '#0f172a', '#f1f5f9')
      + chip('送信済み', sent.length, '#065f46', '#d1fae5')
      + chip('未送信', rows.length - sent.length, '#92400e', '#fef3c7')
      + chip('確認済み', read.length, '#1e3a8a', '#dbeafe');
    const f = filterEl.value;
    const list = rows.filter((r) => (f === 'sent' ? r.d : f === 'unsent' ? !r.d : true));
    if (!list.length) {
      body.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:24px 16px;color:#6a6d70;">該当する従業員がいません</td></tr>';
      return;
    }
    body.innerHTML = list.map(({ u, d }) => `
      <tr style="border-bottom:1px solid #f1f5f9;">
        <td style="padding:10px 16px;font-size:13px;color:#6a6d70;font-weight:600;">${escapeHtml(employeeCode(u))}</td>
        <td style="padding:10px 16px;"><a href="${withStandalone(`/admin/payroll/employees?empId=${encodeURIComponent(u.id)}`)}" style="color:#0f172a;font-weight:600;text-decoration:none;">${escapeHtml(u.username || u.email || '')}</a></td>
        <td style="padding:10px 16px;text-align:center;">${d ? pill('送信済み', '#065f46', '#d1fae5') : pill('未送信', '#92400e', '#fef3c7')}</td>
        <td style="padding:10px 16px;color:#6a6d70;font-size:13px;">${d ? `${escapeHtml(formatDateTime(d.sentAt))}${d.senderName ? ` ／ ${escapeHtml(d.senderName)}` : ''}${d.count > 1 ? ` <span style="color:#94a3b8;">（${d.count}回送信）</span>` : ''}` : '—'}</td>
        <td style="padding:10px 16px;text-align:center;">${d ? (d.anyRead ? pill('確認済み', '#1e3a8a', '#dbeafe') : '<span style="color:#94a3b8;font-size:12px;">未確認</span>') : ''}</td>
        <td style="padding:10px 16px;text-align:right;">${d ? `<button type="button" class="st-open" data-file-id="${escapeHtml(d.fileId)}" style="${BTN}">PDFを開く</button>` : ''}</td>
      </tr>
    `).join('');
    body.querySelectorAll('.st-open').forEach((btn) => btn.addEventListener('click', () => {
      const fileId = btn.getAttribute('data-file-id');
      if (fileId) openPdf(`/api/payslips/admin/file/${encodeURIComponent(fileId)}`);
    }));
  };

  const load = async () => {
    const month = monthEl.value;
    body.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:24px 16px;color:#6a6d70;">読み込み中...</td></tr>';
    summary.innerHTML = '';
    try {
      const res = await service.listDeliveries({ month });
      const byUser = new Map(groupDeliveriesByUserMonth(Array.isArray(res?.items) ? res.items : []).map((d) => [String(d.userId), d]));
      rows = users.map((u) => ({ u, d: byUser.get(String(u.id)) || null }));
      draw();
    } catch {
      body.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:24px 16px;color:#b91c1c;">送信履歴の取得に失敗しました</td></tr>';
    }
  };

  // 初期表示は最後に送信があった月（なければ今月）
  const now = new Date();
  let initial = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  try {
    const res = await service.listDeliveries({});
    const months = (Array.isArray(res?.items) ? res.items : []).map((it) => String(it.month || '')).filter(Boolean).sort();
    if (months.length) initial = months[months.length - 1];
  } catch { /* ignore */ }
  monthEl.value = initial;
  // 従業員を選ぶと、その従業員の給与計算履歴・送信履歴の画面を開く
  card.querySelector('#stEmp').addEventListener('change', (e) => {
    const id = e.target.value;
    if (id) window.location.href = withStandalone(`/admin/payroll/employees?empId=${encodeURIComponent(id)}`);
  });
  monthEl.addEventListener('change', load);
  filterEl.addEventListener('change', draw);
  await load();
}

function renderEmployeeList(container, users, service) {
  container.innerHTML = `
    <div style="padding:24px 28px;max-width:1100px;margin:0 auto;font-family:'Noto Sans JP','Noto Sans','Yu Gothic UI','Meiryo UI','Segoe UI',system-ui,sans-serif;">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:16px;">
        <h1 style="margin:0;font-size:18px;font-weight:700;color:#0f172a;">従業員別 給与管理</h1>
        <a href="/admin/payroll?standalone=1&tab=payroll_editor" style="color:#0b2c66;font-weight:600;text-decoration:none;font-size:13px;">&larr; 給与明細作成・編集へ戻る</a>
      </div>
      <div class="pe-card" id="monthlyStatusCard" style="margin-bottom:16px;"></div>
    </div>
  `;

  renderMonthlyStatus(container.querySelector('#monthlyStatusCard'), users, service);
}

function renderCalcHistory(tbody, items) {
  if (!items.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:24px 16px;color:#6a6d70;">給与計算履歴がありません</td></tr>';
    return;
  }
  tbody.innerHTML = items.map((it) => {
    const badge = it.isPublished
      ? '<span style="color:#065f46;background:#d1fae5;padding:2px 8px;border-radius:999px;font-size:12px;font-weight:600;">公開済み</span>'
      : '<span style="color:#92400e;background:#fef3c7;padding:2px 8px;border-radius:999px;font-size:12px;font-weight:600;">未公開</span>';
    return `
      <tr style="border-bottom:1px solid #f1f5f9;">
        <td style="padding:10px 16px;font-weight:600;color:#0f172a;">${escapeHtml(formatMonth(it.month))}</td>
        <td style="padding:10px 16px;text-align:right;color:#0f172a;">${yen(it.gross)}</td>
        <td style="padding:10px 16px;text-align:right;color:#0f172a;">${yen(it.deduct)}</td>
        <td style="padding:10px 16px;text-align:right;font-weight:700;color:#047857;">${yen(it.net)}</td>
        <td style="padding:10px 16px;text-align:center;">${badge}</td>
        <td style="padding:10px 16px;text-align:right;">
          <button type="button" class="btn-calc-edit" data-month="${escapeHtml(it.month)}" style="border:1px solid #d0d7de;background:#fff;color:#0b2c66;font-weight:600;border-radius:6px;padding:4px 12px;cursor:pointer;font-size:12px;">編集</button>
        </td>
      </tr>
    `;
  }).join('');
}

function renderDeliveryHistory(tbody, items) {
  if (!items.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:24px 16px;color:#6a6d70;">送信履歴がありません</td></tr>';
    return;
  }
  const grouped = groupDeliveriesByUserMonth(items).sort((a, b) => String(b.month).localeCompare(String(a.month)));
  tbody.innerHTML = grouped.map((it) => `
    <tr style="border-bottom:1px solid #f1f5f9;">
      <td style="padding:10px 16px;font-weight:600;color:#0f172a;">${escapeHtml(formatMonth(it.month))}</td>
      <td style="padding:10px 16px;color:#0f172a;">${escapeHtml(it.fileName || '—')}</td>
      <td style="padding:10px 16px;color:#6a6d70;">${escapeHtml(formatDateTime(it.sentAt))} ${it.senderName ? `／ ${escapeHtml(it.senderName)}` : ''}${it.count > 1 ? ` <span style="color:#94a3b8;">（${it.count}回送信・最新を表示）</span>` : ''}</td>
      <td style="padding:10px 16px;text-align:center;">${it.anyRead ? pill('確認済み', '#1e3a8a', '#dbeafe') : '<span style="color:#94a3b8;font-size:12px;">未確認</span>'}</td>
      <td style="padding:10px 16px;text-align:right;">
        <button type="button" class="btn-delivery-open" data-file-id="${escapeHtml(it.fileId)}" style="border:1px solid #d0d7de;background:#fff;color:#0b2c66;font-weight:600;border-radius:6px;padding:4px 12px;cursor:pointer;font-size:12px;">PDFを開く</button>
      </td>
    </tr>
  `).join('');
}

const userLabel = (u) => {
  const code = employeeCode(u);
  return `${u.username || u.email || ''}${code ? `（${code}）` : ''}`;
};

async function renderEmployeeDetail(container, user, service, users = []) {
  // 同じ会社の従業員をプルダウンで切り替えられるようにする（一覧に戻らなくてよい）
  const options = users.some((u) => String(u.id) === String(user.id)) ? users : [user, ...users];
  container.innerHTML = `
    <div style="padding:24px 28px;max-width:1100px;margin:0 auto;font-family:'Noto Sans JP','Noto Sans','Yu Gothic UI','Meiryo UI','Segoe UI',system-ui,sans-serif;">
      <a href="${withStandalone('/admin/payroll/employees')}" style="color:#0b2c66;font-weight:600;text-decoration:none;font-size:13px;">&larr; 従業員一覧へ戻る</a>

      <div class="pe-card" style="display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;margin:16px 0;padding:20px 24px;">
        <div style="min-width:0;flex:1 1 320px;">
          <label for="empSwitch" style="display:block;font-size:12px;color:#6a6d70;font-weight:700;letter-spacing:.5px;">対象従業員（${options.length}名）</label>
          <select id="empSwitch" style="margin-top:6px;width:100%;max-width:420px;height:42px;padding:0 12px;border:1px solid #d0d7de;border-radius:6px;background:#fff;font-size:16px;font-weight:700;color:#0f172a;cursor:pointer;">
            ${options.map((u) => `<option value="${escapeHtml(u.id)}"${String(u.id) === String(user.id) ? ' selected' : ''}>${escapeHtml(userLabel(u))}</option>`).join('')}
          </select>
        </div>
        <button type="button" id="btnGotoEditor" style="height:40px;padding:0 20px;border:none;border-radius:6px;background:#0b2c66;color:#fff;font-weight:700;font-size:13px;cursor:pointer;white-space:nowrap;">この従業員の給与明細を作成・編集 &rarr;</button>
      </div>

      <div class="pe-card">
        <div class="pe-title">給与計算履歴</div>
        <div style="overflow-x:auto;">
          <table style="width:100%;border-collapse:collapse;min-width:560px;">
            <thead>
              <tr style="background:#f8fafc;">
                <th style="text-align:left;padding:8px 16px;font-size:12px;color:#6a6d70;border-bottom:1px solid #edeff0;">対象月</th>
                <th style="text-align:right;padding:8px 16px;font-size:12px;color:#6a6d70;border-bottom:1px solid #edeff0;">支給合計</th>
                <th style="text-align:right;padding:8px 16px;font-size:12px;color:#6a6d70;border-bottom:1px solid #edeff0;">控除合計</th>
                <th style="text-align:right;padding:8px 16px;font-size:12px;color:#6a6d70;border-bottom:1px solid #edeff0;">差引支払額</th>
                <th style="text-align:center;padding:8px 16px;font-size:12px;color:#6a6d70;border-bottom:1px solid #edeff0;">状態</th>
                <th style="border-bottom:1px solid #edeff0;"></th>
              </tr>
            </thead>
            <tbody id="calcHistoryBody">
              <tr><td colspan="6" style="text-align:center;padding:24px 16px;color:#6a6d70;">読み込み中...</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="pe-card" style="margin-top:20px;">
        <div class="pe-title">送信履歴（PDF）</div>
        <div style="overflow-x:auto;">
          <table style="width:100%;border-collapse:collapse;min-width:480px;">
            <thead>
              <tr style="background:#f8fafc;">
                <th style="text-align:left;padding:8px 16px;font-size:12px;color:#6a6d70;border-bottom:1px solid #edeff0;">対象月</th>
                <th style="text-align:left;padding:8px 16px;font-size:12px;color:#6a6d70;border-bottom:1px solid #edeff0;">ファイル名</th>
                <th style="text-align:left;padding:8px 16px;font-size:12px;color:#6a6d70;border-bottom:1px solid #edeff0;">送信日時／送信者</th>
                <th style="text-align:center;padding:8px 16px;font-size:12px;color:#6a6d70;border-bottom:1px solid #edeff0;">従業員の確認</th>
                <th style="border-bottom:1px solid #edeff0;"></th>
              </tr>
            </thead>
            <tbody id="deliveryHistoryBody">
              <tr><td colspan="5" style="text-align:center;padding:24px 16px;color:#6a6d70;">読み込み中...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  container.querySelector('#btnGotoEditor').addEventListener('click', () => goToEditorFor(user.id));
  container.querySelector('#empSwitch').addEventListener('change', (e) => {
    const next = options.find((u) => String(u.id) === String(e.target.value));
    if (!next) return;
    try { history.replaceState(null, '', withStandalone(`/admin/payroll/employees?empId=${encodeURIComponent(next.id)}`)); } catch { /* ignore */ }
    renderEmployeeDetail(container, next, service, users);
  });

  const calcBody = container.querySelector('#calcHistoryBody');
  const deliveryBody = container.querySelector('#deliveryHistoryBody');

  const [historyResult, deliveryResult] = await Promise.allSettled([
    service.getInputHistory({ userId: user.id }),
    service.listDeliveries({ userId: user.id })
  ]);

  if (historyResult.status === 'fulfilled') {
    renderCalcHistory(calcBody, Array.isArray(historyResult.value?.items) ? historyResult.value.items : []);
    calcBody.querySelectorAll('.btn-calc-edit').forEach((btn) => {
      btn.addEventListener('click', () => {
        try {
          localStorage.setItem('payroll.lastUserId', String(user.id));
          localStorage.setItem('payroll.lastMonth', btn.getAttribute('data-month') || '');
        } catch { /* ignore */ }
        window.location.href = '/admin/payroll?standalone=1&tab=payroll_editor';
      });
    });
  } else {
    calcBody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:24px 16px;color:#b91c1c;">給与計算履歴の取得に失敗しました</td></tr>';
  }

  if (deliveryResult.status === 'fulfilled') {
    const items = Array.isArray(deliveryResult.value?.items) ? deliveryResult.value.items : [];
    renderDeliveryHistory(deliveryBody, items);
    deliveryBody.querySelectorAll('.btn-delivery-open').forEach((btn) => {
      btn.addEventListener('click', () => {
        const fileId = btn.getAttribute('data-file-id');
        if (fileId) openPdf(`/api/payslips/admin/file/${encodeURIComponent(fileId)}`);
      });
    });
  } else {
    deliveryBody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:24px 16px;color:#b91c1c;">送信履歴の取得に失敗しました（サーバー再起動が必要な可能性があります）</td></tr>';
  }
}

async function mount({ content } = {}) {
  ensurePayrollStylesheet('payrollEditorStyle', '/static/css/payroll-editor.css?v=6');
  const container = content || document.querySelector('#adminContent');
  if (!container) return;

  container.innerHTML = '';
  const host = document.createElement('div');
  if (isStandalone()) {
    host.style.setProperty('position', 'fixed', 'important');
    host.style.setProperty('top', '0', 'important');
    host.style.setProperty('left', '0', 'important');
    host.style.setProperty('right', '0', 'important');
    host.style.setProperty('bottom', '0', 'important');
    host.style.setProperty('height', window.innerHeight + 'px', 'important');
    host.style.setProperty('max-height', window.innerHeight + 'px', 'important');
    host.style.setProperty('min-height', '0', 'important');
    host.style.setProperty('overflow-y', 'auto', 'important');
    host.style.setProperty('overflow-x', 'hidden', 'important');
    host.style.background = '#f8fafc';
    const onResize = () => {
      try {
        host.style.setProperty('height', window.innerHeight + 'px', 'important');
        host.style.setProperty('max-height', window.innerHeight + 'px', 'important');
      } catch { /* ignore */ }
    };
    window.addEventListener('resize', onResize);
  }
  container.appendChild(host);
  host.innerHTML = '<div style="padding:40px;text-align:center;color:#6a6d70;">読み込み中...</div>';

  const service = createPayrollService({ fetchJSONAuth });

  let users = [];
  try {
    const rows = await listUsers();
    users = (Array.isArray(rows) ? rows : []).filter((u) => {
      const role = String(u.role || '').toLowerCase();
      return role !== 'admin' && role !== 'manager';
    });
  } catch { /* ignore, render with empty list */ }

  const params = new URLSearchParams(window.location.search);
  const empId = params.get('empId');

  if (!empId) {
    renderEmployeeList(host, users, service);
    return;
  }

  const user = users.find((u) => String(u.id) === String(empId)) || { id: empId, username: `従業員 #${empId}` };
  await renderEmployeeDetail(host, user, service, users);
}

export { mount };

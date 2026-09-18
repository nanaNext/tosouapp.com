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

function renderEmployeeList(container, users) {
  container.innerHTML = `
    <div style="padding:24px 28px;max-width:1100px;margin:0 auto;font-family:'Noto Sans JP','Noto Sans','Yu Gothic UI','Meiryo UI','Segoe UI',system-ui,sans-serif;">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:16px;">
        <h1 style="margin:0;font-size:18px;font-weight:700;color:#0f172a;">従業員別 給与管理</h1>
        <a href="/admin/payroll?standalone=1&tab=payroll_editor" style="color:#0b2c66;font-weight:600;text-decoration:none;font-size:13px;">&larr; 給与明細作成・編集へ戻る</a>
      </div>
      <div class="pe-card" style="padding:14px 20px;margin-bottom:16px;">
        <input type="text" id="empSearch" placeholder="社員コード・氏名で検索" autocomplete="off"
          style="width:100%;height:38px;padding:0 12px;border:1px solid #d0d7de;border-radius:6px;font-size:14px;box-sizing:border-box;">
      </div>
      <div class="pe-card" style="padding:0;overflow:hidden;">
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="background:#f8fafc;">
              <th style="text-align:left;padding:10px 20px;font-size:12px;font-weight:700;color:#6a6d70;border-bottom:1px solid #edeff0;">社員コード</th>
              <th style="text-align:left;padding:10px 20px;font-size:12px;font-weight:700;color:#6a6d70;border-bottom:1px solid #edeff0;">氏名</th>
              <th style="border-bottom:1px solid #edeff0;"></th>
            </tr>
          </thead>
          <tbody id="empTableBody"></tbody>
        </table>
        <div id="empEmpty" style="display:none;padding:32px 20px;text-align:center;color:#6a6d70;">該当する従業員が見つかりません。</div>
      </div>
    </div>
  `;

  const tbody = container.querySelector('#empTableBody');
  const emptyEl = container.querySelector('#empEmpty');

  const renderRows = (rows) => {
    if (!rows.length) {
      tbody.innerHTML = '';
      emptyEl.style.display = 'block';
      return;
    }
    emptyEl.style.display = 'none';
    tbody.innerHTML = rows.map((u) => `
      <tr class="emp-row" data-id="${escapeHtml(u.id)}" style="cursor:pointer;border-bottom:1px solid #f1f5f9;transition:background-color .15s;">
        <td style="padding:12px 20px;font-size:13px;color:#6a6d70;font-weight:600;">${escapeHtml(employeeCode(u))}</td>
        <td style="padding:12px 20px;font-size:14px;color:#0f172a;font-weight:500;">${escapeHtml(u.username || u.email || '')}</td>
        <td style="padding:12px 20px;text-align:right;color:#0b2c66;font-weight:600;font-size:13px;">詳細を見る &rarr;</td>
      </tr>
    `).join('');
    tbody.querySelectorAll('.emp-row').forEach((row) => {
      row.addEventListener('mouseenter', () => { row.style.background = '#f8fafc'; });
      row.addEventListener('mouseleave', () => { row.style.background = ''; });
      row.addEventListener('click', () => {
        const id = row.getAttribute('data-id');
        window.location.href = withStandalone(`/admin/payroll/employees?empId=${encodeURIComponent(id)}`);
      });
    });
  };

  renderRows(users);

  const searchInput = container.querySelector('#empSearch');
  searchInput.addEventListener('input', () => {
    const q = searchInput.value.trim().toLowerCase();
    if (!q) { renderRows(users); return; }
    renderRows(users.filter((u) => {
      const hay = `${employeeCode(u)} ${u.username || ''} ${u.email || ''}`.toLowerCase();
      return hay.includes(q);
    }));
  });
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
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:24px 16px;color:#6a6d70;">送信履歴がありません</td></tr>';
    return;
  }
  tbody.innerHTML = items.map((it) => `
    <tr style="border-bottom:1px solid #f1f5f9;">
      <td style="padding:10px 16px;font-weight:600;color:#0f172a;">${escapeHtml(formatMonth(it.month))}</td>
      <td style="padding:10px 16px;color:#0f172a;">${escapeHtml(it.fileName || '—')}</td>
      <td style="padding:10px 16px;color:#6a6d70;">${escapeHtml(formatDateTime(it.sentAt))} ${it.senderName ? `／ ${escapeHtml(it.senderName)}` : ''}</td>
      <td style="padding:10px 16px;text-align:right;">
        <button type="button" class="btn-delivery-open" data-file-id="${escapeHtml(it.fileId)}" style="border:1px solid #d0d7de;background:#fff;color:#0b2c66;font-weight:600;border-radius:6px;padding:4px 12px;cursor:pointer;font-size:12px;">PDFを開く</button>
      </td>
    </tr>
  `).join('');
}

async function renderEmployeeDetail(container, user, service) {
  container.innerHTML = `
    <div style="padding:24px 28px;max-width:1100px;margin:0 auto;font-family:'Noto Sans JP','Noto Sans','Yu Gothic UI','Meiryo UI','Segoe UI',system-ui,sans-serif;">
      <a href="${withStandalone('/admin/payroll/employees')}" style="color:#0b2c66;font-weight:600;text-decoration:none;font-size:13px;">&larr; 従業員一覧へ戻る</a>

      <div class="pe-card" style="display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;margin:16px 0;padding:20px 24px;">
        <div>
          <div style="font-size:12px;color:#6a6d70;font-weight:700;text-transform:uppercase;letter-spacing:.5px;">対象従業員</div>
          <div style="font-size:22px;font-weight:700;color:#0f172a;margin-top:4px;">
            ${escapeHtml(user.username || user.email || '')}
            <span style="color:#6a6d70;font-weight:500;font-size:14px;">（${escapeHtml(employeeCode(user))}）</span>
          </div>
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
                <th style="border-bottom:1px solid #edeff0;"></th>
              </tr>
            </thead>
            <tbody id="deliveryHistoryBody">
              <tr><td colspan="4" style="text-align:center;padding:24px 16px;color:#6a6d70;">読み込み中...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  container.querySelector('#btnGotoEditor').addEventListener('click', () => goToEditorFor(user.id));

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
    deliveryBody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:24px 16px;color:#b91c1c;">送信履歴の取得に失敗しました（サーバー再起動が必要な可能性があります）</td></tr>';
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
    renderEmployeeList(host, users);
    return;
  }

  const user = users.find((u) => String(u.id) === String(empId)) || { id: empId, username: `従業員 #${empId}` };
  await renderEmployeeDetail(host, user, service);
}

export { mount };

import { fetchJSONAuth } from '../../api/http.api.js';
import { downloadWithAuth } from '../../shared/api/client.js';
import { listDepartments } from '../../api/departments.api.js';
import { requireAdmin } from '../_shared/require-admin.js';

function escapeHtml(s) {
  return String(s ?? '').replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c]));
}

function currentMonth() {
  const d = new Date(Date.now() + 9 * 3600 * 1000);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function hm(minutes) {
  const n = Math.round(Number(minutes) || 0);
  const h = Math.floor(Math.abs(n) / 60);
  const m = Math.abs(n) % 60;
  return `${n < 0 ? '-' : ''}${h}:${String(m).padStart(2, '0')}`;
}

const JUDGEMENT_META = {
  normal: { label: '正常', style: 'background:#f0fdf4;color:#166534;border:1px solid #bbf7d0;' },
  caution: { label: '注意', style: 'background:#fff7ed;color:#c2410c;border:1px solid #fed7aa;' },
  exceeded: { label: '超過', style: 'background:#fef2f2;color:#991b1b;border:1px solid #fecaca;' }
};

function progressBar(value, limit) {
  const ratio = limit > 0 ? value / limit : 0;
  const pct = Math.max(0, Math.min(100, ratio * 100));
  const color = ratio >= 1 ? '#dc2626' : ratio >= 0.8 ? '#f59e0b' : '#16a34a';
  return `
    <div style="display:flex;align-items:center;gap:8px;min-width:150px;">
      <div style="flex:1;height:6px;border-radius:999px;background:#e2e8f0;overflow:hidden;">
        <div style="height:100%;width:${pct}%;background:${color};border-radius:999px;"></div>
      </div>
      <span style="font-size:12px;color:#334155;white-space:nowrap;">${escapeHtml(hm(value))}</span>
    </div>
  `;
}

export async function mount({ content } = {}) {
  const admin = await requireAdmin();
  const root = content || document.getElementById('attendanceHubContent') || document.getElementById('adminContent');
  if (!admin || !root) return () => {};

  let month = currentMonth();
  let dept = '';
  let userId = '';
  let departments = [];
  let employees = [];
  let lastConfig = null;

  async function loadFilterOptions() {
    departments = await listDepartments().catch(() => []);
    employees = await fetchJSONAuth('/api/admin/users?employmentStatus=active&role=employee&limit=5000')
      .then(r => Array.isArray(r) ? r : (r.rows || r.items || r.users || []))
      .catch(() => []);
    const deptSel = root.querySelector('#lsDeptFilter');
    if (deptSel) {
      deptSel.innerHTML = ['<option value="">すべて</option>']
        .concat(departments.map(d => `<option value="${escapeHtml(d.name)}">${escapeHtml(d.name)}</option>`))
        .join('');
    }
    const empSel = root.querySelector('#lsUserFilter');
    if (empSel) {
      empSel.innerHTML = ['<option value="">全員</option>']
        .concat(employees.map(u => `<option value="${u.id}">${escapeHtml(u.username || '')}${u.employee_code ? `（${escapeHtml(u.employee_code)}）` : ''}</option>`))
        .join('');
    }
  }

  async function loadClosureBanner() {
    const box = root.querySelector('#lsCloseBanner');
    if (!box) return;
    box.style.display = 'flex';
    box.innerHTML = '読み込み中...';
    try {
      const summary = await fetchJSONAuth(`/api/attendance/month/closure-summary?month=${encodeURIComponent(month)}`);
      if (summary.closed) {
        box.style.background = '#f1f5f9';
        box.style.borderColor = '#cbd5e1';
        box.style.color = '#334155';
        box.innerHTML = `<span>🔒 ${escapeHtml(month)}分は締め済みです</span>`;
      } else {
        box.style.background = '#f0fdf4';
        box.style.borderColor = '#bbf7d0';
        box.style.color = '#166534';
        box.innerHTML = `
          <span>${escapeHtml(month)}分は入力・修正ができます（未締め、承認済み ${summary.approved}/${summary.total}名）</span>
          <button type="button" id="lsCloseMonthBtn" style="height:28px;padding:0 14px;border:none;border-radius:6px;background:#166534;color:#fff;font-size:12px;font-weight:600;cursor:pointer;">月次締めを実行</button>
        `;
        root.querySelector('#lsCloseMonthBtn')?.addEventListener('click', onCloseMonth);
      }
    } catch (err) {
      box.style.background = '#fef2f2';
      box.style.borderColor = '#fecaca';
      box.style.color = '#991b1b';
      box.textContent = `締め状況の取得に失敗しました: ${err.message}`;
    }
  }

  async function onCloseMonth() {
    if (!confirm(`${month}分を全社員まとめて承認します。入力が未完了の人はスキップされます。よろしいですか？`)) return;
    try {
      await fetchJSONAuth('/api/attendance/month/approve-ready', { method: 'POST', body: JSON.stringify({ month }) });
      await loadClosureBanner();
      await loadList();
    } catch (err) {
      alert(String(err?.message || '失敗しました'));
    }
  }

  function renderCards(summary) {
    const box = root.querySelector('#lsCards');
    if (!box) return;
    const cards = [
      { label: '対象社員', value: `${summary.employeeCount}名` },
      { label: '実働時間', value: hm(summary.totalWorkedMinutes) },
      { label: '法定外残業', value: hm(summary.totalOvertimeMinutes) },
      { label: 'アラート', value: `${summary.alertCount}名`, danger: summary.alertCount > 0 }
    ];
    box.innerHTML = cards.map(c => `
      <div style="flex:1;min-width:160px;border:1px solid ${c.danger ? '#fecaca' : '#e2e8f0'};border-radius:10px;padding:18px 20px;background:#fff;">
        <div style="font-size:26px;font-weight:700;color:${c.danger ? '#991b1b' : '#0f172a'};line-height:1.2;">${escapeHtml(c.value)}</div>
        <div style="font-size:13px;color:#64748b;margin-top:4px;">${escapeHtml(c.label)}</div>
      </div>
    `).join('');
  }

  function renderTable(items, config) {
    const body = root.querySelector('#lsTableBody');
    if (!body) return;
    if (!items.length) {
      body.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:24px;color:#94a3b8;">対象データがありません</td></tr>';
      return;
    }
    const cellStyle = 'padding:12px;border-bottom:1px solid #f1f5f9;white-space:nowrap;color:#334155;';
    body.innerHTML = items.map(r => {
      const meta = JUDGEMENT_META[r.judgement] || JUDGEMENT_META.normal;
      const diffColor = r.diffMinutes === 0 ? '#334155' : r.diffMinutes > 0 ? '#c2410c' : '#0369a1';
      const diffLabel = r.diffMinutes > 0 ? `+${hm(r.diffMinutes)}` : hm(r.diffMinutes);
      return `
        <tr>
          <td style="${cellStyle}font-weight:600;">${escapeHtml(r.username || '')}${r.employeeCode ? `<br><span style="font-size:11px;font-weight:400;color:#94a3b8;">${escapeHtml(r.employeeCode)}</span>` : ''}</td>
          <td style="${cellStyle}">${escapeHtml(r.departmentName || '—')}</td>
          <td style="${cellStyle}text-align:center;">${r.attendDays}</td>
          <td style="${cellStyle}">${escapeHtml(hm(r.workedMinutes))}</td>
          <td style="padding:12px;border-bottom:1px solid #f1f5f9;">${progressBar(r.overtimeMinutes, config.monthlyOtLimitMinutes)}</td>
          <td style="${cellStyle}">${escapeHtml(hm(r.nightMinutes))}</td>
          <td style="${cellStyle}">${escapeHtml(hm(r.holidayWorkMinutes))}</td>
          <td style="padding:12px;border-bottom:1px solid #f1f5f9;">${progressBar(r.annualOvertimeMinutes, config.annualOtLimitMinutes)}</td>
          <td style="${cellStyle}"><span style="display:inline-block;padding:5px 14px;border-radius:999px;font-size:12px;font-weight:600;${meta.style}">${meta.label}</span></td>
          <td style="${cellStyle}">${escapeHtml(hm(r.reportedMinutes))}</td>
          <td style="${cellStyle}color:${diffColor};font-weight:600;">${escapeHtml(diffLabel)}</td>
        </tr>
      `;
    }).join('');
  }

  function renderFootnote(config) {
    const box = root.querySelector('#lsFootnote');
    if (!box) return;
    const monthlyH = Math.round(config.monthlyOtLimitMinutes / 60);
    const annualH = Math.round(config.annualOtLimitMinutes / 60);
    const singleH = Math.round(config.singleMonthLimitMinutes / 60);
    const pct = Math.round(config.cautionThresholdRatio * 100);
    box.textContent = `判定の基準: 時間外労働は月${monthlyH}時間・年${annualH}時間まで（36協定の原則）。月の時間外+休日労働は${singleH}時間未満。月の時間外が${pct}%到達で「注意」を表示します。`;
  }

  async function loadList() {
    const body = root.querySelector('#lsTableBody');
    if (body) body.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:24px;color:#94a3b8;">読み込み中...</td></tr>';
    try {
      const [year, m] = month.split('-').map(n => parseInt(n, 10));
      const qs = new URLSearchParams({ year: String(year), month: String(m) });
      if (dept) qs.set('dept', dept);
      if (userId) qs.set('userId', userId);
      const data = await fetchJSONAuth(`/api/attendance/summary/admin-list?${qs.toString()}`);
      lastConfig = data.config;
      renderCards(data.summary || { employeeCount: 0, totalWorkedMinutes: 0, totalOvertimeMinutes: 0, alertCount: 0 });
      renderTable(data.items || [], data.config);
      renderFootnote(data.config);
    } catch (err) {
      if (body) body.innerHTML = `<tr><td colspan="10" style="text-align:center;padding:24px;color:#ef4444;">エラー: ${escapeHtml(err.message)}</td></tr>`;
    }
  }

  root.innerHTML = `
    <div style="padding:16px 20px 32px;max-width:1400px;">
      <div id="lsCloseBanner" style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 18px;margin-bottom:16px;border-radius:8px;font-size:13px;font-weight:600;border:1px solid transparent;flex-wrap:wrap;"></div>

      <div style="display:flex;gap:12px;align-items:flex-end;margin-bottom:20px;flex-wrap:wrap;">
        <div style="display:flex;flex-direction:column;gap:4px;">
          <label style="font-size:12px;color:#64748b;font-weight:600;">対象月</label>
          <input type="month" id="lsMonthFilter" value="${month}" style="height:36px;border:1px solid #cbd5e1;border-radius:6px;padding:0 10px;font-size:13px;">
        </div>
        <div style="display:flex;flex-direction:column;gap:4px;">
          <label style="font-size:12px;color:#64748b;font-weight:600;">部署</label>
          <select id="lsDeptFilter" style="height:36px;border:1px solid #cbd5e1;border-radius:6px;padding:0 10px;min-width:130px;font-size:13px;"><option value="">すべて</option></select>
        </div>
        <div style="display:flex;flex-direction:column;gap:4px;">
          <label style="font-size:12px;color:#64748b;font-weight:600;">社員</label>
          <select id="lsUserFilter" style="height:36px;border:1px solid #cbd5e1;border-radius:6px;padding:0 10px;min-width:150px;font-size:13px;"><option value="">全員</option></select>
        </div>
        <button type="button" id="lsGoBtn" style="height:36px;padding:0 18px;background:#0b2c66;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:600;font-size:13px;">表示</button>
        <div style="flex:1;"></div>
        <button type="button" id="lsCsvBtn" style="height:36px;padding:0 16px;border:1px solid #cbd5e1;border-radius:6px;background:#fff;cursor:pointer;font-weight:600;font-size:13px;color:#334155;">CSV出力</button>
        <button type="button" id="lsXlsxBtn" style="height:36px;padding:0 16px;border:none;border-radius:6px;background:#0b2c66;color:#fff;cursor:pointer;font-weight:600;font-size:13px;">Excel出力</button>
      </div>

      <div id="lsCards" style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:20px;"></div>

      <div style="border:1px solid #e2e8f0;border-radius:10px;overflow:auto;max-height:65vh;background:#fff;">
        <table style="width:100%;border-collapse:separate;border-spacing:0;font-size:13px;min-width:1200px;">
          <thead>
            <tr>
              <th style="padding:12px;text-align:left;white-space:nowrap;position:sticky;top:-1px;z-index:1;background:#f8fafc;color:#64748b;font-weight:600;font-size:12px;border-bottom:1px solid #e2e8f0;transform:translateZ(0);">社員</th>
              <th style="padding:12px;text-align:left;white-space:nowrap;position:sticky;top:-1px;z-index:1;background:#f8fafc;color:#64748b;font-weight:600;font-size:12px;border-bottom:1px solid #e2e8f0;transform:translateZ(0);">部署</th>
              <th style="padding:12px;text-align:center;white-space:nowrap;position:sticky;top:-1px;z-index:1;background:#f8fafc;color:#64748b;font-weight:600;font-size:12px;border-bottom:1px solid #e2e8f0;transform:translateZ(0);">出勤日数</th>
              <th style="padding:12px;text-align:left;white-space:nowrap;position:sticky;top:-1px;z-index:1;background:#f8fafc;color:#64748b;font-weight:600;font-size:12px;border-bottom:1px solid #e2e8f0;transform:translateZ(0);">実働</th>
              <th style="padding:12px;text-align:left;white-space:nowrap;position:sticky;top:-1px;z-index:1;background:#f8fafc;color:#64748b;font-weight:600;font-size:12px;border-bottom:1px solid #e2e8f0;transform:translateZ(0);">法定外残業</th>
              <th style="padding:12px;text-align:left;white-space:nowrap;position:sticky;top:-1px;z-index:1;background:#f8fafc;color:#64748b;font-weight:600;font-size:12px;border-bottom:1px solid #e2e8f0;transform:translateZ(0);">深夜</th>
              <th style="padding:12px;text-align:left;white-space:nowrap;position:sticky;top:-1px;z-index:1;background:#f8fafc;color:#64748b;font-weight:600;font-size:12px;border-bottom:1px solid #e2e8f0;transform:translateZ(0);">休日</th>
              <th style="padding:12px;text-align:left;white-space:nowrap;position:sticky;top:-1px;z-index:1;background:#f8fafc;color:#64748b;font-weight:600;font-size:12px;border-bottom:1px solid #e2e8f0;transform:translateZ(0);">年間時間外</th>
              <th style="padding:12px;text-align:left;white-space:nowrap;position:sticky;top:-1px;z-index:1;background:#f8fafc;color:#64748b;font-weight:600;font-size:12px;border-bottom:1px solid #e2e8f0;transform:translateZ(0);">判定</th>
              <th style="padding:12px;text-align:left;white-space:nowrap;position:sticky;top:-1px;z-index:1;background:#f8fafc;color:#64748b;font-weight:600;font-size:12px;border-bottom:1px solid #e2e8f0;transform:translateZ(0);">報告時間</th>
              <th style="padding:12px;text-align:left;white-space:nowrap;position:sticky;top:-1px;z-index:1;background:#f8fafc;color:#64748b;font-weight:600;font-size:12px;border-bottom:1px solid #e2e8f0;transform:translateZ(0);">実働との差</th>
            </tr>
          </thead>
          <tbody id="lsTableBody"></tbody>
        </table>
      </div>
      <div id="lsFootnote" style="font-size:11px;color:#94a3b8;margin-top:10px;line-height:1.6;"></div>
    </div>
  `;

  await loadFilterOptions();

  root.querySelector('#lsGoBtn')?.addEventListener('click', () => {
    month = root.querySelector('#lsMonthFilter').value || month;
    dept = root.querySelector('#lsDeptFilter').value || '';
    userId = root.querySelector('#lsUserFilter').value || '';
    loadClosureBanner();
    loadList();
  });

  root.querySelector('#lsCsvBtn')?.addEventListener('click', async () => {
    try {
      const [year, m] = month.split('-').map(n => parseInt(n, 10));
      const qs = new URLSearchParams({ year: String(year), month: String(m) });
      if (dept) qs.set('dept', dept);
      await downloadWithAuth(`/api/attendance/summary/export.csv?${qs.toString()}`, `legal_summary_${month}.csv`);
    } catch (err) {
      alert(String(err?.message || 'CSV出力に失敗しました'));
    }
  });

  root.querySelector('#lsXlsxBtn')?.addEventListener('click', async () => {
    try {
      const [year, m] = month.split('-').map(n => parseInt(n, 10));
      const qs = new URLSearchParams({ year: String(year), month: String(m) });
      if (dept) qs.set('dept', dept);
      if (userId) qs.set('userId', userId);
      await downloadWithAuth(`/api/attendance/summary/export.xlsx?${qs.toString()}`, `legal_summary_${month}.xlsx`);
    } catch (err) {
      alert(String(err?.message || 'Excel出力に失敗しました'));
    }
  });

  await loadClosureBanner();
  await loadList();

  return () => {};
}

import { fetchJSONAuth } from '../../api/http.api.js';
import { requireAdmin } from '../_shared/require-admin.js';

function escapeHtml(s) {
  return String(s ?? '').replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c]));
}

function currentMonth() {
  const d = new Date(Date.now() + 9 * 3600 * 1000);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, ym: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}` };
}

function hm(minutes) {
  const n = Math.round(Number(minutes) || 0);
  const h = Math.floor(Math.abs(n) / 60);
  const m = Math.abs(n) % 60;
  return `${n < 0 ? '-' : ''}${h}:${String(m).padStart(2, '0')}`;
}

const JUDGEMENT_META = {
  caution: { label: '注意', style: 'background:#fff7ed;color:#c2410c;border:1px solid #fed7aa;' },
  exceeded: { label: '超過', style: 'background:#fef2f2;color:#991b1b;border:1px solid #fecaca;' }
};

const TYPE_META = {
  leave: { label: '有給申請', style: 'background:#eff6ff;color:#1e40af;border:1px solid #bfdbfe;' },
  adjust: { label: '打刻修正', style: 'background:#f5f3ff;color:#5b21b6;border:1px solid #ddd6fe;' }
};

export async function mount({ content } = {}) {
  const admin = await requireAdmin();
  const root = content || document.getElementById('adminContent');
  if (!admin || !root) return () => {};

  const { year, month, ym } = currentMonth();

  const state = {
    pendingRequests: { summary: { pending: 0 }, items: [] },
    pendingWorkReports: { summary: { pending: 0 } },
    legalSummary: { summary: { alertCount: 0 }, items: [] },
    leaveBalances: { items: [] },
    targetCount: 0,
    loadError: ''
  };

  async function loadAll() {
    const [reqRes, wrRes, legalRes, balRes, usersRes] = await Promise.allSettled([
      fetchJSONAuth(`/api/admin/requests/list?month=${ym}&status=pending&pageSize=50`),
      fetchJSONAuth(`/api/admin/work-reports/list?month=${ym}&status=pending&pageSize=1`),
      fetchJSONAuth(`/api/attendance/summary/admin-list?year=${year}&month=${month}`),
      fetchJSONAuth(`/api/leave/admin-balances`),
      fetchJSONAuth(`/api/admin/users?role=employee&employmentStatus=active&limit=5000`)
    ]);
    if (reqRes.status === 'fulfilled') state.pendingRequests = reqRes.value;
    if (wrRes.status === 'fulfilled') state.pendingWorkReports = wrRes.value;
    if (legalRes.status === 'fulfilled') state.legalSummary = legalRes.value;
    if (balRes.status === 'fulfilled') state.leaveBalances = balRes.value;
    if (usersRes.status === 'fulfilled') state.targetCount = usersRes.value.total || 0;
    const failed = [reqRes, wrRes, legalRes, balRes, usersRes].filter(r => r.status === 'rejected');
    state.loadError = failed.length ? `一部データの取得に失敗しました（${failed.length}件）` : '';
  }

  function render() {
    const pendingReqCount = state.pendingRequests.summary?.pending || 0;
    const pendingWrCount = state.pendingWorkReports.summary?.pending || 0;
    const alertItems = (state.legalSummary.items || [])
      .filter(i => i.judgement && i.judgement !== 'normal')
      .sort((a, b) => (b.overtimeMinutes || 0) - (a.overtimeMinutes || 0));
    const alertCount = state.legalSummary.summary?.alertCount ?? alertItems.length;
    const monthlyOtLimitMinutes = state.legalSummary.config?.monthlyOtLimitMinutes || 45 * 60;
    const unmetItems = (state.leaveBalances.items || []).filter(i => !i.obligationMet);
    const pendingItems = state.pendingRequests.items || [];

    root.innerHTML = `
      <style>
        .dash-page { padding:24px; box-sizing:border-box; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; }
        .dash-page h1 { font-size:20px; color:#1e293b; margin:0 0 16px; }
        .dash-error { background:#fef2f2; color:#991b1b; border:1px solid #fecaca; border-radius:8px; padding:10px 14px; font-size:13px; margin-bottom:16px; }
        .dash-cards { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:12px; margin-bottom:20px; }
        .dash-card { display:block; background:#fff; border:1px solid #e2e8f0; border-radius:8px; padding:12px 16px; text-decoration:none; transition:box-shadow .15s; }
        a.dash-card:hover { box-shadow:0 2px 8px rgba(0,0,0,0.06); }
        .dash-card-value { font-size:24px; font-weight:700; color:#1e293b; line-height:1.2; }
        .dash-card-label { font-size:12px; color:#94a3b8; margin-top:2px; }
        .dash-card-alert { border-color:#fca5a5; }
        .dash-section { background:#fff; border:1px solid #e2e8f0; border-radius:8px; margin-bottom:16px; overflow:hidden; }
        .dash-section h2 { font-size:14px; font-weight:600; color:#1e293b; margin:0; padding:12px 16px; }
        .dash-table { width:100%; border-collapse:collapse; font-size:13px; }
        .dash-table th { text-align:left; padding:8px 16px; color:#64748b; font-weight:600; background:#eef2f7; white-space:nowrap; }
        .dash-table td { padding:8px 16px; border-top:1px solid #f1f5f9; color:#1e293b; }
        .dash-empty { padding:20px 16px; text-align:center; color:#94a3b8; font-size:13px; }
        .dash-pill { display:inline-block; padding:2px 10px; border-radius:10px; font-size:11px; font-weight:600; white-space:nowrap; }
        .dash-progress { display:flex; align-items:center; gap:8px; min-width:130px; }
        .dash-progress-track { flex:1; height:5px; border-radius:999px; background:#f1f5f9; overflow:hidden; }
        .dash-progress-fill { height:100%; border-radius:999px; }
        .dash-btn { height:26px; padding:0 10px; border-radius:6px; font-size:12px; font-weight:600; cursor:pointer; margin-right:6px; }
        .dash-btn-approve { border:1px solid #bbf7d0; background:#f0fdf4; color:#166534; }
        .dash-btn-reject { border:1px solid #fecaca; background:#fef2f2; color:#991b1b; }
        @media (max-width:768px) {
          .dash-page { padding:12px; }
          .dash-table { font-size:12px; }
          .dash-table th, .dash-table td { padding:7px 8px; }
        }
      </style>
      <div class="dash-page">
        <h1>ホーム</h1>
        ${state.loadError ? `<div class="dash-error">${escapeHtml(state.loadError)}</div>` : ''}
        <div class="dash-cards">
          <a class="dash-card" href="/admin/attendance/adjust-requests">
            <div class="dash-card-value">${pendingReqCount}件</div>
            <div class="dash-card-label">未処理の申請</div>
          </a>
          <a class="dash-card" href="/admin/work-reports">
            <div class="dash-card-value">${pendingWrCount}件</div>
            <div class="dash-card-label">承認待ちの作業報告</div>
          </a>
          <a class="dash-card dash-card-alert" href="/admin/attendance/legal-summary">
            <div class="dash-card-value">${alertCount}名</div>
            <div class="dash-card-label">36協定アラート</div>
          </a>
          <a class="dash-card dash-card-alert" href="/admin/attendance/leave-balances">
            <div class="dash-card-value">${unmetItems.length}名</div>
            <div class="dash-card-label">有給5日未達</div>
          </a>
          <div class="dash-card">
            <div class="dash-card-value">${state.targetCount}名</div>
            <div class="dash-card-label">対象者</div>
          </div>
        </div>

        <section class="dash-section">
          <h2>36協定アラート（${year}年${String(month).padStart(2, '0')}月）</h2>
          ${alertItems.length ? `
            <table class="dash-table">
              <thead><tr><th>社員</th><th>部署</th><th>当月の時間外</th><th>年間累計</th><th>判定</th></tr></thead>
              <tbody>
                ${alertItems.map(i => {
                  const jm = JUDGEMENT_META[i.judgement] || JUDGEMENT_META.caution;
                  const ratio = monthlyOtLimitMinutes > 0 ? (i.overtimeMinutes || 0) / monthlyOtLimitMinutes : 0;
                  const pct = Math.max(0, Math.min(100, ratio * 100));
                  const barColor = i.judgement === 'exceeded' ? '#dc2626' : '#f59e0b';
                  return `
                    <tr>
                      <td>${escapeHtml(i.username)}</td>
                      <td>${escapeHtml(i.departmentName || '—')}</td>
                      <td>
                        <div class="dash-progress">
                          <div class="dash-progress-track"><div class="dash-progress-fill" style="width:${pct}%;background:${barColor};"></div></div>
                          <span>${escapeHtml(hm(i.overtimeMinutes))}</span>
                        </div>
                      </td>
                      <td>${escapeHtml(hm(i.annualOvertimeMinutes))}</td>
                      <td><span class="dash-pill" style="${jm.style}">${jm.label}</span></td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          ` : '<div class="dash-empty">アラートはありません</div>'}
        </section>

        <section class="dash-section">
          <h2>処理待ちの申請</h2>
          ${pendingItems.length ? `
            <table class="dash-table">
              <thead><tr><th>種別</th><th>申請者</th><th>対象日</th><th>内容</th><th></th></tr></thead>
              <tbody id="dashPendingBody">
                ${pendingItems.map(r => {
                  const label = r.typeLabel || TYPE_META[r.type]?.label || r.type;
                  return `
                    <tr>
                      <td>${escapeHtml(label)}</td>
                      <td>${escapeHtml(r.applicantName)}</td>
                      <td>${escapeHtml(r.targetDate)}</td>
                      <td>${escapeHtml(r.content)}</td>
                      <td style="white-space:nowrap;text-align:right;">
                        <button type="button" class="dash-btn dash-btn-approve" data-type="${escapeHtml(r.type)}" data-id="${escapeHtml(r.requestId)}">承認</button>
                        <button type="button" class="dash-btn dash-btn-reject" data-type="${escapeHtml(r.type)}" data-id="${escapeHtml(r.requestId)}">却下</button>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          ` : '<div class="dash-empty">処理待ちの申請はありません</div>'}
        </section>

        <section class="dash-section">
          <h2>年5日の有給取得義務（未達）</h2>
          ${unmetItems.length ? `
            <table class="dash-table">
              <thead><tr><th>社員</th><th>部署</th><th>取得日数</th><th></th></tr></thead>
              <tbody>
                ${unmetItems.map(i => `
                  <tr>
                    <td>${escapeHtml(i.username)}</td>
                    <td>${escapeHtml(i.departmentName || '—')}</td>
                    <td>取得${escapeHtml(i.obligationTaken)}日</td>
                    <td><span class="dash-pill" style="background:#fef2f2;color:#991b1b;border:1px solid #fecaca;">要取得</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : '<div class="dash-empty">対象者はいません</div>'}
        </section>
      </div>
    `;

    root.querySelectorAll('.dash-btn-approve').forEach(btn => btn.addEventListener('click', () => onDecide(btn.dataset.type, btn.dataset.id, 'approved')));
    root.querySelectorAll('.dash-btn-reject').forEach(btn => btn.addEventListener('click', () => onDecide(btn.dataset.type, btn.dataset.id, 'rejected')));
  }

  async function onDecide(type, id, decision) {
    let reason = '';
    if (decision === 'rejected' && type === 'adjust') {
      reason = prompt('却下理由を入力してください（必須）:', '') || '';
      if (!reason.trim()) { alert('却下理由を入力してください'); return; }
    }
    try {
      if (type === 'leave') {
        await fetchJSONAuth('/api/leave/approve', { method: 'PUT', body: JSON.stringify({ id, status: decision }) });
      } else {
        await fetchJSONAuth(`/api/adjust/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status: decision, adminNote: reason }) });
      }
      await loadAll();
      render();
    } catch (err) {
      alert(String(err?.message || '失敗しました'));
    }
  }

  root.innerHTML = '<div style="padding:24px;color:#64748b;">読み込み中...</div>';
  await loadAll();
  render();

  return () => {};
}

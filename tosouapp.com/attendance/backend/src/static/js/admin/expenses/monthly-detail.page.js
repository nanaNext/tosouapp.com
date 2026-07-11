import { requireAdmin } from '../_shared/require-admin.js';
import { fetchJSONAuth } from '../../api/http.api.js';

const $ = (sel) => document.querySelector(sel);
const todayISO = () => new Date().toLocaleDateString('sv-SE');
const todayMonth = () => todayISO().slice(0, 7);

const fmtStatus = (v) => {
  const s = String(v || '').toLowerCase();
  if (s === 'applied') return '承認待ち';
  if (s === 'approved') return '承認済み';
  if (s === 'rejected') return '差戻し';
  if (s === 'draft') return '下書き';
  if (s === 'pending') return '未申請';
  if (s === 'denied') return '却下';
  if (s === 'paid') return '支給済み';
  return s || '-';
};
// Lấy dữ liệu từ URL rồi hiển thị dữ liệu lên màn hình
const render = async () => {
  const host = $('#adminContent');
  if (!host) return;
  const params = new URLSearchParams(window.location.search || '');
  const month = params.get('month') || todayMonth();
  const userId = params.get('userId') || '';
// Cái này dùng để hiển thị chi tiết - 交通費

  host.className = '';
  host.style.maxWidth = '1000px';
  host.style.width = '100%';
  host.style.margin = '20px auto';
  host.style.padding = '0 16px';
  host.innerHTML = `
    <div class="exp-month-detail">
      <style>
        .exp-month-detail { display:grid; gap:10px; color:#0f172a; }
        .exp-month-detail .head { display:flex; align-items:center; justify-content:space-between; gap:12px; }
        .exp-month-detail .title { margin:0; font-size:20px; font-weight:700; }
        .exp-month-detail .meta { color:#475569; font-size:13px; }
        .exp-month-detail .btn { height:32px; padding:0 12px; border:1px solid #cbd5e1; background:#fff; border-radius:0; cursor:pointer; }
        .exp-month-detail .btn.primary { background:#0b5ed7; border-color:#0b5ed7; color:#fff; }
        .exp-month-detail .table-wrap { border:1px solid #dbe3ee; border-radius:0; background:#fff; overflow-x:auto; padding-bottom:12px; }
        .exp-month-detail table { width:100%; min-width:800px; border-collapse:collapse; border-spacing:0; }
        .exp-month-detail th, .exp-month-detail td { border:1px solid #e5eaf2; padding:10px 12px; font-size:13px; }
        .exp-month-detail th { background:#f8fafc; text-align:left; }
        .print-header { display: none; }
        @media print {
          @page { size: A4 portrait; margin: 15mm; }
          body * { visibility: hidden; }
          .exp-month-detail, .exp-month-detail * { visibility: visible; }
          .exp-month-detail { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
          .print-header { display: block; margin-bottom: 20px; }
          .print-header h2 { text-align: center; margin: 0 0 20px 0; font-size: 24px; border-bottom: 2px solid #000; padding-bottom: 10px; }
          .print-header .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 14px; margin-bottom: 15px; }
          .print-header .info-item { display: flex; }
          .print-header .info-label { width: 120px; font-weight: bold; }
          .exp-month-detail .table-wrap { border: none; }
          .exp-month-detail table { border: 1px solid #000; }
          .exp-month-detail th, .exp-month-detail td { border: 1px solid #000; padding: 6px 8px; font-size: 11px; }
          .exp-month-detail th { background: #eee !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .exp-month-detail .head .title { display: none; }
        }
      </style>
      <div class="print-header" id="printHeader"></div>
      <div class="head">
        <h3 class="title">交通費申請詳細</h3>
        <div style="display:flex;gap:8px;align-items:center;" class="no-print">
          <button id="downloadPdf" class="btn" type="button" style="display:flex; align-items:center; gap:6px; background:#fff; color:#dc2626; border-color:#dc2626; font-weight:bold;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            PDF出力
          </button>
          <button id="backToExpenseList" class="btn" type="button">一覧へ戻る</button>
        </div>
      </div>
      <div id="detailMeta" class="meta"></div>
      <div id="detailTableHost"></div>
    </div>
  `;

  const meta = $('#detailMeta');
  const tableHost = $('#detailTableHost');
  const backBtn = $('#backToExpenseList');
  const approveBtn = $('#approveThisMonth');

  const goBack = () => {
    const params = new URLSearchParams(window.location.search);
    const isStandalone = params.get('standalone');
    const tabParam = params.get('tab');
    let url = '/admin/expenses';

    // Always append parameters if they exist, even when not standalone
    const urlParams = [];
    if (isStandalone) urlParams.push(`standalone=${encodeURIComponent(isStandalone)}`);
    if (tabParam) urlParams.push(`tab=${encodeURIComponent(tabParam)}`);
    else urlParams.push(`tab=monthly_approval`); // fallback tab

    if (urlParams.length > 0) {
      url += '?' + urlParams.join('&');
    }
    window.location.href = url;
  };

  backBtn?.addEventListener('click', goBack);

  approveBtn?.addEventListener('click', async () => {
    const uid = String(userId || '').trim();
    const ym = String(month || '').slice(0, 7);
    if (!uid || !/^\d{4}-\d{2}$/.test(ym)) return;
    const ok = window.confirm(`${ym} を月次承認しますか？`);
    if (!ok) return;
    try {
      approveBtn.disabled = true;
      await fetchJSONAuth('/api/expenses/admin/months/approve', { method: 'POST', body: JSON.stringify({ userId: uid, month: ym }) });
      goBack();
    } catch (e) {
      if (meta) meta.textContent = `月次承認に失敗しました: ${String(e?.message || 'unknown')}`;
    } finally {
      approveBtn.disabled = false;
    }
  });

  try {
    const [usersRes, rowsRes] = await Promise.all([
      fetchJSONAuth('/api/admin/users'),
      fetchJSONAuth(`/api/expenses/admin/list?month=${encodeURIComponent(month)}&userId=${encodeURIComponent(userId)}&page=1&limit=1000&sortBy=date&sortDir=desc`)
    ]);
    const users = Array.isArray(usersRes) ? usersRes : (Array.isArray(usersRes?.rows) ? usersRes.rows : []);
    const rows = Array.isArray(rowsRes) ? rowsRes : (Array.isArray(rowsRes?.rows) ? rowsRes.rows : []);
    const nameMap = new Map(users.map((u) => [String(u.id), (u.username || u.email || String(u.id))]));
    const selectedName = nameMap.get(String(userId)) || String(userId || '全員');
    if (!rows.length) {
      if (meta) meta.textContent = `対象: ${selectedName} / ${month} | 合計: ¥0`;
      if (tableHost) tableHost.innerHTML = '<div class="table-wrap"><table><tbody><tr><td>データがありません</td></tr></tbody></table></div>';
      return;
    }
    let totalAmount = 0;
    const body = rows.map((r) => {
      const d = String(r.date || '').slice(0, 10);
      const route = [r.origin || '', r.destination || ''].filter(Boolean).join(' → ') || '-';
      const transport = String(r.transport_type || '電車');
      const tripType = String(r.trip_type || 'one_way') === 'round_trip' ? '往復' : '片道';
      const usage = String(r.purpose || '');
      const note = String(r.note || '');
      const createdAt = r.created_at ? String(r.created_at).replace('T', ' ').slice(0, 16) : '-';
      const amountVal = Number(r.amount || 0);
      totalAmount += amountVal;
      const amount = amountVal.toLocaleString('ja-JP');
      const status = fmtStatus(r.status);
      return `<tr>
        <td>${d}</td>
        <td>${usage}</td>
        <td>${route}</td>
        <td>${transport}</td>
        <td>${tripType}</td>
        <td>${note}</td>
        <td style="text-align:right;">¥${amount}</td>
        <td>${status}</td>
        <td>${createdAt}</td>
      </tr>`;
    }).join('');
    
    const downloadPdfBtn = $('#downloadPdf');
    if (downloadPdfBtn) {
      downloadPdfBtn.addEventListener('click', () => {
        window.print();
      });
    }

    if (meta) {
      meta.innerHTML = `対象: ${selectedName} / ${month} <span style="margin-left:16px; font-weight:bold; font-size:16px; color:#b91c1c;">合計: ¥${totalAmount.toLocaleString('ja-JP')}</span>`;
    }

    const printHeader = $('#printHeader');
    if (printHeader) {
      const targetUser = users.find(u => String(u.id) === String(userId)) || {};
      const empCode = targetUser.employee_code || targetUser.employeeCode || '';
      const birthDate = targetUser.birth_date || targetUser.birthDate ? String(targetUser.birth_date || targetUser.birthDate).slice(0, 10) : '';
      printHeader.innerHTML = `
        <h2>交通費精算書</h2>
        <div class="info-grid">
          <div class="info-item"><span class="info-label">会社名</span><span>飯塚塗研株式会社</span></div>
          <div class="info-item"><span class="info-label">対象月</span><span>${month}</span></div>
          <div class="info-item"><span class="info-label">社員番号</span><span>${empCode}</span></div>
          <div class="info-item"><span class="info-label">氏名</span><span>${selectedName}</span></div>
          <div class="info-item"><span class="info-label">生年月日</span><span>${birthDate}</span></div>
        </div>
      `;
    }

    if (tableHost) {
      tableHost.innerHTML = `
        <div class="table-wrap">
          <table>
            <thead><tr>
              <th>日付</th>
              <th>用途</th>
              <th>経路</th>
              <th>交通機関</th>
              <th>種別</th>
              <th>備考</th>
              <th style="text-align:right;">金額</th>
              <th>状態</th>
              <th>申請日時</th>
            </tr></thead>
            <tbody>
              ${body}
              <tr style="background:#f8fafc; font-weight:bold; border-top: 2px solid #e2e8f0;">
                <td colspan="6" style="text-align:right; padding-bottom: 20px;">合計</td>
                <td style="text-align:right; color:#0f172a; padding-bottom: 20px;">¥${totalAmount.toLocaleString('ja-JP')}</td>
                <td colspan="2" style="padding-bottom: 20px;"></td>
              </tr>
            </tbody>
          </table>
        </div>
      `;
    }
  } catch (e) {
    if (meta) meta.textContent = `取得失敗: ${String(e?.message || 'unknown')}`;
  }
};

export async function mount() {
  const profile = await requireAdmin();
  if (!profile) return;
  return await render();
}

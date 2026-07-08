import { fetchJSONAuth, fetchResponseAuth } from '../../api/http.api.js';
import { listUsers, getUser } from '../../api/users.api.js';
import { createPayloadController } from './editor.payload.js';
import { createPayrollService } from './editor.service.js';
import { createRealtimeController } from './editor.realtime.js';

let aborter = null;

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const yen = (n) => Math.round(Number(n) || 0);

const fmtNum = (n) => {
  const v = yen(n);
  try { return new Intl.NumberFormat('ja-JP').format(v); } catch { return String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
};
const fmtYen = (n) => `${fmtNum(n)} 円`;

const parseNum = (raw, label, { allowEmpty = false } = {}) => {
  const s0 = raw == null ? '' : String(raw);
  const s = s0.replace(/,/g, '').trim();
  if (!s) return allowEmpty ? null : 0;
  const n = Number(s);
  if (!Number.isFinite(n)) throw new Error(`${label} が正しくありません`);
  return yen(n);
};

const isMoneyKey = (k) => {
  const s = String(k || '');
  return s.includes('円') || s.includes('額') || s.includes('手当') || s.includes('保険') || s.includes('税') || s.includes('控除') || s.includes('合計') || s.includes('給') || s.includes('振込') || s.includes('現金') || s.includes('現物');
};

const hmFromMin = (min) => {
  const m = Math.max(0, yen(min));
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${h}:${String(mm).padStart(2, '0')}`;
};

const formatEmployeeCode = (u) => {
  return String((u && (u.employee_code || u.employeeCode || ('EMP' + String(u.id).padStart(3, '0')))) || '').trim();
};

const isAbortLike = (err) => {
  if (!err) return false;
  if (err.name === 'AbortError') return true;
  const msg = String(err.message || err || '').toLowerCase();
  return msg.includes('aborterror') || msg.includes('signal is aborted') || msg.includes('aborted without reason');
};

function mountStyle() {
  if (document.getElementById('payrollEditorStyle')) return;
  const st = document.createElement('style');
  st.id = 'payrollEditorStyle';
  st.textContent = `
    .pe-wrap{width:100%;max-width:1400px;margin:0 auto !important;padding:20px 24px;font-family:"Noto Sans JP","Noto Sans","Yu Gothic UI","Meiryo UI","Segoe UI",system-ui,-apple-system,"Hiragino Kaku Gothic ProN",sans-serif;font-size:14px;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;text-rendering:optimizeLegibility;letter-spacing:.2px;font-weight:400;font-synthesis:none;color:#0f172a;background:#f8fafc;min-height:100vh;overflow-y:auto !important;overflow-x:hidden;}
    .pe-wrap *{box-sizing:border-box;font-family:inherit;font-weight:400}
    .pe-card{background:transparent;border:none;border-radius:0;padding:16px 0;margin-bottom:24px;box-shadow:none;min-width:0;border-bottom:1px solid #e2e8f0}
    .pe-title{font-size:16px;line-height:1.4;font-weight:600;color:#0f172a;margin:0 0 16px 0;border-bottom:2px solid #cbd5e1;padding-bottom:8px;display:flex;align-items:center;gap:8px}
    .pe-sub-title{font-size:14px;font-weight:600;color:#475569;margin:20px 0 10px;display:flex;align-items:center;gap:6px}
    .pe-sub-title::before{content:'';display:block;width:4px;height:14px;background:#3b82f6;border-radius:2px}
    .pe-muted{color:#64748b;font-weight:400}

    .pe-nav{display:flex;gap:8px;flex-wrap:wrap;margin:6px 0 24px 0}
    .pe-nav a{display:inline-flex;align-items:center;gap:6px;padding:8px 12px;border:1px solid #e2e8f0;border-radius:6px;background:#fff;color:#0f172a;font-weight:500;text-decoration:none;transition:all .2s;font-size:14px}
    .pe-nav a:hover{border-color:#cbd5e1;background:#f8fafc}
    .pe-nav a.active{background:#0f172a;border-color:#0f172a;color:#fff}

    .pe-money{position:relative;width:100%;display:flex;align-items:center;gap:6px}
    .pe-money input{padding-right:8px;text-align:right;flex:1}
    .pe-money span{position:static;transform:none;font-weight:400;color:#64748b;font-size:12px;background:transparent;padding:0;margin:0;line-height:1}

    .pe-tabs{display:flex;align-items:center;gap:24px;border-bottom:1px solid #cbd5e1;margin-top:16px;margin-bottom:20px;padding:0 8px;}
    .pe-tab-btn{background:none;border:none;padding:12px 4px;font-size:15px;font-weight:600;color:#64748b;cursor:pointer;position:relative;transition:all 0.2s;}
    .pe-tab-btn:hover{color:#0f172a;}
    .pe-tab-btn.active{color:#2563eb;}
    .pe-tab-btn.active::after{content:'';position:absolute;bottom:-1px;left:0;right:0;height:3px;background-color:#2563eb;border-radius:3px 3px 0 0;}
    .pe-history-view{display:none;}
    .pe-editor-view{display:block;}
    .pe-kpi{display:grid;grid-template-columns:1fr;gap:12px;width:100%}
    @media (min-width: 980px) {
      .pe-kpi{grid-template-columns:repeat(4, 1fr);gap:16px;width:100%}
    }
    .pe-kpi > div{display:flex;flex-direction:column;align-items:flex-start;justify-content:center;gap:4px;padding:12px 16px;border:1px solid #e2e8f0;border-radius:6px;background:#f8fafc}
    .pe-kpi .v{font-size:16px;font-weight:600;color:#0f172a;line-height:1.2;white-space:nowrap;text-align:left;align-self:flex-start}
    .pe-kpi-net{background:#d1fae5 !important;border:1px solid #10b981 !important;}
    .pe-kpi .v-net{color:#047857;font-size:24px;font-weight:700}
    .pe-kpi .k{font-size:12px;font-weight:500;color:#475569;line-height:1.4}

    .pe-grid{display:grid;grid-template-columns:1fr;gap:12px;margin-top:0;align-items:start}
    @media (min-width: 980px) {
      .pe-grid{grid-template-columns:repeat(4, 1fr);gap:24px}
    }
    .pe-grid > *{min-width:0;margin-bottom:0}

    .pe-row{display:grid;grid-template-columns:1fr;gap:6px;align-items:end}
    .pe-field{display:flex;flex-direction:column;gap:2px;min-width:0}
    .pe-field>span{font-size:11px;font-weight:500;color:#475569;line-height:1.1}
    .pe-field input,.pe-field select{height:30px;padding:2px 6px;border:1px solid #cbd5e1;border-radius:4px;background:#fff;font-size:13px;line-height:1.5;color:#0f172a;transition:border-color .2s,box-shadow .2s;width:100%}
    .pe-field input:focus,.pe-field select:focus{border-color:#1e40af;outline:none;box-shadow:0 0 0 3px rgba(30,64,175,.15)}
    .pe-field input:hover,.pe-field select:hover{border-color:#94a3b8}
    .pe-field input:disabled,.pe-field select:disabled{background:#f8fafc;color:#94a3b8;cursor:not-allowed;border-color:#e2e8f0}
    .pe-field input::placeholder{color:#94a3b8}

    .pe-lowergrid{display:grid;grid-template-columns:1fr;gap:24px}
    @media (min-width: 980px){.pe-lowergrid{grid-template-columns:1fr 1fr}}

    .pe-paygrid{display:grid;grid-template-columns:1fr;gap:16px 24px;align-items:end}
    @media (min-width: 980px) {
      .pe-paygrid{grid-template-columns:repeat(2, 1fr)}
    }

    .pe-items{display:flex;flex-direction:column;gap:4px;margin:0;padding:0}
    .pe-item{display:grid;grid-template-columns:1fr 110px 24px;gap:6px;align-items:center;padding:4px 0;border-bottom:1px dashed #e2e8f0;transition:background-color .2s}
    .pe-item:hover{background:#f8fafc}
    .pe-item-short{grid-template-columns:1fr 110px 24px}
    .pe-lbl{display:flex;align-items:center;height:auto;font-size:12px;font-weight:500;color:#334155;min-width:0;letter-spacing:-0.5px;padding-right:4px}
    .pe-item input{height:30px;padding:2px 8px;border:1px solid #cbd5e1;border-radius:4px;background:#fff;font-size:13px;line-height:1.5;color:#0f172a;transition:all .2s;text-align:right;width:100%;flex:1}
    .pe-item .pe-money-item{position:relative;width:100%;display:flex;align-items:center;gap:6px}
    .pe-item .pe-money-item span{position:static;transform:none;font-weight:400;color:#64748b;font-size:12px;background:transparent;padding:0;margin:0;line-height:1}
    .pe-item input:focus{border-color:#1e40af;outline:none;box-shadow:0 0 0 3px rgba(30,64,175,.15)}
    .pe-item input:hover{border-color:#94a3b8}
    .pe-item span{justify-self:start;text-align:left;color:#64748b;font-weight:400;font-size:12px}
    .pe-item input:disabled{background:#f8fafc;color:#94a3b8;border-color:#e2e8f0;cursor:not-allowed}
    .pe-item button{width:24px;height:24px;padding:0;display:flex;align-items:center;justify-content:center;border:none;border-radius:4px;background:transparent;color:#94a3b8;cursor:pointer;transition:all .2s}
    .pe-item button:hover{background:#fee2e2;color:#ef4444}
    
    .pe-btn-add{display:inline-flex;align-items:center;gap:4px;height:28px;padding:0 8px;border:1px dashed #cbd5e1;border-radius:4px;background:#fff;color:#3b82f6;font-size:12px;font-weight:500;cursor:pointer;transition:all .2s;width:100%;justify-content:center;margin-top:4px}
    .pe-btn-add:hover{border-color:#3b82f6;background:#eff6ff}

    .pe-actions{display:flex;gap:0;flex-wrap:wrap;margin:0;padding:0;justify-content:flex-start;align-items:stretch;position:relative;z-index:10;background:transparent;border:none;border-bottom:2px solid #cbd5e1;border-radius:0;margin-bottom:24px;box-shadow:none;}
    .pe-actions button{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:40px;padding:0 16px;border:none;border-right:1px solid #cbd5e1;border-radius:0;background:transparent;cursor:pointer;color:#475569;font-weight:600;font-size:13px;transition:all .2s}
    .pe-actions button:last-child{border-right:none}
    .pe-actions button:hover{background:#f1f5f9;color:#0f172a}
    .pe-actions button.pe-primary{color:#fff;background:#3b82f6;border-color:#3b82f6}
    .pe-actions button.pe-primary:hover{background:#2563eb;color:#fff}
    #btnSavePayroll{color:#059669;border-color:#059669;background:#fff}
    #btnSavePayroll:hover{background:#ecfdf5;color:#047857;border-color:#047857}
    #btnPublishPayroll{color:#fff;background:#7c3aed;border-color:#7c3aed;font-weight:700}
    #btnPublishPayroll:hover{background:#6d28d9;color:#fff;border-color:#6d28d9}
    .pe-actions button:disabled{cursor:not-allowed;opacity:0.5}

    .pe-preview{margin-top:12px}
    .pe-previewCard{background:#fff;border:1px solid #cbd5e1;border-radius:0;padding:12px;margin-top:12px}
    .pe-previewGrid{display:grid;grid-template-columns:1fr;gap:10px}
    @media (min-width: 980px){.pe-previewGrid{grid-template-columns:1fr 1fr}}
    .pe-table{width:100%;border-collapse:separate;border-spacing:0}
    .pe-table td{padding:8px 10px;border-top:1px solid #f1f5f9;vertical-align:top;font-size:15px;line-height:1.5;font-weight:400}
    .pe-table tr:first-child td{border-top:none}
    .pe-table td:first-child{color:#1f2937;font-weight:400;width:62%}
    .pe-table td:last-child{text-align:right;font-weight:400;color:#0b1220}
    .pe-preview-table{width:100%;border-collapse:collapse}
    .pe-preview-table td{padding:4px 6px;border-bottom:1px solid #f1f5f9;vertical-align:middle;font-size:13px;line-height:1.3}
    .pe-preview-table tr:last-child td{border-bottom:none}
    .pe-preview-table td:first-child{color:#475569;width:55%}
    .pe-preview-table td:last-child{text-align:right;color:#0f172a;font-weight:500}
    .pe-msg{margin-top:10px;font-weight:400}

    /* Dark mode for payroll editor */
    :root[data-theme='dark'] .pe-wrap{background:#0f172a !important;color:#e0d4fc !important}
    :root[data-theme='dark'] .pe-card{background:transparent !important;border:none !important;border-bottom:1px solid #334155 !important;color:#e0d4fc !important}
    :root[data-theme='dark'] .pe-title{color:#e0d4fc !important;border-bottom-color:#475569 !important}
    :root[data-theme='dark'] .pe-sub-title{color:#94a3b8 !important}
    :root[data-theme='dark'] .pe-field>span,:root[data-theme='dark'] .pe-lbl{color:#94a3b8 !important}
    :root[data-theme='dark'] .pe-field input,:root[data-theme='dark'] .pe-field select,:root[data-theme='dark'] .pe-item input,:root[data-theme='dark'] .pe-money input,:root[data-theme='dark'] .pe-paygrid input,:root[data-theme='dark'] .pe-paygrid select{background:#0f172a !important;border-color:#475569 !important;color:#e0d4fc !important}
    :root[data-theme='dark'] .pe-field input:disabled,:root[data-theme='dark'] .pe-field select:disabled{background:#111827 !important;color:#64748b !important}
    :root[data-theme='dark'] .pe-field input::placeholder,:root[data-theme='dark'] .pe-item input::placeholder{color:#64748b !important}
    :root[data-theme='dark'] .pe-money span,:root[data-theme='dark'] .pe-item .pe-money-item span{color:#94a3b8 !important}
    :root[data-theme='dark'] .pe-actions{background:transparent !important;border:none !important;border-bottom:2px solid #475569 !important;box-shadow:none !important;padding:0 !important}
    :root[data-theme='dark'] .pe-actions button{background:transparent !important;border:none !important;border-right:1px solid #475569 !important;color:#e0d4fc !important;border-radius:0 !important}
    :root[data-theme='dark'] .pe-actions button:last-child{border-right:none !important}
    :root[data-theme='dark'] .pe-actions button:hover{background:#313244 !important;color:#ffffff !important}
    :root[data-theme='dark'] .pe-actions button.pe-primary{background:#3b82f6 !important;border-color:#3b82f6 !important;color:#fff !important}
    :root[data-theme='dark'] #btnSavePayroll{background:#0f172a !important;color:#10b981 !important;border-color:#10b981 !important}
    :root[data-theme='dark'] #btnPublishPayroll{background:#7c3aed !important;border-color:#7c3aed !important;color:#fff !important}
    :root[data-theme='dark'] .pe-btn-add{background:#0f172a !important;border-color:#475569 !important;color:#93c5fd !important}
    :root[data-theme='dark'] .pe-previewCard{background:#1e293b !important;border-color:#334155 !important}
    :root[data-theme='dark'] .pe-table td{border-color:#334155 !important;color:#e0d4fc !important}
    :root[data-theme='dark'] .pe-table td:first-child{color:#94a3b8 !important}
    :root[data-theme='dark'] .pe-preview-table td{border-color:#334155 !important;color:#e0d4fc !important}
    :root[data-theme='dark'] .pe-preview-table td:first-child{color:#94a3b8 !important}
    :root[data-theme='dark'] .pe-tab-btn{color:#94a3b8 !important;border-bottom-color:transparent !important}
    :root[data-theme='dark'] .pe-tab-btn.active{color:#e0d4fc !important;border-bottom-color:#3b82f6 !important}
    :root[data-theme='dark'] .pe-item button:hover{background:#3b1111 !important;color:#fca5a5 !important}
  `;
  document.head.appendChild(st);
}

const tabHref = (tab) => {
  const p = String(window.location.pathname || '');
  const base = p.startsWith('/admin/payroll') ? p : '/ui/admin';
  return `${base}?tab=${encodeURIComponent(String(tab || ''))}`;
};
// hàm này để mo
export async function mount(options = {}) {
  if (aborter) aborter.abort();
  aborter = new AbortController();
  const { signal } = aborter;

  try { window.scrollTo(0, 0); } catch (e) { /* silently ignored */ }

  mountStyle();

  const content = options.content || document.querySelector('#adminContent');
  if (!content) return;
  content.innerHTML = '';
  
  // Xóa mọi CSS rác từ #adminContent
  content.style.cssText = 'width: 100%; margin: 0; padding: 0; background: transparent; border: none; box-shadow: none; max-width: none; float: none; text-align: left; overflow-y: auto !important; height: 100%;';

  // Thẻ div to nhất bọc toàn bộ nội dung (nằm dưới menu chính) - Yêu cầu của User
  const wrap = document.createElement('div');
  wrap.className = 'max-w-[1400px] mx-auto px-6 w-full';
  // Đảm bảo CSS inline luôn thắng mọi CSS legacy
  wrap.style.cssText = 'max-width: 1400px; margin-left: auto !important; margin-right: auto !important; padding-left: 24px; padding-right: 24px; width: 100%; box-sizing: border-box; display: block; clear: both; min-height: min-content; padding-bottom: 60px;';
  content.appendChild(wrap);

  // Toolbar (Phần trên cùng)
  const actionTopBar = document.createElement('div');
  actionTopBar.className = 'pe-actions w-full';
  actionTopBar.style.cssText = 'width: 100%; margin: 0 0 24px 0; padding: 12px 16px; box-sizing: border-box;';
  actionTopBar.innerHTML = `
    <button type="button" id="btnLoadPayroll" title="読み込み">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
      読込
    </button>
    <button type="button" id="btnSavePayroll" title="保存">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
      保存
    </button>
    <button type="button" id="btnPreviewPayroll" title="プレビュー">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
      プレビュー
    </button>
    <button type="button" id="btnCreatePdf" title="PDF作成">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
      PDF作成
    </button>
    <button type="button" id="btnDownloadPdf" title="PDFダウンロード">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 14 12 19 7 14"></polyline><line x1="12" y1="19" x2="12" y2="3"></line></svg>
      ダウンロード
    </button>
    <div id="payrollMsg" class="pe-msg" style="margin-left: 8px; font-size: 13px; font-weight: 500; margin-top: 0;"></div>
    
    <div style="margin-left: auto; display: flex; align-items: center; gap: 12px;">
      <span id="payrollStatusBadge" style="display:none; padding:4px 10px; border-radius:12px; font-size:12px; font-weight:700;"></span>
      <button type="button" id="btnPublishPayroll" title="社員へ送信（公開）">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
        給与明細を送信
      </button>
    </div>
  `;
  wrap.appendChild(actionTopBar);

  const tabContainer = document.createElement('div');
  tabContainer.className = 'w-full';
  tabContainer.style.cssText = 'width: 100%; box-sizing: border-box;';
  tabContainer.innerHTML = `
    <div class="pe-tabs w-full" style="width: 100%; margin-top:0; border-bottom: 1px solid #cbd5e1; margin-bottom: 24px; padding-bottom: 8px;">
      <button type="button" class="pe-tab-btn active" data-tab="editor">給与明細作成・編集</button>
      <button type="button" class="pe-tab-btn" data-tab="history">送信履歴</button>
    </div>
  `;
  wrap.appendChild(tabContainer);

  const editorViewDiv = document.createElement('div');
  editorViewDiv.id = 'peEditorView';
  editorViewDiv.className = 'pe-editor-view';
  wrap.appendChild(editorViewDiv);

  const summaryCard = document.createElement('div');
  summaryCard.className = 'pe-card';
  summaryCard.innerHTML = `
    <div class="pe-title" style="margin-top:0;">総計（リアルタイム）</div>
    <div class="pe-kpi">
      <div class="pe-kpi-net"><div class="k" style="color:#065f46">差引支払額（手取り）</div><div class="v v-net" id="kpiNet">-</div></div>
      <div><div class="k">支払内訳合計（総支給額）</div><div class="v" id="kpiGross">-</div></div>
      <div><div class="k">控除合計（総控除額）</div><div class="v" id="kpiDeduct">-</div></div>
      <div><div class="k">支払方法合計（振込+現金+現物）</div><div class="v" id="kpiPaySum">-</div></div>
    </div>
    <div id="kpiHint" style="margin-top:12px;color:#64748b;font-weight:500;font-size:13px;display:flex;align-items:center;gap:6px"></div>
  `;
  editorViewDiv.appendChild(summaryCard);

  const basicCard = document.createElement('div');
  basicCard.className = 'pe-card';
  basicCard.innerHTML = `
      <div class="pe-sub-title" style="margin-top:0">対象者・期間</div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
        <label class="pe-field">
          <span>社員選択</span>
          <select id="payrollUserId"><option value="">選択してください</option></select>
        </label>
        <label class="pe-field">
          <span>対象年月</span>
          <input id="payrollMonth" type="month">
        </label>
        <label class="pe-field">
          <span>基本給（月給）</span>
          <div class="pe-money"><input id="payrollBaseMonthly" type="text" inputmode="numeric" placeholder="0"><span>円</span></div>
        </label>
        <label class="pe-field">
          <span>自動計算（保険・税）</span>
          <select id="payrollAutoCalc">
            <option value="0">しない</option>
            <option value="1">する</option>
          </select>
        </label>
      </div>

      <div class="pe-sub-title" style="cursor:pointer;user-select:none;margin-top:20px" id="toggleAttendance">
        勤怠情報
        <svg id="iconToggleAttendance" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-left:auto;transition:transform 0.2s;transform:rotate(-90deg)"><polyline points="6 9 12 15 18 9"></polyline></svg>
      </div>
      <div id="payrollAttendanceSection" style="display:none; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
        <label class="pe-field">
          <span>出勤日数</span>
          <input id="payrollKWork" type="number" step="1" placeholder="自動">
        </label>
        <label class="pe-field">
          <span>休日出勤日数</span>
          <input id="payrollKHoliday" type="number" step="1" placeholder="自動">
        </label>
        <label class="pe-field">
          <span>半日出勤日数</span>
          <input id="payrollKHalf" type="number" step="1" placeholder="自動">
        </label>
        <label class="pe-field">
          <span>欠勤日数</span>
          <input id="payrollKAbsent" type="number" step="1" placeholder="自動">
        </label>
        <label class="pe-field">
          <span>無給休暇</span>
          <input id="payrollKUnpaid" type="number" step="1" placeholder="自動">
        </label>
        <label class="pe-field">
          <span>有給休暇</span>
          <input id="payrollKPaid" type="number" step="1" placeholder="自動">
        </label>
        <label class="pe-field">
          <span>就業時間</span>
          <input id="payrollKWorkHours" type="text" placeholder="自動">
        </label>
        <label class="pe-field">
          <span>法外時間外</span>
          <input id="payrollKLegalHours" type="text" placeholder="自動">
        </label>
        <label class="pe-field">
          <span>週40超時間</span>
          <input id="payrollKOverHours" type="text" placeholder="自動">
        </label>
        <label class="pe-field">
          <span>月60超時間</span>
          <input id="payrollKOver60Hours" type="text" placeholder="自動">
        </label>
        <label class="pe-field">
          <span>深夜勤務時間</span>
          <input id="payrollKNightHours" type="text" placeholder="自動">
        </label>
      </div>
  `;

  const dedCard = document.createElement('div');
  dedCard.className = 'pe-card';
  dedCard.innerHTML = `
    <div class="pe-title">控除</div>
    <div class="pe-sub-title" style="margin-top:0;">社会保険</div>
    <div class="pe-items">
      <div class="pe-item"><div class="pe-lbl">健康保険料</div><div class="pe-money-item"><input class="pe-amt" id="ovDedHealth" type="number" step="1" placeholder="0" aria-label="健康保険料"><span>円</span></div></div>
      <div class="pe-item"><div class="pe-lbl">介護保険料</div><div class="pe-money-item"><input class="pe-amt" id="ovDedCare" type="number" step="1" placeholder="0" aria-label="介護保険料"><span>円</span></div></div>
      <div class="pe-item"><div class="pe-lbl">厚生年金保険</div><div class="pe-money-item"><input class="pe-amt" id="ovDedPension" type="number" step="1" placeholder="0" aria-label="厚生年金保険"><span>円</span></div></div>
      <div class="pe-item"><div class="pe-lbl">雇用保険料</div><div class="pe-money-item"><input class="pe-amt" id="ovDedEmployment" type="number" step="1" placeholder="0" aria-label="雇用保険料"><span>円</span></div></div>
    </div>
    <div class="pe-sub-title">税金</div>
    <div class="pe-items">
      <div class="pe-item"><div class="pe-lbl">所得税</div><div class="pe-money-item"><input class="pe-amt" id="ovDedIncome" type="number" step="1" placeholder="0" aria-label="所得税"><span>円</span></div></div>
      <div class="pe-item"><div class="pe-lbl">住民税</div><div class="pe-money-item"><input class="pe-amt" id="ovDedResident" type="number" step="1" placeholder="0" aria-label="住民税"><span>円</span></div></div>
    </div>
    <div class="pe-sub-title">その他</div>
    <div class="pe-items">
      <div class="pe-item"><div class="pe-lbl">立替家賃（控除）</div><div class="pe-money-item"><input class="pe-amt" id="payrollRent" type="text" inputmode="numeric" placeholder="0" aria-label="立替家賃（控除）"><span>円</span></div></div>
    </div>
    <div class="pe-sub-title">追加控除</div>
    <div id="payrollDeductions" class="pe-items"></div>
    <button type="button" class="pe-btn-add" id="btnAddDed">+ 控除項目を追加</button>
  `;

  const earnCard = document.createElement('div');
  earnCard.className = 'pe-card';
  earnCard.innerHTML = `
    <div class="pe-title">支給</div>
    <div class="pe-sub-title" style="margin-top:0;">基本手当</div>
    <div class="pe-items">
      <div class="pe-item"><div class="pe-lbl">非課税通勤費</div><div class="pe-money-item"><input class="pe-amt" id="ovEarnTransit" type="number" step="1" placeholder="0"><span>円</span></div></div>
      <div class="pe-item"><div class="pe-lbl">資格手当</div><div class="pe-money-item"><input class="pe-amt" id="ovEarnCert" type="number" step="1" placeholder="0"><span>円</span></div></div>
      <div class="pe-item"><div class="pe-lbl">交通手当</div><div class="pe-money-item"><input class="pe-amt" id="payrollTransport" type="number" step="1" placeholder="0"><span>円</span></div></div>
    </div>
    <div class="pe-sub-title">時間外・割増手当</div>
    <div class="pe-items">
      <div class="pe-item"><div class="pe-lbl">時間外手当</div><div class="pe-money-item"><input class="pe-amt" id="ovEarnOT" type="number" step="1" placeholder="0"><span>円</span></div></div>
      <div class="pe-item"><div class="pe-lbl">固定残業手当</div><div class="pe-money-item"><input class="pe-amt" id="ovEarnFixedOT" type="number" step="1" placeholder="0"><span>円</span></div></div>
      <div class="pe-item"><div class="pe-lbl">深夜勤手当</div><div class="pe-money-item"><input class="pe-amt" id="ovEarnNight" type="number" step="1" placeholder="0"><span>円</span></div></div>
      <div class="pe-item"><div class="pe-lbl">所休出手当</div><div class="pe-money-item"><input class="pe-amt" id="ovEarnHoliday" type="number" step="1" placeholder="0"><span>円</span></div></div>
    </div>
    <div class="pe-sub-title">その他手当・控除</div>
    <div class="pe-items">
      <div class="pe-item"><div class="pe-lbl">欠勤控除</div><div class="pe-money-item"><input class="pe-amt" id="ovEarnAbsent" type="number" step="1" placeholder="0"><span>円</span></div></div>
      <div class="pe-item"><div class="pe-lbl">催事協力手当</div><div class="pe-money-item"><input class="pe-amt" id="ovEarnEvent" type="number" step="1" placeholder="0"><span>円</span></div></div>
      <div class="pe-item"><div class="pe-lbl">通信手当</div><div class="pe-money-item"><input class="pe-amt" id="ovEarnComms" type="number" step="1" placeholder="0"><span>円</span></div></div>
      <div class="pe-item"><div class="pe-lbl">誕生日月手当</div><div class="pe-money-item"><input class="pe-amt" id="ovEarnBirthday" type="number" step="1" placeholder="0"><span>円</span></div></div>
    </div>
    <div class="pe-sub-title">追加支給</div>
    <div id="payrollEarnings" class="pe-items"></div>
    <button type="button" class="pe-btn-add" id="btnAddEarn">+ 支給項目を追加</button>
  `;

  const otherCard = document.createElement('div');
  otherCard.style.marginTop = '24px';
  otherCard.style.borderTop = '1px dashed #cbd5e1';
  otherCard.style.paddingTop = '20px';
  otherCard.innerHTML = `
    <div class="pe-title" style="border-bottom:none; margin-bottom:8px">その他</div>
    <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;font-weight:500;color:#0f172a;margin-bottom:12px">
      <input type="checkbox" id="chkShowYearEnd" style="width:16px;height:16px;accent-color:#3b82f6;cursor:pointer;">
      年末調整・差額を入力する（12月または発生時のみ）
    </label>
    <div id="payrollYearEndSection" style="display:none;">
      <div class="pe-items">
        <div class="pe-item pe-item-short"><div class="pe-lbl">差額計算</div><div class="pe-money-item"><input class="pe-amt" id="payrollOtherDiff" type="number" step="1" placeholder="0"><span>円</span></div></div>
        <div class="pe-item pe-item-short"><div class="pe-lbl">追加診療費</div><div class="pe-money-item"><input class="pe-amt" id="payrollOtherMedical" type="number" step="1" placeholder="0"><span>円</span></div></div>
        <div class="pe-item pe-item-short"><div class="pe-lbl">年末調整徴収</div><div class="pe-money-item"><input class="pe-amt" id="payrollOtherYec" type="number" step="1" placeholder="0"><span>円</span></div></div>
        <div class="pe-item pe-item-short"><div class="pe-lbl">年末調整還付</div><div class="pe-money-item"><input class="pe-amt" id="payrollOtherYer" type="number" step="1" placeholder="0"><span>円</span></div></div>
      </div>
    </div>
  `;

  const payCard = document.createElement('div');
  payCard.style.marginTop = '24px';
  payCard.style.borderTop = '1px dashed #cbd5e1';
  payCard.style.paddingTop = '20px';
  payCard.innerHTML = `
    <div class="pe-title" style="border-bottom:none; margin-bottom:8px">支払方法（振込・現金・現物）</div>
    <div class="pe-paygrid">
      <div class="pe-field"><span>差引支払額（自動/手取り）</span><div class="pe-money"><input id="payrollNetPay" type="text" readonly><span>円</span></div></div>
      <div class="pe-field"><span>支払方法合計（振込+現金+現物）</span><div class="pe-money"><input id="payrollPaySum" type="text" readonly><span>円</span></div></div>
      <div class="pe-field"><span>銀行名</span>
        <input id="payrollBankName" type="text" list="bankList" placeholder="例: みずほ銀行">
        <datalist id="bankList">
          <option value="みずほ銀行">
          <option value="三菱UFJ銀行">
          <option value="三井住友銀行">
          <option value="ゆうちょ銀行">
          <option value="りそな銀行">
          <option value="埼玉りそな銀行">
          <option value="PayPay銀行">
          <option value="楽天銀行">
          <option value="住信SBIネット銀行">
        </datalist>
      </div>
      <div class="pe-field"><span>支店名</span><input id="payrollBranchName" type="text" placeholder="例: 渋谷支店"></div>
      
      <div class="pe-field"><span>種別</span><select id="payrollAccountType"><option value="">選択</option><option value="普通">普通</option><option value="当座">当座</option></select></div>
      <div class="pe-field"><span>口座番号（7桁）</span><input id="payrollAccountNumber" type="text" inputmode="numeric" placeholder="1234567"></div>
      <div class="pe-field"><span>名義（カナ）</span><input id="payrollAccountHolder" type="text" placeholder="例: ヤマダタロウ"></div>
      <div class="pe-field"><span>振込支給額（任意）</span><div class="pe-money"><input id="payrollPayBank" type="text" inputmode="numeric" placeholder="0（空欄=自動）"><span>円</span></div></div>
      
      <div class="pe-field"><span>現金支給額</span><div class="pe-money"><input id="payrollPayCash" type="text" inputmode="numeric" placeholder="0"><span>円</span></div></div>
      <div class="pe-field"><span>現物支給額</span><div class="pe-money"><input id="payrollPayKind" type="text" inputmode="numeric" placeholder="0"><span>円</span></div></div>
    </div>
  `;

  const historyViewDiv = document.createElement('div');
  historyViewDiv.id = 'peHistoryView';
  historyViewDiv.className = 'pe-history-view w-full';
  historyViewDiv.style.cssText = 'display: none; width: 100%; box-sizing: border-box;';
  historyViewDiv.innerHTML = `
    <div class="pe-card w-full" style="margin-top: 0; width: 100%; box-sizing: border-box;">
      <div class="pe-title" style="margin-top:0">送信履歴</div>
      
      <div style="display: flex; gap: 16px; margin-bottom: 16px; align-items: flex-end; flex-wrap: wrap;">
        <label class="pe-field" style="width: 200px;">
          <span>対象年月</span>
          <input type="month" id="historyFilterMonth">
        </label>
        <label class="pe-field" style="width: 250px;">
          <span>社員選択</span>
          <select id="historyFilterUserId">
            <option value="">すべて</option>
          </select>
        </label>
        <button type="button" id="btnFilterHistory" style="padding: 0 16px; height: 30px; border: 1px solid #cbd5e1; border-radius: 4px; background: #fff; cursor: pointer; font-size: 13px; font-weight: 500; color: #0f172a; display: flex; align-items: center; gap: 6px;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
          絞り込み
        </button>
      </div>

      <div style="width: 100%; overflow-x: auto;">
        <table class="pe-table w-full" style="width: 100%; box-sizing: border-box; table-layout: fixed;">
          <thead>
            <tr>
              <th style="width:180px">送信日時</th>
              <th style="width:100px">年月</th>
              <th style="width:200px">対象者</th>
              <th style="width:80px">結果</th>
              <th>エラー詳細（ファイル名）</th>
            </tr>
          </thead>
          <tbody id="payrollHistoryBody">
            <tr><td colspan="5" style="text-align:center;padding:24px 16px;color:#64748b">送信履歴がありません</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;
  wrap.appendChild(historyViewDiv);

  // Layout 4 cột theo yêu cầu
  const col3 = document.createElement('div');
  col3.style.cssText = 'display: flex; flex-direction: column; gap: 12px;';
  col3.appendChild(dedCard);
  col3.appendChild(otherCard);

  const editorViewContent = document.createElement('div');
  editorViewContent.className = 'pe-grid';
  editorViewContent.appendChild(basicCard); // Cột 1: Đối tượng + Chấm công
  editorViewContent.appendChild(earnCard);  // Cột 2: Phát sinh (Dài nên để riêng)
  editorViewContent.appendChild(col3);      // Cột 3: Khấu trừ + Cấu toán cuối năm
  editorViewContent.appendChild(payCard);   // Cột 4: Phương thức thanh toán (Ngân hàng, Tiền mặt)

  editorViewDiv.appendChild(editorViewContent);



  const toggleAttendance = basicCard.querySelector('#toggleAttendance');
  const payrollAttendanceSection = basicCard.querySelector('#payrollAttendanceSection');
  const iconToggleAttendance = basicCard.querySelector('#iconToggleAttendance');
  if (toggleAttendance && payrollAttendanceSection) {
    toggleAttendance.addEventListener('click', () => {
      const isHidden = payrollAttendanceSection.style.display === 'none';
      payrollAttendanceSection.style.display = isHidden ? 'grid' : 'none';
      if (iconToggleAttendance) {
        iconToggleAttendance.style.transform = isHidden ? 'rotate(0deg)' : 'rotate(-90deg)';
      }
    });
  }

  const chkShowYearEnd = otherCard.querySelector('#chkShowYearEnd');
  const payrollYearEndSection = otherCard.querySelector('#payrollYearEndSection');
  if (chkShowYearEnd && payrollYearEndSection) {
    chkShowYearEnd.addEventListener('change', (e) => {
      payrollYearEndSection.style.display = e.target.checked ? 'block' : 'none';
    });
  }

  const previewModalOverlay = document.createElement('div');
  previewModalOverlay.id = 'payrollPreviewModalOverlay';
  previewModalOverlay.className = 'modal-overlay';
  previewModalOverlay.style.display = 'none';
  previewModalOverlay.style.position = 'fixed';
  previewModalOverlay.style.top = '0';
  previewModalOverlay.style.left = '0';
  previewModalOverlay.style.width = '100vw';
  previewModalOverlay.style.height = '100vh';
  previewModalOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
  previewModalOverlay.style.zIndex = '999999';
  previewModalOverlay.style.padding = '40px 20px';
  previewModalOverlay.style.boxSizing = 'border-box';
  previewModalOverlay.style.overflowY = 'auto';
  previewModalOverlay.style.alignItems = 'flex-start';
  previewModalOverlay.style.justifyContent = 'center';

  const previewCard = document.createElement('div');
  previewCard.className = 'pe-card';
  previewCard.style.width = '95%';
  previewCard.style.maxWidth = '1200px';
  previewCard.style.position = 'relative';
  previewCard.style.padding = '16px 24px';
  previewCard.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)';
  previewCard.style.display = 'block'; // Always block since overlay controls visibility

  previewModalOverlay.appendChild(previewCard);
  document.body.appendChild(previewModalOverlay);

  previewModalOverlay.addEventListener('click', (e) => {
    if (e.target === previewModalOverlay) {
      const btnPreview = document.getElementById('btnPreviewPayroll');
      if (btnPreview) {
        btnPreview.click();
      } else {
        previewModalOverlay.style.display = 'none';
      }
    }
  });

  const btnPreview = actionTopBar.querySelector('#btnPreviewPayroll');
  const setPreviewOpen = (open) => {
    if (!btnPreview) return;
    previewModalOverlay.style.display = open ? 'flex' : 'none';
    if (!open) {
      btnPreview.title = 'プレビュー';
      btnPreview.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>';
    } else {
      btnPreview.title = 'プレビュー（閉じる）';
      btnPreview.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
    }
  };

    // Tab logic
    const tabBtns = wrap.querySelectorAll('.pe-tab-btn');
    const editorView = wrap.querySelector('#peEditorView');
    const historyView = wrap.querySelector('#peHistoryView');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', async () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const t = btn.dataset.tab;
        if (t === 'editor') {
          editorView.style.display = 'block';
          historyView.style.display = 'none';
        } else {
          editorView.style.display = 'none';
          historyView.style.display = 'block';
          // Tải lịch sử dựa theo bộ lọc khi mở tab
          await refreshDeliveries();
        }
      });
    });

  const msgEl = actionTopBar.querySelector('#payrollMsg');
  const btnCreatePdf = actionTopBar.querySelector('#btnCreatePdf');
  const btnDownloadPdf = actionTopBar.querySelector('#btnDownloadPdf');
  if (btnDownloadPdf) btnDownloadPdf.disabled = true;

  let msgTimeout = null;
  const msg = (t, ok = false) => {
    if (!msgEl) return;
    msgEl.textContent = String(t || '');
    msgEl.style.color = ok ? '#065f46' : '#ef4444';
    if (msgTimeout) clearTimeout(msgTimeout);
    if (t) {
      msgTimeout = setTimeout(() => {
        if (msgEl.textContent === t) msgEl.textContent = '';
      }, 5000);
    }
  };
  const showError = (e, fallback = 'error') => {
    if (isAbortLike(e)) {
      msg('');
      return false;
    }
    msg((e && e.message) ? e.message : fallback);
    return true;
  };

  const users = await listUsers().catch(() => []);
  const sel = basicCard.querySelector('#payrollUserId');
  const historySel = document.getElementById('historyFilterUserId');
  
  for (const u of users) {
    const role = String(u.role || '').toLowerCase();
    if (role === 'admin' || role === 'manager') continue;
    
    const opt = document.createElement('option');
    opt.value = String(u.id);
    const code = formatEmployeeCode(u);
    opt.textContent = `${code} ${u.username || u.email}`.trim();
    sel.appendChild(opt);
    
    if (historySel) {
      const hOpt = opt.cloneNode(true);
      historySel.appendChild(hOpt);
    }
  }

  const monthEl = basicCard.querySelector('#payrollMonth');
  const getKey = () => ({ userId: String(sel.value || '').trim(), month: String(monthEl.value || '').trim() });

  try {
    let lastUserId = String(localStorage.getItem('payroll.lastUserId') || '').trim();
    const lastMonth = String(localStorage.getItem('payroll.lastMonth') || '').trim();
    
    // Auto-select first employee if no previous selection exists
    if (!lastUserId && sel.options.length > 1) {
      lastUserId = sel.options[1].value; // options[0] is the empty placeholder
    }
    
    if (lastUserId) {
      const opt = sel.querySelector(`option[value="${CSS.escape(lastUserId)}"]`);
      if (opt) sel.value = lastUserId;
    }
    if (/^\d{4}-\d{2}$/.test(lastMonth)) {
      monthEl.value = lastMonth;
    } else {
      // Default to current month if no previous month exists
      const d = new Date();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      monthEl.value = `${d.getFullYear()}-${m}`;
    }
  } catch (e) { /* silently ignored */ }
  let lastPdfKey = '';
  let lastSecureUrl = '';
  let lastEmpCode = '';
  let lastLoadedPayload = null;
  const clearPdfStateIfKeyChanged = () => {
    const k = getKey();
    const kk = `${k.userId}|${k.month}`;
    if (kk && kk === lastPdfKey) return;
    lastPdfKey = kk;
    lastSecureUrl = '';
    lastEmpCode = '';
    lastLoadedPayload = null;
    if (btnDownloadPdf) btnDownloadPdf.disabled = true;
  };

  const mergePayload = (base, patch) => {
    const b = base && typeof base === 'object' ? base : {};
    const p = patch && typeof patch === 'object' ? patch : {};
    const out = { ...b, ...p };
    const mergeObj = (k) => {
      const bv = b[k] && typeof b[k] === 'object' ? b[k] : null;
      const pv = p[k] && typeof p[k] === 'object' ? p[k] : null;
      if (bv || pv) out[k] = { ...(bv || {}), ...(pv || {}) };
    };
    mergeObj('kintai');
    mergeObj('payment');
    mergeObj('bankAccountParts');
    mergeObj('overrideEarnings');
    mergeObj('overrideDeductions');
    if (!Object.prototype.hasOwnProperty.call(p, 'extraEarnings') && Object.prototype.hasOwnProperty.call(b, 'extraEarnings')) out.extraEarnings = b.extraEarnings;
    if (!Object.prototype.hasOwnProperty.call(p, 'extraDeductions') && Object.prototype.hasOwnProperty.call(b, 'extraDeductions')) out.extraDeductions = b.extraDeductions;
    if (!Object.prototype.hasOwnProperty.call(p, 'otherItems') && Object.prototype.hasOwnProperty.call(b, 'otherItems')) out.otherItems = b.otherItems;
    return out;
  };

  let absentDeductionManual = false;

  const updateAutoCalcState = () => {
    const acEl = basicCard.querySelector('#payrollAutoCalc');
    const autoCalc = String(acEl && acEl.value != null ? acEl.value : '0') === '1';
    const dedFields = ['#ovDedHealth', '#ovDedCare', '#ovDedPension', '#ovDedEmployment', '#ovDedIncome'];
    for (const id of dedFields) {
      const el = document.querySelector(id);
      if (el) {
        el.disabled = autoCalc;
        if (autoCalc) {
          el.value = ''; // Clear manual overrides if auto calc is selected
          el.placeholder = '自動計算';
        } else {
          el.placeholder = '0';
        }
      }
    }
  };

  const handleAutoCalcToggle = async () => {
    updateAutoCalcState();
    const acEl = basicCard.querySelector('#payrollAutoCalc');
    const isAuto = String(acEl && acEl.value != null ? acEl.value : '0') === '1';
    if (isAuto) {
      const overlayWrap = document.querySelector('.admin-layout') || document.body;
      let overlay = null;
      try {
        overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.right = '0';
        overlay.style.bottom = '0';
        overlay.style.backgroundColor = 'rgba(255, 255, 255, 0.6)';
        overlay.style.zIndex = '999999';
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.fontSize = '16px';
        overlay.style.fontWeight = 'bold';
        overlay.style.color = '#334155';
        overlay.innerHTML = `<div style="background:white;padding:20px 40px;border-radius:8px;box-shadow:0 10px 25px rgba(0,0,0,0.1);display:flex;align-items:center;gap:12px;">
          <div style="width:20px;height:20px;border:3px solid #e2e8f0;border-top-color:#3b82f6;border-radius:50%;animation:spin 1s linear infinite;"></div>
          勤怠データを自動取得中...
        </div><style>@keyframes spin{to{transform:rotate(360deg)}}</style>`;
        overlayWrap.appendChild(overlay);

        // Force refresh kintai from server without overwriting the form's auto-calc state
        await autoFillKintaiCounts();
      } catch (e) {
        console.error(e);
      } finally {
        if (overlay && overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }
        msg(''); // Xoá message đang tải
      }
    }
    scheduleRealtime();
  };

  const { addRow, collectItems, setForm: baseSetForm, buildPayload: buildPayloadRaw } = createPayloadController({
    doc: document,
    basicCard,
    dedCard,
    otherCard,
    payCard,
    signal,
    parseNum,
    yen
  });

  const setForm = (payload) => {
    baseSetForm(payload);
    updateAutoCalcState();
    try {
      const ovE = payload && typeof payload === 'object' && payload.overrideEarnings && typeof payload.overrideEarnings === 'object'
        ? payload.overrideEarnings
        : {};
      absentDeductionManual = Object.prototype.hasOwnProperty.call(ovE, '欠勤控除');
    } catch {
      absentDeductionManual = false;
    }
  };

  const buildPayload = async () => {
    const p = await buildPayloadRaw();
    if (!absentDeductionManual && p && typeof p === 'object') {
      const ovE = p.overrideEarnings && typeof p.overrideEarnings === 'object' ? p.overrideEarnings : null;
      if (ovE && Object.prototype.hasOwnProperty.call(ovE, '欠勤控除')) {
        delete ovE['欠勤控除'];
        if (!Object.keys(ovE).length) delete p.overrideEarnings;
      }
    }
    return p;
  };

  const setKpi = ({ gross, deduct, net, paySum, hint }) => {
    const g = document.querySelector('#kpiGross');
    const d = document.querySelector('#kpiDeduct');
    const n = document.querySelector('#kpiNet');
    const p = document.querySelector('#kpiPaySum');
    const h = document.querySelector('#kpiHint');
    if (g) g.textContent = gross == null ? '-' : fmtYen(gross);
    if (d) d.textContent = deduct == null ? '-' : fmtYen(deduct);
    if (n) n.textContent = net == null ? '-' : fmtYen(net);
    if (p) p.textContent = paySum == null ? '-' : fmtYen(paySum);
    if (h) h.innerHTML = String(hint || '');
    try {
      const nn = Number(net || 0);
      const ps = Number(paySum || 0);
      const ok = nn > 0 && Math.round(ps) === Math.round(nn);
      if (btnCreatePdf) {
        btnCreatePdf.disabled = !ok;
        btnCreatePdf.style.opacity = ok ? '1' : '0.55';
      }
      if (btnDownloadPdf) {
        btnDownloadPdf.disabled = !ok || !lastSecureUrl;
        btnDownloadPdf.style.opacity = (!ok || !lastSecureUrl) ? '0.55' : '1';
      }
    } catch (e) { /* silently ignored */ }
  };

  const renderKv = (obj, { money = true, hide = [] } = {}) => {
    const rows = [];
    for (const [k, v] of Object.entries(obj || {})) {
      if (hide.includes(k)) continue;
      if (v == null) continue;
      if (money && typeof v === 'number' && !isMoneyKey(k)) continue;
      rows.push([k, v]);
    }
    return `
      <table class="pe-preview-table">
        ${rows.map(([k, v]) => {
      const vv = typeof v === 'number' ? (money ? fmtYen(v) : esc(v)) : esc(v);
      return `<tr><td>${esc(k)}</td><td>${vv}</td></tr>`;
    }).join('')}
      </table>
    `;
  };

  const renderKintai = (obj) => {
    const map = {
      '就業時間': (v) => hmFromMin(v),
      '法外時間外': (v) => hmFromMin(v),
      '週40超時間': (v) => hmFromMin(v),
      '月60超時間': (v) => hmFromMin(v),
      '深夜勤時間': (v) => hmFromMin(v)
    };
    const keys = ['出勤日数', '休日出勤日数', '半日出勤日数', '欠勤日数', '有給休暇', '就業時間', '法外時間外', '週40超時間', '月60超時間', '深夜勤時間'];
    return `
      <table class="pe-preview-table">
        ${keys.map((k) => {
      if (!Object.prototype.hasOwnProperty.call(obj || {}, k)) return '';
      const v = obj[k];
      const f = map[k] || ((x) => x);
      // Ensure v is treated as string for time values that are already formatted
      const vv = (typeof v === 'string' && v.includes(':')) ? esc(v) : (typeof v === 'number' ? esc(f(v)) : esc(v));
      return `<tr><td>${esc(k)}</td><td>${vv}</td></tr>`;
    }).join('')}
      </table>
    `;
  };

  const updatePreview = (emp) => {
    if (!emp) return;
    try { lastEmpCode = String((emp && emp['従業員コード']) ? emp['従業員コード'] : '').trim() || lastEmpCode; } catch (e) { /* silently ignored */ }
    const totals = (emp && emp['合計'] && typeof emp['合計'] === 'object') ? emp['合計'] : {};
    const pay = (emp && emp['支払'] && typeof emp['支払'] === 'object') ? emp['支払'] : {};
    const kintai = (emp && emp['勤怠'] && typeof emp['勤怠'] === 'object') ? { ...emp['勤怠'] } : {};
    const earn = (emp && emp['支給'] && typeof emp['支給'] === 'object') ? emp['支給'] : {};
    const ded = (emp && emp['控除'] && typeof emp['控除'] === 'object') ? emp['控除'] : {};
    const other = (emp && emp['その他'] && typeof emp['その他'] === 'object') ? emp['その他'] : {};
    
    // Grab the exact strings from inputs to avoid parsing/formatting loops
    const kwhEl = document.querySelector('#payrollKWorkHours');
    if (kwhEl && kwhEl.value) kintai['就業時間'] = String(kwhEl.value).trim();
    
    const kohEl = document.querySelector('#payrollKOverHours');
    if (kohEl && kohEl.value) kintai['週40超時間'] = String(kohEl.value).trim();
    
    const klhEl = document.querySelector('#payrollKLegalHours');
    if (klhEl && klhEl.value) kintai['法外時間外'] = String(klhEl.value).trim();
    
    const k60El = document.querySelector('#payrollKOver60Hours');
    if (k60El && k60El.value) kintai['月60超時間'] = String(k60El.value).trim();
    
    const knhEl = document.querySelector('#payrollKNightHours');
    if (knhEl && knhEl.value) kintai['深夜勤時間'] = String(knhEl.value).trim();

    const netPay = Number(totals['差引支給額'] || 0);
    const paySum = Number(pay['振込支給額'] || 0) + Number(pay['現金支給額'] || 0) + Number(pay['現物支給額'] || 0);
    const okPay = Math.round(paySum) === Math.round(netPay);
    try {
      const netEl = document.querySelector('#payrollNetPay');
      const sumEl = document.querySelector('#payrollPaySum');
      if (netEl) netEl.value = fmtNum(netPay);
      if (sumEl) sumEl.value = fmtNum(paySum);
    } catch (e) { /* silently ignored */ }
    const autoEl = document.querySelector('#payrollAutoCalc');
    const isAuto = String(autoEl && autoEl.value != null ? autoEl.value : '0') === '1';
    const calcHint = isAuto ? '【自動計算ON】 保険料・所得税は自動算出されます' : '【自動計算OFF】 保険料・所得税は手入力の値が使用されます';
    try {
      if (!absentDeductionManual) {
        const absentEl = document.querySelector('#ovEarnAbsent');
        const absentDays = Number(kintai['欠勤日数'] || 0);
        const val = Object.prototype.hasOwnProperty.call(earn, '欠勤控除') ? yen(earn['欠勤控除']) : 0;
        if (absentEl) {
          absentEl.value = absentDays > 0 && val ? String(val) : '';
        }
      }
    } catch (e) { /* silently ignored */ }
    previewCard.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <div class="pe-title" style="margin:0;font-size:16px;">給与明細書（プレビュー）</div>
        <button type="button" class="btn" onclick="document.getElementById('btnPreviewPayroll').click();" style="padding:4px 12px;background:#f8fafc;border:1px solid #cbd5e1;border-radius:6px;cursor:pointer;font-weight:600;font-size:12px;color:#334155;transition:all 0.2s;">キャンセル</button>
      </div>
      <div class="pe-muted" style="margin-bottom:6px;font-size:12px;">${esc((emp && emp['対象年月']) ? emp['対象年月'] : '')} / ${esc((emp && emp['所属']) ? emp['所属'] : '')} / ${esc((emp && emp['氏名']) ? emp['氏名'] : '')}（${esc((emp && emp['従業員コード']) ? emp['従業員コード'] : '')}）</div>
      <div class="pe-muted" style="margin-bottom:6px;color:#0ea5e9;font-size:12px;">${calcHint}</div>
      <div class="pe-muted" style="margin-bottom:12px;font-size:12px;">差引支払額（手取り） = 支払内訳合計 − 控除合計</div>
      
      <div style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px; align-items: start;">
        <div>
          <div class="pe-title" style="margin:0 0 8px 0; font-size: 14px;">勤怠</div>
          ${renderKintai(kintai || {})}
        </div>
        <div>
          <div class="pe-title" style="margin:0 0 8px 0; font-size: 14px;">支払方法</div>
          ${renderKv({ 振込: pay['振込支給額'] || 0, 現金: pay['現金支給額'] || 0, 現物: pay['現物支給額'] || 0, 合計: paySum }, { money: true })}
          <div class="pe-muted" style="margin-top:6px; font-size: 11px;">
            ${okPay 
              ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg><span style="color:#10b981; vertical-align: middle;">支払方法合計は差引支払額と一致しています</span>` 
              : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg><span style="color:#ef4444; vertical-align: middle;">支払方法合計が差引支払額と一致しません</span>`}
          </div>
        </div>
        <div>
          <div class="pe-title" style="margin:0 0 8px 0; font-size: 14px;">支給</div>
          ${renderKv(earn || {}, { money: true })}
        </div>
        <div>
          <div class="pe-title" style="margin:0 0 8px 0; font-size: 14px;">控除</div>
          ${renderKv(ded || {}, { money: true, hide: ['社保合計額', '課税対象額'] })}
        </div>
        <div>
          <div class="pe-title" style="margin:0 0 8px 0; font-size: 14px;">その他</div>
          ${renderKv(other || {}, { money: true })}
        </div>
        <div>
          <div class="pe-title" style="margin:0 0 8px 0; font-size: 14px;">合計</div>
          ${renderKv({
      総支給額: totals['総支給額'] || 0,
      総控除額: totals['総控除額'] || 0,
      'その他参考': totals['その他合計'] || 0,
      差引支給額: totals['差引支給額'] || 0
    }, { money: true })}
        </div>
      </div>
    `;
    
    // Append debug details
    const debugDetails = document.createElement('details');
    debugDetails.style.marginTop = '10px';
    debugDetails.innerHTML = `<summary class="pe-title">JSON（デバッグ）</summary><pre style="white-space:pre-wrap;background:#fff;border:none;border-radius:0;padding:10px 12px;overflow:auto;font-size:12px;line-height:1.4;margin:0;">${JSON.stringify(emp || {}, null, 2)}</pre>`;
    previewCard.appendChild(debugDetails);
  };

  const svc = createPayrollService({ fetchJSONAuth });
  const { computeEmp, persistPayload, generatePayslip, publishPayslip, listDeliveries } = svc;

  const formatDateTime = (isoString) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${y}/${m}/${day} ${h}:${min}`;
  };

  const renderDeliveries = (items) => {
    const historyBody = document.getElementById('payrollHistoryBody');
    if (!historyBody) return;
    
    const list = Array.isArray(items) ? items : [];
    if (!list.length) {
      historyBody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:24px 16px;color:#64748b">送信履歴がありません</td></tr>`;
      return;
    }
    historyBody.innerHTML = list.map(it => {
      const when = formatDateTime(it && it.sentAt ? it.sentAt : '');
      const who = escapeHtml(it && it.userName ? it.userName : '');
      const month = escapeHtml(it && it.month ? it.month : '');
      const fileName = escapeHtml(it && it.fileName ? it.fileName : '');
      const fileId = String((it && it.fileId != null) ? it.fileId : '');
      const result = '成功'; // Assuming success if it's in the list, or we need to extract from it
      const errorDetail = '-';
      
      return `
        <tr>
          <td>${when}</td>
          <td>${month}</td>
          <td>${who}</td>
          <td><span style="color:#10b981;font-weight:bold;">${result}</span></td>
          <td>${fileId ? `<a href="#" data-file-id="${escapeHtml(fileId)}" data-file-name="${fileName}" style="color:#1d4ed8;text-decoration:underline;">${fileName || 'PDF'}</a>` : `${fileName || errorDetail}`}</td>
        </tr>
      `;
    }).join('');

    historyBody.querySelectorAll('a[data-file-id]').forEach(a => {
      a.addEventListener('click', async (e) => {
        e.preventDefault();
        const id = String(a.getAttribute('data-file-id') || '').trim();
        if (!id) return;
        let w = null;
        try { w = window.open('about:blank', '_blank'); } catch (e) { /* silently ignored */ }
        if (!w) { msg('ポップアップがブロックされました。許可してください。'); return; }
        setPopupMessage(w, '処理中…');
        let res = null;
        try {
          res = await fetchResponseAuth(`/api/payslips/admin/file/${encodeURIComponent(id)}`);
        } catch (err) {
          setPopupMessage(w, 'エラー', (err && err.message) ? err.message : 'error');
          return;
        }
        const ct = String(res.headers.get('content-type') || '').toLowerCase();
        if (!ct.includes('application/pdf')) {
          let t = '';
          try { t = await res.clone().text(); } catch (e) { /* silently ignored */ }
          setPopupMessage(w, 'PDFの取得に失敗しました。', t || '');
          return;
        }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        try {
          w.location.href = url;
        } catch (e) { /* silently ignored */ }
        setTimeout(() => { try { URL.revokeObjectURL(url); } catch (e) { /* silently ignored */ } }, 30000);
      });
    });
  };

  const refreshDeliveries = async () => {
    try {
      const hMonth = document.getElementById('historyFilterMonth')?.value || null;
      const hUserId = document.getElementById('historyFilterUserId')?.value || null;
      const r = await listDeliveries({ userId: hUserId, month: hMonth });
      renderDeliveries((r && Array.isArray(r.items)) ? r.items : []);
    } catch (e) {
      const historyBody = document.getElementById('payrollHistoryBody');
      if (historyBody) {
        historyBody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:24px 16px;color:#b91c1c;font-weight:600;">送信履歴の取得に失敗しました（サーバー再起動が必要な可能性があります）</td></tr>`;
      } else {
        renderDeliveries([]);
      }
    }
  };

  const btnFilterHistory = document.getElementById('btnFilterHistory');
  if (btnFilterHistory) {
    btnFilterHistory.addEventListener('click', async () => {
      msg('履歴を絞り込んでいます...');
      await refreshDeliveries();
      msg('絞り込み完了', true);
    });
  }

  const loadInput = async () => {
    const k = getKey();
    if (!k.userId || !/^\d{4}-\d{2}$/.test(k.month)) { msg('社員と月を選択'); return null; }
    let r = null;
    try {
      r = await svc.loadInput({ userId: k.userId, month: k.month });
    } catch (e) {
      // 404 or other errors mean no saved data yet, we can ignore and proceed
    }
    const p = (r && r.payload && typeof r.payload === 'object') ? r.payload : null;
    if (p && Object.keys(p).length) {
      setForm(p);
      lastLoadedPayload = p;
      const pubStatus = (r && r.is_published) ? '🟢 公開済' : '🔴 未公開';
      const timeStr = (r && r.updatedAt) ? ` (最終更新: ${formatDateTime(r.updatedAt)})` : '';
      msg(`読み込みました（${pubStatus}）${timeStr}`);
      await refreshDeliveries();
      return p;
    }
    msg('保存データがありません（未保存）');
    lastLoadedPayload = null;
    await refreshDeliveries();
    return p || {};
  };

  const saveInput = async () => {
    const k = getKey();
    if (!k.userId || !/^\d{4}-\d{2}$/.test(k.month)) { msg('社員と月を選択'); return; }
    const patch = await buildPayload();
    const payload = mergePayload(lastLoadedPayload, patch);
    await persistPayload({ userId: k.userId, month: k.month, payload });
    lastLoadedPayload = payload;
    msg('保存しました', true);
  };

  const preview = async () => {
    const k = getKey();
    if (!k.userId || !/^\d{4}-\d{2}$/.test(k.month)) { msg('社員と月を選択'); return; }
    clearPdfStateIfKeyChanged();
    const patch = await buildPayload();
    const payload = mergePayload(lastLoadedPayload, patch);
    const emp = await computeEmp({ userId: k.userId, month: k.month, payload });
    try {
      const totals = (emp && emp['合計'] && typeof emp['合計'] === 'object') ? emp['合計'] : {};
      const pay = (emp && emp['支払'] && typeof emp['支払'] === 'object') ? emp['支払'] : {};
      const net = Number(totals['差引支給額'] || 0);
      const sum = Number(pay['振込支給額'] || 0) + Number(pay['現金支給額'] || 0) + Number(pay['現物支給額'] || 0);
      const hint = Math.round(sum) !== Math.round(net)
        ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg> <span style="color:#ef4444">支払方法が一致しません（${Math.round(sum)} != ${Math.round(net)}）</span>`
        : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg> <span style="color:#10b981">支払方法合計は差引支払額と一致しています</span>';
      const acEl = basicCard.querySelector('#payrollAutoCalc');
      const isAuto = String(acEl && acEl.value != null ? acEl.value : '0') === '1';
      const calcHint = isAuto ? '<span style="color:#3b82f6;background:#eff6ff;padding:2px 6px;border-radius:4px;font-size:12px;margin-left:8px;font-weight:600">自動計算ON</span>' : '<span style="color:#64748b;background:#e2e8f0;padding:2px 6px;border-radius:4px;font-size:12px;margin-left:8px;font-weight:600">自動計算OFF</span>';
      setKpi({ gross: totals['総支給額'], deduct: totals['総控除額'], net, paySum: sum, hint: `${hint} ${calcHint}` });
    } catch (e) { /* silently ignored */ }
    updatePreview(emp);
  };

  const { scheduleRealtime } = createRealtimeController({
    getKey,
    buildPayload,
    computeEmp,
    setKpi,
    updatePreview,
    clearPdfStateIfKeyChanged
  });

  const safeCloseWindow = (w) => { try { if (w && !w.closed) w.close(); } catch (e) { /* silently ignored */ } };
  const escapeHtml = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] || c));
  const setPopupMessage = (w, title, detail = '') => {
    if (!w || w.closed) return;
    const t = escapeHtml(title);
    const d = escapeHtml(detail);
    try { w.document.open(); } catch (e) { /* silently ignored */ }
    try {
      w.document.write(`<title>${t}</title><meta charset="utf-8"><style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;margin:24px;color:#0f172a}h1{font-size:16px;margin:0 0 12px}pre{white-space:pre-wrap;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px}</style><h1>${t}</h1>${d ? `<pre>${d}</pre>` : ''}`);
      w.document.close();
    } catch (e) { /* silently ignored */ }
  };

  const createPdf = async (openedWindow) => {
    const k = getKey();
    if (!k.userId || !/^\d{4}-\d{2}$/.test(k.month)) { setPopupMessage(openedWindow, '社員と月を選択'); msg('社員と月を選択'); return; }
    clearPdfStateIfKeyChanged();
    msg('処理中…');
    try {
      const patch = await buildPayload();
      const payload = mergePayload(lastLoadedPayload, patch);
      await persistPayload({ userId: k.userId, month: k.month, payload });
      lastLoadedPayload = payload;
      const emp = await computeEmp({ userId: k.userId, month: k.month, payload }).catch(() => null);
      try { lastEmpCode = String((emp && emp['従業員コード']) ? emp['従業員コード'] : '').trim() || String(k.userId); } catch { lastEmpCode = String(k.userId); }
      const totals = (emp && emp['合計'] && typeof emp['合計'] === 'object') ? emp['合計'] : {};
      const pay = (emp && emp['支払'] && typeof emp['支払'] === 'object') ? emp['支払'] : {};
      const net = Number(totals['差引支給額'] || 0);
      const sum = Math.round(Number(pay['振込支給額'] || 0) + Number(pay['現金支給額'] || 0) + Number(pay['現物支給額'] || 0));
      if (!net) { setPopupMessage(openedWindow, '差引支払額が0です。'); msg('差引支払額が0です。'); return; }
      if (sum !== Math.round(net)) { setPopupMessage(openedWindow, '支払方法が一致しません', `${sum} != ${net}`); msg(`支払方法合計が差引支払額と一致しません（${sum} != ${net}）。`); return; }
      const r = await generatePayslip({ userId: k.userId, month: k.month });
      if (!(r && r.secureUrl)) { setPopupMessage(openedWindow, 'PDF作成に失敗しました。'); msg('PDF作成に失敗しました。', false); return; }
      lastSecureUrl = String(r.secureUrl || '');
      if (btnDownloadPdf) btnDownloadPdf.disabled = false;
      await openPdf(openedWindow);
      msg('PDFを作成しました', true);
      await refreshDeliveries();
    } catch (e) {
      setPopupMessage(openedWindow, 'エラー', (e && e.message) ? e.message : 'error');
      msg((e && e.message) ? e.message : 'error');
    }
  };

  const openPdf = async (openedWindow) => {
    const k = getKey();
    if (!k.userId || !/^\d{4}-\d{2}$/.test(k.month)) { setPopupMessage(openedWindow, '社員と月を選択'); msg('社員と月を選択'); return; }
    clearPdfStateIfKeyChanged();
    if (!lastSecureUrl) { setPopupMessage(openedWindow, 'まだPDFがありません。', '先に「PDF作成」を押してください。'); msg('まだPDFがありません。先に「PDF作成」を押してください。'); return; }
    msg('処理中…');
    let w = openedWindow;
    if (!w) {
      try { w = window.open('about:blank', '_blank'); } catch (e) { /* silently ignored */ }
    }
    let res = null;
    try {
      res = await fetchResponseAuth(lastSecureUrl);
    } catch (e) {
      setPopupMessage(w, 'エラー', (e && e.message) ? e.message : 'error');
      msg((e && e.message) ? e.message : 'error');
      return;
    }
    const ct = String(res.headers.get('content-type') || '').toLowerCase();
    if (!ct.includes('application/pdf')) {
      let t = '';
      try { t = await res.clone().text(); } catch (e) { /* silently ignored */ }
      setPopupMessage(w, 'PDFの取得に失敗しました。', t || '');
      msg(t || 'PDFの取得に失敗しました。', false);
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const y = k.month.slice(0, 4);
    const mm = k.month.slice(5, 7);
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const code = String(lastEmpCode || k.userId).trim() || String(k.userId);
    
    let empName = '';
    const sel = document.getElementById('payrollUserId');
    if (sel && sel.selectedIndex > 0) {
      const text = sel.options[sel.selectedIndex].textContent;
      empName = text.replace(code, '').trim();
    }
    const namePart = empName ? `_${empName}` : '';
    const filename = `${y}年${mm}月${dd}日_給与明細${namePart}_${code}.pdf`;
    
    try {
      if (w) {
        w.location.href = url;
        try { w.document.title = filename; } catch (e) { /* silently ignored */ }
      } else {
        window.open(url, '_blank');
      }
    } catch (e) { /* silently ignored */ }
    setTimeout(() => { try { URL.revokeObjectURL(url); } catch (e) { /* silently ignored */ } }, 30000);
    msg('PDFを開きました', true);
  };

  const downloadPdf = async () => {
    const k = getKey();
    if (!k.userId || !/^\d{4}-\d{2}$/.test(k.month)) { msg('社員と月を選択'); return; }
    if (!lastSecureUrl) { msg('まだPDFがありません。先に「PDF作成」を押してください。'); return; }
    msg('処理中…');
    let res = null;
    try {
      res = await fetchResponseAuth(lastSecureUrl);
    } catch (e) {
      msg((e && e.message) ? e.message : 'error');
      return;
    }
    const ct = String(res.headers.get('content-type') || '').toLowerCase();
    if (!ct.includes('application/pdf')) {
      let t = '';
      try { t = await res.clone().text(); } catch (e) { /* silently ignored */ }
      msg(t || 'PDFの取得に失敗しました。', false);
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const y = k.month.slice(0, 4);
    const mm = k.month.slice(5, 7);
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const code = String(lastEmpCode || k.userId).trim() || String(k.userId);

    let empName = '';
    const sel = document.getElementById('payrollUserId');
    if (sel && sel.selectedIndex > 0) {
      const text = sel.options[sel.selectedIndex].textContent;
      empName = text.replace(code, '').trim();
    }
    const namePart = empName ? `_${empName}` : '';
    const filename = `${y}年${mm}月${dd}日_給与明細${namePart}_${code}.pdf`;

    try {
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
    } catch (e) { /* silently ignored */ }
    setTimeout(() => { try { URL.revokeObjectURL(url); } catch (e) { /* silently ignored */ } }, 30000);
    msg('PDFをダウンロードしました', true);
  };

  wrap.addEventListener('change', (e) => {
    if (!e || !e.target) return;
    if (e.target.id === 'payrollAutoCalc') {
      handleAutoCalcToggle();
      return;
    }
  }, { passive: true, signal });

  wrap.addEventListener('input', (e) => {
    if (!e || !e.target) return;
    if (e.target.id === 'payrollAutoCalc') return; // Handled by change event
    scheduleRealtime();
  }, { passive: true, signal });

  const absentEl = document.querySelector('#ovEarnAbsent');
  if (absentEl) {
    absentEl.addEventListener('input', () => {
      const v = String(absentEl.value || '').trim();
      absentDeductionManual = !!v;
    }, { signal });
  }

  const btnAddEarn = document.querySelector('#btnAddEarn');
  if (btnAddEarn) btnAddEarn.addEventListener('click', () => addRow('#payrollEarnings'), { signal });
  const btnAddDed = document.querySelector('#btnAddDed');
  if (btnAddDed) btnAddDed.addEventListener('click', () => addRow('#payrollDeductions'), { signal });

  const btnLoad = actionTopBar.querySelector('#btnLoadPayroll');
  if (btnLoad) btnLoad.addEventListener('click', () => loadInput().catch(e => showError(e)), { signal });
  const btnSave = actionTopBar.querySelector('#btnSavePayroll');
  if (btnSave) btnSave.addEventListener('click', () => saveInput().catch(e => showError(e)), { signal });
  if (btnPreview) btnPreview.addEventListener('click', async () => {
    const isOpen = previewModalOverlay.style.display !== 'none';
    if (isOpen) {
      setPreviewOpen(false);
      return;
    }
    let ok = false;
    try {
      await preview();
      ok = true;
    } catch (e) {
      showError(e);
    }
    if (ok) setPreviewOpen(true);
  }, { signal });
  const btnCreate = actionTopBar.querySelector('#btnCreatePdf');
  if (btnCreate) btnCreate.addEventListener('click', () => {
    let w = null;
    try { w = window.open('about:blank', '_blank'); } catch (e) { /* silently ignored */ }
    if (!w) msg('ポップアップがブロックされました。許可してください。');
    createPdf(w).catch(e => showError(e));
  }, { signal });
  const btnDl = actionTopBar.querySelector('#btnDownloadPdf');
  if (btnDl) btnDl.addEventListener('click', () => {
    downloadPdf().catch(e => showError(e));
  }, { signal });
  const btnPublish = actionTopBar.querySelector('#btnPublishPayroll');
  if (btnPublish) btnPublish.addEventListener('click', async () => {
    const k = getKey();
    if (!k.userId || !/^\d{4}-\d{2}$/.test(k.month)) { msg('社員と月を選択'); return; }
    if (!confirm(`${k.month}の給与明細を社員に送信（公開）しますか？\n\n公開すると、社員はマイページからこの給与明細を確認できるようになります。`)) return;
    try {
      msg('送信中...');
      const r = await publishPayslip({ userId: k.userId, month: k.month, is_published: true });
      msg(`社員に送信しました（${formatDateTime(new Date().toISOString())}）`, true);
      await refreshDeliveries();
    } catch (e) {
      showError(e, '送信に失敗しました');
    }
  }, { signal });

  const autoFillKintaiCounts = async () => {
    const userId = String(sel.value || '').trim();
    const ym = String(monthEl.value || '').trim();
    if (!userId || !/^\d{4}-\d{2}$/.test(ym)) return;
    const y = ym.slice(0, 4);
    const m = ym.slice(5, 7);
    try {
      // 1. Fetch fresh timesheet details directly to ensure accurate recalculation
      const detailRes = await Promise.allSettled([
        fetchJSONAuth(`/api/attendance/month/detail?year=${encodeURIComponent(y)}&month=${encodeURIComponent(m)}&userId=${encodeURIComponent(userId)}`)
      ]);
      const detail = detailRes[0].status === 'fulfilled' ? detailRes[0].value : null;

      let attendDays = 0, holidayWorkDays = 0, absentDays = 0, paidDays = 0, unpaidDays = 0;
      let totalWorkMinutes = 0, overtimeMinutes = 0, nightMinutes = 0;

      const parseHm = (hm) => {
        if (hm == null || hm === '') return 0;
        if (typeof hm === 'number') return isNaN(hm) ? 0 : hm;
        const str = String(hm).trim();
        const pts = str.split(':');
        if (pts.length !== 2) {
          const n = Number(str);
          return isNaN(n) ? 0 : n;
        }
        const h = parseInt(pts[0], 10);
        const mn = parseInt(pts[1], 10);
        if (isNaN(h) || isNaN(mn)) return 0;
        return h * 60 + mn;
      };

      if (detail && typeof detail === 'object') {
        const days = Array.isArray(detail.days) ? detail.days : [];
        const off = days.filter(d => Number(d?.is_off || 0) === 1).length;
        const working = days.length ? (days.length - off) : 0;
        const hasAttend = (d) => {
          const k = String(d?.daily?.kubun || '').trim();
          return k === '出勤' || k === '半休' || k === '休日出勤' || k === '代替出勤' ||
                 (Array.isArray(d?.segments) && d.segments.some(s => s?.checkIn || s?.checkOut));
        };
        attendDays = days.filter(hasAttend).length;
        holidayWorkDays = days.filter(d => Number(d?.is_off || 0) === 1 && hasAttend(d)).length;
        absentDays = Math.max(0, working - (attendDays - holidayWorkDays));

        const diffMin = (a, b) => {
          const am = parseHm(a);
          const bm = parseHm(b);
          if (am == null || bm == null) return null;
          return bm >= am ? (bm - am) : (bm + 1440 - am);
        };

        const getHm = (iso) => {
          if (!iso) return '';
          const parts = String(iso).split('T');
          if (parts.length > 1 && parts[1]) return parts[1].slice(0, 5);
          return '';
        };

        for (const d of days) {
          if (!hasAttend(d)) continue;

          const daily = d?.daily || null;
          const shift = d?.shift || null;
          const segs = Array.isArray(d?.segments) ? d.segments : [];
          const seg = segs.length > 0 ? segs[0] : null;
          
          const dow = new Date(String(d?.date || '') + 'T00:00:00').getDay();
          const offDay = Number(d?.is_off || 0) === 1 || dow === 0 || dow === 6;
          const kubunInitRaw = String(daily?.kubun || '').trim();
          const kubunOptions = offDay ? ['休日', '休日出勤', '代替出勤'] : ['出勤', '半休', '欠勤', '有給休暇', '無給休暇', '代替休日'];
          let kubunInit = kubunOptions.includes(kubunInitRaw) ? kubunInitRaw : '';
          const plannedKubun = offDay ? '休日' : '出勤';
          const workKubunSet = new Set(['出勤', '半休', '休日出勤', '代替出勤']);
          const hasActual = !!(seg?.id || seg?.checkIn || seg?.checkOut);
          if (offDay && !kubunInit && hasActual) kubunInit = '休日出勤';
          
          const effectiveKubun = kubunInit || plannedKubun;
          const isWorkDay = workKubunSet.has(effectiveKubun);
          
          if (kubunInit === '欠勤' || kubunInit === '有給休暇' || kubunInit === '無給休暇') {
             continue;
          }

          const shiftStart = String(shift?.start_time || '08:00').trim();
          const shiftEnd = String(shift?.end_time || '17:00').trim();
          const inHm = seg?.checkIn ? getHm(seg.checkIn) : '';
          const outHm = seg?.checkOut ? getHm(seg.checkOut) : '';
          
          const finalIn = isWorkDay ? (inHm || shiftStart) : '';
          const finalOut = isWorkDay ? (outHm || shiftEnd) : '';
          
          const brMin = (isWorkDay || hasActual) ? Number(daily?.breakMinutes ?? 60) : 0;
          const nbMin = (isWorkDay || hasActual) ? Number(daily?.nightBreakMinutes ?? 0) : 0;
          const totalBmin = (Number.isFinite(brMin) ? brMin : 60) + (Number.isFinite(nbMin) ? nbMin : 0);
          
          const rawMin = (finalIn && finalOut) ? diffMin(finalIn, finalOut) : null;
          const workMin = (rawMin == null || rawMin <= 0) ? 0 : Math.max(0, rawMin - totalBmin);
          
          if (workMin > 0) {
            totalWorkMinutes += workMin;
            
            const stM = parseHm(shiftStart);
            const etM = parseHm(shiftEnd);
            const outM = parseHm(finalOut);
            let over = 0;
            if (finalIn && finalOut && outM != null && stM != null && etM != null) {
              const overnight = etM < stM;
              const endAbs = overnight ? (etM + 24 * 60) : etM;
              const outAbs = overnight && outM < stM ? (outM + 24 * 60) : outM;
              over = Math.max(0, outAbs - endAbs);
            } else {
              over = Math.max(0, workMin - 8 * 60);
            }
            overtimeMinutes += over;
          }
        }

        const leave = detail?.leaveSummary || {};
        paidDays = Number(leave.paidDays || 0);
        unpaidDays = Number(leave.unpaidDays || 0);
      }

      // 2. Map calculated values to UI safely
      const safeStr = (v) => String(v == null || isNaN(v) ? 0 : v);

      const kWork = safeStr(attendDays);
      const kHoliday = safeStr(holidayWorkDays);
      const kHalf = '0'; // Half-days could be computed similarly if needed
      const kAbsent = safeStr(absentDays);
      const kUnpaid = safeStr(unpaidDays);
      const kPaid = safeStr(paidDays);
      
      const formatHm = (min) => Math.floor(min / 60) + ':' + String(min % 60).padStart(2, '0');
      
      const kWorkHours = formatHm(totalWorkMinutes);
      const kOverHours = formatHm(overtimeMinutes);
      const kLegalHours = formatHm(overtimeMinutes); // For now assuming all over is legal
      const kNightHours = formatHm(nightMinutes);

      const setVal = (id, val) => {
        const el = document.querySelector(id);
        if (el) {
          el.value = val;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
      };
      
      setVal('#payrollKWork', kWork);
      setVal('#payrollKHoliday', kHoliday);
      setVal('#payrollKHalf', kHalf);
      setVal('#payrollKAbsent', kAbsent);
      setVal('#payrollKUnpaid', kUnpaid);
      setVal('#payrollKPaid', kPaid);
      setVal('#payrollKWorkHours', kWorkHours);
      setVal('#payrollKOverHours', kOverHours);
      setVal('#payrollKLegalHours', kLegalHours);
      setVal('#payrollKOver60Hours', '0:00');
      setVal('#payrollKNightHours', kNightHours);
      
      scheduleRealtime();
      
    } catch (e) {
      if (isAbortLike(e)) return;
      console.error('autoFill error:', e);
      msg('勤怠データの自動取得に失敗しました: ' + (e.message || ''), false);
    }
  };

  const onSelectionChange = async () => {
    const userId = String(sel.value || '').trim();
    const ym = String(monthEl.value || '').trim();
    if (!userId || !/^\d{4}-\d{2}$/.test(ym)) return;

    clearPdfStateIfKeyChanged();
    try { localStorage.setItem('payroll.lastUserId', userId); } catch (e) { /* silently ignored */ }
    try { localStorage.setItem('payroll.lastMonth', ym); } catch (e) { /* silently ignored */ }

    msg('データ取得中...');

    // 1. Tự động tải dữ liệu đã lưu (nếu có)
    const savedData = await loadInput().catch(() => null);

    // 2. Nếu chưa có dữ liệu lưu hoặc thiếu thông tin lương cơ bản, tự động lấy từ hồ sơ nhân viên
    try {
      const u = await getUser(userId);
      if (u) {
        const baseEl = document.querySelector('#payrollBaseMonthly');
        if (baseEl && (!baseEl.value || baseEl.value === '0')) {
          baseEl.value = u.base_salary != null ? String(u.base_salary) : '';
        }
        const transportEl = document.querySelector('#payrollTransport');
        if (transportEl && (!transportEl.value || transportEl.value === '0')) {
          transportEl.value = u.allowance_transport != null ? String(u.allowance_transport) : '';
        }
      }
    } catch (e) { /* silently ignored */ }

    // 3. Tự động cập nhật số liệu chấm công mới nhất để đảm bảo chính xác tuyệt đối
    await autoFillKintaiCounts().catch(() => { });

    // 4. Kích hoạt tính toán realtime
    scheduleRealtime();
    msg('データ取得完了', true);
    setTimeout(() => {
      const currentMsg = document.querySelector('#payrollMsg');
      if (currentMsg && currentMsg.textContent === 'データ取得完了') {
        msg('');
      }
    }, 2000);
  };

  sel.addEventListener('change', onSelectionChange, { signal });
  monthEl.addEventListener('change', onSelectionChange, { signal });

  updateAutoCalcState();
  msg('');
  if (getKey().userId && getKey().month) {
    onSelectionChange().catch(() => { });
  }

  return () => {
    if (aborter) aborter.abort();
    try {
      const modal = document.getElementById('payrollPreviewModalOverlay');
      if (modal) modal.remove();
    } catch (e) { /* silently ignored */ }
  };
}

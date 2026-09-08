import{fetchJSONAuth as Ct,fetchResponseAuth as _e}from"../../api/http.api.js";import{listUsers as no,getUser as io}from"../../api/users.api.js";import{createPayloadController as ao}from"./editor.payload.js";import{createPayrollService as ro}from"./editor.service.js";import{createRealtimeController as lo}from"./editor.realtime.js";let oe=null;const D=d=>String(d??"").replace(/[&<>"']/g,r=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[r]),ce=d=>Math.round(Number(d)||0),Ve=d=>{const r=ce(d);try{return new Intl.NumberFormat("ja-JP").format(r)}catch{return String(r).replace(/\B(?=(\d{3})+(?!\d))/g,",")}},ue=d=>`${Ve(d)} \u5186`,so=(d,r,{allowEmpty:z=!1}={})=>{const w=(d==null?"":String(d)).replace(/,/g,"").trim();if(!w)return z?null:0;const B=Number(w);if(!Number.isFinite(B))throw new Error(`${r} \u304C\u6B63\u3057\u304F\u3042\u308A\u307E\u305B\u3093`);return ce(B)},po=d=>{const r=String(d||"");return r.includes("\u5186")||r.includes("\u984D")||r.includes("\u624B\u5F53")||r.includes("\u4FDD\u967A")||r.includes("\u7A0E")||r.includes("\u63A7\u9664")||r.includes("\u5408\u8A08")||r.includes("\u7D66")||r.includes("\u632F\u8FBC")||r.includes("\u73FE\u91D1")||r.includes("\u73FE\u7269")||r.includes("\u5BB6\u8CC3")||r.includes("\u8CBB")||r.includes("\u5FB4\u53CE")||r.includes("\u9084\u4ED8")||r.includes("\u8A08\u7B97")||r.includes("\u8A3A\u7642")},me=d=>{const r=Math.max(0,ce(d)),z=Math.floor(r/60),k=r%60;return`${z}:${String(k).padStart(2,"0")}`},co=d=>String(d&&(d.employee_code||d.employeeCode||"EMP"+String(d.id).padStart(3,"0"))||"").trim(),$t=d=>{if(!d)return!1;if(d.name==="AbortError")return!0;const r=String(d.message||d||"").toLowerCase();return r.includes("aborterror")||r.includes("signal is aborted")||r.includes("aborted without reason")},uo=d=>Array.isArray(d)?d:d&&Array.isArray(d.rows)?d.rows:[];function mo(){if(document.getElementById("payrollEditorStyle"))return;const d=document.createElement("style");d.id="payrollEditorStyle",d.textContent=`
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
  `,document.head.appendChild(d)}const ko=d=>{const r=String(window.location.pathname||"");return`${r.startsWith("/admin/payroll")?r:"/ui/admin"}?tab=${encodeURIComponent(String(d||""))}`};async function So(d={}){oe&&oe.abort(),oe=new AbortController;const{signal:r}=oe;try{window.scrollTo(0,0)}catch{}mo();const z=d.content||document.querySelector("#adminContent");if(!z)return;z.innerHTML="",z.style.cssText="width: 100%; margin: 0; padding: 0; background: transparent; border: none; box-shadow: none; max-width: none; float: none; text-align: left; overflow-y: auto !important; height: 100%;";const k=document.createElement("div");k.className="max-w-[1400px] mx-auto px-6 w-full",k.style.cssText="max-width: 1400px; margin-left: auto !important; margin-right: auto !important; padding-left: 24px; padding-right: 24px; width: 100%; box-sizing: border-box; display: block; clear: both; min-height: min-content; padding-bottom: 60px;",z.appendChild(k);const w=document.createElement("div");w.className="pe-actions w-full",w.style.cssText="width: 100%; margin: 0 0 24px 0; padding: 12px 16px; box-sizing: border-box;",w.innerHTML=`
    <button type="button" id="btnLoadPayroll" title="\u8AAD\u307F\u8FBC\u307F">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
      \u8AAD\u8FBC
    </button>
    <button type="button" id="btnSavePayroll" title="\u4FDD\u5B58">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
      \u4FDD\u5B58
    </button>
    <button type="button" id="btnPreviewPayroll" title="\u30D7\u30EC\u30D3\u30E5\u30FC">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
      \u30D7\u30EC\u30D3\u30E5\u30FC
    </button>
    <button type="button" id="btnCreatePdf" title="PDF\u4F5C\u6210">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
      PDF\u4F5C\u6210
    </button>
    <button type="button" id="btnDownloadPdf" title="PDF\u30C0\u30A6\u30F3\u30ED\u30FC\u30C9">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 14 12 19 7 14"></polyline><line x1="12" y1="19" x2="12" y2="3"></line></svg>
      \u30C0\u30A6\u30F3\u30ED\u30FC\u30C9
    </button>
    <div id="payrollMsg" class="pe-msg" style="margin-left: 8px; font-size: 13px; font-weight: 500; margin-top: 0;"></div>
    
    <div style="margin-left: auto; display: flex; align-items: center; gap: 12px;">
      <span id="payrollStatusBadge" style="display:none; padding:4px 10px; border-radius:12px; font-size:12px; font-weight:700;"></span>
      <button type="button" id="btnPublishPayroll" title="\u793E\u54E1\u3078\u9001\u4FE1\uFF08\u516C\u958B\uFF09">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
        \u7D66\u4E0E\u660E\u7D30\u3092\u9001\u4FE1
      </button>
    </div>
  `,k.appendChild(w);const B=document.createElement("div");B.className="w-full",B.style.cssText="width: 100%; box-sizing: border-box;",B.innerHTML=`
    <div class="pe-tabs w-full" style="width: 100%; margin-top:0; border-bottom: 1px solid #cbd5e1; margin-bottom: 24px; padding-bottom: 8px;">
      <button type="button" class="pe-tab-btn active" data-tab="editor">\u7D66\u4E0E\u660E\u7D30\u4F5C\u6210\u30FB\u7DE8\u96C6</button>
      <button type="button" class="pe-tab-btn" data-tab="history">\u9001\u4FE1\u5C65\u6B74</button>
    </div>
  `,k.appendChild(B);const ne=document.createElement("div");ne.id="peEditorView",ne.className="pe-editor-view",k.appendChild(ne);const ye=document.createElement("div");ye.className="pe-card",ye.style.cssText="padding:12px 16px; margin-bottom:12px;",ye.innerHTML=`
    <div class="pe-kpi" style="display:flex; align-items:center; gap:24px; flex-wrap:wrap; margin:0;">
      <div class="pe-kpi-net" style="margin:0; padding:8px 16px; border-radius:8px;"><div class="k" style="color:#065f46;font-size:11px;margin-bottom:2px;">\u5DEE\u5F15\u652F\u6255\u984D\uFF08\u624B\u53D6\u308A\uFF09</div><div class="v v-net" id="kpiNet" style="font-size:20px;">-</div></div>
      <div style="margin:0;"><div class="k" style="font-size:11px;color:#64748b;">\u652F\u7D66\u5408\u8A08</div><div class="v" id="kpiGross" style="font-size:15px;font-weight:600;">-</div></div>
      <div style="margin:0;"><div class="k" style="font-size:11px;color:#64748b;">\u63A7\u9664\u5408\u8A08</div><div class="v" id="kpiDeduct" style="font-size:15px;font-weight:600;">-</div></div>
      <div style="margin:0;"><div class="k" style="font-size:11px;color:#64748b;">\u652F\u6255\u65B9\u6CD5\u5408\u8A08</div><div class="v" id="kpiPaySum" style="font-size:15px;font-weight:600;">-</div></div>
    </div>
    <div id="kpiHint" style="margin-top:6px;color:#64748b;font-weight:500;font-size:12px;display:flex;align-items:center;gap:6px"></div>
  `,ne.appendChild(ye);const P=document.createElement("div");P.className="pe-card",P.innerHTML=`
      <div class="pe-sub-title" style="margin-top:0">\u5BFE\u8C61\u8005\u30FB\u671F\u9593</div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
        <label class="pe-field">
          <span>\u793E\u54E1\u9078\u629E</span>
          <select id="payrollUserId"><option value="">\u9078\u629E\u3057\u3066\u304F\u3060\u3055\u3044</option></select>
        </label>
        <label class="pe-field">
          <span>\u5BFE\u8C61\u5E74\u6708</span>
          <input id="payrollMonth" type="month">
        </label>
        <label class="pe-field">
          <span>\u57FA\u672C\u7D66\uFF08\u6708\u7D66\uFF09</span>
          <div class="pe-money"><input id="payrollBaseMonthly" type="text" inputmode="numeric" placeholder="0"><span>\u5186</span></div>
        </label>
        <label class="pe-field">
          <span>\u81EA\u52D5\u8A08\u7B97\uFF08\u4FDD\u967A\u30FB\u7A0E\uFF09</span>
          <select id="payrollAutoCalc">
            <option value="0">\u3057\u306A\u3044</option>
            <option value="1">\u3059\u308B</option>
          </select>
        </label>
      </div>

      <div class="pe-sub-title" style="cursor:pointer;user-select:none;margin-top:20px" id="toggleAttendance">
        \u52E4\u6020\u60C5\u5831
        <svg id="iconToggleAttendance" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-left:auto;transition:transform 0.2s;transform:rotate(-90deg)"><polyline points="6 9 12 15 18 9"></polyline></svg>
      </div>
      <div id="payrollAttendanceSection" style="display:none; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
        <label class="pe-field">
          <span>\u51FA\u52E4\u65E5\u6570</span>
          <input id="payrollKWork" type="number" step="1" placeholder="\u81EA\u52D5">
        </label>
        <label class="pe-field">
          <span>\u4F11\u65E5\u51FA\u52E4\u65E5\u6570</span>
          <input id="payrollKHoliday" type="number" step="1" placeholder="\u81EA\u52D5">
        </label>
        <label class="pe-field">
          <span>\u534A\u65E5\u51FA\u52E4\u65E5\u6570</span>
          <input id="payrollKHalf" type="number" step="1" placeholder="\u81EA\u52D5">
        </label>
        <label class="pe-field">
          <span>\u6B20\u52E4\u65E5\u6570</span>
          <input id="payrollKAbsent" type="number" step="1" placeholder="\u81EA\u52D5">
        </label>
        <label class="pe-field">
          <span>\u7121\u7D66\u4F11\u6687</span>
          <input id="payrollKUnpaid" type="number" step="1" placeholder="\u81EA\u52D5">
        </label>
        <label class="pe-field">
          <span>\u6709\u7D66\u4F11\u6687</span>
          <input id="payrollKPaid" type="number" step="1" placeholder="\u81EA\u52D5">
        </label>
        <label class="pe-field">
          <span>\u5C31\u696D\u6642\u9593</span>
          <input id="payrollKWorkHours" type="text" placeholder="\u81EA\u52D5">
        </label>
        <label class="pe-field">
          <span>\u6CD5\u5916\u6642\u9593\u5916</span>
          <input id="payrollKLegalHours" type="text" placeholder="\u81EA\u52D5">
        </label>
        <label class="pe-field">
          <span>\u903140\u8D85\u6642\u9593</span>
          <input id="payrollKOverHours" type="text" placeholder="\u81EA\u52D5">
        </label>
        <label class="pe-field">
          <span>\u670860\u8D85\u6642\u9593</span>
          <input id="payrollKOver60Hours" type="text" placeholder="\u81EA\u52D5">
        </label>
        <label class="pe-field">
          <span>\u6DF1\u591C\u52E4\u52D9\u6642\u9593</span>
          <input id="payrollKNightHours" type="text" placeholder="\u81EA\u52D5">
        </label>
      </div>
  `;const be=document.createElement("div");be.className="pe-card",be.innerHTML=`
    <div class="pe-title">\u63A7\u9664</div>
    <div class="pe-sub-title" style="margin-top:0;">\u793E\u4F1A\u4FDD\u967A</div>
    <div class="pe-items">
      <div class="pe-item"><div class="pe-lbl">\u5065\u5EB7\u4FDD\u967A\u6599</div><div class="pe-money-item"><input class="pe-amt" id="ovDedHealth" type="number" step="1" placeholder="0" aria-label="\u5065\u5EB7\u4FDD\u967A\u6599"><span>\u5186</span></div></div>
      <div class="pe-item"><div class="pe-lbl">\u4ECB\u8B77\u4FDD\u967A\u6599</div><div class="pe-money-item"><input class="pe-amt" id="ovDedCare" type="number" step="1" placeholder="0" aria-label="\u4ECB\u8B77\u4FDD\u967A\u6599"><span>\u5186</span></div></div>
      <div class="pe-item"><div class="pe-lbl">\u539A\u751F\u5E74\u91D1\u4FDD\u967A</div><div class="pe-money-item"><input class="pe-amt" id="ovDedPension" type="number" step="1" placeholder="0" aria-label="\u539A\u751F\u5E74\u91D1\u4FDD\u967A"><span>\u5186</span></div></div>
      <div class="pe-item"><div class="pe-lbl">\u96C7\u7528\u4FDD\u967A\u6599</div><div class="pe-money-item"><input class="pe-amt" id="ovDedEmployment" type="number" step="1" placeholder="0" aria-label="\u96C7\u7528\u4FDD\u967A\u6599"><span>\u5186</span></div></div>
      <div class="pe-item"><div class="pe-lbl">\u5B50\u80B2\u652F\u63F4\u91D1</div><div class="pe-money-item"><input class="pe-amt" id="ovDedChildcare" type="number" step="1" placeholder="0" aria-label="\u5B50\u80B2\u652F\u63F4\u91D1"><span>\u5186</span></div></div>
    </div>
    <div class="pe-sub-title">\u7A0E\u91D1</div>
    <div class="pe-items">
      <div class="pe-item"><div class="pe-lbl">\u6240\u5F97\u7A0E</div><div class="pe-money-item"><input class="pe-amt" id="ovDedIncome" type="number" step="1" placeholder="0" aria-label="\u6240\u5F97\u7A0E"><span>\u5186</span></div></div>
      <div class="pe-item"><div class="pe-lbl">\u4F4F\u6C11\u7A0E</div><div class="pe-money-item"><input class="pe-amt" id="ovDedResident" type="number" step="1" placeholder="0" aria-label="\u4F4F\u6C11\u7A0E"><span>\u5186</span></div></div>
    </div>
    <div class="pe-sub-title">\u305D\u306E\u4ED6</div>
    <div class="pe-items">
      <div class="pe-item"><div class="pe-lbl">\u7ACB\u66FF\u5BB6\u8CC3\uFF08\u63A7\u9664\uFF09</div><div class="pe-money-item"><input class="pe-amt" id="payrollRent" type="text" inputmode="numeric" placeholder="0" aria-label="\u7ACB\u66FF\u5BB6\u8CC3\uFF08\u63A7\u9664\uFF09"><span>\u5186</span></div></div>
    </div>
    <div class="pe-sub-title">\u8FFD\u52A0\u63A7\u9664</div>
    <div id="payrollDeductions" class="pe-items"></div>
    <button type="button" class="pe-btn-add" id="btnAddDed">+ \u63A7\u9664\u9805\u76EE\u3092\u8FFD\u52A0</button>
  `;const $e=document.createElement("div");$e.className="pe-card",$e.innerHTML=`
    <div class="pe-title">\u652F\u7D66</div>
    <div class="pe-sub-title" style="margin-top:0;">\u57FA\u672C\u624B\u5F53</div>
    <div class="pe-items">
      <div class="pe-item"><div class="pe-lbl">\u975E\u8AB2\u7A0E\u901A\u52E4\u8CBB</div><div class="pe-money-item"><input class="pe-amt" id="ovEarnTransit" type="number" step="1" placeholder="0"><span>\u5186</span></div></div>
      <div class="pe-item"><div class="pe-lbl">\u8CC7\u683C\u624B\u5F53</div><div class="pe-money-item"><input class="pe-amt" id="ovEarnCert" type="number" step="1" placeholder="0"><span>\u5186</span></div></div>
      <div class="pe-item"><div class="pe-lbl">\u4EA4\u901A\u624B\u5F53</div><div class="pe-money-item"><input class="pe-amt" id="payrollTransport" type="number" step="1" placeholder="0"><span>\u5186</span></div></div>
    </div>
    <div class="pe-sub-title">\u6642\u9593\u5916\u30FB\u5272\u5897\u624B\u5F53</div>
    <div class="pe-items">
      <div class="pe-item"><div class="pe-lbl">\u6642\u9593\u5916\u624B\u5F53</div><div class="pe-money-item"><input class="pe-amt" id="ovEarnOT" type="number" step="1" placeholder="0"><span>\u5186</span></div></div>
      <div class="pe-item"><div class="pe-lbl">\u56FA\u5B9A\u6B8B\u696D\u624B\u5F53</div><div class="pe-money-item"><input class="pe-amt" id="ovEarnFixedOT" type="number" step="1" placeholder="0"><span>\u5186</span></div></div>
      <div class="pe-item"><div class="pe-lbl">\u6DF1\u591C\u52E4\u624B\u5F53</div><div class="pe-money-item"><input class="pe-amt" id="ovEarnNight" type="number" step="1" placeholder="0"><span>\u5186</span></div></div>
      <div class="pe-item"><div class="pe-lbl">\u6240\u4F11\u51FA\u624B\u5F53</div><div class="pe-money-item"><input class="pe-amt" id="ovEarnHoliday" type="number" step="1" placeholder="0"><span>\u5186</span></div></div>
    </div>
    <div class="pe-sub-title">\u305D\u306E\u4ED6\u624B\u5F53\u30FB\u63A7\u9664</div>
    <div class="pe-items">
      <div class="pe-item"><div class="pe-lbl">\u6B20\u52E4\u63A7\u9664</div><div class="pe-money-item"><input class="pe-amt" id="ovEarnAbsent" type="number" step="1" placeholder="0"><span>\u5186</span></div></div>
      <div class="pe-item"><div class="pe-lbl">\u50AC\u4E8B\u5354\u529B\u624B\u5F53</div><div class="pe-money-item"><input class="pe-amt" id="ovEarnEvent" type="number" step="1" placeholder="0"><span>\u5186</span></div></div>
      <div class="pe-item"><div class="pe-lbl">\u901A\u4FE1\u624B\u5F53</div><div class="pe-money-item"><input class="pe-amt" id="ovEarnComms" type="number" step="1" placeholder="0"><span>\u5186</span></div></div>
      <div class="pe-item"><div class="pe-lbl">\u8A95\u751F\u65E5\u6708\u624B\u5F53</div><div class="pe-money-item"><input class="pe-amt" id="ovEarnBirthday" type="number" step="1" placeholder="0"><span>\u5186</span></div></div>
    </div>
    <div class="pe-sub-title">\u8FFD\u52A0\u652F\u7D66</div>
    <div id="payrollEarnings" class="pe-items"></div>
    <button type="button" class="pe-btn-add" id="btnAddEarn">+ \u652F\u7D66\u9805\u76EE\u3092\u8FFD\u52A0</button>
  `;const T=document.createElement("div");T.style.marginTop="24px",T.style.borderTop="1px dashed #cbd5e1",T.style.paddingTop="20px",T.innerHTML=`
    <div class="pe-title" style="border-bottom:none; margin-bottom:8px">\u305D\u306E\u4ED6</div>
    <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;font-weight:500;color:#0f172a;margin-bottom:12px">
      <input type="checkbox" id="chkShowYearEnd" style="width:16px;height:16px;accent-color:#3b82f6;cursor:pointer;">
      \u5E74\u672B\u8ABF\u6574\u30FB\u5DEE\u984D\u3092\u5165\u529B\u3059\u308B\uFF0812\u6708\u307E\u305F\u306F\u767A\u751F\u6642\u306E\u307F\uFF09
    </label>
    <div id="payrollYearEndSection" style="display:none;">
      <div class="pe-items">
        <div class="pe-item pe-item-short"><div class="pe-lbl">\u5DEE\u984D\u8A08\u7B97</div><div class="pe-money-item"><input class="pe-amt" id="payrollOtherDiff" type="number" step="1" placeholder="0"><span>\u5186</span></div></div>
        <div class="pe-item pe-item-short"><div class="pe-lbl">\u8FFD\u52A0\u8A3A\u7642\u8CBB</div><div class="pe-money-item"><input class="pe-amt" id="payrollOtherMedical" type="number" step="1" placeholder="0"><span>\u5186</span></div></div>
        <div class="pe-item pe-item-short"><div class="pe-lbl">\u5E74\u672B\u8ABF\u6574\u5FB4\u53CE</div><div class="pe-money-item"><input class="pe-amt" id="payrollOtherYec" type="number" step="1" placeholder="0"><span>\u5186</span></div></div>
        <div class="pe-item pe-item-short"><div class="pe-lbl">\u5E74\u672B\u8ABF\u6574\u9084\u4ED8</div><div class="pe-money-item"><input class="pe-amt" id="payrollOtherYer" type="number" step="1" placeholder="0"><span>\u5186</span></div></div>
      </div>
    </div>
  `;const V=document.createElement("div");V.style.marginTop="24px",V.style.borderTop="1px dashed #cbd5e1",V.style.paddingTop="20px",V.innerHTML=`
    <div class="pe-title" style="border-bottom:none; margin-bottom:8px">\u652F\u6255\u65B9\u6CD5\uFF08\u632F\u8FBC\u30FB\u73FE\u91D1\u30FB\u73FE\u7269\uFF09</div>
    <div class="pe-paygrid">
      <div class="pe-field"><span>\u5DEE\u5F15\u652F\u6255\u984D\uFF08\u81EA\u52D5/\u624B\u53D6\u308A\uFF09</span><div class="pe-money"><input id="payrollNetPay" type="text" readonly><span>\u5186</span></div></div>
      <div class="pe-field"><span>\u652F\u6255\u65B9\u6CD5\u5408\u8A08\uFF08\u632F\u8FBC+\u73FE\u91D1+\u73FE\u7269\uFF09</span><div class="pe-money"><input id="payrollPaySum" type="text" readonly><span>\u5186</span></div></div>
      <div class="pe-field"><span>\u9280\u884C\u540D</span>
        <input id="payrollBankName" type="text" list="bankList" placeholder="\u4F8B: \u307F\u305A\u307B\u9280\u884C">
        <datalist id="bankList">
          <option value="\u307F\u305A\u307B\u9280\u884C">
          <option value="\u4E09\u83F1UFJ\u9280\u884C">
          <option value="\u4E09\u4E95\u4F4F\u53CB\u9280\u884C">
          <option value="\u3086\u3046\u3061\u3087\u9280\u884C">
          <option value="\u308A\u305D\u306A\u9280\u884C">
          <option value="\u57FC\u7389\u308A\u305D\u306A\u9280\u884C">
          <option value="PayPay\u9280\u884C">
          <option value="\u697D\u5929\u9280\u884C">
          <option value="\u4F4F\u4FE1SBI\u30CD\u30C3\u30C8\u9280\u884C">
        </datalist>
      </div>
      <div class="pe-field"><span>\u652F\u5E97\u540D</span><input id="payrollBranchName" type="text" placeholder="\u4F8B: \u6E0B\u8C37\u652F\u5E97"></div>
      
      <div class="pe-field"><span>\u7A2E\u5225</span><select id="payrollAccountType"><option value="">\u9078\u629E</option><option value="\u666E\u901A">\u666E\u901A</option><option value="\u5F53\u5EA7">\u5F53\u5EA7</option></select></div>
      <div class="pe-field"><span>\u53E3\u5EA7\u756A\u53F7\uFF087\u6841\uFF09</span><input id="payrollAccountNumber" type="text" inputmode="numeric" placeholder="1234567"></div>
      <div class="pe-field"><span>\u540D\u7FA9\uFF08\u30AB\u30CA\uFF09</span><input id="payrollAccountHolder" type="text" placeholder="\u4F8B: \u30E4\u30DE\u30C0\u30BF\u30ED\u30A6"></div>
      <div class="pe-field"><span>\u632F\u8FBC\u652F\u7D66\u984D\uFF08\u4EFB\u610F\uFF09</span><div class="pe-money"><input id="payrollPayBank" type="text" inputmode="numeric" placeholder="0\uFF08\u7A7A\u6B04=\u81EA\u52D5\uFF09"><span>\u5186</span></div></div>
      
      <div class="pe-field"><span>\u73FE\u91D1\u652F\u7D66\u984D</span><div class="pe-money"><input id="payrollPayCash" type="text" inputmode="numeric" placeholder="0"><span>\u5186</span></div></div>
      <div class="pe-field"><span>\u73FE\u7269\u652F\u7D66\u984D</span><div class="pe-money"><input id="payrollPayKind" type="text" inputmode="numeric" placeholder="0"><span>\u5186</span></div></div>
    </div>
  `;const ie=document.createElement("div");ie.id="peHistoryView",ie.className="pe-history-view w-full",ie.style.cssText="display: none; width: 100%; box-sizing: border-box;",ie.innerHTML=`
    <div class="pe-card w-full" style="margin-top: 0; width: 100%; box-sizing: border-box;">
      <div class="pe-title" style="margin-top:0">\u9001\u4FE1\u5C65\u6B74</div>
      
      <div style="display: flex; gap: 16px; margin-bottom: 16px; align-items: flex-end; flex-wrap: wrap;">
        <label class="pe-field" style="width: 200px;">
          <span>\u5BFE\u8C61\u5E74\u6708</span>
          <input type="month" id="historyFilterMonth">
        </label>
        <label class="pe-field" style="width: 250px;">
          <span>\u793E\u54E1\u9078\u629E</span>
          <select id="historyFilterUserId">
            <option value="">\u3059\u3079\u3066</option>
          </select>
        </label>
        <button type="button" id="btnFilterHistory" style="padding: 0 16px; height: 30px; border: 1px solid #cbd5e1; border-radius: 4px; background: #fff; cursor: pointer; font-size: 13px; font-weight: 500; color: #0f172a; display: flex; align-items: center; gap: 6px;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
          \u7D5E\u308A\u8FBC\u307F
        </button>
      </div>

      <div style="width: 100%; overflow-x: auto;">
        <table class="pe-table w-full" style="width: 100%; box-sizing: border-box; table-layout: fixed;">
          <thead>
            <tr>
              <th style="width:180px">\u9001\u4FE1\u65E5\u6642</th>
              <th style="width:100px">\u5E74\u6708</th>
              <th style="width:200px">\u5BFE\u8C61\u8005</th>
              <th style="width:80px">\u7D50\u679C</th>
              <th>\u30A8\u30E9\u30FC\u8A73\u7D30\uFF08\u30D5\u30A1\u30A4\u30EB\u540D\uFF09</th>
            </tr>
          </thead>
          <tbody id="payrollHistoryBody">
            <tr><td colspan="5" style="text-align:center;padding:24px 16px;color:#64748b">\u9001\u4FE1\u5C65\u6B74\u304C\u3042\u308A\u307E\u305B\u3093</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `,k.appendChild(ie);const fe=document.createElement("div");fe.style.cssText="display: flex; flex-direction: column; gap: 12px;",fe.appendChild(be),fe.appendChild(T);const Y=document.createElement("div");Y.className="pe-grid",Y.appendChild(P),Y.appendChild($e),Y.appendChild(fe),Y.appendChild(V),ne.appendChild(Y);const Ye=P.querySelector("#toggleAttendance"),Me=P.querySelector("#payrollAttendanceSection"),We=P.querySelector("#iconToggleAttendance");Ye&&Me&&Ye.addEventListener("click",()=>{const e=Me.style.display==="none";Me.style.display=e?"grid":"none",We&&(We.style.transform=e?"rotate(0deg)":"rotate(-90deg)")});const Ge=T.querySelector("#chkShowYearEnd"),Je=T.querySelector("#payrollYearEndSection");Ge&&Je&&Ge.addEventListener("change",e=>{Je.style.display=e.target.checked?"block":"none"});const m=document.createElement("div");m.id="payrollPreviewModalOverlay",m.className="modal-overlay",m.style.display="none",m.style.position="fixed",m.style.top="0",m.style.left="0",m.style.right="0",m.style.bottom="0",m.style.width="100vw",m.style.height="100vh",m.style.backgroundColor="rgba(0, 0, 0, 0.5)",m.style.zIndex="2147483647",m.style.padding="56px 20px 24px",m.style.boxSizing="border-box",m.style.overflowY="auto",m.style.alignItems="flex-start",m.style.justifyContent="center";const S=document.createElement("div");S.className="pe-card",S.style.width="95%",S.style.maxWidth="1200px",S.style.position="relative",S.style.padding="16px 24px",S.style.background="#ffffff",S.style.border="1px solid #cbd5e1",S.style.borderRadius="8px",S.style.color="#0f172a",S.style.opacity="1",S.style.boxShadow="0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",S.style.display="block",m.appendChild(S),document.body.appendChild(m),m.addEventListener("click",e=>{if(e.target===m){const o=document.getElementById("btnPreviewPayroll");o?o.click():m.style.display="none"}});const U=w.querySelector("#btnPreviewPayroll"),he="\u30D7\u30EC\u30D3\u30E5\u30FC",Mt='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>',Nt='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>',Qe=e=>{U&&(m.style.display=e?"flex":"none",e?(U.title=`${he}\uFF08\u9589\u3058\u308B\uFF09`,U.innerHTML=`${Nt} ${he}`):(U.title=he,U.innerHTML=`${Mt} ${he}`))},Xe=k.querySelectorAll(".pe-tab-btn"),Ze=k.querySelector("#peEditorView"),et=k.querySelector("#peHistoryView");Xe.forEach(e=>{e.addEventListener("click",async()=>{Xe.forEach(n=>n.classList.remove("active")),e.classList.add("active"),e.dataset.tab==="editor"?(Ze.style.display="block",et.style.display="none"):(Ze.style.display="none",et.style.display="block",await J())})});const ae=w.querySelector("#payrollMsg"),Ne=w.querySelector("#btnCreatePdf"),j=w.querySelector("#btnDownloadPdf");j&&(j.disabled=!0);let De=null;const s=(e,o=!1)=>{ae&&(ae.textContent=String(e||""),ae.style.color=o?"#065f46":"#ef4444",De&&clearTimeout(De),e&&(De=setTimeout(()=>{ae.textContent===e&&(ae.textContent="")},5e3)))},W=(e,o="error")=>$t(e)?(s(""),!1):(s(e&&e.message?e.message:o),!0),Dt=uo(await no().catch(()=>[])),O=P.querySelector("#payrollUserId"),tt=document.getElementById("historyFilterUserId");for(const e of Dt){const o=String(e.role||"").toLowerCase();if(o==="admin"||o==="manager")continue;const n=document.createElement("option");n.value=String(e.id);const t=co(e);if(n.textContent=`${t} ${e.username||e.email}`.trim(),O.appendChild(n),tt){const i=n.cloneNode(!0);tt.appendChild(i)}}const G=P.querySelector("#payrollMonth"),M=()=>({userId:String(O.value||"").trim(),month:String(G.value||"").trim()});try{let e=String(localStorage.getItem("payroll.lastUserId")||"").trim();const o=String(localStorage.getItem("payroll.lastMonth")||"").trim();if(!e&&O.options.length>1&&(e=O.options[1].value),e&&O.querySelector(`option[value="${CSS.escape(e)}"]`)&&(O.value=e),/^\d{4}-\d{2}$/.test(o))G.value=o;else{const n=new Date,t=String(n.getMonth()+1).padStart(2,"0");G.value=`${n.getFullYear()}-${t}`}}catch{}let ot="",q="",K="",F=null;const re=()=>{const e=M(),o=`${e.userId}|${e.month}`;o&&o===ot||(ot=o,q="",K="",F=null,j&&(j.disabled=!0))},Ae=(e,o)=>{const n=e&&typeof e=="object"?e:{},t=o&&typeof o=="object"?o:{},i={...n,...t},a=l=>{const p=n[l]&&typeof n[l]=="object"?n[l]:null,u=t[l]&&typeof t[l]=="object"?t[l]:null;(p||u)&&(i[l]={...p||{},...u||{}})};return a("kintai"),a("payment"),a("bankAccountParts"),a("overrideEarnings"),a("overrideDeductions"),!Object.prototype.hasOwnProperty.call(t,"extraEarnings")&&Object.prototype.hasOwnProperty.call(n,"extraEarnings")&&(i.extraEarnings=n.extraEarnings),!Object.prototype.hasOwnProperty.call(t,"extraDeductions")&&Object.prototype.hasOwnProperty.call(n,"extraDeductions")&&(i.extraDeductions=n.extraDeductions),!Object.prototype.hasOwnProperty.call(t,"otherItems")&&Object.prototype.hasOwnProperty.call(n,"otherItems")&&(i.otherItems=n.otherItems),i};let le=!1;const He=()=>{const e=P.querySelector("#payrollAutoCalc"),o=String(e&&e.value!=null?e.value:"0")==="1",n=["#ovDedHealth","#ovDedCare","#ovDedPension","#ovDedEmployment","#ovDedIncome"];for(const t of n){const i=document.querySelector(t);i&&(i.disabled=o,o?(i.value="",i.placeholder="\u81EA\u52D5\u8A08\u7B97"):i.placeholder="0")}},At=async()=>{He();const e=P.querySelector("#payrollAutoCalc");if(String(e&&e.value!=null?e.value:"0")==="1"){const n=document.querySelector(".admin-layout")||document.body;let t=null;try{t=document.createElement("div"),t.style.position="fixed",t.style.top="0",t.style.left="0",t.style.right="0",t.style.bottom="0",t.style.backgroundColor="rgba(255, 255, 255, 0.6)",t.style.zIndex="999999",t.style.display="flex",t.style.alignItems="center",t.style.justifyContent="center",t.style.fontSize="16px",t.style.fontWeight="bold",t.style.color="#334155",t.innerHTML=`<div style="background:white;padding:20px 40px;border-radius:8px;box-shadow:0 10px 25px rgba(0,0,0,0.1);display:flex;align-items:center;gap:12px;">
          <div style="width:20px;height:20px;border:3px solid #e2e8f0;border-top-color:#3b82f6;border-radius:50%;animation:spin 1s linear infinite;"></div>
          \u52E4\u6020\u30C7\u30FC\u30BF\u3092\u81EA\u52D5\u53D6\u5F97\u4E2D...
        </div><style>@keyframes spin{to{transform:rotate(360deg)}}</style>`,n.appendChild(t),await gt()}catch(i){console.error(i)}finally{t&&t.parentNode&&t.parentNode.removeChild(t),s("")}}ve()},{addRow:nt,collectItems:yo,setForm:Ht,buildPayload:Lt}=ao({doc:document,basicCard:P,dedCard:be,otherCard:T,payCard:V,signal:r,parseNum:so,yen:ce}),zt=e=>{Ht(e),He();try{const o=e&&typeof e=="object"&&e.overrideEarnings&&typeof e.overrideEarnings=="object"?e.overrideEarnings:{};le=Object.prototype.hasOwnProperty.call(o,"\u6B20\u52E4\u63A7\u9664")}catch{le=!1}},ge=async()=>{const e=await Lt();if(!le&&e&&typeof e=="object"){const o=e.overrideEarnings&&typeof e.overrideEarnings=="object"?e.overrideEarnings:null;o&&Object.prototype.hasOwnProperty.call(o,"\u6B20\u52E4\u63A7\u9664")&&(delete o.\u6B20\u52E4\u63A7\u9664,Object.keys(o).length||delete e.overrideEarnings)}return e},it=({gross:e,deduct:o,net:n,paySum:t,hint:i})=>{const a=document.querySelector("#kpiGross"),l=document.querySelector("#kpiDeduct"),p=document.querySelector("#kpiNet"),u=document.querySelector("#kpiPaySum"),y=document.querySelector("#kpiHint");a&&(a.textContent=e==null?"-":ue(e)),l&&(l.textContent=o==null?"-":ue(o)),p&&(p.textContent=n==null?"-":ue(n)),u&&(u.textContent=t==null?"-":ue(t)),y&&(y.innerHTML=String(i||""));try{const h=Number(n||0),c=Number(t||0),v=h>0&&Math.round(c)===Math.round(h);Ne&&(Ne.disabled=!v,Ne.style.opacity=v?"1":"0.55"),j&&(j.disabled=!v||!q,j.style.opacity=!v||!q?"0.55":"1")}catch{}},se=(e,{money:o=!0,hide:n=[]}={})=>{const t=[];for(const[i,a]of Object.entries(e||{}))n.includes(i)||a!=null&&(o&&typeof a=="number"&&!po(i)||t.push([i,a]));return`
      <table class="pe-preview-table">
        ${t.map(([i,a])=>{const l=typeof a=="number"&&o?ue(a):D(a);return`<tr><td>${D(i)}</td><td>${l}</td></tr>`}).join("")}
      </table>
    `},jt=e=>{const o={\u5C31\u696D\u6642\u9593:t=>me(t),\u6CD5\u5916\u6642\u9593\u5916:t=>me(t),\u903140\u8D85\u6642\u9593:t=>me(t),\u670860\u8D85\u6642\u9593:t=>me(t),\u6DF1\u591C\u52E4\u6642\u9593:t=>me(t)};return`
      <table class="pe-preview-table">
        ${["\u51FA\u52E4\u65E5\u6570","\u4F11\u65E5\u51FA\u52E4\u65E5\u6570","\u534A\u65E5\u51FA\u52E4\u65E5\u6570","\u6B20\u52E4\u65E5\u6570","\u6709\u7D66\u4F11\u6687","\u5C31\u696D\u6642\u9593","\u6CD5\u5916\u6642\u9593\u5916","\u903140\u8D85\u6642\u9593","\u670860\u8D85\u6642\u9593","\u6DF1\u591C\u52E4\u6642\u9593"].map(t=>{if(!Object.prototype.hasOwnProperty.call(e||{},t))return"";const i=e[t],a=o[t]||(p=>p),l=typeof i=="string"&&i.includes(":")?D(i):D(typeof i=="number"?a(i):i);return`<tr><td>${D(t)}</td><td>${l}</td></tr>`}).join("")}
      </table>
    `},at=e=>{if(!e)return;try{K=String(e&&e.\u5F93\u696D\u54E1\u30B3\u30FC\u30C9?e.\u5F93\u696D\u54E1\u30B3\u30FC\u30C9:"").trim()||K}catch{}const o=e&&e.\u5408\u8A08&&typeof e.\u5408\u8A08=="object"?e.\u5408\u8A08:{},n=e&&e.\u652F\u6255&&typeof e.\u652F\u6255=="object"?e.\u652F\u6255:{},t=e&&e.\u52E4\u6020&&typeof e.\u52E4\u6020=="object"?{...e.\u52E4\u6020}:{},i=e&&e.\u652F\u7D66&&typeof e.\u652F\u7D66=="object"?e.\u652F\u7D66:{},a=e&&e.\u63A7\u9664&&typeof e.\u63A7\u9664=="object"?e.\u63A7\u9664:{},l=e&&e.\u305D\u306E\u4ED6&&typeof e.\u305D\u306E\u4ED6=="object"?e.\u305D\u306E\u4ED6:{},p=document.querySelector("#payrollKWorkHours");p&&p.value&&(t.\u5C31\u696D\u6642\u9593=String(p.value).trim());const u=document.querySelector("#payrollKOverHours");u&&u.value&&(t.\u903140\u8D85\u6642\u9593=String(u.value).trim());const y=document.querySelector("#payrollKLegalHours");y&&y.value&&(t.\u6CD5\u5916\u6642\u9593\u5916=String(y.value).trim());const h=document.querySelector("#payrollKOver60Hours");h&&h.value&&(t.\u670860\u8D85\u6642\u9593=String(h.value).trim());const c=document.querySelector("#payrollKNightHours");c&&c.value&&(t.\u6DF1\u591C\u52E4\u6642\u9593=String(c.value).trim());const v=Number(o.\u5DEE\u5F15\u652F\u7D66\u984D||0),C=Number(n.\u632F\u8FBC\u652F\u7D66\u984D||0)+Number(n.\u73FE\u91D1\u652F\u7D66\u984D||0)+Number(n.\u73FE\u7269\u652F\u7D66\u984D||0),b=Math.round(C)===Math.round(v);try{const A=document.querySelector("#payrollNetPay"),X=document.querySelector("#payrollPaySum");A&&(A.value=Ve(v)),X&&(X.value=Ve(C))}catch{}const $=document.querySelector("#payrollAutoCalc"),xe=String($&&$.value!=null?$.value:"0")==="1"?"\u3010\u81EA\u52D5\u8A08\u7B97ON\u3011 \u4FDD\u967A\u6599\u30FB\u6240\u5F97\u7A0E\u306F\u81EA\u52D5\u7B97\u51FA\u3055\u308C\u307E\u3059":"\u3010\u81EA\u52D5\u8A08\u7B97OFF\u3011 \u4FDD\u967A\u6599\u30FB\u6240\u5F97\u7A0E\u306F\u624B\u5165\u529B\u306E\u5024\u304C\u4F7F\u7528\u3055\u308C\u307E\u3059";try{if(!le){const A=document.querySelector("#ovEarnAbsent"),X=Number(t.\u6B20\u52E4\u65E5\u6570||0),we=Object.prototype.hasOwnProperty.call(i,"\u6B20\u52E4\u63A7\u9664")?ce(i.\u6B20\u52E4\u63A7\u9664):0;A&&(A.value=X>0&&we?String(we):"")}}catch{}S.innerHTML=`
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <div class="pe-title" style="margin:0;font-size:16px;">\u7D66\u4E0E\u660E\u7D30\u66F8\uFF08\u30D7\u30EC\u30D3\u30E5\u30FC\uFF09</div>
        <button type="button" class="btn" onclick="document.getElementById('btnPreviewPayroll').click();" style="padding:4px 12px;background:#f8fafc;border:1px solid #cbd5e1;border-radius:6px;cursor:pointer;font-weight:600;font-size:12px;color:#334155;transition:all 0.2s;">\u30AD\u30E3\u30F3\u30BB\u30EB</button>
      </div>
      <div class="pe-muted" style="margin-bottom:6px;font-size:12px;">${D(e&&e.\u5BFE\u8C61\u5E74\u6708?e.\u5BFE\u8C61\u5E74\u6708:"")} / ${D(e&&e.\u6240\u5C5E?e.\u6240\u5C5E:"")} / ${D(e&&e.\u6C0F\u540D?e.\u6C0F\u540D:"")}\uFF08${D(e&&e.\u5F93\u696D\u54E1\u30B3\u30FC\u30C9?e.\u5F93\u696D\u54E1\u30B3\u30FC\u30C9:"")}\uFF09</div>
      <div class="pe-muted" style="margin-bottom:6px;color:#0ea5e9;font-size:12px;">${xe}</div>
      <div class="pe-muted" style="margin-bottom:12px;font-size:12px;">\u5DEE\u5F15\u652F\u6255\u984D\uFF08\u624B\u53D6\u308A\uFF09 = \u652F\u6255\u5185\u8A33\u5408\u8A08 \u2212 \u63A7\u9664\u5408\u8A08</div>
      
      <div style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px; align-items: start;">
        <div>
          <div class="pe-title" style="margin:0 0 8px 0; font-size: 14px;">\u52E4\u6020</div>
          ${jt(t||{})}
        </div>
        <div>
          <div class="pe-title" style="margin:0 0 8px 0; font-size: 14px;">\u652F\u6255\u65B9\u6CD5</div>
          ${se({\u632F\u8FBC:n.\u632F\u8FBC\u652F\u7D66\u984D||0,\u73FE\u91D1:n.\u73FE\u91D1\u652F\u7D66\u984D||0,\u73FE\u7269:n.\u73FE\u7269\u652F\u7D66\u984D||0,\u5408\u8A08:C},{money:!0})}
          <div class="pe-muted" style="margin-top:6px; font-size: 11px;">
            ${b?'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg><span style="color:#10b981; vertical-align: middle;">\u652F\u6255\u65B9\u6CD5\u5408\u8A08\u306F\u5DEE\u5F15\u652F\u6255\u984D\u3068\u4E00\u81F4\u3057\u3066\u3044\u307E\u3059</span>':'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg><span style="color:#ef4444; vertical-align: middle;">\u652F\u6255\u65B9\u6CD5\u5408\u8A08\u304C\u5DEE\u5F15\u652F\u6255\u984D\u3068\u4E00\u81F4\u3057\u307E\u305B\u3093</span>'}
          </div>
        </div>
        <div>
          <div class="pe-title" style="margin:0 0 8px 0; font-size: 14px;">\u652F\u7D66</div>
          ${se(i||{},{money:!0,hide:["\u5DEE\u984D\u8A08\u7B97","\u5E74\u672B\u8ABF\u6574\u9084\u4ED8"]})}
        </div>
        <div>
          <div class="pe-title" style="margin:0 0 8px 0; font-size: 14px;">\u63A7\u9664</div>
          ${se(a||{},{money:!0,hide:["\u793E\u4FDD\u5408\u8A08\u984D","\u8AB2\u7A0E\u5BFE\u8C61\u984D","\u8FFD\u52A0\u8A3A\u7642\u8CBB","\u5E74\u672B\u8ABF\u6574\u5FB4\u53CE"]})}
        </div>
        <div>
          <div class="pe-title" style="margin:0 0 8px 0; font-size: 14px;">\u305D\u306E\u4ED6</div>
          ${se(l||{},{money:!0})}
        </div>
        <div>
          <div class="pe-title" style="margin:0 0 8px 0; font-size: 14px;">\u5408\u8A08</div>
          ${se({\u7DCF\u652F\u7D66\u984D:o.\u7DCF\u652F\u7D66\u984D||0,\u7DCF\u63A7\u9664\u984D:o.\u7DCF\u63A7\u9664\u984D||0,\u305D\u306E\u4ED6\u53C2\u8003:o.\u305D\u306E\u4ED6\u5408\u8A08||0,\u5DEE\u5F15\u652F\u7D66\u984D:o.\u5DEE\u5F15\u652F\u7D66\u984D||0},{money:!0})}
        </div>
      </div>
    `;const de=document.createElement("details");de.style.marginTop="10px",de.innerHTML=`<summary class="pe-title">JSON\uFF08\u30C7\u30D0\u30C3\u30B0\uFF09</summary><pre style="white-space:pre-wrap;background:#fff;border:none;border-radius:0;padding:10px 12px;overflow:auto;font-size:12px;line-height:1.4;margin:0;">${JSON.stringify(e||{},null,2)}</pre>`,S.appendChild(de)},rt=ro({fetchJSONAuth:Ct}),{computeEmp:Le,persistPayload:lt,generatePayslip:Ot,publishPayslip:Tt,listDeliveries:qt}=rt,ze=e=>{if(!e)return"";const o=new Date(e);if(isNaN(o.getTime()))return e;const n=o.getFullYear(),t=String(o.getMonth()+1).padStart(2,"0"),i=String(o.getDate()).padStart(2,"0"),a=String(o.getHours()).padStart(2,"0"),l=String(o.getMinutes()).padStart(2,"0");return`${n}/${t}/${i} ${a}:${l}`},st=e=>{const o=document.getElementById("payrollHistoryBody");if(!o)return;const n=Array.isArray(e)?e:[];if(!n.length){o.innerHTML='<tr><td colspan="5" style="text-align:center;padding:24px 16px;color:#64748b">\u9001\u4FE1\u5C65\u6B74\u304C\u3042\u308A\u307E\u305B\u3093</td></tr>';return}o.innerHTML=n.map(t=>{const i=ze(t&&t.sentAt?t.sentAt:""),a=Q(t&&t.userName?t.userName:""),l=Q(t&&t.month?t.month:""),p=Q(t&&t.fileName?t.fileName:""),u=String(t&&t.fileId!=null?t.fileId:"");return`
        <tr>
          <td>${i}</td>
          <td>${l}</td>
          <td>${a}</td>
          <td><span style="color:#10b981;font-weight:bold;">\u6210\u529F</span></td>
          <td>${u?`<a href="#" data-file-id="${Q(u)}" data-file-name="${p}" style="color:#1d4ed8;text-decoration:underline;">${p||"PDF"}</a>`:`${p||"-"}`}</td>
        </tr>
      `}).join(""),o.querySelectorAll("a[data-file-id]").forEach(t=>{t.addEventListener("click",async i=>{i.preventDefault();const a=String(t.getAttribute("data-file-id")||"").trim();if(!a)return;let l=null;try{l=window.open("about:blank","_blank")}catch{}if(!l){s("\u30DD\u30C3\u30D7\u30A2\u30C3\u30D7\u304C\u30D6\u30ED\u30C3\u30AF\u3055\u308C\u307E\u3057\u305F\u3002\u8A31\u53EF\u3057\u3066\u304F\u3060\u3055\u3044\u3002");return}I(l,"\u51E6\u7406\u4E2D\u2026");let p=null;try{p=await _e(`/api/payslips/admin/file/${encodeURIComponent(a)}`)}catch(c){I(l,"\u30A8\u30E9\u30FC",c&&c.message?c.message:"error");return}if(!String(p.headers.get("content-type")||"").toLowerCase().includes("application/pdf")){let c="";try{c=await p.clone().text()}catch{}I(l,"PDF\u306E\u53D6\u5F97\u306B\u5931\u6557\u3057\u307E\u3057\u305F\u3002",c||"");return}const y=await p.blob(),h=URL.createObjectURL(y);try{l.location.href=h}catch{}setTimeout(()=>{try{URL.revokeObjectURL(h)}catch{}},3e4)})})},J=async()=>{try{const e=document.getElementById("historyFilterMonth")?.value||null,o=document.getElementById("historyFilterUserId")?.value||null,n=await qt({userId:o,month:e});st(n&&Array.isArray(n.items)?n.items:[])}catch{const o=document.getElementById("payrollHistoryBody");o?o.innerHTML='<tr><td colspan="5" style="text-align:center;padding:24px 16px;color:#b91c1c;font-weight:600;">\u9001\u4FE1\u5C65\u6B74\u306E\u53D6\u5F97\u306B\u5931\u6557\u3057\u307E\u3057\u305F\uFF08\u30B5\u30FC\u30D0\u30FC\u518D\u8D77\u52D5\u304C\u5FC5\u8981\u306A\u53EF\u80FD\u6027\u304C\u3042\u308A\u307E\u3059\uFF09</td></tr>':st([])}},dt=document.getElementById("btnFilterHistory");dt&&dt.addEventListener("click",async()=>{s("\u5C65\u6B74\u3092\u7D5E\u308A\u8FBC\u3093\u3067\u3044\u307E\u3059..."),await J(),s("\u7D5E\u308A\u8FBC\u307F\u5B8C\u4E86",!0)});const pt=async()=>{const e=M();if(!e.userId||!/^\d{4}-\d{2}$/.test(e.month))return s("\u793E\u54E1\u3068\u6708\u3092\u9078\u629E"),null;let o=null;try{o=await rt.loadInput({userId:e.userId,month:e.month})}catch{}const n=o&&o.payload&&typeof o.payload=="object"?o.payload:null;if(n&&Object.keys(n).length){zt(n),F=n;const t=o&&o.is_published?"\u{1F7E2} \u516C\u958B\u6E08":"\u{1F534} \u672A\u516C\u958B",i=o&&o.updatedAt?` (\u6700\u7D42\u66F4\u65B0: ${ze(o.updatedAt)})`:"";return s(`\u8AAD\u307F\u8FBC\u307F\u307E\u3057\u305F\uFF08${t}\uFF09${i}`),await J(),n}return s("\u4FDD\u5B58\u30C7\u30FC\u30BF\u304C\u3042\u308A\u307E\u305B\u3093\uFF08\u672A\u4FDD\u5B58\uFF09"),F=null,await J(),n||{}},Ft=async()=>{const e=M();if(!e.userId||!/^\d{4}-\d{2}$/.test(e.month)){s("\u793E\u54E1\u3068\u6708\u3092\u9078\u629E");return}const o=await ge(),n=Ae(F,o);await lt({userId:e.userId,month:e.month,payload:n}),F=n,s("\u4FDD\u5B58\u3057\u307E\u3057\u305F",!0)},Bt=async()=>{const e=M();if(!e.userId||!/^\d{4}-\d{2}$/.test(e.month)){s("\u793E\u54E1\u3068\u6708\u3092\u9078\u629E");return}re();const o=await ge(),n=Ae(F,o),t=await Le({userId:e.userId,month:e.month,payload:n});try{const i=t&&t.\u5408\u8A08&&typeof t.\u5408\u8A08=="object"?t.\u5408\u8A08:{},a=t&&t.\u652F\u6255&&typeof t.\u652F\u6255=="object"?t.\u652F\u6255:{},l=Number(i.\u5DEE\u5F15\u652F\u7D66\u984D||0),p=Number(a.\u632F\u8FBC\u652F\u7D66\u984D||0)+Number(a.\u73FE\u91D1\u652F\u7D66\u984D||0)+Number(a.\u73FE\u7269\u652F\u7D66\u984D||0),u=Math.round(p)!==Math.round(l)?`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg> <span style="color:#ef4444">\u652F\u6255\u65B9\u6CD5\u304C\u4E00\u81F4\u3057\u307E\u305B\u3093\uFF08${Math.round(p)} != ${Math.round(l)}\uFF09</span>`:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg> <span style="color:#10b981">\u652F\u6255\u65B9\u6CD5\u5408\u8A08\u306F\u5DEE\u5F15\u652F\u6255\u984D\u3068\u4E00\u81F4\u3057\u3066\u3044\u307E\u3059</span>',y=P.querySelector("#payrollAutoCalc"),c=String(y&&y.value!=null?y.value:"0")==="1"?'<span style="color:#3b82f6;background:#eff6ff;padding:2px 6px;border-radius:4px;font-size:12px;margin-left:8px;font-weight:600">\u81EA\u52D5\u8A08\u7B97ON</span>':'<span style="color:#64748b;background:#e2e8f0;padding:2px 6px;border-radius:4px;font-size:12px;margin-left:8px;font-weight:600">\u81EA\u52D5\u8A08\u7B97OFF</span>';it({gross:i.\u7DCF\u652F\u7D66\u984D,deduct:i.\u7DCF\u63A7\u9664\u984D,net:l,paySum:p,hint:`${u} ${c}`})}catch{}at(t)},{scheduleRealtime:ve}=lo({getKey:M,buildPayload:ge,computeEmp:Le,setKpi:it,updatePreview:at,clearPdfStateIfKeyChanged:re}),bo=e=>{try{e&&!e.closed&&e.close()}catch{}},Q=e=>String(e??"").replace(/[&<>"']/g,o=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[o]||o),I=(e,o,n="")=>{if(!e||e.closed)return;const t=Q(o),i=Q(n);try{e.document.open()}catch{}try{e.document.write(`<title>${t}</title><meta charset="utf-8"><style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;margin:24px;color:#0f172a}h1{font-size:16px;margin:0 0 12px}pre{white-space:pre-wrap;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px}</style><h1>${t}</h1>${i?`<pre>${i}</pre>`:""}`),e.document.close()}catch{}},Ut=async e=>{const o=M();if(!o.userId||!/^\d{4}-\d{2}$/.test(o.month)){I(e,"\u793E\u54E1\u3068\u6708\u3092\u9078\u629E"),s("\u793E\u54E1\u3068\u6708\u3092\u9078\u629E");return}re(),s("\u51E6\u7406\u4E2D\u2026");try{const n=await ge(),t=Ae(F,n);await lt({userId:o.userId,month:o.month,payload:t}),F=t;const i=await Le({userId:o.userId,month:o.month,payload:t}).catch(()=>null);try{K=String(i&&i.\u5F93\u696D\u54E1\u30B3\u30FC\u30C9?i.\u5F93\u696D\u54E1\u30B3\u30FC\u30C9:"").trim()||String(o.userId)}catch{K=String(o.userId)}const a=i&&i.\u5408\u8A08&&typeof i.\u5408\u8A08=="object"?i.\u5408\u8A08:{},l=i&&i.\u652F\u6255&&typeof i.\u652F\u6255=="object"?i.\u652F\u6255:{},p=Number(a.\u5DEE\u5F15\u652F\u7D66\u984D||0),u=Math.round(Number(l.\u632F\u8FBC\u652F\u7D66\u984D||0)+Number(l.\u73FE\u91D1\u652F\u7D66\u984D||0)+Number(l.\u73FE\u7269\u652F\u7D66\u984D||0));if(!p){I(e,"\u5DEE\u5F15\u652F\u6255\u984D\u304C0\u3067\u3059\u3002"),s("\u5DEE\u5F15\u652F\u6255\u984D\u304C0\u3067\u3059\u3002");return}if(u!==Math.round(p)){I(e,"\u652F\u6255\u65B9\u6CD5\u304C\u4E00\u81F4\u3057\u307E\u305B\u3093",`${u} != ${p}`),s(`\u652F\u6255\u65B9\u6CD5\u5408\u8A08\u304C\u5DEE\u5F15\u652F\u6255\u984D\u3068\u4E00\u81F4\u3057\u307E\u305B\u3093\uFF08${u} != ${p}\uFF09\u3002`);return}const y=await Ot({userId:o.userId,month:o.month});if(!(y&&y.secureUrl)){I(e,"PDF\u4F5C\u6210\u306B\u5931\u6557\u3057\u307E\u3057\u305F\u3002"),s("PDF\u4F5C\u6210\u306B\u5931\u6557\u3057\u307E\u3057\u305F\u3002",!1);return}q=String(y.secureUrl||""),j&&(j.disabled=!1),await Kt(e),s("PDF\u3092\u4F5C\u6210\u3057\u307E\u3057\u305F",!0),await J()}catch(n){I(e,"\u30A8\u30E9\u30FC",n&&n.message?n.message:"error"),s(n&&n.message?n.message:"error")}},Kt=async e=>{const o=M();if(!o.userId||!/^\d{4}-\d{2}$/.test(o.month)){I(e,"\u793E\u54E1\u3068\u6708\u3092\u9078\u629E"),s("\u793E\u54E1\u3068\u6708\u3092\u9078\u629E");return}if(re(),!q){I(e,"\u307E\u3060PDF\u304C\u3042\u308A\u307E\u305B\u3093\u3002","\u5148\u306B\u300CPDF\u4F5C\u6210\u300D\u3092\u62BC\u3057\u3066\u304F\u3060\u3055\u3044\u3002"),s("\u307E\u3060PDF\u304C\u3042\u308A\u307E\u305B\u3093\u3002\u5148\u306B\u300CPDF\u4F5C\u6210\u300D\u3092\u62BC\u3057\u3066\u304F\u3060\u3055\u3044\u3002");return}s("\u51E6\u7406\u4E2D\u2026");let n=e;if(!n)try{n=window.open("about:blank","_blank")}catch{}let t=null;try{t=await _e(q)}catch(x){I(n,"\u30A8\u30E9\u30FC",x&&x.message?x.message:"error"),s(x&&x.message?x.message:"error");return}if(!String(t.headers.get("content-type")||"").toLowerCase().includes("application/pdf")){let x="";try{x=await t.clone().text()}catch{}I(n,"PDF\u306E\u53D6\u5F97\u306B\u5931\u6557\u3057\u307E\u3057\u305F\u3002",x||""),s(x||"PDF\u306E\u53D6\u5F97\u306B\u5931\u6557\u3057\u307E\u3057\u305F\u3002",!1);return}const a=await t.blob(),l=URL.createObjectURL(a),p=o.month.slice(0,4),u=o.month.slice(5,7),h=String(new Date().getDate()).padStart(2,"0"),c=String(K||o.userId).trim()||String(o.userId);let v="";const C=document.getElementById("payrollUserId");C&&C.selectedIndex>0&&(v=C.options[C.selectedIndex].textContent.replace(c,"").trim());const b=v?`_${v}`:"",$=`${p}\u5E74${u}\u6708${h}\u65E5_\u7D66\u4E0E\u660E\u7D30${b}_${c}.pdf`;try{if(n){n.location.href=l;try{n.document.title=$}catch{}}else window.open(l,"_blank")}catch{}setTimeout(()=>{try{URL.revokeObjectURL(l)}catch{}},3e4),s("PDF\u3092\u958B\u304D\u307E\u3057\u305F",!0)},Rt=async()=>{const e=M();if(!e.userId||!/^\d{4}-\d{2}$/.test(e.month)){s("\u793E\u54E1\u3068\u6708\u3092\u9078\u629E");return}if(!q){s("\u307E\u3060PDF\u304C\u3042\u308A\u307E\u305B\u3093\u3002\u5148\u306B\u300CPDF\u4F5C\u6210\u300D\u3092\u62BC\u3057\u3066\u304F\u3060\u3055\u3044\u3002");return}s("\u51E6\u7406\u4E2D\u2026");let o=null;try{o=await _e(q)}catch(b){s(b&&b.message?b.message:"error");return}if(!String(o.headers.get("content-type")||"").toLowerCase().includes("application/pdf")){let b="";try{b=await o.clone().text()}catch{}s(b||"PDF\u306E\u53D6\u5F97\u306B\u5931\u6557\u3057\u307E\u3057\u305F\u3002",!1);return}const t=await o.blob(),i=URL.createObjectURL(t),a=e.month.slice(0,4),l=e.month.slice(5,7),u=String(new Date().getDate()).padStart(2,"0"),y=String(K||e.userId).trim()||String(e.userId);let h="";const c=document.getElementById("payrollUserId");c&&c.selectedIndex>0&&(h=c.options[c.selectedIndex].textContent.replace(y,"").trim());const v=h?`_${h}`:"",C=`${a}\u5E74${l}\u6708${u}\u65E5_\u7D66\u4E0E\u660E\u7D30${v}_${y}.pdf`;try{const b=document.createElement("a");b.href=i,b.download=C,b.click()}catch{}setTimeout(()=>{try{URL.revokeObjectURL(i)}catch{}},3e4),s("PDF\u3092\u30C0\u30A6\u30F3\u30ED\u30FC\u30C9\u3057\u307E\u3057\u305F",!0)};k.addEventListener("change",e=>{if(!(!e||!e.target)&&e.target.id==="payrollAutoCalc"){At();return}},{passive:!0,signal:r}),k.addEventListener("input",e=>{!e||!e.target||e.target.id!=="payrollAutoCalc"&&ve()},{passive:!0,signal:r});const je=document.querySelector("#ovEarnAbsent");je&&je.addEventListener("input",()=>{le=!!String(je.value||"").trim()},{signal:r});const ct=document.querySelector("#btnAddEarn");ct&&ct.addEventListener("click",()=>nt("#payrollEarnings"),{signal:r});const ut=document.querySelector("#btnAddDed");ut&&ut.addEventListener("click",()=>nt("#payrollDeductions"),{signal:r});const mt=w.querySelector("#btnLoadPayroll");mt&&mt.addEventListener("click",()=>pt().catch(e=>W(e)),{signal:r});const yt=w.querySelector("#btnSavePayroll");yt&&yt.addEventListener("click",()=>Ft().catch(e=>W(e)),{signal:r}),U&&U.addEventListener("click",async()=>{if(m.style.display!=="none"){Qe(!1);return}let o=!1;try{await Bt(),o=!0}catch(n){W(n)}o&&Qe(!0)},{signal:r});const bt=w.querySelector("#btnCreatePdf");bt&&bt.addEventListener("click",()=>{let e=null;try{e=window.open("about:blank","_blank")}catch{}e||s("\u30DD\u30C3\u30D7\u30A2\u30C3\u30D7\u304C\u30D6\u30ED\u30C3\u30AF\u3055\u308C\u307E\u3057\u305F\u3002\u8A31\u53EF\u3057\u3066\u304F\u3060\u3055\u3044\u3002"),Ut(e).catch(o=>W(o))},{signal:r});const ft=w.querySelector("#btnDownloadPdf");ft&&ft.addEventListener("click",()=>{Rt().catch(e=>W(e))},{signal:r});const ht=w.querySelector("#btnPublishPayroll");ht&&ht.addEventListener("click",async()=>{const e=M();if(!e.userId||!/^\d{4}-\d{2}$/.test(e.month)){s("\u793E\u54E1\u3068\u6708\u3092\u9078\u629E");return}if(confirm(`${e.month}\u306E\u7D66\u4E0E\u660E\u7D30\u3092\u793E\u54E1\u306B\u9001\u4FE1\uFF08\u516C\u958B\uFF09\u3057\u307E\u3059\u304B\uFF1F

\u516C\u958B\u3059\u308B\u3068\u3001\u793E\u54E1\u306F\u30DE\u30A4\u30DA\u30FC\u30B8\u304B\u3089\u3053\u306E\u7D66\u4E0E\u660E\u7D30\u3092\u78BA\u8A8D\u3067\u304D\u308B\u3088\u3046\u306B\u306A\u308A\u307E\u3059\u3002`))try{s("\u9001\u4FE1\u4E2D...");const o=await Tt({userId:e.userId,month:e.month,is_published:!0});s(`\u793E\u54E1\u306B\u9001\u4FE1\u3057\u307E\u3057\u305F\uFF08${ze(new Date().toISOString())}\uFF09`,!0),await J()}catch(o){W(o,"\u9001\u4FE1\u306B\u5931\u6557\u3057\u307E\u3057\u305F")}},{signal:r});const gt=async()=>{const e=String(O.value||"").trim(),o=String(G.value||"").trim();if(!e||!/^\d{4}-\d{2}$/.test(o))return;const n=o.slice(0,4),t=o.slice(5,7);try{const i=await Promise.allSettled([Ct(`/api/attendance/month/detail?year=${encodeURIComponent(n)}&month=${encodeURIComponent(t)}&userId=${encodeURIComponent(e)}`)]),a=i[0].status==="fulfilled"?i[0].value:null;let l=0,p=0,u=0,y=0,h=0,c=0,v=0,C=0;const b=f=>{if(f==null||f==="")return 0;if(typeof f=="number")return isNaN(f)?0:f;const Z=String(f).trim(),H=Z.split(":");if(H.length!==2){const pe=Number(Z);return isNaN(pe)?0:pe}const ee=parseInt(H[0],10),Se=parseInt(H[1],10);return isNaN(ee)||isNaN(Se)?0:ee*60+Se};if(a&&typeof a=="object"){const f=Array.isArray(a.days)?a.days:[],Z=f.filter(g=>Number(g?.is_off||0)===1).length,H=f.length?f.length-Z:0,ee=g=>{const E=String(g?.daily?.kubun||"").trim();return E==="\u51FA\u52E4"||E==="\u534A\u4F11"||E==="\u4F11\u65E5\u51FA\u52E4"||E==="\u4EE3\u66FF\u51FA\u52E4"||Array.isArray(g?.segments)&&g.segments.some(L=>L?.checkIn||L?.checkOut)};l=f.filter(ee).length,p=f.filter(g=>Number(g?.is_off||0)===1&&ee(g)).length,u=Math.max(0,H-(l-p));const Se=(g,E)=>{const L=b(g),R=b(E);return L==null||R==null?null:R>=L?R-L:R+1440-L},pe=g=>{if(!g)return"";const E=String(g).split("T");return E.length>1&&E[1]?E[1].slice(0,5):""};for(const g of f){if(!ee(g))continue;const E=g?.daily||null,L=g?.shift||null,R=Array.isArray(g?.segments)?g.segments:[],_=R.length>0?R[0]:null,xt=new Date(String(g?.date||"")+"T00:00:00").getDay(),Te=Number(g?.is_off||0)===1||xt===0||xt===6,wt=String(E?.kubun||"").trim();let te=(Te?["\u4F11\u65E5","\u4F11\u65E5\u51FA\u52E4","\u4EE3\u66FF\u51FA\u52E4","\u632F\u66FF\u51FA\u52E4"]:["\u51FA\u52E4","\u534A\u4F11","\u534A\u4F11(\u6709\u7D66)","\u6B20\u52E4","\u6709\u7D66\u4F11\u6687","\u7121\u7D66\u4F11\u6687","\u4EE3\u66FF\u4F11\u65E5"]).includes(wt)?wt:"";const Gt=Te?"\u4F11\u65E5":"\u51FA\u52E4",Jt=new Set(["\u51FA\u52E4","\u534A\u4F11","\u534A\u4F11(\u6709\u7D66)","\u632F\u66FF\u51FA\u52E4","\u4F11\u65E5\u51FA\u52E4","\u4EE3\u66FF\u51FA\u52E4"]),qe=!!(_?.id||_?.checkIn||_?.checkOut);Te&&!te&&qe&&(te="\u4F11\u65E5\u51FA\u52E4");const Qt=te||Gt,Ee=Jt.has(Qt);if(te==="\u6B20\u52E4"||te==="\u6709\u7D66\u4F11\u6687"||te==="\u7121\u7D66\u4F11\u6687")continue;const kt=String(L?.start_time||"08:00").trim(),St=String(L?.end_time||"17:00").trim(),Xt=_?.checkIn?pe(_.checkIn):"",Zt=_?.checkOut?pe(_.checkOut):"",Fe=Ee?Xt||kt:"",Pe=Ee?Zt||St:"",Et=Ee||qe?Number(E?.breakMinutes??60):0,Pt=Ee||qe?Number(E?.nightBreakMinutes??0):0,eo=(Number.isFinite(Et)?Et:60)+(Number.isFinite(Pt)?Pt:0),Be=Fe&&Pe?Se(Fe,Pe):null,Ue=Be==null||Be<=0?0:Math.max(0,Be-eo);if(Ue>0){c+=Ue;const Ke=b(kt),Ie=b(St),Ce=b(Pe);let Re=0;if(Fe&&Pe&&Ce!=null&&Ke!=null&&Ie!=null){const It=Ie<Ke,to=It?Ie+1440:Ie,oo=It&&Ce<Ke?Ce+1440:Ce;Re=Math.max(0,oo-to)}else Re=Math.max(0,Ue-480);v+=Re}}const vt=a?.leaveSummary||{};y=Number(vt.paidDays||0),h=Number(vt.unpaidDays||0)}const $=f=>String(f==null||isNaN(f)?0:f),x=$(l),xe=$(p),de="0",A=$(u),X=$(h),we=$(y),ke=f=>Math.floor(f/60)+":"+String(f%60).padStart(2,"0"),_t=ke(c),Vt=ke(v),Yt=ke(v),Wt=ke(C),N=(f,Z)=>{const H=document.querySelector(f);H&&(H.value=Z,H.dispatchEvent(new Event("input",{bubbles:!0})),H.dispatchEvent(new Event("change",{bubbles:!0})))};N("#payrollKWork",x),N("#payrollKHoliday",xe),N("#payrollKHalf",de),N("#payrollKAbsent",A),N("#payrollKUnpaid",X),N("#payrollKPaid",we),N("#payrollKWorkHours",_t),N("#payrollKOverHours",Vt),N("#payrollKLegalHours",Yt),N("#payrollKOver60Hours","0:00"),N("#payrollKNightHours",Wt),ve()}catch(i){if($t(i))return;console.error("autoFill error:",i),s("\u52E4\u6020\u30C7\u30FC\u30BF\u306E\u81EA\u52D5\u53D6\u5F97\u306B\u5931\u6557\u3057\u307E\u3057\u305F: "+(i.message||""),!1)}},Oe=async()=>{const e=String(O.value||"").trim(),o=String(G.value||"").trim();if(!e||!/^\d{4}-\d{2}$/.test(o))return;re();try{localStorage.setItem("payroll.lastUserId",e)}catch{}try{localStorage.setItem("payroll.lastMonth",o)}catch{}s("\u30C7\u30FC\u30BF\u53D6\u5F97\u4E2D...");const n=await pt().catch(()=>null);try{const t=await io(e);if(t){const i=document.querySelector("#payrollBaseMonthly");i&&(!i.value||i.value==="0")&&(i.value=t.base_salary!=null?String(t.base_salary):"");const a=document.querySelector("#payrollTransport");a&&(!a.value||a.value==="0")&&(a.value=t.allowance_transport!=null?String(t.allowance_transport):"")}}catch{}await gt().catch(()=>{}),ve(),s("\u30C7\u30FC\u30BF\u53D6\u5F97\u5B8C\u4E86",!0),setTimeout(()=>{const t=document.querySelector("#payrollMsg");t&&t.textContent==="\u30C7\u30FC\u30BF\u53D6\u5F97\u5B8C\u4E86"&&s("")},2e3)};return O.addEventListener("change",Oe,{signal:r}),G.addEventListener("change",Oe,{signal:r}),He(),s(""),M().userId&&M().month&&Oe().catch(()=>{}),()=>{oe&&oe.abort();try{const e=document.getElementById("payrollPreviewModalOverlay");e&&e.remove()}catch{}}}export{So as mount};

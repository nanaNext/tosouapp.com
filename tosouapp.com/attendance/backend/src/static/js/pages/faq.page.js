const r=t=>document.querySelector(t);let g=[],u=[],f="all";function v(t){const n=document.cookie.match(new RegExp(`(^| )${t}=([^;]+)`));return n?decodeURIComponent(n[2]):""}function y(){const t={"Content-Type":"application/json"},n=v("csrfToken");return n&&(t["X-CSRF-Token"]=n),t}async function m(t,n={},e=12e3){const o=new AbortController,i=setTimeout(()=>o.abort(),e);try{const s=await fetch(t,{credentials:"include",cache:"no-store",...n,signal:o.signal});let a=null;try{a=await s.json()}catch{}if(!s.ok){const d=a?.message||a?.errors?.[0]?.msg||`HTTP ${s.status}`;throw new Error(d)}return a}finally{clearTimeout(i)}}function l(t){const n=document.createElement("div");return n.textContent=String(t??""),n.innerHTML}function c(t,n="info"){const e=document.createElement("div");e.style.cssText=["position: fixed","bottom: 20px","right: 20px","padding: 16px 20px","border-radius: 6px","font-size: 14px","font-weight: 500","max-width: 300px","z-index: 9999","animation: faqSlideIn 0.3s ease-out"].join(";"),n==="success"?(e.style.background="#28a745",e.style.color="white",e.textContent="\u2713 "+t):n==="error"?(e.style.background="#dc3545",e.style.color="white",e.textContent="\u274C "+t):(e.style.background="#17a2b8",e.style.color="white",e.textContent="\u2139\uFE0F "+t),document.body.appendChild(e),setTimeout(()=>{e.style.animation="faqSlideOut 0.3s ease-out",setTimeout(()=>e.remove(),300)},3e3)}function w(){if(document.getElementById("faq-toast-style"))return;const t=document.createElement("style");t.id="faq-toast-style",t.textContent=`
    @keyframes faqSlideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    @keyframes faqSlideOut {
      from { transform: translateX(0); opacity: 1; }
      to { transform: translateX(100%); opacity: 0; }
    }
  `,document.head.appendChild(t)}function x(){const t=r("#faqContainer");if(!t)return;const n=f==="all"?g:g.filter(o=>o.category===f);if(!n.length){t.innerHTML='<div style="text-align:center;padding:40px;color:#999;">\u8A72\u5F53\u3059\u308B\u8CEA\u554F\u304C\u3042\u308A\u307E\u305B\u3093</div>';return}const e=n.map((o,i)=>`
    <div class="kintai-card" style="margin-bottom:12px;">
      <button type="button" class="faq-question-toggle" data-idx="${i}" style="width:100%;text-align:left;cursor:pointer;padding:15px;display:flex;justify-content:space-between;align-items:center;background:#f9f9f9;border:0;border-radius:6px;">
        <span>
          <span style="display:block;color:#666;font-size:12px;margin-bottom:5px;">
            <span style="background:#e8f4f8;color:#1e40af;padding:2px 8px;border-radius:3px;font-size:11px;">
              ${l(o.category||"\u305D\u306E\u4ED6")}
            </span>
          </span>
          <span style="font-weight:bold;color:#1e40af;font-size:14px;">
            Q: ${l(o.question)}
          </span>
        </span>
        <span style="font-size:18px;margin-left:10px;" id="arrow-${i}">\u25BC</span>
      </button>
      <div id="answer-${i}" style="display:none;padding:15px;background:white;border-left:4px solid #1e40af;">
        <div style="font-size:13px;color:#334155;line-height:1.6;">
          A: ${l(o.answer)}
        </div>
      </div>
    </div>
  `).join("");t.innerHTML=e}function q(t){const n=document.getElementById(`answer-${t}`),e=document.getElementById(`arrow-${t}`);if(!n||!e)return;const o=n.style.display!=="none";n.style.display=o?"none":"block",e.textContent=o?"\u25BC":"\u25B2"}function b(){document.querySelectorAll(".faq-tab-btn").forEach(t=>{const e=String(t.getAttribute("data-category")||"")===f;t.style.background=e?"#1e40af":"#fff",t.style.color=e?"#fff":"#000",t.style.border=e?"none":"1px solid #ddd",t.classList.toggle("active",e)})}function C(t){f=String(t||"all"),b(),x()}async function S(){const t=r("#faqContainer");try{g=(await m("/api/faq",{method:"GET",headers:y()}))?.data||[],x()}catch(n){t&&(t.innerHTML=`<div style="color:red;padding:20px;"><strong>FAQ\u8AAD\u307F\u8FBC\u307F\u30A8\u30E9\u30FC:</strong><br>${l(n.message)}</div>`)}}function k(){const t=r("#myQuestionsCount"),n=r("#myQuestionsContainer");if(!n)return;if(t&&(t.textContent=String(u.length)),!u.length){n.innerHTML='<div style="text-align:center;color:#999;padding:20px;">\u8CEA\u554F\u304C\u307E\u3060\u3042\u308A\u307E\u305B\u3093</div>';return}const e=u.map(o=>{const i=String(o.status||""),s=i==="\u56DE\u7B54\u6E08\u307F"?"#28a745":"#ffc107",a=i==="\u56DE\u7B54\u6E08\u307F"?"#d4edda":"#fff3cd";return`
      <div style="padding:12px;border:1px solid #ddd;border-radius:6px;background:#f9f9f9;">
        <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
          <div style="font-weight:bold;color:#334155;font-size:13px;">
            ${l(o.question)}
          </div>
          <span style="background:${a};color:${s};padding:2px 8px;border-radius:3px;font-size:11px;white-space:nowrap;">
            ${l(i)}
          </span>
        </div>
        <div style="font-size:12px;color:#666;margin-bottom:8px;">
          \u9001\u4FE1\u65E5: ${new Date(o.created_at).toLocaleString("ja-JP")}
        </div>
        ${o.admin_answer?`
          <div style="background:white;padding:10px;border-left:3px solid #28a745;margin-top:8px;font-size:12px;color:#334155;">
            <div style="font-weight:bold;color:#28a745;margin-bottom:5px;">\u2713 \u56DE\u7B54:</div>
            <div>${l(o.admin_answer)}</div>
          </div>
        `:""}
      </div>
    `}).join("");n.innerHTML=e}async function h(){const t=r("#myQuestionsContainer");try{u=(await m("/api/faq/questions/my",{method:"GET",headers:y()}))?.data||[],k()}catch(n){const e=String(n.message||"").toLowerCase();t&&(e.includes("unauthorized")||e.includes("401"))&&(t.innerHTML='<div style="text-align:center;color:#999;padding:20px;">\u30ED\u30B0\u30A4\u30F3\u5F8C\u306B\u8CEA\u554F\u5C65\u6B74\u3092\u8868\u793A\u3067\u304D\u307E\u3059</div>')}}async function T(t){t.preventDefault();const n=String(r("#questionInput")?.value||"").trim(),e=String(r("#detailInput")?.value||"").trim(),o=String(r("#categorySelect")?.value||""),i=r("#questionForm"),s=i?.querySelector('button[type="submit"]'),a=s?.textContent||"\u9001\u4FE1";if(!n)return c("\u8CEA\u554F\u30BF\u30A4\u30C8\u30EB\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044","error");if(n.length<5)return c("\u8CEA\u554F\u306F5\u6587\u5B57\u4EE5\u4E0A\u3067\u3042\u308B\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059","error");if(e.length>2e3)return c("\u8A73\u7D30\u306F2000\u6587\u5B57\u4EE5\u4E0B\u3067\u3042\u308B\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059","error");s&&(s.disabled=!0,s.textContent="\u9001\u4FE1\u4E2D...");try{const d=await m("/api/faq/questions",{method:"POST",headers:y(),body:JSON.stringify({question:n,detail:e,category:o})},15e3);c(d?.message||"\u8CEA\u554F\u3092\u9001\u4FE1\u3057\u307E\u3057\u305F","success"),i?.reset(),await h()}catch(d){const p=String(d.message||"");p.toLowerCase().includes("unauthorized")||p.includes("401")?(c("\u30ED\u30B0\u30A4\u30F3\u304C\u5FC5\u8981\u3067\u3059","error"),window.location.href="/ui/login"):c("\u901A\u4FE1\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F: "+p,"error")}finally{s&&(s.disabled=!1,s.textContent=a)}}function $(){const t=r("#questionForm");t&&t.addEventListener("submit",T),document.querySelectorAll(".faq-tab-btn").forEach(e=>{e.addEventListener("click",()=>{const o=e.getAttribute("data-category")||"all";C(o)})}),r("#faqContainer")?.addEventListener("click",e=>{const o=e.target.closest(".faq-question-toggle");if(!o)return;const i=Number.parseInt(String(o.getAttribute("data-idx")||""),10);Number.isFinite(i)&&q(i)})}document.addEventListener("DOMContentLoaded",async()=>{w(),$(),b(),await S(),await h()});

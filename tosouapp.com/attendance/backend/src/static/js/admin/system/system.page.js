const i=t=>{const n=String(t||"");return n.length>1?n.replace(/\/+$/,""):n};async function o(){const t=document.querySelector("#adminContent");if(!t)return;const s=i(window.location.pathname)==="/admin/system/audit-logs",a=s?"\u76E3\u67FB\u30ED\u30B0":"\u8A2D\u5B9A",e=s?"\u76E3\u67FB\u30ED\u30B0\u753B\u9762\u306F\u3053\u308C\u304B\u3089\u5B9F\u88C5\u3057\u307E\u3059\u3002":"\u8A2D\u5B9A\u753B\u9762\u306F\u3053\u308C\u304B\u3089\u5B9F\u88C5\u3057\u307E\u3059\u3002";t.className="card",t.innerHTML=`
    <section style="max-width:1100px;margin:12px auto;padding:0 8px;">
      <div style="border:1px solid #dbeafe;background:#f8fbff;border-radius:14px;padding:16px;">
        <div style="font-size:20px;font-weight:900;color:#0b2c66;margin-bottom:8px;">${a}</div>
        <div style="font-size:14px;color:#334155;margin-bottom:14px;">${e}</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <a href="/admin/dashboard" class="btn">\u30C0\u30C3\u30B7\u30E5\u30DC\u30FC\u30C9\u3078\u623B\u308B</a>
          <a href="/admin/system/settings" class="btn">\u8A2D\u5B9A</a>
          <a href="/admin/system/audit-logs" class="btn">\u76E3\u67FB\u30ED\u30B0</a>
        </div>
      </div>
    </section>
  `}export{o as mount};

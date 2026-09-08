import{fetchJSONAuth as n}from"../../api/http.api.js";async function g({content:s,profile:a}){const l=(()=>{try{return JSON.parse(localStorage.getItem("prefs")||"{}")}catch{return{}}})(),u={};s.innerHTML="";const e=document.createElement("div");e.className="card wide",e.innerHTML=`
    <h3>\u5404\u7A2E\u8A2D\u5B9A</h3>
    <div class="two-cols">
      <div class="left">
        <form id="formUser" class="section">
          <div class="section-head">
            <h4>\u30E6\u30FC\u30B6\u60C5\u5831</h4>
            <div class="actions"><button type="button" id="btnCancelUser">\u30AD\u30E3\u30F3\u30BB\u30EB</button><button type="submit" id="btnSaveUser">\u4FDD\u5B58</button></div>
          </div>
          <div class="row"><label>\u30E6\u30FC\u30B6\u30FC\u540D</label><input id="setName" placeholder="\u6C0F\u540D" value="${a.username||""}"></div>
          <div class="row"><label>\u30E1\u30FC\u30EB\u30A2\u30C9\u30EC\u30B9 <span style="color:#b00020;">\uFF0A\u5FC5\u9808\u60C5\u5831</span></label><input id="setEmail" placeholder="email@example.com" value="${a.email||""}"></div>
          <div class="row"><label>\u30D1\u30B9\u30EF\u30FC\u30C9</label><input id="setPass" type="password" placeholder="\u65B0\u3057\u3044\u30D1\u30B9\u30EF\u30FC\u30C9"></div>
        </form>
        <form id="formLang" class="section">
          <div class="section-head">
            <h4>\u8A00\u8A9E\u8A2D\u5B9A</h4>
            <div class="actions"><button type="button" id="btnCancelPrefs">\u30AD\u30E3\u30F3\u30BB\u30EB</button><button type="submit" id="btnSavePrefs">\u4FDD\u5B58</button></div>
          </div>
          <div class="row">
            <label>\u8A00\u8A9E</label>
            <select id="langSel">
              <option value="ja" ${l.lang==="ja"?"selected":""}>\u65E5\u672C\u8A9E</option>
              <option value="en" ${l.lang==="en"?"selected":""}>English</option>
              <option value="vi" ${l.lang==="vi"?"selected":""}>Ti\u1EBFng Vi\u1EC7t</option>
            </select>
          </div>
          <div class="row">
            <label>\u5730\u57DF</label>
            <select id="regionSel">
              <option value="ja-JP" ${l.region==="ja-JP"?"selected":""}>\u65E5\u672C\u8A9E (\u65E5\u672C)</option>
              <option value="en-US" ${l.region==="en-US"?"selected":""}>English (United States)</option>
              <option value="vi-VN" ${l.region==="vi-VN"?"selected":""}>Ti\u1EBFng Vi\u1EC7t (Vi\u1EC7t Nam)</option>
            </select>
          </div>
          <div class="row">
            <label>\u30BF\u30A4\u30E0\u30BE\u30FC\u30F3</label>
            <select id="tzSel">
              <option value="Asia/Tokyo" ${l.tz==="Asia/Tokyo"?"selected":""}>GMT+09:00 \u65E5\u672C\u6A19\u6E96\u6642 (Asia/Tokyo)</option>
              <option value="UTC" ${l.tz==="UTC"?"selected":""}>UTC</option>
              <option value="Asia/Ho_Chi_Minh" ${l.tz==="Asia/Ho_Chi_Minh"?"selected":""}>GMT+07:00 (Asia/Ho_Chi_Minh)</option>
            </select>
          </div>
        </form>
      </div>
      <div class="right">
        <form id="formMail" class="section">
          <div class="section-head">
            <h4>\u30E1\u30FC\u30EB\u8A2D\u5B9A</h4>
            <div class="actions"><button type="button" id="btnCancelMail">\u30AD\u30E3\u30F3\u30BB\u30EB</button><button type="submit" id="btnSaveMail">\u4FDD\u5B58</button></div>
          </div>
          <div class="row single"><label><input type="checkbox" id="mail_enabled">\u30E1\u30FC\u30EB\u901A\u77E5\u3092\u6709\u52B9\u306B\u3059\u308B</label></div>
          <div style="margin:8px 16px;color:#3a6ea5;">VITE\u30A2\u30AB\u30A6\u30F3\u30C8\u306E\u8A2D\u5B9A\u5909\u66F4\u3092\u901A\u77E5\u3057\u3066\u3001\u91CD\u8981\u306A\u5909\u66F4\u3092\u898B\u9003\u3055\u306A\u3044\u3088\u3046\u306B\u3057\u307E\u3057\u3087\u3046\u3002</div>
          <div class="row single"><label><input type="checkbox" id="mail_topic">\u30C8\u30D4\u30C3\u30AF\u306E\u4F5C\u6210\u3092\u901A\u77E5</label></div>
          <div class="row single"><label><input type="checkbox" id="mail_profile_update">\u30D7\u30ED\u30D5\u30A3\u30FC\u30EB\u306E\u66F4\u65B0\u3092\u901A\u77E5</label></div>
          <div class="row single"><label><input type="checkbox" id="mail_my_comment">\u79C1\u306E\u6295\u7A3F\u3078\u306E\u30B3\u30E1\u30F3\u30C8</label></div>
          <div class="row single"><label><input type="checkbox" id="mail_file_comment">\u30D5\u30A1\u30A4\u30EB\u3078\u306E\u30B3\u30E1\u30F3\u30C8</label></div>
          <div class="row single"><label><input type="checkbox" id="mail_mention">\u30E1\u30F3\u30B7\u30E7\u30F3\u3055\u308C\u305F\u6642</label></div>
          <div class="row single"><label><input type="checkbox" id="mail_reply">\u8FD4\u4FE1\u304C\u4ED8\u3044\u305F\u6642</label></div>
          <div class="row single"><label><input type="checkbox" id="mail_like_comment">\u79C1\u306E\u30B3\u30E1\u30F3\u30C8\u306B\u300C\u3044\u3044\u306D\u300D\u304C\u4ED8\u3044\u305F</label></div>
          <div class="row single"><label><input type="checkbox" id="mail_reply_comment">\u79C1\u306E\u30B3\u30E1\u30F3\u30C8\u306B\u8FD4\u4FE1\u304C\u4ED8\u3044\u305F</label></div>
          <div class="row single"><label><input type="checkbox" id="mail_blog_update">\u81EA\u5206\u306E\u30D6\u30ED\u30B0\u306E\u30A2\u30C3\u30D7\u30C7\u30FC\u30C8</label></div>
          <div class="row single"><label><input type="checkbox" id="mail_page_update">\u81EA\u5206\u306E\u30D7\u30ED\u30D5\u30A1\u30A4\u30EB\u30DA\u30FC\u30B8\u306E\u30A2\u30C3\u30D7\u30C7\u30FC\u30C8</label></div>
        </form>
      </div>
    </div>
  `,s.appendChild(e),e.querySelector("#formUser").addEventListener("submit",async t=>{t.preventDefault();const i=e.querySelector("#setEmail").value.trim();if(!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$/.test(i)){alert("\u30E1\u30FC\u30EB\u30A2\u30C9\u30EC\u30B9\u306E\u5F62\u5F0F\u304C\u6B63\u3057\u304F\u3042\u308A\u307E\u305B\u3093");return}const m={username:e.querySelector("#setName").value.trim()||null,email:i||null};await n("/api/users/me",{method:"PATCH",body:JSON.stringify(m)});const o=e.querySelector("#setPass").value;o&&o.length>=6&&((a.role||"").toLowerCase()==="admin"?await n(`/api/admin/users/${encodeURIComponent(a.id)}/password`,{method:"PATCH",body:JSON.stringify({password:o})}):alert("\u30D1\u30B9\u30EF\u30FC\u30C9\u5909\u66F4\u306F\u73FE\u5728\u306E\u30D1\u30B9\u30EF\u30FC\u30C9\u304C\u5FC5\u8981\u3067\u3059")),alert("\u4FDD\u5B58\u3057\u307E\u3057\u305F")});const c=e.querySelector("#btnCancelUser");c&&c.addEventListener("click",()=>{window.location.href="/ui/admin"}),e.querySelector("#formLang").addEventListener("submit",async t=>{t.preventDefault();const i={lang:e.querySelector("#langSel").value,region:e.querySelector("#regionSel").value,tz:e.querySelector("#tzSel").value};localStorage.setItem("prefs",JSON.stringify(i)),await n("/api/users/me",{method:"PATCH",body:JSON.stringify({lang:i.lang,region:i.region,timezone:i.tz})}),alert("\u4FDD\u5B58\u3057\u307E\u3057\u305F")});const r=e.querySelector("#btnCancelPrefs");r&&r.addEventListener("click",()=>{window.location.href="/ui/admin"}),e.querySelector("#formMail").addEventListener("submit",async t=>{t.preventDefault();const i={enabled:e.querySelector("#mail_enabled").checked,topic:e.querySelector("#mail_topic").checked,profile_update:e.querySelector("#mail_profile_update").checked,my_comment:e.querySelector("#mail_my_comment").checked,file_comment:e.querySelector("#mail_file_comment").checked,mention:e.querySelector("#mail_mention").checked,reply:e.querySelector("#mail_reply").checked,like_comment:e.querySelector("#mail_like_comment").checked,reply_comment:e.querySelector("#mail_reply_comment").checked,blog_update:e.querySelector("#mail_blog_update").checked,page_update:e.querySelector("#mail_page_update").checked};localStorage.setItem("mailPrefs",JSON.stringify(i)),alert("\u4FDD\u5B58\u3057\u307E\u3057\u305F")});const d=e.querySelector("#btnCancelMail");d&&d.addEventListener("click",()=>{window.location.href="/ui/admin"})}export{g as mountSettings};

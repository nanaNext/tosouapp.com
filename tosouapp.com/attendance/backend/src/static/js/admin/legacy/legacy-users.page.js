import{delegate as f}from"../_shared/dom.js";import{api as p}from"../../shared/api/client.js";const h=new WeakMap,m=new WeakMap;function w(t){try{if(!t||t.dataset.usersBound==="1")return;t.dataset.usersBound="1",f(t,"[data-action]","click",async(r,s)=>{const n=s.dataset.action||"",i=s.dataset.id||"",d=h.get(t)||[],u=m.get(t)||{},{listUsers:a,deleteUserAccount:o,resetUserPassword:l}=u;if(n==="delete"){confirm("\u524A\u9664\u3057\u307E\u3059\u304B\uFF1F")&&(await o(i),await $({content:t,fetchJSONAuth,listUsers:a,deleteUserAccount:o,resetUserPassword:l}));return}if(n==="resetpw"){const e=prompt("\u65B0\u3057\u3044\u30D1\u30B9\u30EF\u30FC\u30C9\u3092\u5165\u529B");e&&e.length>=6&&(await l(i,e),alert("PW\u66F4\u65B0\u3057\u307E\u3057\u305F"));return}if(n==="lock"){const e=prompt("\u30ED\u30C3\u30AF\u5206\u6570 (\u65E2\u5B9A: 60)"),c=parseInt(e||"60",10);await p.patch(`/api/admin/users/${i}/lock`,{minutes:c}),alert("\u30ED\u30C3\u30AF\u3057\u307E\u3057\u305F");return}if(n==="unlock"){await p.patch(`/api/admin/users/${i}/unlock`),alert("\u30ED\u30C3\u30AF\u89E3\u9664\u3057\u307E\u3057\u305F");return}if(n==="detail"){const e=d.find(c=>String(c.id)===String(i));e&&alert(`ID: ${e.id}
\u540D\u524D: ${e.username||""}
Email: ${e.email||""}
Role: ${e.role||""}`)}})}catch{}}async function $({content:t,listUsers:r,deleteUserAccount:s,resetUserPassword:n}){if(!t)return;const i=await r();m.set(t,{listUsers:r,deleteUserAccount:s,resetUserPassword:n}),h.set(t,i),w(t),t.innerHTML="<h3>\u30E6\u30FC\u30B6\u30FC\u4E00\u89A7</h3>";const d=document.createElement("table");d.style.width="auto",d.style.minWidth="880px",d.style.tableLayout="auto",d.innerHTML="<thead><tr><th>ID</th><th>\u540D\u524D</th><th>Email</th><th>Role</th><th>\u64CD\u4F5C</th></tr></thead>";const u=document.createElement("tbody");for(const a of i){const o=document.createElement("tr");o.innerHTML=`
      <td>${a.id}</td>
      <td>${a.username||""}</td>
      <td>${a.email||""}</td>
      <td>${a.role||""}</td>
      <td>
        <button data-action="detail" data-id="${a.id}">\u8A73\u7D30</button>
        <button data-action="resetpw" data-id="${a.id}">PW\u30EA\u30BB\u30C3\u30C8</button>
        <button data-action="lock" data-id="${a.id}">\u30ED\u30C3\u30AF</button>
        <button data-action="unlock" data-id="${a.id}">\u30ED\u30C3\u30AF\u89E3\u9664</button>
        <button data-action="delete" data-id="${a.id}">\u524A\u9664</button>
      </td>
    `,u.appendChild(o)}d.appendChild(u),t.appendChild(d)}export{$ as mountUsers};

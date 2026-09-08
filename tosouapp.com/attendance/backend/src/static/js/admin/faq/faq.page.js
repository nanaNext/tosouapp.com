import{FaqAdminComponent as o}from"../faq-admin-component.js?v=navy-20260427-faqfix1";async function r(t={}){const n=t&&t.content||document.querySelector("#adminContent");if(!n){console.error("\u274C Admin content host not found");return}return n.className="",n.innerHTML=`
    <div style="padding: 20px;">
      <div id="faqAdminContainer"></div>
    </div>
  `,await new o("faqAdminContainer").init(),async()=>{}}export{r as mount};

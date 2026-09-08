import{fetchJSONAuth as r}from"../api/http.api.js";class s{constructor(e){this.container=document.getElementById(e),this.allQuestions=[],this.currentTab="unanswered"}async init(){await this.loadQuestions(),this.render()}async loadQuestions(){try{const e=await r("/api/faq/admin/questions");this.allQuestions=e.data||[]}catch(e){console.error("\u274C Error loading questions:",e),alert("\u30A8\u30E9\u30FC: "+e.message)}}render(){const e=this.allQuestions.filter(o=>o.status==="\u672A\u56DE\u7B54"),t=this.allQuestions.filter(o=>o.status==="\u56DE\u7B54\u6E08\u307F"),n=`
      <div style="max-width:1200px;margin:0;">
        <!-- Stats -->
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:15px;margin-bottom:30px;">
          <div style="background:#f0f9ff;padding:20px;border-left:4px solid #1e40af;border-radius:4px;">
            <div style="font-size:28px;font-weight:bold;color:#1e40af;">${this.allQuestions.length}</div>
            <div style="font-size:12px;color:#666;margin-top:5px;">\u7DCF\u8CEA\u554F\u6570</div>
          </div>
          <div style="background:#fffbf0;padding:20px;border-left:4px solid #f59e0b;border-radius:4px;">
            <div style="font-size:28px;font-weight:bold;color:#f59e0b;">${e.length}</div>
            <div style="font-size:12px;color:#666;margin-top:5px;">\u672A\u56DE\u7B54</div>
          </div>
          <div style="background:#f0fdf4;padding:20px;border-left:4px solid #28a745;border-radius:4px;">
            <div style="font-size:28px;font-weight:bold;color:#28a745;">${t.length}</div>
            <div style="font-size:12px;color:#666;margin-top:5px;">\u56DE\u7B54\u6E08\u307F</div>
          </div>
        </div>

        <!-- Tabs -->
        <div style="display:flex;gap:10px;margin-bottom:20px;border-bottom:2px solid #ddd;">
          <button class="faq-tab" data-tab="unanswered" style="${this.currentTab==="unanswered"?"border-bottom:3px solid #1e40af;color:#1e40af;":"color:#666;"}padding:10px 20px;border:none;background:none;cursor:pointer;font-weight:bold;">
            \u672A\u56DE\u7B54 (${e.length})
          </button>
          <button class="faq-tab" data-tab="answered" style="${this.currentTab==="answered"?"border-bottom:3px solid #1e40af;color:#1e40af;":"color:#666;"}padding:10px 20px;border:none;background:none;cursor:pointer;font-weight:bold;">
            \u56DE\u7B54\u6E08\u307F (${t.length})
          </button>
          <button class="faq-tab" data-tab="all" style="${this.currentTab==="all"?"border-bottom:3px solid #1e40af;color:#1e40af;":"color:#666;"}padding:10px 20px;border:none;background:none;cursor:pointer;font-weight:bold;">
            \u3059\u3079\u3066
          </button>
        </div>

        <!-- Content -->
        <div id="faqContent">
          ${this.renderQuestions()}
        </div>
      </div>
    `;this.container.innerHTML=n,this.attachEventListeners()}renderQuestions(){let e=this.allQuestions;return this.currentTab==="unanswered"?e=e.filter(t=>t.status==="\u672A\u56DE\u7B54"):this.currentTab==="answered"&&(e=e.filter(t=>t.status==="\u56DE\u7B54\u6E08\u307F")),e.length===0?'<div style="text-align:center;padding:40px;color:#999;">\u8CEA\u554F\u304C\u3042\u308A\u307E\u305B\u3093</div>':e.map(t=>`
      <div style="background:#f9f9f9;padding:15px;margin-bottom:12px;border-left:4px solid ${t.status==="\u56DE\u7B54\u6E08\u307F"?"#28a745":"#1e40af"};border-radius:4px;">
        <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:10px;">
          <div style="flex:1;">
            <div style="font-weight:bold;color:#1e40af;font-size:14px;margin-bottom:5px;">
              ${this.escapeHtml(t.question)}
            </div>
            <div style="font-size:12px;color:#666;">
              \u793E\u54E1: <strong>${this.escapeHtml(t.name||"N/A")}</strong> (ID: ${t.employee_id||"N/A"})
              <br>
              \u9001\u4FE1\u65E5: ${new Date(t.created_at).toLocaleString("ja-JP")}
              ${t.category?`<br>\u30AB\u30C6\u30B4\u30EA\u30FC: <span style="background:#e8f4f8;padding:2px 6px;border-radius:3px;font-size:11px;">${this.escapeHtml(t.category)}</span>`:""}
            </div>
          </div>
          <span style="background:${t.status==="\u672A\u56DE\u7B54"?"#fff3cd":"#d4edda"};color:${t.status==="\u672A\u56DE\u7B54"?"#856404":"#155724"};padding:4px 10px;border-radius:12px;font-size:11px;font-weight:bold;white-space:nowrap;">
            ${t.status}
          </span>
        </div>

        ${t.detail?`
          <div style="background:white;padding:10px;border-radius:4px;margin-bottom:10px;font-size:13px;color:#334155;">
            <strong>\u8A73\u7D30:</strong><br>
            ${this.escapeHtml(t.detail)}
          </div>
        `:""}

        ${t.admin_answer?`
          <div style="background:white;padding:12px;border-left:3px solid #28a745;border-radius:4px;margin-bottom:10px;">
            <div style="font-weight:bold;color:#28a745;margin-bottom:8px;">\u2713 \u56DE\u7B54:</div>
            <div style="font-size:13px;color:#155724;white-space:pre-wrap;word-wrap:break-word;line-height:1.5;">
              ${this.escapeHtml(t.admin_answer)}
            </div>
            <div style="font-size:11px;color:#666;margin-top:8px;">
              \u56DE\u7B54\u65E5: ${new Date(t.answered_at).toLocaleString("ja-JP")}
            </div>
          </div>
        `:`
          <div class="answer-form" id="form-${t.id}" style="display:none;background:white;padding:12px;border:1px solid #dbeafe;border-radius:4px;">
            <div style="font-weight:700;color:#0f172a;margin-bottom:8px;">\u56DE\u7B54\u5165\u529B</div>
            <textarea id="answerText-${t.id}" data-answer-input="${t.id}" placeholder="\u3053\u3053\u306B\u56DE\u7B54\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\uFF082000\u6587\u5B57\u4EE5\u4E0B\uFF09" maxlength="2000" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:4px;font-size:13px;min-height:120px;resize:vertical;box-sizing:border-box;"></textarea>
            <div style="margin-top:6px;font-size:11px;color:#64748b;text-align:right;" id="answerCount-${t.id}">0 / 2000</div>
            <div style="display:flex;gap:10px;margin-top:10px;">
              <button type="button" data-action="submit-answer" data-question-id="${t.id}" style="flex:1;padding:10px;background:#28a745;color:white;border:none;border-radius:4px;cursor:pointer;font-weight:bold;">
                \u56DE\u7B54\u3092\u4FDD\u5B58
              </button>
              <button type="button" data-action="cancel-answer" data-question-id="${t.id}" style="flex:0 0 120px;padding:10px;background:#ccc;color:#333;border:none;border-radius:4px;cursor:pointer;">
                \u30AD\u30E3\u30F3\u30BB\u30EB
              </button>
            </div>
          </div>

          <div style="display:flex;gap:10px;margin-top:10px;">
            <button type="button" data-action="show-answer" data-question-id="${t.id}" style="padding:10px 20px;background:#1e40af;color:white;border:none;border-radius:4px;cursor:pointer;font-weight:bold;font-size:13px;">
              \u56DE\u7B54\u3059\u308B
            </button>
          </div>
        `}
      </div>
    `).join("")}attachEventListeners(){document.querySelectorAll(".faq-tab").forEach(e=>{e.addEventListener("click",t=>{this.currentTab=t.target.dataset.tab,this.render()})}),this.container&&(this.container.querySelectorAll("[data-action]").forEach(e=>{e.addEventListener("click",t=>{const n=t.currentTarget.dataset.action,o=Number(t.currentTarget.dataset.questionId||0);o&&(n==="show-answer"&&this.showAnswerForm(o),n==="cancel-answer"&&this.cancelAnswer(o),n==="submit-answer"&&this.submitAnswer(o))})}),this.container.querySelectorAll("[data-answer-input]").forEach(e=>{e.addEventListener("input",t=>{const n=Number(t.currentTarget.dataset.answerInput||0),o=document.getElementById(`answerCount-${n}`);o&&(o.textContent=`${String(t.currentTarget.value.length)} / 2000`)})}))}showAnswerForm(e){const t=document.getElementById(`form-${e}`);if(t){t.style.display="block";const n=document.getElementById(`answerText-${e}`);if(n){n.focus();const o=document.getElementById(`answerCount-${e}`);o&&(o.textContent=`${String(n.value.length)} / 2000`)}}}cancelAnswer(e){const t=document.getElementById(`form-${e}`);t&&(t.style.display="none",document.getElementById(`answerText-${e}`).value="")}async submitAnswer(e){const t=document.getElementById(`answerText-${e}`).value.trim();if(!t){alert("\u56DE\u7B54\u5185\u5BB9\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044");return}try{const n=await r(`/api/faq/admin/questions/${e}/answer`,{method:"POST",body:JSON.stringify({answer:t})});alert("\u2713 \u56DE\u7B54\u3092\u4FDD\u5B58\u3057\u307E\u3057\u305F"),await this.loadQuestions(),this.render()}catch(n){console.error("\u274C Error:",n),alert("\u30A8\u30E9\u30FC: "+n.message)}}escapeHtml(e){const t=document.createElement("div");return t.textContent=e,t.innerHTML}}export{s as FaqAdminComponent};

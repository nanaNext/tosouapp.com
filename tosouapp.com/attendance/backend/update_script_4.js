const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'static', 'js', 'pages', 'admin-employees-monthly-summary.page.js');
let code = fs.readFileSync(filePath, 'utf8');

// 1. renderSummarySection changes
code = code.replace(
  /<table class="excel-table" style="width: 100%; min-width: 900px; margin-bottom: 0;">/,
  '<table class="excel-table" style="width: max-content; min-width: 900px; margin-bottom: 0;">'
);
code = code.replace(
  /<td><input id="\${prefix}\${field\.id}" class="admin-ms-input"\${typeAttr}\${stepAttr}\${placeholderAttr} style="width:100%; border:none; outline:none; background:transparent; box-shadow:none; padding:4px 0;"><\/td>/,
  '<td style="border: 1px solid #dbe4f0; padding: 4px;"><input id="${prefix}${field.id}" class="admin-ms-input"${typeAttr}${stepAttr}${placeholderAttr} style="width:100%; border:none; outline:none; background:transparent; box-shadow:none; padding:4px;"></td>'
);

// 2. renderSa changes
code = code.replace(
  /<table class="excel-table" style="width: 100%;">\s*<tbody>\s*<tr>\s*<td style="width:120px; background:#f8fbff; font-weight:500;">シフト<\/td>\s*<td><select id="saShift" class="admin-ms-select" style="width:100%; border:none; outline:none; background:transparent;"><option value="">シフト<\/option><\/select><\/td>\s*<td style="width:120px; background:#f8fbff; font-weight:500;">適用開始日<\/td>\s*<td><input id="saStart" type="date" class="admin-ms-input" style="width:100%; border:none; outline:none; background:transparent;"><\/td>\s*<td style="width:120px; background:#f8fbff; font-weight:500;">適用終了日<\/td>\s*<td><input id="saEnd" type="date" class="admin-ms-input" style="width:100%; border:none; outline:none; background:transparent;"><\/td>\s*<\/tr>/m,
  `<table class="excel-table" style="width: max-content; min-width: 900px;">
            <tbody>
              <tr>
                <td style="width:120px; background:#f8fbff; font-weight:500;">シフト</td>
                <td style="border: 1px solid #dbe4f0; padding: 4px;"><select id="saShift" class="admin-ms-select" style="width:100%; border:none; outline:none; background:transparent;"><option value="">シフト</option></select></td>
                <td style="width:120px; background:#f8fbff; font-weight:500;">適用開始日</td>
                <td style="border: 1px solid #dbe4f0; padding: 4px;"><input id="saStart" type="date" class="admin-ms-input" style="width:100%; border:none; outline:none; background:transparent;"></td>
                <td style="width:120px; background:#f8fbff; font-weight:500;">適用終了日</td>
                <td style="border: 1px solid #dbe4f0; padding: 4px;"><input id="saEnd" type="date" class="admin-ms-input" style="width:100%; border:none; outline:none; background:transparent;"></td>
              </tr>`
);

// 3. renderWd changes
code = code.replace(
  /<table class="excel-table" style="width: 100%;">\s*<tbody>\s*<tr>\s*<td style="width:120px; background:#f8fbff; font-weight:500;">適用開始日<\/td>\s*<td><input id="wdStart" type="date" class="admin-ms-input" style="width:100%; border:none; outline:none; background:transparent;"><\/td>\s*<td style="width:120px; background:#f8fbff; font-weight:500;">適用終了日<\/td>\s*<td><input id="wdEnd" type="date" class="admin-ms-input" style="width:100%; border:none; outline:none; background:transparent;"><\/td>\s*<td style="width:120px; background:#f8fbff; font-weight:500;">企業名<\/td>\s*<td><input id="wdCompany" class="admin-ms-input" style="width:100%; border:none; outline:none; background:transparent;"><\/td>\s*<\/tr>\s*<tr>\s*<td style="width:120px; background:#f8fbff; font-weight:500;">就業先住所<\/td>\s*<td colspan="5"><input id="wdAddr" class="admin-ms-input" style="width:100%; border:none; outline:none; background:transparent;"><\/td>\s*<\/tr>\s*<tr>\s*<td style="width:120px; background:#f8fbff; font-weight:500;">業務内容<\/td>\s*<td><input id="wdWork" class="admin-ms-input" style="width:100%; border:none; outline:none; background:transparent;"><\/td>\s*<td style="width:120px; background:#f8fbff; font-weight:500;">役職<\/td>\s*<td><input id="wdRole" class="admin-ms-input" style="width:100%; border:none; outline:none; background:transparent;"><\/td>\s*<td style="width:120px; background:#f8fbff; font-weight:500;">責任の程度<\/td>\s*<td><input id="wdResp" class="admin-ms-input" style="width:100%; border:none; outline:none; background:transparent;"><\/td>\s*<\/tr>/m,
  `<table class="excel-table" style="width: max-content; min-width: 900px;">
            <tbody>
              <tr>
                <td style="width:120px; background:#f8fbff; font-weight:500;">適用開始日</td>
                <td style="border: 1px solid #dbe4f0; padding: 4px;"><input id="wdStart" type="date" class="admin-ms-input" style="width:100%; border:none; outline:none; background:transparent;"></td>
                <td style="width:120px; background:#f8fbff; font-weight:500;">適用終了日</td>
                <td style="border: 1px solid #dbe4f0; padding: 4px;"><input id="wdEnd" type="date" class="admin-ms-input" style="width:100%; border:none; outline:none; background:transparent;"></td>
                <td style="width:120px; background:#f8fbff; font-weight:500;">企業名</td>
                <td style="border: 1px solid #dbe4f0; padding: 4px;"><input id="wdCompany" class="admin-ms-input" style="width:100%; border:none; outline:none; background:transparent;"></td>
              </tr>
              <tr>
                <td style="width:120px; background:#f8fbff; font-weight:500;">就業先住所</td>
                <td colspan="5" style="border: 1px solid #dbe4f0; padding: 4px;"><input id="wdAddr" class="admin-ms-input" style="width:100%; border:none; outline:none; background:transparent;"></td>
              </tr>
              <tr>
                <td style="width:120px; background:#f8fbff; font-weight:500;">業務内容</td>
                <td style="border: 1px solid #dbe4f0; padding: 4px;"><input id="wdWork" class="admin-ms-input" style="width:100%; border:none; outline:none; background:transparent;"></td>
                <td style="width:120px; background:#f8fbff; font-weight:500;">役職</td>
                <td style="border: 1px solid #dbe4f0; padding: 4px;"><input id="wdRole" class="admin-ms-input" style="width:100%; border:none; outline:none; background:transparent;"></td>
                <td style="width:120px; background:#f8fbff; font-weight:500;">責任の程度</td>
                <td style="border: 1px solid #dbe4f0; padding: 4px;"><input id="wdResp" class="admin-ms-input" style="width:100%; border:none; outline:none; background:transparent;"></td>
              </tr>`
);

// 4. Add the layout fix for the page alignment
code = code.replace(
  /function ensureEditorLayoutStyle\(\) \{\s*try \{\s*if \(document\.querySelector\('#adminMsExtraLayoutStyle'\)\) return;\s*const st = document\.createElement\('style'\);\s*st\.id = 'adminMsExtraLayoutStyle';\s*st\.textContent = `/,
  `function ensureEditorLayoutStyle() {
  try {
    if (document.querySelector('#adminMsExtraLayoutStyle')) return;
    const st = document.createElement('style');
    st.id = 'adminMsExtraLayoutStyle';
    st.textContent = \`
      #adminContent { max-width: none !important; margin-left: 16px !important; margin-right: 16px !important; }
      .admin-ms-page-head { padding-left: 16px !important; text-align: left !important; }
      .admin-ms-page-title { text-align: left !important; }
      .admin-ms-shell table { margin-left: 0 !important; }
`
);

fs.writeFileSync(filePath, code);
console.log("Done");

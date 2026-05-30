const fs = require('fs');
const file = 'c:\\tosouapp.com\\attendance\\backend\\src\\static\\js\\pages\\expenses.page.js';
const content = fs.readFileSync(file, 'utf8');
const lines = content.split('\n');

const startIdx = lines.findIndex(l => l.includes("const exAppMonth = document.getElementById('exAppMonth');"));
const endIdx = lines.findIndex(l => l.includes("document.getElementById('exHistoryNewBtn')?.click();")) + 2;

if (startIdx === -1 || endIdx === -1) {
  console.log('Not found', startIdx, endIdx);
  process.exit(1);
}

const extracted = lines.slice(startIdx, endIdx);
const listHostIdx = lines.findIndex(l => l.includes("if (listHost) listHost.style.display = 'block';"));

const before = lines.slice(0, listHostIdx + 1);
const afterExtracted = lines.slice(endIdx);

const tryBlockIdx = afterExtracted.findIndex(l => l.includes('  try {'));

let newLines = [
  ...before,
  "        await renderList();",
  "      });",
  "    }",
  "  };",
  "",
  ...extracted,
  "",
  ...afterExtracted.slice(tryBlockIdx)
];

fs.writeFileSync(file, newLines.join('\n'));
console.log('Fixed file structure');
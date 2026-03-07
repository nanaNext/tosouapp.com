const fs = require('fs');
const path = require('path');
function tryLoad(p) {
  if (fs.existsSync(p)) {
    try { require('dotenv').config({ path: p }); } catch {}
  }
}
const candidates = [
  path.join(__dirname, '../../.env'),
  path.join(__dirname, '../.env'),
  path.join(process.cwd(), '.env')
];
for (const p of candidates) {
  tryLoad(p);
}
module.exports = {};

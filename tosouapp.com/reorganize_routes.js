const fs = require('fs');
const code = fs.readFileSync('./attendance/backend/src/modules/expenses/expenses.routes.js', 'utf8');

// The file has a header, then routes, then module.exports = router;
// A route starts with router.<method>('path',

const regex = /^router\.(get|post|patch|delete)\('([^']+)',/gm;
let match;
const routePositions = [];
while ((match = regex.exec(code)) !== null) {
  routePositions.push({
    index: match.index,
    method: match[1],
    path: match[2]
  });
}

// Extract blocks
const blocks = [];
for (let i = 0; i < routePositions.length; i++) {
  const start = routePositions[i].index;
  const end = (i + 1 < routePositions.length) ? routePositions[i+1].index : code.lastIndexOf('module.exports = router;');
  blocks.push({
    path: routePositions[i].path,
    code: code.substring(start, end)
  });
}

const header = code.substring(0, routePositions[0].index);
const footer = code.substring(code.lastIndexOf('module.exports = router;'));

const idRoutes = [];
const otherRoutes = [];

for (const b of blocks) {
  if (b.path.startsWith('/:id') || b.path.startsWith('/files/:fileId')) {
    idRoutes.push(b);
  } else {
    otherRoutes.push(b);
  }
}

const newCode = header + otherRoutes.map(b => b.code).join('') + idRoutes.map(b => b.code).join('') + footer;
fs.writeFileSync('./attendance/backend/src/modules/expenses/expenses.routes.js', newCode);
console.log('Routes reordered successfully.');

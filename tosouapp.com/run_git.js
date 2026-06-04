const cp = require('child_process');
const fs = require('fs');
try {
  cp.execSync('git add .');
  cp.execSync('git commit -m "fix: final push for textarea"');
  cp.execSync('git push origin main');
  fs.writeFileSync('output.txt', 'Success');
} catch (e) {
  fs.writeFileSync('output.txt', 'Error: ' + e.message);
}
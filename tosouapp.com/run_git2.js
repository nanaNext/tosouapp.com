const cp = require('child_process');
const fs = require('fs');
try {
  cp.execSync('git add .');
  cp.execSync('git commit -m "fix: update memo extraction logic to support textarea instead of input"');
  cp.execSync('git push origin main');
  fs.writeFileSync('C:/tosouapp.com/deploy2_log.txt', 'Success');
} catch (e) {
  fs.writeFileSync('C:/tosouapp.com/deploy2_log.txt', 'Error: ' + e.message + '\n' + (e.stdout ? e.stdout.toString() : ''));
}
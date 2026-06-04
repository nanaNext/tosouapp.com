const cp = require('child_process');
const fs = require('fs');

try {
  let out = cp.execSync('git add .').toString();
  out += cp.execSync('git commit -m "fix: update memo extraction logic to support textarea instead of input"').toString();
  out += cp.execSync('git push origin main').toString();
  fs.writeFileSync(__dirname + '/deploy5_log.txt', out + '\nSuccess');
} catch (e) {
  fs.writeFileSync(__dirname + '/deploy5_log.txt', 'Error: ' + e.message + '\n' + (e.stdout ? e.stdout.toString() : ''));
}
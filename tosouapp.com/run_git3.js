const cp = require('child_process');
const fs = require('fs');

let out = '';
try {
  out += cp.execSync('git add .').toString();
  out += cp.execSync('git commit -m "fix: update memo extraction logic to support textarea instead of input"').toString();
  out += cp.execSync('git push origin main').toString();
  fs.writeFileSync('C:/tosouapp.com/deploy3_log.txt', out + '\nSuccess');
} catch (e) {
  fs.writeFileSync('C:/tosouapp.com/deploy3_log.txt', out + '\nError: ' + e.message + '\n' + (e.stdout ? e.stdout.toString() : ''));
}
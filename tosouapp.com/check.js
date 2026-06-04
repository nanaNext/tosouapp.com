const cp = require('child_process');
const fs = require('fs');
try {
  const log = cp.execSync('git log -3').toString();
  const status = cp.execSync('git status').toString();
  const push = cp.execSync('git push origin main').toString();
  fs.writeFileSync('C:/tosouapp.com/result.txt', `LOG:\n${log}\n\nSTATUS:\n${status}\n\nPUSH:\n${push}`);
} catch (e) {
  fs.writeFileSync('C:/tosouapp.com/result.txt', `ERROR:\n${e.message}\n${e.stdout?.toString()}\n${e.stderr?.toString()}`);
}
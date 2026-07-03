const { execSync } = require('child_process');
const fs = require('fs');
try {
  let log = "Status:\n" + execSync('git status', {cwd: 'C:\\tosouapp.com'}).toString();
  log += "\nAdd:\n" + execSync('git add .', {cwd: 'C:\\tosouapp.com'}).toString();
  try {
    log += "\nCommit:\n" + execSync('git commit -m "fix: resolve frontend blank screen issue"', {cwd: 'C:\\tosouapp.com'}).toString();
  } catch(e) { log += "\nCommit err: " + e.message; }
  log += "\nPush:\n" + execSync('git push origin main', {cwd: 'C:\\tosouapp.com'}).toString();
  fs.writeFileSync('C:\\Users\\Administrator.DESKTOP-98TGIBL\\AppData\\Local\\Temp\\git_push_root.txt', log);
} catch(e) {
  fs.writeFileSync('C:\\Users\\Administrator.DESKTOP-98TGIBL\\AppData\\Local\\Temp\\git_push_root.txt', "ERR: " + e.message);
}

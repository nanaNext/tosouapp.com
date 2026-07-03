const { execSync } = require('child_process');
const fs = require('fs');

try {
  let log = "";
  log += execSync('git add .').toString();
  log += execSync('git commit -m "fix: update prod logic"').toString();
  log += execSync('git push origin main').toString();
  fs.writeFileSync('C:\\tosouapp.com\\push_log.txt', log);
} catch(e) {
  fs.writeFileSync('C:\\tosouapp.com\\push_log.txt', "ERROR: " + e.message + "\n" + (e.stdout ? e.stdout.toString() : "") + "\n" + (e.stderr ? e.stderr.toString() : ""));
}

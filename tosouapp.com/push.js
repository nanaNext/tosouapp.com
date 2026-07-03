const { execSync } = require('child_process');
const fs = require('fs');
try {
  const add = execSync('git add .').toString();
  let commit = "";
  try {
    commit = execSync('git commit -m "fix: leave hours blank on PDF if checkin or checkout is missing (v8)"').toString();
  } catch(e) {}
  const push = execSync('git push origin main').toString();
  fs.writeFileSync('C:\\tosouapp.com\\git_out.txt', add + "\n" + commit + "\n" + push);
} catch(e) {
  fs.writeFileSync('C:\\tosouapp.com\\git_err.txt', e.message);
}

const cp = require('child_process');
const fs = require('fs');
try {
  const log = cp.execSync('git log -3 --oneline').toString();
  const remoteLog = cp.execSync('git log origin/main -3 --oneline').toString();
  fs.writeFileSync('C:/tosouapp.com/git_info2.txt', `LOCAL:\n${log}\nREMOTE:\n${remoteLog}`);
} catch (e) {
  fs.writeFileSync('C:/tosouapp.com/git_info2.txt', e.toString());
}
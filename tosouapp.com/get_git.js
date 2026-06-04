const cp = require('child_process');
const fs = require('fs');
try {
  const log = cp.execSync('git log -5 --oneline').toString();
  const status = cp.execSync('git status').toString();
  fs.writeFileSync('C:/tosouapp.com/git_info.txt', log + '\n\n' + status);
} catch (e) {
  fs.writeFileSync('C:/tosouapp.com/git_info.txt', e.toString());
}
const { execSync } = require('child_process');
const fs = require('fs');

try {
  let log = "";
  log += execSync('git status').toString();
  fs.writeFileSync('c:\\tosouapp.com\\git_status_result.txt', log);
} catch(e) {
  fs.writeFileSync('c:\\tosouapp.com\\git_status_result.txt', e.message);
}

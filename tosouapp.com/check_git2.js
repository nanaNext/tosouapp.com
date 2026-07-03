const { execSync } = require('child_process');
const fs = require('fs');
try {
  const log = execSync('git log -n 3 --stat', {cwd: 'C:\\tosouapp.com'}).toString();
  fs.writeFileSync('C:\\tosouapp.com\\git_log_stat.txt', log);
} catch(e) {
  fs.writeFileSync('C:\\tosouapp.com\\git_log_stat.txt', e.message);
}

const { execSync } = require('child_process');
const fs = require('fs');
try {
  const cwd = 'C:\\tosouapp.com\\attendance\\backend';
  const log = execSync('git log -n 3 -p', {cwd}).toString();
  fs.writeFileSync('C:\\tosouapp.com\\git_diff_backend.txt', log);
} catch(e) {}

const { execSync } = require('child_process');
const fs = require('fs');
try {
  fs.writeFileSync('C:\\tosouapp.com\\git_diff.txt', execSync('git log -n 2 -p', {cwd: 'C:\\tosouapp.com\\attendance\\backend'}).toString());
} catch(e) {}

const { execSync } = require('child_process');
const fs = require('fs');
try {
  const cwd = 'C:\\tosouapp.com\\attendance\\backend';
  const out = execSync('git diff HEAD~5 HEAD', {cwd, maxBuffer: 1024 * 1024 * 50}).toString();
  fs.writeFileSync('C:\\tosouapp.com\\git_diff_all.txt', out);
} catch(e) {
  fs.writeFileSync('C:\\tosouapp.com\\git_diff_all.txt', e.message);
}

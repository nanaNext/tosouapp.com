const { execSync } = require('child_process');
const fs = require('fs');

try {
  const cwd = 'C:\\tosouapp.com\\attendance\\backend';
  let log = execSync('git status', {cwd}).toString();
  fs.writeFileSync(cwd + '\\git_status_output.txt', log);
} catch(e) {
  fs.writeFileSync('C:\\tosouapp.com\\attendance\\backend\\git_status_output.txt', e.message);
}

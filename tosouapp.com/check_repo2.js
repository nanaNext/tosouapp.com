const { execSync } = require('child_process');
const fs = require('fs');
try {
  fs.writeFileSync('C:\\tosouapp.com\\repo_root.txt', execSync('git rev-parse --show-toplevel', {cwd: 'C:\\tosouapp.com\\attendance\\backend'}).toString().trim());
} catch (e) {
  fs.writeFileSync('C:\\tosouapp.com\\repo_root.txt', e.message);
}

const { execSync } = require('child_process');
const fs = require('fs');
try {
  const out = execSync('git status', { cwd: 'c:\\tosouapp.com', encoding: 'utf8' });
  fs.writeFileSync('c:\\tosouapp.com\\git_out.txt', out);
} catch (e) {
  fs.writeFileSync('c:\\tosouapp.com\\git_out.txt', e.toString() + '\n' + (e.stdout || '') + '\n' + (e.stderr || ''));
}

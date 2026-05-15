const { execSync } = require('child_process');
const fs = require('fs');
let out = '';
try {
  out += execSync('git add .', { encoding: 'utf8', cwd: 'C:/tosouapp.com' }) + '\n';
  out += execSync('git commit -m "feat: update email config and shift reminders"', { encoding: 'utf8', cwd: 'C:/tosouapp.com' }) + '\n';
  out += execSync('git push', { encoding: 'utf8', cwd: 'C:/tosouapp.com' }) + '\n';
  out += 'GIT_PUSH_SUCCESS\n';
} catch (e) {
  out += 'ERROR: ' + e.message + '\n';
  if (e.stdout) out += 'STDOUT: ' + e.stdout + '\n';
  if (e.stderr) out += 'STDERR: ' + e.stderr + '\n';
}
fs.writeFileSync('C:/tosouapp.com/git-out.txt', out);
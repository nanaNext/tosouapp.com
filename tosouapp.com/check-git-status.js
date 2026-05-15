const { execSync } = require('child_process');
const fs = require('fs');
try {
  let out = '';
  out += '--- GIT STATUS ---\n';
  out += execSync('git status', { encoding: 'utf8' });
  out += '\n--- GIT LOG ---\n';
  out += execSync('git log -n 5', { encoding: 'utf8' });
  out += '\n--- GIT REMOTE ---\n';
  out += execSync('git remote -v', { encoding: 'utf8' });
  fs.writeFileSync('C:/tosouapp.com/git-check.txt', out);
} catch (e) {
  fs.writeFileSync('C:/tosouapp.com/git-check.txt', e.message + '\n' + (e.stdout || '') + '\n' + (e.stderr || ''));
}

const { execSync } = require('child_process');
const fs = require('fs');

try {
  const stdout = execSync('git add . && git commit -m "chore: force cache update for html files" && git push origin main', { cwd: 'C:\\tosouapp.com' }).toString();
  fs.writeFileSync('C:\\tosouapp.com\\deploy_log.txt', stdout);
} catch (e) {
  fs.writeFileSync('C:\\tosouapp.com\\deploy_log.txt', e.toString() + '\n' + (e.stdout ? e.stdout.toString() : ''));
}
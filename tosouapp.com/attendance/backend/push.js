const { execSync } = require('child_process');
const fs = require('fs');
try {
  const status = execSync('git status').toString();
  execSync('git add .');
  try {
    execSync('git commit -m "Update pagination and UI"');
  } catch (e) {}
  
  const pushOut = execSync('git push').toString();
  fs.writeFileSync('push_result.txt', 'SUCCESS\n' + status + '\n' + pushOut);
} catch (e) {
  fs.writeFileSync('push_result.txt', 'ERROR\n' + e.message + '\n' + (e.stdout ? e.stdout.toString() : '') + '\n' + (e.stderr ? e.stderr.toString() : ''));
}

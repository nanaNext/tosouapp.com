const { execSync } = require('child_process');
const fs = require('fs');
try {
  const out = execSync('git log origin/main -n 5 --oneline', { cwd: 'c:\\tosouapp.com', encoding: 'utf8' });
  fs.writeFileSync('c:\\tosouapp.com\\push_result.txt', 'LOG:\n' + out);
} catch (e) {
  fs.writeFileSync('c:\\tosouapp.com\\push_result.txt', 'ERROR:\n' + e.message);
}

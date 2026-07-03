const { execSync } = require('child_process');
const fs = require('fs');

try {
  const cwd = 'C:\\tosouapp.com\\attendance\\backend';
  const out = execSync('git log -p -n 5', {cwd, maxBuffer: 1024 * 1024 * 50}).toString();
  fs.writeFileSync('C:\\Users\\Administrator.DESKTOP-98TGIBL\\AppData\\Local\\Temp\\git_diff_full.txt', out);
} catch(e) {
  fs.writeFileSync('C:\\Users\\Administrator.DESKTOP-98TGIBL\\AppData\\Local\\Temp\\git_diff_full.txt', e.message);
}

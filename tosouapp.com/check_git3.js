const { execSync } = require('child_process');
const fs = require('fs');
try {
  const cwd = 'C:\\tosouapp.com';
  const log = execSync('git log -n 2 -p', {cwd, maxBuffer: 1024 * 1024 * 10}).toString();
  fs.writeFileSync('C:\\Users\\Administrator.DESKTOP-98TGIBL\\AppData\\Local\\Temp\\git_diff.txt', log);
  console.log("Wrote to temp");
} catch(e) {
  console.error("Error", e.message);
}

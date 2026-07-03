const { execSync } = require('child_process');
const fs = require('fs');

try {
  const cwd = 'C:\\tosouapp.com\\attendance\\backend';
  let out = "";
  
  out += execSync('git add .', {cwd}).toString() + "\n";
  try {
    out += execSync('git commit -m "fix: resolve admin dashboard loading issue"', {cwd}).toString() + "\n";
  } catch(e) { out += e.message + "\n"; }
  out += execSync('git push origin main', {cwd}).toString() + "\n";
  
  fs.writeFileSync('C:\\Users\\Administrator.DESKTOP-98TGIBL\\AppData\\Local\\Temp\\git_push_out.txt', out);
} catch (e) {
  fs.writeFileSync('C:\\Users\\Administrator.DESKTOP-98TGIBL\\AppData\\Local\\Temp\\git_push_err.txt', e.toString());
}

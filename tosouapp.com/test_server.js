const { execSync } = require('child_process');
const fs = require('fs');

try {
  const cwd = 'C:\\tosouapp.com\\attendance\\backend';
  const out = execSync('node src/server.js', {cwd, stdio: 'pipe'}).toString();
  fs.writeFileSync('C:\\Users\\Administrator.DESKTOP-98TGIBL\\AppData\\Local\\Temp\\server_out.txt', out);
} catch(e) {
  let err = e.message + "\n";
  if (e.stdout) err += "STDOUT:\n" + e.stdout.toString() + "\n";
  if (e.stderr) err += "STDERR:\n" + e.stderr.toString() + "\n";
  fs.writeFileSync('C:\\Users\\Administrator.DESKTOP-98TGIBL\\AppData\\Local\\Temp\\server_err.txt', err);
}

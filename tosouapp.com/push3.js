const { execSync } = require('child_process');
const fs = require('fs');
let out = "";
try {
  out += execSync('git add .', {cwd: 'C:\\tosouapp.com'}).toString();
  try {
    out += execSync('git commit -m "feat: remove 申請 (Requests) tab from employee portal navigation"', {cwd: 'C:\\tosouapp.com'}).toString();
  } catch(e) { out += e.message; }
  out += execSync('git push origin main', {cwd: 'C:\\tosouapp.com'}).toString();
  fs.writeFileSync('C:\\tosouapp.com\\push_log3.txt', out);
} catch(e) { 
  fs.writeFileSync('C:\\tosouapp.com\\push_log3.txt', e.message); 
}

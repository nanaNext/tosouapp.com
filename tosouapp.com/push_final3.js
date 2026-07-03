const { execSync } = require('child_process');
const fs = require('fs');
let out = "";
try {
  out += execSync('git add .', {cwd: 'C:\\tosouapp.com'}).toString();
  try {
    out += execSync('git commit -m "fix: resolve frontend blank screen issue"', {cwd: 'C:\\tosouapp.com'}).toString();
  } catch(e) { out += e.message; }
  out += execSync('git push origin main', {cwd: 'C:\\tosouapp.com'}).toString();
  fs.writeFileSync('C:\\tosouapp.com\\push_final2_out.txt', out);
} catch(e) { 
  fs.writeFileSync('C:\\tosouapp.com\\push_final2_out.txt', e.message); 
}

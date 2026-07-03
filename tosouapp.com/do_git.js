const { execSync } = require('child_process');
const fs = require('fs');

try {
  let log = "";
  
  try {
    log += "Adding...\n";
    execSync('git add .');
  } catch(e) { log += e.message + "\n"; }
  
  try {
    log += "Committing...\n";
    execSync('git commit -m "fix: leave hours blank on PDF if checkin or checkout is missing (v8)"');
  } catch(e) { log += e.message + "\n"; }
  
  try {
    log += "Pushing...\n";
    const push = execSync('git push origin main');
    log += "Push success: " + push.toString() + "\n";
  } catch(e) { log += e.message + "\n"; }
  
  try {
    log += "Log:\n";
    log += execSync('git log -n 1 --oneline').toString();
  } catch(e) { log += e.message + "\n"; }
  
  fs.writeFileSync('c:\\tosouapp.com\\git_result.txt', log);
} catch(e) {
  fs.writeFileSync('c:\\tosouapp.com\\git_result.txt', e.message);
}

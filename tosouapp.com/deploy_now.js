const { execSync } = require('child_process');
const fs = require('fs');

try {
  let log = "";
  const cwd = 'C:\\tosouapp.com\\attendance\\backend';
  log += "Adding: " + execSync('git --no-pager add .', {cwd}).toString() + "\n";
  try {
    log += "Committing: " + execSync('git --no-pager commit -m "deploy: update to production"', {cwd}).toString() + "\n";
  } catch(e) { log += "Commit err: " + e.message + "\n"; }
  log += "Pushing: " + execSync('git --no-pager push origin main', {cwd}).toString() + "\n";
  fs.writeFileSync('C:\\tosouapp.com\\deploy_out_123.txt', log);
  console.log("Success");
} catch(e) {
  fs.writeFileSync('C:\\tosouapp.com\\deploy_out_123.txt', "ERROR: " + e.message);
  console.log("Error");
}

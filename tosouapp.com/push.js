const { execSync } = require('child_process');
const fs = require('fs');
try {
  const status = execSync('git status').toString();
  console.log(status);
  
  execSync('git add .');
  try {
    execSync('git commit -m "Update pagination and UI"');
  } catch (e) {
    console.log("Nothing to commit or commit failed:", e.message);
  }
  
  const pushOut = execSync('git push').toString();
  console.log("Push success:", pushOut);
  
  fs.writeFileSync('C:\\tosouapp.com\\push_result.txt', 'SUCCESS\n' + status + '\n' + pushOut);
} catch (e) {
  console.error("Error:", e.message);
  if (e.stdout) console.error("STDOUT:", e.stdout.toString());
  if (e.stderr) console.error("STDERR:", e.stderr.toString());
  fs.writeFileSync('C:\\tosouapp.com\\push_result.txt', 'ERROR\n' + e.message + '\n' + (e.stdout ? e.stdout.toString() : '') + '\n' + (e.stderr ? e.stderr.toString() : ''));
}

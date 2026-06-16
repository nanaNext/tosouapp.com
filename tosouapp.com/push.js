const { execSync } = require('child_process');
const fs = require('fs');

try {
  console.log("Running git operations...");
  const add = execSync('git add attendance/backend/src/static/js/pages/shifts.page.js attendance/backend/src/static/js/pages/shifts-all.page.js', { cwd: 'c:\\tosouapp.com', encoding: 'utf8' });
  console.log(add);
  
  try {
    const commit = execSync('git commit -m "hotfix: restore utf-8 encoding for shifts"', { cwd: 'c:\\tosouapp.com', encoding: 'utf8' });
    console.log(commit);
  } catch (e) {
    console.log("Commit might have failed if no changes or already committed", e.stdout);
  }

  const push = execSync('git push', { cwd: 'c:\\tosouapp.com', encoding: 'utf8' });
  console.log("PUSH SUCCESS", push);
  
  fs.writeFileSync('c:\\tosouapp.com\\push_result.txt', "SUCCESS\n" + push);
} catch (e) {
  console.error("ERROR", e);
  fs.writeFileSync('c:\\tosouapp.com\\push_result.txt', "ERROR\n" + e.toString() + "\nSTDOUT:\n" + (e.stdout||'') + "\nSTDERR:\n" + (e.stderr||''));
}

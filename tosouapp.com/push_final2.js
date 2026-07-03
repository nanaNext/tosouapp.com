const { execSync } = require('child_process');
try {
  console.log(execSync('git add .', {cwd: 'C:\\tosouapp.com'}).toString());
  try {
    console.log(execSync('git commit -m "fix: resolve frontend blank screen issue"', {cwd: 'C:\\tosouapp.com'}).toString());
  } catch(e) {}
  console.log(execSync('git push origin main', {cwd: 'C:\\tosouapp.com'}).toString());
} catch(e) { console.error(e.message); }

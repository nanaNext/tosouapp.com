const { execSync } = require('child_process');
try {
  console.log(execSync('git log -n 5 --oneline', {cwd: 'C:\\tosouapp.com'}).toString());
} catch(e) { console.error(e.message); }

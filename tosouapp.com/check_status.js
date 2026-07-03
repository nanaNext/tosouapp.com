const { execSync } = require('child_process');
console.log(execSync('git status', {cwd: 'C:\\tosouapp.com'}).toString());

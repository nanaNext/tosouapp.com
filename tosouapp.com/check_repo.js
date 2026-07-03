const { execSync } = require('child_process');
console.log(execSync('git rev-parse --show-toplevel', {cwd: 'C:\\tosouapp.com\\attendance\\backend'}).toString().trim());

const { execSync } = require('child_process');
const fs = require('fs');
try {
  fs.writeFileSync('C:\\tosouapp.com\\status_out.txt', execSync('git status', {cwd: 'C:\\tosouapp.com'}).toString());
  console.log('done');
} catch(e) {
  fs.writeFileSync('C:\\tosouapp.com\\status_out.txt', e.toString());
  console.log('error');
}

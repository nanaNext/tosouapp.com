const { execSync } = require('child_process');
const fs = require('fs');
let out = "Root repo remotes:\n";
try { out += execSync('git remote -v', {cwd: 'C:\\tosouapp.com'}).toString(); } catch(e) { out += e.message + '\n'; }
out += "\nBackend repo remotes:\n";
try { out += execSync('git remote -v', {cwd: 'C:\\tosouapp.com\\attendance\\backend'}).toString(); } catch(e) { out += e.message + '\n'; }
fs.writeFileSync('C:\\tosouapp.com\\remotes.txt', out);

const cp = require('child_process');
try {
  console.log(cp.execSync('git add .', {cwd: 'c:/tosouapp.com'}).toString());
  console.log(cp.execSync('git commit -m "fix: deploy final ui and auth fixes"', {cwd: 'c:/tosouapp.com'}).toString());
  console.log(cp.execSync('git push origin main', {cwd: 'c:/tosouapp.com'}).toString());
} catch(e) {
  console.error(e.stdout ? e.stdout.toString() : e.message);
  console.error(e.stderr ? e.stderr.toString() : '');
}
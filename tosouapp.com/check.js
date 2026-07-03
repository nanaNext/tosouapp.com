const { execSync } = require('child_process');
try {
  const out = execSync('git log -n 1 --oneline').toString();
  console.log('LOG:', out);
  const status = execSync('git status --short').toString();
  console.log('STATUS:', status);
} catch (e) {
  console.error(e.message);
}

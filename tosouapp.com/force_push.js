const { execSync } = require('child_process');
try {
  console.log("Adding...");
  execSync('git add .');
  console.log("Committing...");
  try {
    execSync('git commit -m "fix: make sure PDF export hides all hours for missing checkin/checkout"');
  } catch (e) {
    console.log("Commit may have failed if no changes (or already committed).", e.stdout?.toString());
  }
  console.log("Pushing...");
  const pushOut = execSync('git push origin main').toString();
  console.log("PUSH SUCCESS:", pushOut);
  
  const logOut = execSync('git log -n 1 --oneline').toString();
  console.log("LATEST COMMIT:", logOut);
} catch (e) {
  console.error("ERROR:", e.message);
  if (e.stdout) console.error("STDOUT:", e.stdout.toString());
  if (e.stderr) console.error("STDERR:", e.stderr.toString());
}

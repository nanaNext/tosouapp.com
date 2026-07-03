const { execSync } = require('child_process');
const fs = require('fs');

let out = "";
function run(cmd) {
    try {
        out += `> ${cmd}\n`;
        const res = execSync(cmd, { stdio: 'pipe' });
        out += res.toString() + "\n";
    } catch (e) {
        out += `ERROR: ${e.message}\n`;
        if (e.stdout) out += `STDOUT: ${e.stdout.toString()}\n`;
        if (e.stderr) out += `STDERR: ${e.stderr.toString()}\n`;
    }
}

run('git status');
run('git add .');
run('git commit -m "chore: deploy latest changes to production"');
run('git push origin main');
run('git log -n 1');

fs.writeFileSync('C:\\tosouapp.com\\git_deploy_out.txt', out);
console.log("Done. Check git_deploy_out.txt");

const controller = require('./src/modules/attendance/attendance.controller');
const repo = require('./src/modules/attendance/attendance.repository');

async function run() {
  const req = {
    user: { id: 2, role: 'employee' },
    params: { date: '2026-06-05' },
    body: {
      location: '飯塚塗研',
      memo: ' ',
      notes: 'Testing notes via controller',
      lateMinutes: 355,
      earlyMinutes: null,
      kubun: '出勤',
      workType: 'onsite',
      breakMinutes: 60,
      nightBreakMinutes: 0
    }
  };
  
  const res = {
    status: (code) => {
      console.log('Status:', code);
      return res;
    },
    json: (data) => {
      console.log('Response:', data);
    }
  };
  
  // mock resolveTargetUserId
  // Actually resolveTargetUserId reads req.user.id and req.query.userId
  req.query = {};
  
  console.log('Calling putDaily...');
  await controller.putDaily(req, res);
  
  console.log('Checking DB directly...');
  const daily = await repo.getDaily(2, '2026-06-05');
  console.log('DB Daily:', daily);
  
  process.exit(0);
}

run().catch(console.error);
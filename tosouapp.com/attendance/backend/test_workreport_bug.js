const controller = require('./src/modules/workReports/workReports.controller');
const attendanceRepo = require('./src/modules/attendance/attendance.repository');

async function run() {
  const userId = 2;
  const date = '2026-06-05';
  
  // 1. Manually save notes via upsertDaily (simulating PUT /daily)
  await attendanceRepo.upsertDaily(userId, date, {
    location: 'test', memo: 'test', notes: 'My important note', lateMinutes: 15
  });
  
  let daily = await attendanceRepo.getDaily(userId, date);
  console.log('1. After PUT /daily, notes:', daily.notes);
  
  // 2. Simulate POST /work-reports
  const mockReq = {
    user: { id: userId },
    body: { date, site: 'new site', work: 'new work', workType: 'onsite' }
  };
  const mockRes = {
    status: () => mockRes,
    json: () => {}
  };
  
  await controller.createReport(mockReq, mockRes);
  
  daily = await attendanceRepo.getDaily(userId, date);
  console.log('2. After POST /work-reports, notes:', daily.notes);
  
  process.exit(0);
}

run().catch(console.error);
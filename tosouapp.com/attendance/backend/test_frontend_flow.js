const http = require('http');

// Let's use the local API
const db = require('./src/core/database/mysql');
const repo = require('./src/modules/attendance/attendance.repository');

async function run() {
  const userId = 2; // test user
  const date = '2026-06-05';
  
  // 1. Initial upsert with notes
  console.log('--- 1. Sending full payload ---');
  const incoming = {
    location: 'test',
    memo: 'test memo',
    notes: 'Lý do đi trễ test',
    lateMinutes: 15,
    earlyMinutes: null,
    kubun: '出勤',
    workType: 'onsite',
    breakMinutes: 60,
    nightBreakMinutes: 0
  };
  await repo.upsertDaily(userId, date, incoming);
  let daily = await repo.getDaily(userId, date);
  console.log('After full payload, notes:', daily?.notes);

  // 2. Simulate saveWorkReportIfPossible which calls upsertDaily WITHOUT notes
  console.log('\n--- 2. Sending work report payload ---');
  await repo.upsertDaily(userId, date, { location: 'test', memo: 'test memo' });
  daily = await repo.getDaily(userId, date);
  console.log('After work report payload, notes:', daily?.notes);
  
  process.exit(0);
}

run().catch(console.error);
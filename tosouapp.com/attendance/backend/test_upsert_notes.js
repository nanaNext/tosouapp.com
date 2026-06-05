const repo = require('./src/modules/attendance/attendance.repository');
const db = require('./src/core/database/mysql');

async function test() {
  try {
    const userId = 2; // Assuming a valid user ID, change if needed
    const date = '2026-06-05';
    
    console.log('1. Checking current daily...');
    let daily = await repo.getDaily(userId, date);
    console.log('Current daily:', daily);
    
    console.log('2. Upserting daily with notes...');
    await repo.upsertDaily(userId, date, { notes: 'Test lý do', location: 'test', memo: 'test' });
    
    console.log('3. Checking updated daily...');
    daily = await repo.getDaily(userId, date);
    console.log('Updated daily notes:', daily?.notes);
    
    console.log('4. Upserting daily without notes (like persistDaily)...');
    await repo.upsertDaily(userId, date, { kubun: '出勤', workType: 'onsite', breakMinutes: 60, nightBreakMinutes: 0 });
    
    console.log('5. Checking if notes is preserved...');
    daily = await repo.getDaily(userId, date);
    console.log('Preserved daily notes:', daily?.notes);
    
    console.log('6. Upserting from work-reports (location and memo only)...');
    await repo.upsertDaily(userId, date, { location: 'test2', memo: 'test2' });
    
    console.log('7. Checking if notes is still preserved...');
    daily = await repo.getDaily(userId, date);
    console.log('Final daily notes:', daily?.notes);
    
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

test();

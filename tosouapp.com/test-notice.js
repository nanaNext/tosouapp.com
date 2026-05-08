const db = require('./attendance/backend/src/core/database/mysql.js');
const noticesRepo = require('./attendance/backend/src/modules/notices/notices.repository.js');

async function test() {
  try {
    await noticesRepo.createAdminNotification({
      kind: 'attendance_punch',
      title: '打刻通知',
      message: 'testさんが退勤打刻をしました（12:00）',
      linkUrl: '/admin/attendance',
      createdBy: 2,
      audience: 'admin_manager'
    });
    console.log('Notice created');
    
    const { items } = await noticesRepo.listAdminFeed({ userId: 1, role: 'admin', limit: 10 });
    console.log('Admin feed:', items);
  } catch (e) {
    console.error('Error:', e);
  } finally {
    process.exit(0);
  }
}
test();
require('./src/config/loadEnv');
const { initBackupCronJob } = require('./src/cron/dbBackupCron');
const { initAttendanceTimeoutCron } = require('./src/cron/attendanceTimeoutCron');
const { initShiftSubmissionReminderCron } = require('./src/cron/shiftSubmissionReminderCron');

console.log('==================================================');
console.log('🚀 KHỞI ĐỘNG CRON WORKER ĐỘC LẬP (BACKGROUND TASKS)');
console.log('==================================================');

initAttendanceTimeoutCron();
if (process.env.NODE_ENV === 'production') {
    initBackupCronJob();
    console.log('[CronWorker] Đã kích hoạt DB Backup Cron.');
}

// 3. Tương lai: Có thể chuyển các Scheduler như Auto-Grant Leave, Shift Reminders 
// từ server.js sang đây để cô lập hoàn toàn khỏi luồng API.

// Giữ cho process không bị thoát
process.on('SIGINT', () => {
    console.log('🛑 Đang đóng Cron Worker...');
    process.exit(0);
});

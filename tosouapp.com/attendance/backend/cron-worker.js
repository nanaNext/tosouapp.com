require('./src/config/loadEnv');
const { initBackupCronJob } = require('./src/cron/dbBackupCron');
const { initAttendanceTimeoutCron } = require('./src/cron/attendanceTimeoutCron');

console.log('==================================================');
console.log('🚀 KHỞI ĐỘNG CRON WORKER ĐỘC LẬP (BACKGROUND TASKS)');
console.log('==================================================');

// 1. Khởi chạy tác vụ quét quên check-out (Hard Timeout 12h)
initAttendanceTimeoutCron();

// 2. Khởi chạy tác vụ Backup DB (Chỉ chạy trên Production)
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

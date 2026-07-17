// File khởi chạy máy chủ (Server Entry Point)
// Chứa cấu hình Port và các tính năng chạy ngầm (Cron Jobs)

// Initialize error monitoring
const errorReporter = require('./core/errorReporter');
errorReporter.init();

// Auto Database Backup Cron - Tự động sao lưu dữ liệu MySQL
const { initBackupCronJob } = require('./cron/dbBackupCron');

// Health Monitor - Built-in uptime check + Discord/Slack alert
const { initHealthMonitor } = require('./cron/healthMonitorCron');

const app = require('./app');
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const disableSchedulers = String(process.env.DISABLE_SCHEDULERS || '').toLowerCase() === 'true';

// Hàm tự động cấp phép ngày nghỉ (Leave Grants) cho nhân viên
function initAutoGrantScheduler() {
  try {
    const userRepo = require('./modules/users/user.repository');
    const { ensureUserGrants } = require('./modules/leave/leave.controller');
    let lastRunDay = null;
    async function run() {
      try {
        const users = await userRepo.listUsers();
        for (const u of users) {
          try { await ensureUserGrants(u.id); } catch (e) { /* silently ignored */ }
        }
        lastRunDay = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
        console.log('[auto-grant] completed for day', lastRunDay);
      } catch (err) {
        console.error('[auto-grant] error', err && err.message);
      }
    }
    run();
    setInterval(() => {
      const jst = new Date(Date.now() + 9 * 3600 * 1000);
      const day = jst.toISOString().slice(0, 10);
      const hour = jst.getUTCHours();
      if (lastRunDay !== day && hour >= 3 && hour < 4) {
        run();
      }
    }, 15 * 60 * 1000);
  } catch (e) {
    console.error('[auto-grant] init error', e && e.message);
  }
}

function initShiftReminders() {
  try {
    const shiftReminder = require('./services/shiftReminder.service');
    shiftReminder.init();

    const { initShiftSubmissionReminderCron } = require('./cron/shiftSubmissionReminderCron');
    initShiftSubmissionReminderCron();
  } catch (e) {
    console.error('[ShiftReminder] init error', e && e.message);
  }
}

async function start() {
  try {
    await require('./core/bootstrap').init();
    const server = app.listen(PORT, HOST, () => {
      const shownHost = HOST === '0.0.0.0' ? 'localhost' : HOST;
      console.log(`Server is running at http://${shownHost}:${PORT} (bind ${HOST})`);
    });
    // Khởi tạo các tác vụ chạy ngầm nếu không bị vô hiệu hóa
    if (!disableSchedulers) {
      initAutoGrantScheduler(); // Cấp ngày nghỉ tự động
      initShiftReminders();     // Gửi email nhắc nhở/báo cáo chấm công
    }

    // Initialize backup cron job - Tự động sao lưu Database (chỉ chạy trên Production)
    if (process.env.NODE_ENV === 'production') {
        initBackupCronJob();
    }

    // Initialize health monitor (all environments except test)
    initHealthMonitor();

    // Graceful shutdown — finish in-flight requests before stopping
    const shutdown = (signal) => {
      console.log(`${signal} received. Shutting down gracefully...`);
      server.close(async () => {
        console.log('HTTP server closed.');
        try {
          const db = require('./core/database/mysql');
          await db.end();
          console.log('DB pool closed.');
        } catch (e) { /* silently ignored */ }
        process.exit(0);
      });
      // Force exit after 10s if connections won't close
      setTimeout(() => {
        console.error('Forced shutdown after timeout.');
        process.exit(1);
      }, 10000);
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (e) {
    try { console.error('bootstrap_error', e && e.message ? e.message : e); } catch (e) { /* silently ignored */ }
    process.exit(1);
  }
}

void start();


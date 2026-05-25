// File khởi chạy máy chủ (Server Entry Point)
// Chứa cấu hình Port và các tính năng chạy ngầm (Cron Jobs)

// Auto Database Backup Cron - Tự động sao lưu dữ liệu MySQL
const { initBackupCronJob } = require('./cron/dbBackupCron');

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
          try { await ensureUserGrants(u.id); } catch {}
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
  } catch (e) {
    console.error('[ShiftReminder] init error', e && e.message);
  }
}

async function start() {
  try {
    await require('./core/bootstrap').init();
    app.listen(PORT, HOST, () => {
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
  } catch (e) {
    try { console.error('bootstrap_error', e && e.message ? e.message : e); } catch {}
    process.exit(1);
  }
}

void start();


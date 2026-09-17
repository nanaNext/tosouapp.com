// File chạy ngầm (Cron Job): Tự động sao lưu dữ liệu (Backup) từ MySQL và gửi qua Email định kỳ
const cron = require('node-cron');
const path = require('path');
const fs = require('fs');
const mailService = require('../core/notifications/email.service');

// Only require mysqldump if it's actually installed, otherwise create a mock
let mysqldump;
try {
  mysqldump = require('mysqldump');
} catch (e) {
  console.warn('[DB Backup] mysqldump module not found, backup feature will be disabled.');
  mysqldump = async () => { throw new Error('mysqldump module is not installed'); };
}

const BACKUP_DIR = path.join(__dirname, '../uploads');
// Gmail/most SMTP relays reject attachments above ~25MB; stay well under that.
const MAX_EMAIL_ATTACHMENT_BYTES = 15 * 1024 * 1024;
// Giữ lại vài bản gần nhất trên ổ đĩa persistent (uploads/) làm lớp dự phòng
// thứ hai, độc lập với việc gửi email có thành công hay không.
const RETAIN_BACKUPS = 4;
const ALERT_EMAIL = 'iizuka_token@tosouapp.com';

async function sendAlertEmail(subject, html) {
    try {
        await mailService.sendMail({ to: ALERT_EMAIL, subject, html });
    } catch (alertError) {
        console.error('[Cron Job] Không gửi được email cảnh báo backup:', alertError);
    }
}

function pruneOldBackups() {
    try {
        const files = fs.readdirSync(BACKUP_DIR)
            .filter((f) => f.startsWith('tosouapp_backup_') && f.endsWith('.sql'))
            .sort() // timestamp trong tên file nên sort theo chuỗi = sort theo thời gian
            .reverse();
        for (const oldFile of files.slice(RETAIN_BACKUPS)) {
            fs.unlinkSync(path.join(BACKUP_DIR, oldFile));
            console.log(`[Cron Job] Đã dọn bản backup cũ: ${oldFile}`);
        }
    } catch (pruneError) {
        console.error('[Cron Job] Lỗi khi dọn backup cũ:', pruneError);
    }
}

async function runAutoBackup() {
    console.log('[Cron Job] Bắt đầu tự động backup Database...');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `tosouapp_backup_${timestamp}.sql`;
    const backupFilePath = path.join(BACKUP_DIR, backupFileName);

    try {
        if (!fs.existsSync(BACKUP_DIR)) {
            fs.mkdirSync(BACKUP_DIR, { recursive: true });
        }

        // 1. Tạo file backup SQL — nếu bước này lỗi, không có file nào bị xóa nhầm.
        await mysqldump({
            connection: {
                host: process.env.DB_HOST,
                port: process.env.DB_PORT || 3306,
                user: process.env.DB_USER,
                password: process.env.DB_PASS || process.env.DB_PASSWORD,
                database: process.env.DB_NAME,
            },
            dumpToFile: backupFilePath,
        });

        console.log(`[Cron Job] Backup tạo thành công tại: ${backupFilePath}`);

        // 2. File đã được tạo thành công trên ổ đĩa persistent — đây là lớp dự
        // phòng chính, tồn tại độc lập với việc gửi email có thành công hay không.
        const sizeBytes = fs.statSync(backupFilePath).size;
        if (sizeBytes > MAX_EMAIL_ATTACHMENT_BYTES) {
            console.warn(`[Cron Job] Backup ${(sizeBytes / 1024 / 1024).toFixed(1)}MB vượt ngưỡng gửi email, bỏ qua bước email.`);
            await sendAlertEmail(
                `[Cảnh báo] Backup TosouApp quá lớn để gửi email - ${new Date().toLocaleDateString('vi-VN')}`,
                `<p>Backup ngày hôm nay (${(sizeBytes / 1024 / 1024).toFixed(1)}MB) vượt quá giới hạn đính kèm email an toàn.</p>
                 <p>File vẫn được giữ trên server tại <code>${backupFilePath}</code> (giữ lại ${RETAIN_BACKUPS} bản gần nhất). Cần thiết lập nơi lưu trữ ngoài (S3/Drive...) trước khi dữ liệu lớn hơn nữa.</p>`
            );
        } else {
            // 3. Gửi Email đính kèm file
            const subject = `[Tự động] Bản sao lưu Dữ liệu Nhân sự TosouApp - ${new Date().toLocaleDateString('vi-VN')}`;
            const html = `
                <h3>Kính gửi Quản lý,</h3>
                <p>Đây là bản sao lưu (backup) tự động dữ liệu của hệ thống chấm công TosouApp.</p>
                <p>Bao gồm toàn bộ dữ liệu tài khoản, chấm công, thông tin lương của nhân viên tính đến thời điểm hiện tại.</p>
                <p>Xin vui lòng tải file đính kèm và cất giữ cẩn thận. Trong trường hợp hệ thống gặp sự cố (như lỗi máy chủ, sập database), bạn có thể cung cấp file này cho bộ phận kỹ thuật để khôi phục lại 100% dữ liệu.</p>
                <p>Trân trọng,<br/>Hệ thống tự động TosouApp.</p>
            `;

            try {
                await mailService.sendMail({
                    to: ALERT_EMAIL,
                    subject,
                    html,
                    attachments: [{ filename: backupFileName, path: backupFilePath }]
                });
                console.log(`[Cron Job] Đã gửi file backup thành công vào email: ${ALERT_EMAIL}`);
            } catch (mailError) {
                // Gửi email thất bại KHÔNG được xóa file — đây là bản backup duy nhất.
                console.error('[Cron Job] Gửi email backup thất bại (file vẫn được giữ lại):', mailError);
                await sendAlertEmail(
                    `[Cảnh báo] Gửi email backup TosouApp thất bại - ${new Date().toLocaleDateString('vi-VN')}`,
                    `<p>Backup đã tạo thành công nhưng gửi email thất bại: ${String(mailError.message || mailError)}</p>
                     <p>File vẫn còn trên server tại <code>${backupFilePath}</code>.</p>`
                );
            }
        }

        // 4. Dọn các bản backup cũ hơn RETAIN_BACKUPS bản gần nhất (không đụng bản vừa tạo).
        pruneOldBackups();

    } catch (error) {
        console.error('[Cron Job] Lỗi khi tự động backup Database:', error);
        await sendAlertEmail(
            `[Cảnh báo] Backup TosouApp THẤT BẠI - ${new Date().toLocaleDateString('vi-VN')}`,
            `<p>Tự động backup database thất bại, KHÔNG có bản backup nào được tạo hôm nay.</p>
             <p>Lỗi: ${String(error.message || error)}</p>`
        );
    }
}

// Khởi tạo Cron Job
function initBackupCronJob() {
    // Chạy vào 23:59 (11h59 đêm) mỗi ngày Chủ Nhật (Sunday = 0)
    // Cú pháp cron: '59 23 * * 0'
    // Để bạn dễ test ngay bây giờ, tôi để tạm lịch là mỗi đêm Chủ Nhật. 
    // Nếu bạn muốn test luôn bây giờ, chúng ta có thể đổi thành chạy mỗi phút.
    cron.schedule('59 23 * * 0', () => {
        runAutoBackup();
    }, {
        scheduled: true,
        timezone: "Asia/Tokyo" // Chạy theo múi giờ Nhật Bản
    });

    console.log('[Cron Job] Đã lên lịch tự động sao lưu dữ liệu vào 23:59 Chủ Nhật hàng tuần.');
}

module.exports = {
    initBackupCronJob,
    runAutoBackup // Export ra để có thể gọi test thủ công
};
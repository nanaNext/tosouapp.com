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

async function runAutoBackup() {
    console.log('[Cron Job] Bắt đầu tự động backup Database...');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `tosouapp_backup_${timestamp}.sql`;
    // Lưu tạm vào thư mục uploads
    const backupFilePath = path.join(__dirname, `../../../uploads/${backupFileName}`);

    try {
        // Đảm bảo thư mục uploads tồn tại
        if (!fs.existsSync(path.join(__dirname, '../../../uploads'))) {
            fs.mkdirSync(path.join(__dirname, '../../../uploads'), { recursive: true });
        }

        // 1. Tạo file backup SQL
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

        // 2. Gửi Email đính kèm file
        const toEmail = 'iizuka_token@tosouapp.com'; // Gửi thẳng vào email của bạn
        const subject = `[Tự động] Bản sao lưu Dữ liệu Nhân sự TosouApp - ${new Date().toLocaleDateString('vi-VN')}`;
        const html = `
            <h3>Kính gửi Quản lý,</h3>
            <p>Đây là bản sao lưu (backup) tự động dữ liệu của hệ thống chấm công TosouApp.</p>
            <p>Bao gồm toàn bộ dữ liệu tài khoản, chấm công, thông tin lương của nhân viên tính đến thời điểm hiện tại.</p>
            <p>Xin vui lòng tải file đính kèm và cất giữ cẩn thận. Trong trường hợp hệ thống gặp sự cố (như lỗi máy chủ, sập database), bạn có thể cung cấp file này cho bộ phận kỹ thuật để khôi phục lại 100% dữ liệu.</p>
            <p>Trân trọng,<br/>Hệ thống tự động TosouApp.</p>
        `;

        const attachments = [
            {
                filename: backupFileName,
                path: backupFilePath
            }
        ];

        await mailService.sendMail({
            to: toEmail,
            subject: subject,
            html: html,
            attachments: attachments
        });

        console.log(`[Cron Job] Đã gửi file backup thành công vào email: ${toEmail}`);

        // 3. Xóa file tạm sau khi gửi xong để không đầy ổ cứng server
        if (fs.existsSync(backupFilePath)) {
            fs.unlinkSync(backupFilePath);
            console.log(`[Cron Job] Đã xóa file tạm: ${backupFilePath}`);
        }

    } catch (error) {
        console.error('[Cron Job] Lỗi khi tự động backup và gửi email:', error);
        // Cố gắng dọn dẹp nếu có lỗi
        if (fs.existsSync(backupFilePath)) {
            fs.unlinkSync(backupFilePath);
        }
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
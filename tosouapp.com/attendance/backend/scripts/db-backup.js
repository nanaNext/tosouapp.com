const mysqldump = require('mysqldump');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function backupDatabase() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(__dirname, `../../backup_${timestamp}.sql`);

    console.log(`Bắt đầu backup dữ liệu từ host: ${process.env.DB_HOST}...`);

    try {
        await mysqldump({
            connection: {
                host: process.env.DB_HOST,
                port: process.env.DB_PORT || 3306,
                user: process.env.DB_USER,
                password: process.env.DB_PASSWORD,
                database: process.env.DB_NAME,
            },
            dumpToFile: backupFile,
        });

        console.log(`✅ Backup thành công! Dữ liệu đã được lưu tại: ${backupFile}`);
        console.log(`Bạn hãy cất giữ file này cẩn thận. Nếu server có sập, chúng ta có thể dùng file này để khôi phục.`);
    } catch (error) {
        console.error('❌ Lỗi trong quá trình backup:', error.message);
    }
}

backupDatabase();
const mysqldump = require('mysqldump');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function backupDatabase() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputDir = process.env.BACKUP_DIR || path.join(__dirname, '..', '..', 'backups');
    const backupFile = path.join(outputDir, `backup_${timestamp}.sql`);

    fs.mkdirSync(outputDir, { recursive: true });

    console.log(`Bắt đầu backup dữ liệu từ host: ${process.env.DB_HOST}...`);

    try {
        await mysqldump({
            connection: {
                host: process.env.DB_HOST,
                port: process.env.DB_PORT || 3306,
                user: process.env.DB_USER,
                password: process.env.DB_PASS || process.env.DB_PASSWORD,
                database: process.env.DB_NAME,
            },
            dumpToFile: backupFile,
        });

        console.log(`✅ Backup thành công! Dữ liệu đã được lưu tại: ${backupFile}`);
    } catch (error) {
        console.error('❌ Lỗi trong quá trình backup:', error.message);
        process.exitCode = 1;
    }
}

void backupDatabase();
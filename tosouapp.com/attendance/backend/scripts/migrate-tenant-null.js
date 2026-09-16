'use strict';
/**
 * Script migrate: gán tenant_id = 1 cho tất cả records NULL.
 * Chỉ chạy sau khi đã chạy check-tenant-null.js và thấy có records cần fix.
 *
 * Chạy: node attendance/backend/scripts/migrate-tenant-null.js
 * Dry run (chỉ xem, không thay đổi): node attendance/backend/scripts/migrate-tenant-null.js --dry-run
 */

require('../src/config/loadEnv');
const db = require('../src/core/database/mysql');

const DRY_RUN = process.argv.includes('--dry-run');
const TARGET_TENANT_ID = 1; // Công ty đang dùng thật

const TABLES = [
  'attendance',
  'attendance_daily',
  'attendance_month_status',
  'attendance_plan',
  'attendance_month_summary',
  'work_details',
  'user_shift_assignments',
  'shift_definitions',
];

async function main() {
  const mode = DRY_RUN ? '[DRY RUN — không thay đổi gì]' : '[LIVE — sẽ cập nhật DB]';
  console.log(`\n=== Migration tenant_id NULL → ${TARGET_TENANT_ID} ${mode} ===\n`);

  if (!DRY_RUN) {
    console.log('  ⚠️  Đang chạy LIVE. Nhấn Ctrl+C trong 3 giây để hủy...');
    await new Promise(r => setTimeout(r, 3000));
    console.log('  Bắt đầu...\n');
  }

  const conn = await db.getConnection();
  let totalUpdated = 0;

  try {
    if (!DRY_RUN) await conn.beginTransaction();

    for (const table of TABLES) {
      try {
        // Kiểm tra bảng và cột tồn tại
        const [exists] = await conn.query(
          `SELECT COUNT(*) AS c FROM information_schema.tables
           WHERE table_schema = DATABASE() AND table_name = ?`, [table]
        );
        if (!exists[0].c) { console.log(`  [SKIP] ${table} — bảng chưa tồn tại`); continue; }

        const [hasTid] = await conn.query(
          `SELECT COUNT(*) AS c FROM information_schema.columns
           WHERE table_schema = DATABASE() AND table_name = ? AND column_name = 'tenant_id'`, [table]
        );
        if (!hasTid[0].c) { console.log(`  [SKIP] ${table} — không có cột tenant_id`); continue; }

        // Đếm trước
        const [[{ nullCount }]] = await conn.query(
          `SELECT SUM(tenant_id IS NULL) AS nullCount FROM \`${table}\``
        );
        const n = Number(nullCount || 0);

        if (n === 0) {
          console.log(`  ✅  ${table.padEnd(30)} — không có gì cần update`);
          continue;
        }

        if (!DRY_RUN) {
          const [result] = await conn.query(
            `UPDATE \`${table}\` SET tenant_id = ? WHERE tenant_id IS NULL`,
            [TARGET_TENANT_ID]
          );
          totalUpdated += result.affectedRows;
          console.log(`  ✅  ${table.padEnd(30)} — updated ${result.affectedRows} records`);
        } else {
          console.log(`  📋  ${table.padEnd(30)} — sẽ update ${n} records (dry run)`);
          totalUpdated += n;
        }
      } catch (err) {
        console.log(`  [ERR] ${table} — ${err.message}`);
        if (!DRY_RUN) {
          await conn.rollback();
          console.error('\n❌ Rollback do lỗi. Không có gì bị thay đổi.');
          process.exit(1);
        }
      }
    }

    if (!DRY_RUN) {
      await conn.commit();
      console.log(`\n✅ Migration hoàn tất. Tổng ${totalUpdated} records đã được cập nhật.`);
      console.log('   Có thể deploy code fix an toàn.\n');
    } else {
      console.log(`\n📋 Dry run xong. Sẽ có ${totalUpdated} records được update khi chạy thật.`);
      console.log('   Chạy không có --dry-run để thực hiện.\n');
    }
  } finally {
    conn.release();
    await db.end?.();
    process.exit(0);
  }
}

main().catch(err => {
  console.error('Lỗi:', err.message);
  process.exit(1);
});

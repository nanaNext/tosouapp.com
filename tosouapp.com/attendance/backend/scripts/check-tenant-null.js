'use strict';
/**
 * Script kiểm tra số lượng records có tenant_id = NULL trong DB.
 * Chạy: node attendance/backend/scripts/check-tenant-null.js
 */

// Load env giống như app chính
require('../src/config/loadEnv');
const db = require('../src/core/database/mysql');

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
  console.log('\n=== Kiểm tra records có tenant_id = NULL ===\n');

  let totalNull = 0;

  for (const table of TABLES) {
    try {
      // Kiểm tra bảng có tồn tại không
      const [exists] = await db.query(
        `SELECT COUNT(*) AS c FROM information_schema.tables
         WHERE table_schema = DATABASE() AND table_name = ?`,
        [table]
      );
      if (!exists[0].c) {
        console.log(`  [SKIP] ${table.padEnd(30)} — bảng chưa tồn tại`);
        continue;
      }

      // Kiểm tra cột tenant_id có tồn tại không
      const [hasTid] = await db.query(
        `SELECT COUNT(*) AS c FROM information_schema.columns
         WHERE table_schema = DATABASE() AND table_name = ? AND column_name = 'tenant_id'`,
        [table]
      );
      if (!hasTid[0].c) {
        console.log(`  [SKIP] ${table.padEnd(30)} — không có cột tenant_id`);
        continue;
      }

      const [[{ nullCount, totalCount }]] = await db.query(
        `SELECT
           SUM(tenant_id IS NULL) AS nullCount,
           COUNT(*) AS totalCount
         FROM \`${table}\``
      );

      const n = Number(nullCount || 0);
      const t = Number(totalCount || 0);
      totalNull += n;

      const icon = n > 0 ? '⚠️ ' : '✅ ';
      console.log(`  ${icon} ${table.padEnd(30)} NULL: ${String(n).padStart(6)} / Total: ${t}`);
    } catch (err) {
      console.log(`  [ERR] ${table.padEnd(30)} — ${err.message}`);
    }
  }

  console.log('\n' + '─'.repeat(55));

  if (totalNull === 0) {
    console.log('✅ Tất cả OK — không có records nào cần migrate.');
    console.log('   An toàn để deploy fix.\n');
  } else {
    console.log(`⚠️  Tổng ${totalNull} records có tenant_id = NULL.`);
    console.log('   Cần chạy migration trước khi deploy fix.\n');
    console.log('   Chạy tiếp: node attendance/backend/scripts/migrate-tenant-null.js\n');
  }

  await db.end?.();
  process.exit(0);
}

main().catch(err => {
  console.error('Lỗi:', err.message);
  process.exit(1);
});

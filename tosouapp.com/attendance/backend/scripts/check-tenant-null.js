'use strict';
/**
 * Kiểm tra (CHỈ ĐỌC) các dòng có tenant_id = NULL trong mọi bảng theo công ty.
 *
 * Với bảng có cột user (userId / user_id), dòng NULL được phân loại theo công ty
 * thật của user sở hữu (users.tenant_id) — để biết migrate-tenant-null.js sẽ gán
 * chúng vào đâu. Dòng không suy ra được công ty thì migrate KHÔNG đụng tới.
 *
 * Chạy: node attendance/backend/scripts/check-tenant-null.js
 * Không thay đổi dữ liệu.
 */

require('../src/config/loadEnv');
const db = require('../src/core/database/mysql');
const { TENANT_TABLES, inspectTable } = require('./lib/tenant-null');

async function main() {
  console.log('\n=== Kiểm tra records có tenant_id = NULL (chỉ đọc) ===\n');

  const [[{ nullUsers }]] = await db.query('SELECT COUNT(*) AS nullUsers FROM users WHERE tenant_id IS NULL');
  console.log(`  users không có tenant_id: ${Number(nullUsers)}`);
  console.log('');

  let totalNull = 0;
  let totalUnresolvable = 0;
  for (const table of TENANT_TABLES) {
    try {
      const info = await inspectTable(db, table);
      if (info.skip) {
        console.log(`  [SKIP] ${table.padEnd(30)} — ${info.skip}`);
        continue;
      }
      totalNull += info.nullCount;
      totalUnresolvable += info.unresolvable;
      const icon = info.nullCount > 0 ? '⚠️ ' : '✅ ';
      const byTenant = Object.entries(info.byTenant).map(([t, c]) => `tenant ${t}: ${c}`).join(', ');
      const detail = info.nullCount === 0
        ? ''
        : info.userCol
          ? `  → ${byTenant || '-'}${info.unresolvable ? `, không xác định: ${info.unresolvable}` : ''}`
          : '  → không có cột user, không tự gán được';
      console.log(`  ${icon} ${table.padEnd(30)} NULL: ${String(info.nullCount).padStart(6)} / Total: ${info.totalCount}${detail}`);
    } catch (err) {
      console.log(`  [ERR] ${table.padEnd(30)} — ${err.message}`);
    }
  }

  console.log('\n' + '─'.repeat(60));
  if (totalNull === 0 && Number(nullUsers) === 0) {
    console.log('✅ Không có record NULL nào. An toàn để bật TENANT_STRICT=true.\n');
  } else {
    console.log(`⚠️  Tổng ${totalNull} records NULL (${totalUnresolvable} không tự xác định được công ty).`);
    console.log('   Xem trước:  node attendance/backend/scripts/migrate-tenant-null.js');
    console.log('   (mặc định chỉ dry-run; cần backup DB rồi mới chạy với --apply)\n');
  }

  await db.end?.();
  process.exit(0);
}

main().catch(err => {
  console.error('Lỗi:', err.message);
  process.exit(1);
});

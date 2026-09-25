'use strict';
/**
 * Gán tenant_id cho các dòng tenant_id = NULL theo CÔNG TY THẬT của user sở hữu
 * dòng đó (users.tenant_id) — KHÔNG gán hàng loạt vào tenant 1 nữa, vì đã có
 * nhiều công ty: gán nhầm sẽ chuyển dữ liệu của công ty khác sang Iizuka.
 *
 * Dòng không suy ra được công ty (bảng không có cột user, hoặc user không có
 * tenant_id) được giữ nguyên và liệt kê ra để xử lý tay.
 *
 * Mặc định CHỈ DRY-RUN (không thay đổi gì):
 *   node attendance/backend/scripts/migrate-tenant-null.js
 * Chạy thật — chỉ sau khi đã backup DB:
 *   node attendance/backend/scripts/migrate-tenant-null.js --apply
 */

require('../src/config/loadEnv');
const db = require('../src/core/database/mysql');
const { TENANT_TABLES, inspectTable } = require('./lib/tenant-null');

const APPLY = process.argv.includes('--apply');

async function main() {
  const mode = APPLY ? '[APPLY — sẽ cập nhật DB]' : '[DRY RUN — không thay đổi gì]';
  console.log(`\n=== Gán tenant_id cho records NULL theo user sở hữu ${mode} ===\n`);

  if (APPLY) {
    console.log('  ⚠️  Đang chạy APPLY. Hãy chắc chắn đã backup DB. Nhấn Ctrl+C trong 5 giây để hủy...');
    await new Promise(r => setTimeout(r, 5000));
    console.log('  Bắt đầu...\n');
  }

  const conn = await db.getConnection();
  let totalUpdated = 0;
  let totalLeft = 0;

  try {
    if (APPLY) await conn.beginTransaction();

    for (const table of TENANT_TABLES) {
      const info = await inspectTable(conn, table);
      if (info.skip) continue;
      if (info.nullCount === 0) continue;

      const plan = Object.entries(info.byTenant).map(([t, c]) => `tenant ${t}: ${c}`).join(', ');
      totalLeft += info.unresolvable;

      if (!info.userCol) {
        console.log(`  ⏭  ${table.padEnd(30)} ${info.nullCount} NULL — không có cột user, cần xử lý tay`);
        continue;
      }

      if (APPLY) {
        const [result] = await conn.query(
          `UPDATE \`${table}\` t JOIN users u ON u.id = t.\`${info.userCol}\`
           SET t.tenant_id = u.tenant_id
           WHERE t.tenant_id IS NULL AND u.tenant_id IS NOT NULL`
        );
        totalUpdated += result.affectedRows;
        console.log(`  ✅  ${table.padEnd(30)} updated ${result.affectedRows} (${plan || '-'})${info.unresolvable ? `, giữ nguyên ${info.unresolvable}` : ''}`);
      } else {
        const n = info.nullCount - info.unresolvable;
        totalUpdated += n;
        console.log(`  📋  ${table.padEnd(30)} sẽ gán ${n} (${plan || '-'})${info.unresolvable ? `, không xác định: ${info.unresolvable}` : ''}`);
      }
    }

    if (APPLY) {
      await conn.commit();
      console.log(`\n✅ Xong. Đã gán ${totalUpdated} records. Còn ${totalLeft} records cần xử lý tay.\n`);
    } else {
      console.log(`\n📋 Dry run: sẽ gán ${totalUpdated} records. ${totalLeft} records không xác định được công ty.`);
      console.log('   Backup DB rồi chạy lại với --apply để thực hiện.\n');
    }
  } catch (err) {
    if (APPLY) {
      await conn.rollback();
      console.error('\n❌ Lỗi — đã rollback, không có gì bị thay đổi:', err.message);
    }
    throw err;
  } finally {
    conn.release();
    await db.end?.();
  }
}

main().then(() => process.exit(0)).catch(err => {
  console.error('Lỗi:', err.message);
  process.exit(1);
});

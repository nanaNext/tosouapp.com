'use strict';
/**
 * Kiểm tra (CHỈ ĐỌC) ảnh hưởng của việc khôi phục mốc ngày cấp (grantDate) trong allocateUsageByDays.
 *
 * Liệt kê nhân viên có ngày 有給休暇/半休(有給) (attendance_daily) KHÔNG được trừ vào đợt cấp nào
 * theo logic mới (vd: dùng trước ngày cấp đầu tiên), và so sánh 残日数 cũ (chỉ xét hết hạn) với mới.
 * Người có chênh lệch: hoặc là đúng (ngày dùng thuộc kỳ trước, đã tính trong số ngày cấp/繰越),
 * hoặc ngày cấp đang nhập sai → cần sửa 付与日 trên màn hình 有給休暇の編集.
 *
 * Chạy: node attendance/backend/scripts/check-leave-pre-grant-usage.js
 * Không thay đổi dữ liệu.
 */

require('../src/config/loadEnv');
const db = require('../src/core/database/mysql');
const repo = require('../src/modules/leave/leave.repository');
const { allocateUsageByDays } = require('../src/modules/leave/leave.controller');

// Logic cũ (commit d210441): chỉ xét ngày hết hạn, không xét ngày cấp.
function allocateOld(grants, usedDays) {
  const out = grants.map(g => ({ ...g, daysRemaining: g.daysGranted }));
  const sorted = [...usedDays].sort((a, b) => String(a.date).localeCompare(String(b.date)));
  for (const u of sorted) {
    let need = Number(u.days || 0);
    for (const g of out) {
      if (need <= 0) break;
      if (u.date > String(g.expiryDate).slice(0, 10)) continue;
      const take = Math.min(need, g.daysRemaining);
      if (take > 0) { g.daysRemaining -= take; need -= take; }
    }
  }
  return out;
}

const available = (grants, today) =>
  grants.reduce((s, g) => s + (String(g.expiryDate).slice(0, 10) >= today ? Math.max(0, g.daysRemaining) : 0), 0);

async function main() {
  const today = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
  const [users] = await db.query(`
    SELECT u.id, u.tenant_id AS tenantId, u.username, u.employee_code AS employeeCode
    FROM users u
    WHERE u.employment_status = 'active'
    ORDER BY u.tenant_id, u.id
  `);
  const [usedRows] = await db.query(`
    SELECT userId, date, REPLACE(TRIM(COALESCE(kubun, '')), '　', '') AS kubun
    FROM attendance_daily
    WHERE REPLACE(TRIM(COALESCE(kubun, '')), '　', '') IN ('有給休暇', '半休(有給)')
    ORDER BY date ASC
  `);

  const usedBy = new Map();
  for (const r of usedRows) {
    const k = Number(r.userId);
    if (!usedBy.has(k)) usedBy.set(k, []);
    usedBy.get(k).push({ date: String(r.date).slice(0, 10), kubun: r.kubun, days: r.kubun === '半休(有給)' ? 0.5 : 1 });
  }

  console.log(`\n=== Ảnh hưởng khi khôi phục mốc ngày cấp (chỉ đọc) — hôm nay ${today} ===\n`);
  let affected = 0;
  for (const u of users) {
    const used = usedBy.get(Number(u.id)) || [];
    if (!used.length) continue;
    // repo.listGrants chỉ đọc (khác ensureUserGrants ở chế độ AUTO sẽ ghi 付与).
    const grants = (await repo.listGrants(u.id, 'paid')).map(g => ({
      grantDate: String(g.grantDate).slice(0, 10), expiryDate: String(g.expiryDate).slice(0, 10), daysGranted: Number(g.daysGranted)
    }));
    if (!grants.length) continue;
    const { grants: newAlloc, days } = allocateUsageByDays(grants, used);
    const oldAvail = available(allocateOld(grants, used), today);
    const newAvail = available(newAlloc, today);
    const notCounted = days.filter(d => d.counted < d.days);
    if (oldAvail === newAvail && !notCounted.length) continue;
    affected++;
    console.log(`tenant ${u.tenantId} | user ${u.id} ${u.employeeCode || ''} ${u.username}`);
    console.log(`  付与: ${grants.map(g => `${g.grantDate}(${g.daysGranted}日, ~${g.expiryDate})`).join(', ')}`);
    console.log(`  残日数: cũ ${oldAvail} → mới ${newAvail}${oldAvail !== newAvail ? '  ⚠️ thay đổi' : ''}`);
    console.log(`  không trừ: ${notCounted.map(d => `${d.date}(${d.days - d.counted})`).join(', ')}`);
  }
  console.log(`\nTổng: ${affected} nhân viên bị ảnh hưởng.\n`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1); });

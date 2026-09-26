'use strict';
/**
 * Kiểm tra (CHỈ ĐỌC) ảnh hưởng của cách tính 有給 theo luật (労基法39条) lên số dư của từng nhân viên.
 *
 * So sánh:
 *   - cũ : chỉ dùng các đợt cấp đã đăng ký (付与 nhập tay), trừ trong khoảng 付与日〜有効期限
 *   - mới: đăng ký + đợt cấp theo luật tính từ 入社日 (buildEffectiveGrants)
 * Liệt kê nhân viên có 残日数 thay đổi, kèm đợt cấp được tự tính và ngày dùng không trừ được.
 *
 * Chạy: node attendance/backend/scripts/check-leave-pre-grant-usage.js
 * Không thay đổi dữ liệu (không gọi ensureUserGrants — ở chế độ AUTO hàm đó sẽ ghi 付与).
 */

require('../src/config/loadEnv');
const db = require('../src/core/database/mysql');
const repo = require('../src/modules/leave/leave.repository');
const { allocateUsageByDays, buildEffectiveGrants } = require('../src/modules/leave/leave.controller');
const { resolveEmploymentStartDate, normalizeDateInput } = require('../src/utils/employmentDate');

const available = (grants, used, today) => allocateUsageByDays(grants, used).grants
  .reduce((s, g) => s + (String(g.expiryDate).slice(0, 10) >= today ? Math.max(0, g.daysRemaining) : 0), 0);

async function main() {
  const today = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
  const autoLegal = String(process.env.LEAVE_GRANT_MODE || 'HYBRID').toUpperCase() !== 'MANUAL';
  const [users] = await db.query(`
    SELECT u.id, u.tenant_id AS tenantId, u.username, u.employee_code AS employeeCode,
           u.hire_date, u.join_date, u.employment_type
    FROM users u
    WHERE u.employment_status = 'active' AND u.role = 'employee'
    ORDER BY u.tenant_id, u.employee_code, u.id
  `);

  console.log(`\n=== 有給: số dư hiện tại → theo luật (chỉ đọc) — hôm nay ${today}, tự tính theo luật: ${autoLegal ? 'BẬT' : 'TẮT (MANUAL)'} ===\n`);
  let changed = 0;
  for (const u of users) {
    const tenantId = u.tenantId;
    const registered = (await repo.listGrants(u.id, 'paid', tenantId)).map(g => ({
      grantDate: String(g.grantDate).slice(0, 10), expiryDate: String(g.expiryDate).slice(0, 10), daysGranted: Number(g.daysGranted)
    }));
    const used = await repo.listPaidLeaveUsedDays(u.id, tenantId);
    const hireDate = normalizeDateInput(u.hire_date) || resolveEmploymentStartDate(u); // 入社日優先（controller の leaveHireDate と同じ）
    const attendanceRows = hireDate && autoLegal ? await repo.listAttendanceKubun(u.id, tenantId) : [];
    const built = buildEffectiveGrants({ hireDate, employmentType: u.employment_type, registered, attendanceRows, today, autoLegal });

    const before = available(registered, used, today);
    const after = available(built.grants, used, today);
    if (before === after) continue;
    changed++;
    const { days } = allocateUsageByDays(built.grants, used);
    const notCounted = days.filter(d => d.counted < d.days);
    const autoAdded = built.grants.filter(g => g.source === 'legal' && g.expiryDate >= today);
    const ineligible = built.slots.filter(s => s.status === 'ineligible');
    console.log(`tenant ${tenantId} | ${u.employeeCode || '-'} ${u.username} (入社 ${hireDate || '未登録'}, ${u.employment_type || '-'})`);
    console.log(`  残日数: ${before} → ${after}`);
    console.log(`  đã đăng ký: ${registered.map(g => `${g.grantDate}(${g.daysGranted}日)`).join(', ') || 'không có'}`);
    if (autoAdded.length) console.log(`  tự tính theo luật (còn hạn): ${autoAdded.map(g => `${g.grantDate}(${g.daysGranted}日)`).join(', ')}`);
    if (built.cutoff) console.log(`  đăng ký gồm cả 繰越 → bỏ các đợt luật trước ${built.cutoff}`);
    if (ineligible.length) console.log(`  không đủ 80%: ${ineligible.map(s => s.grantDate).join(', ')}`);
    if (notCounted.length) console.log(`  ngày dùng không trừ: ${notCounted.map(d => `${d.date}(${d.days - d.counted})`).join(', ')}`);
  }
  console.log(`\nTổng: ${changed}/${users.length} nhân viên có số dư thay đổi.\n`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1); });

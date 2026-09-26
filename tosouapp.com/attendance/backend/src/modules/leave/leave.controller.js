const repo = require('./leave.repository');
const userRepo = require('../users/user.repository');
const auditRepo = require('../audit/audit.repository');
const noticesRepo = require('../notices/notices.repository');
const { resolveEmploymentStartDate } = require('../../utils/employmentDate');
const env = require('../../config/env');
const metrics = require('../../core/metrics');

const LEAVE_GRANT_MODES = new Set(['AUTO', 'MANUAL', 'HYBRID']);
function getLeaveGrantMode() {
  const m = String(env.leaveGrantMode || 'HYBRID').toUpperCase();
  return LEAVE_GRANT_MODES.has(m) ? m : 'HYBRID';
}

function recordEndpointPerf(endpoint, startedAt, meta = {}) {
  const durationMs = Date.now() - startedAt;
  try {
    metrics.observe(`${endpoint}_duration_ms`, durationMs);
    if (durationMs >= 100) metrics.inc(`${endpoint}_slow_count`, 1);
  } catch (e) { /* silently ignored */ }
  if (durationMs >= 100) {
    try {
      console.warn(JSON.stringify({ level: 'warn', type: 'slow_endpoint', endpoint, duration_ms: durationMs, ...meta }));
    } catch (e) { /* silently ignored */ }
  }
}

function addMonths(d, m) {
  const dt = new Date(d);
  const day = dt.getDate();
  dt.setMonth(dt.getMonth() + m);
  if (dt.getDate() < day) dt.setDate(0);
  return dt;
}
function addYears(d, y) { return addMonths(d, y * 12); }
function fmt(d) { return d.toISOString().slice(0,10); }
function daysBetweenInclusive(a, b) {
  const ms = 24*60*60*1000;
  const d1 = new Date(a + 'T00:00:00Z');
  const d2 = new Date(b + 'T00:00:00Z');
  return Math.max(0, Math.ceil((d2 - d1)/ms) + 1);
}
function overlapDays(aStart, aEnd, bStart, bEnd) {
  const s = aStart > bStart ? aStart : bStart;
  const e = aEnd < bEnd ? aEnd : bEnd;
  if (s > e) return 0;
  return daysBetweenInclusive(s, e);
}
// 承認済みだった有給申請が勤怠実績との不一致で自動的に却下された場合、
// 申請者本人に通知する（従来は無言で却下されるだけだった）。
async function notifyAutoReconciled(affectedRequests) {
  if (!Array.isArray(affectedRequests) || !affectedRequests.length) return;
  for (const row of affectedRequests) {
    try {
      await noticesRepo.createNotice({
        targetUserId: row.userId,
        targetDate: row.startDate ? String(row.startDate).slice(0, 10) : null,
        targetMonth: row.startDate ? String(row.startDate).slice(0, 7) : null,
        message: `承認済みだった有給申請（${String(row.startDate || '').slice(0, 10)}）は、勤怠実績の区分と一致しないため自動的に取り消されました。内容をご確認のうえ、必要であれば再度申請してください。`,
        createdBy: null,
        kind: 'approval',
        title: '休暇申請の自動取消'
      });
    } catch (e) { /* silently ignored */ }
  }
}
async function tryReconcileAttendance(tenantId = null) {
  try {
    const affected = await repo.reconcileApprovedPaidWithAttendance(tenantId);
    await notifyAutoReconciled(affected);
  } catch (e) { /* silently ignored */ }
}
const { resolveManagerBranchScope } = require('./leave.access');
// Kiểm tra manager có quyền thao tác (duyệt/từ chối) trên đơn nghỉ của user khác chi nhánh hay không.
async function assertLeaveRequestInManagerBranch(req, leaveRequestRow) {
  const branchId = await resolveManagerBranchScope(req);
  if (branchId == null || !leaveRequestRow) return true;
  const targetUser = await userRepo.getUserById(leaveRequestRow.userId, req.tenantId || null);
  const targetBranchId = targetUser?.branch_id != null ? Number(targetUser.branch_id) : null;
  if (targetBranchId == null) return true;
  return targetBranchId === branchId;
}
function scheduleGrants(hireDate, untilDate) {
  const grants = [];
  if (!hireDate) return grants;
  const h = new Date(hireDate + 'T00:00:00Z');
  const now = new Date(untilDate + 'T00:00:00Z');
  const milestones = [
    { offsetMonths: 6, days: 10 },
    { offsetMonths: 18, days: 11 },
    { offsetMonths: 30, days: 12 },
    { offsetMonths: 42, days: 14 },
    { offsetMonths: 54, days: 16 },
    { offsetMonths: 66, days: 18 },
    { offsetMonths: 78, days: 20 }
  ];
  for (const m of milestones) {
    const g = addMonths(h, m.offsetMonths);
    if (g <= now) {
      grants.push({ grantDate: fmt(g), days: m.days });
    }
  }
  // After 6年半: 20 days every year
  const last = addMonths(h, 78);
  let y = new Date(last);
  while (y <= now) {
    if (y >= last) grants.push({ grantDate: fmt(y), days: 20 });
    y = addYears(y, 1);
  }
  return grants;
}
function addDays(d, n) {
  const dt = new Date(d);
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt;
}
function isSameDate(a, b) {
  return fmt(new Date(a + 'T00:00:00Z')) === fmt(new Date(b + 'T00:00:00Z'));
}
async function getGrantAttendanceEligibility(userId, hireDate, grantDate, tenantId = null) {
  if (!hireDate || !grantDate) return false;
  const firstGrantDate = fmt(addMonths(new Date(hireDate + 'T00:00:00Z'), 6));
  let periodStart;
  let periodEnd;
  if (isSameDate(grantDate, firstGrantDate)) {
    periodStart = hireDate;
    periodEnd = fmt(addDays(new Date(grantDate + 'T00:00:00Z'), -1));
  } else {
    periodStart = fmt(addYears(new Date(grantDate + 'T00:00:00Z'), -1));
    periodEnd = fmt(addDays(new Date(grantDate + 'T00:00:00Z'), -1));
  }
  if (periodStart > periodEnd) return { eligible: false, workDays: 0, presentDays: 0, attendanceRate: 0, periodStart, periodEnd };
  let stats = { workDays: 0, presentDays: 0 };
  try {
    stats = await repo.getAttendanceStats(userId, periodStart, periodEnd, tenantId);
  } catch (e) { /* silently ignored */ }
  const workDays = Number(stats.workDays || 0);
  const presentDays = Number(stats.presentDays || 0);
  const attendanceRate = workDays > 0 ? (presentDays / workDays) : 0;
  return {
    eligible: workDays > 0 && attendanceRate >= 0.8,
    workDays,
    presentDays,
    attendanceRate,
    periodStart,
    periodEnd
  };
}
async function isGrantEligibleByAttendance(userId, hireDate, grantDate, tenantId = null) {
  const r = await getGrantAttendanceEligibility(userId, hireDate, grantDate, tenantId);
  return !!r?.eligible;
}
async function ensureUserGrants(userId, tenantId = null) {
  const mode = getLeaveGrantMode();
  const listGrants = async () => {
    const rows = await repo.listGrants(userId, 'paid', tenantId);
    return (rows || []).slice().sort((a, b) => String(a?.grantDate || '').localeCompare(String(b?.grantDate || '')));
  };

  if (mode === 'MANUAL' || mode === 'HYBRID') {
    return listGrants();
  }

  const u = await userRepo.getUserById(userId);
  const hire = resolveEmploymentStartDate(u);
  if (!hire) return [];
  const today = new Date(); const todayStr = fmt(today);
  const plan = scheduleGrants(hire, todayStr);
  for (const g of plan) {
    const ok = await isGrantEligibleByAttendance(userId, hire, g.grantDate);
    if (!ok) continue;
    const eTmp = addYears(new Date(g.grantDate + 'T00:00:00Z'), 2);
    eTmp.setUTCDate(eTmp.getUTCDate() - 1);
    const expiry = fmt(eTmp);
    await repo.upsertGrant({ userId, type: 'paid', grantDate: g.grantDate, daysGranted: g.days, expiryDate: expiry, tenantId });
  }
  return listGrants();
}
exports.ensureUserGrants = ensureUserGrants;
function allocateUsage(grants, requests) {
  const out = grants.map(g => ({ ...g, daysRemaining: g.daysGranted, daysUsedAlloc: 0 }));
  for (const r of requests) {
    let need = daysBetweenInclusive(r.startDate, r.endDate);
    for (const g of out) {
      if (need <= 0) break;
      const overlap = overlapDays(r.startDate, r.endDate, g.grantDate, g.expiryDate);
      if (overlap <= 0) continue;
      const take = Math.min(need, g.daysRemaining);
      if (take > 0) {
        g.daysRemaining -= take;
        g.daysUsedAlloc += take;
        need -= take;
      }
    }
  }
  return out;
}

// 半休(有給)=0.5 / 有給休暇=1.0 を考慮し、取得日(attendance_daily由来)を付与枠へ按分する。
// usedDays: [{ date: 'YYYY-MM-DD', days: 0.5|1.0 }]
// 戻り値: { grants: 按分後の付与枠, days: 各取得日に counted（残数から差し引いた日数）を付けたもの }
function allocateUsageByDays(grants, usedDays) {
  const out = grants.map(g => ({ ...g, daysRemaining: Number(g.daysGranted), daysUsedAlloc: 0, usedDates: [] }));
  const sorted = [...(usedDays || [])].sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const days = [];
  for (const u of sorted) {
    let need = Number(u.days || 0);
    const d = String(u.date || '').slice(0, 10);
    for (const g of out) {
      if (need <= 0) break;
      // その日が付与枠の有効期間内（付与日〜有効期限）のときだけ按分する。
      // 付与日より前の取得は前期間の分であり、手入力の付与日数（繰越込み）に既に反映済みのため二重に引かない。
      if (d < String(g.grantDate).slice(0, 10) || d > String(g.expiryDate).slice(0, 10)) continue;
      const take = Math.min(need, g.daysRemaining);
      if (take > 0) {
        g.daysRemaining -= take;
        g.daysUsedAlloc += take;
        g.usedDates.push({ date: d, days: take });
        need -= take;
      }
    }
    days.push({ ...u, counted: Number(u.days || 0) - need });
  }
  return { grants: out, days };
}
exports.allocateUsageByDays = allocateUsageByDays;

// API: Nhân viên tạo yêu cầu nghỉ phép (có lương/không lương)
exports.create = async (req, res) => {
  try {
    const role = String(req.user?.role || '').toLowerCase();
    const canActOnBehalf = role === 'admin' || role === 'manager';
    const { startDate, endDate, type, reason, userId: targetUserId } = req.body || {};
    const userId = (canActOnBehalf && targetUserId) ? parseInt(String(targetUserId), 10) : req.user?.id;
    if (!userId || !startDate || !endDate || !type) {
      return res.status(400).json({ message: 'Missing userId/startDate/endDate/type' });
    }
    const id = await repo.create({ userId, startDate, endDate, type, reason, tenantId: req.tenantId || null });
    const actingOnBehalf = canActOnBehalf && targetUserId && Number(targetUserId) !== Number(req.user?.id);
    if (!actingOnBehalf) {
      try {
        const userName = String(req.user?.username || req.user?.email || `user#${userId}`);
        await noticesRepo.createAdminNotification({
          kind: 'leave_request',
          title: '有休/休暇申請',
          message: `${userName} さんが休暇申請しました（${startDate} ~ ${endDate}）`,
          linkUrl: '/admin/leave/requests',
          payload: { source: 'leave', requestId: id, userId, startDate, endDate, type: type || 'paid' },
          createdBy: userId,
          audience: 'admin_manager'
        });
      } catch (e) { /* silently ignored */ }
    }
    res.status(201).json({ id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
exports.createPaid = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { startDate, endDate, reason } = req.body || {};
    if (!userId || !startDate || !endDate) {
      return res.status(400).json({ message: 'Missing userId/startDate/endDate' });
    }
    const existed = await repo.findExactRequest({ userId, startDate, endDate, type: 'paid', statuses: ['pending', 'approved'], tenantId: req.tenantId || null });
    if (existed) {
      return res.status(200).json({ id: existed.id, duplicated: true, status: existed.status });
    }
    const id = await repo.create({ userId, startDate, endDate, type: 'paid', reason, tenantId: req.tenantId || null });
    try {
      const userName = String(req.user?.username || req.user?.email || `user#${userId}`);
      await noticesRepo.createAdminNotification({
        kind: 'leave_request',
        title: '有給申請',
        message: `${userName} さんが有給申請しました（${startDate} ~ ${endDate}）`,
        linkUrl: '/admin/leave/requests',
        payload: { source: 'leave', requestId: id, userId, startDate, endDate, type: 'paid' },
        createdBy: userId,
        audience: 'admin_manager'
      });
    } catch (e) { /* silently ignored */ }
    res.status(201).json({ id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
// API: 任意の休暇区分（欠勤・半休(有給)・無給休暇 など）の申請を管理者へ通知する（通知のみ・有給残数には影響しない）。
// 有給休暇は createPaid 側でリクエスト作成＋通知を行うため、この API では通知のみを扱う。
const LEAVE_KUBUN_LABELS = {
  '有給休暇': '有給休暇',
  '半休(有給)': '半休（有給）',
  '半休（有給）': '半休（有給）',
  '半休': '半休',
  '欠勤': '欠勤',
  '無給休暇': '無給休暇',
  '代替休日': '代替休日'
};
exports.notifyLeaveKubun = async (req, res) => {
  try {
    const userId = req.user?.id;
    const date = String(req.body?.date || '').slice(0, 10);
    const kubunRaw = String(req.body?.kubun || '').trim();
    if (!userId || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !kubunRaw) {
      return res.status(400).json({ message: 'Missing userId/date/kubun' });
    }
    // 休暇系の区分のみ通知対象（出勤系は対象外）
    const label = LEAVE_KUBUN_LABELS[kubunRaw];
    if (!label) {
      return res.status(200).json({ ok: true, skipped: true });
    }
    try {
      const userName = String(req.user?.username || req.user?.email || `user#${userId}`);
      await noticesRepo.createAdminNotification({
        kind: 'leave_request',
        title: '休暇申請',
        message: `${userName} さんが${label}を申請しました（${date}）`,
        linkUrl: '/admin/leave/requests',
        payload: { source: 'attendance_kubun', userId, date, kubun: kubunRaw },
        createdBy: userId,
        audience: 'admin_manager'
      });
    } catch (e) { /* silently ignored */ }
    res.status(201).json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
exports.cancelMyPaid = async (req, res) => {
  try {
    const userId = req.user?.id;
    const date = String(req.body?.date || '').slice(0, 10);
    if (!userId || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ message: 'Missing userId/date' });
    }
    const affected = await repo.cancelOwnPaidByDate(userId, date, req.tenantId || null);
    return res.status(200).json({ ok: true, affected });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
exports.reconcileAttendance = async (req, res) => {
  try {
    const affected = await repo.reconcileApprovedPaidWithAttendance(req.tenantId || null);
    await notifyAutoReconciled(affected);
    return res.status(200).json({ ok: true, updated: affected.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
// API: Lấy danh sách lịch sử nghỉ phép của chính nhân viên đó
exports.listMine = async (req, res) => {
  try {
    const userId = req.user?.id;
    const rows = await repo.listMine(userId, req.tenantId || null);
    
    // Also include 有給休暇 days from attendance_daily that may not have an approved leave_request
    const db = require('../../core/database/mysql');
    try {
      const tid = req.tenantId || null;
      let kubunSql = `
        SELECT date FROM attendance_daily 
        WHERE userId = ? AND kubun = '有給休暇'
      `;
      const kubunParams = [userId];
      if (tid != null) { kubunSql += ` AND tenant_id = ?`; kubunParams.push(tid); }
      kubunSql += ` ORDER BY date ASC`;
      const [kubunDays] = await db.query(kubunSql, kubunParams);
      
      // For each kubun day, check if there's already an approved request covering it
      const existingApproved = new Set();
      for (const r of (rows || [])) {
        if (String(r?.status || '').toLowerCase() === 'approved' && String(r?.type || '').toLowerCase() === 'paid') {
          const s = new Date(String(r.startDate || '').slice(0, 10));
          const e = new Date(String(r.endDate || '').slice(0, 10));
          for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
            existingApproved.add(d.toISOString().slice(0, 10));
          }
        }
      }
      
      // Add synthetic "approved" entries for kubun days not yet covered
      for (const day of (kubunDays || [])) {
        const dateStr = String(day.date || '').slice(0, 10);
        if (!dateStr || existingApproved.has(dateStr)) continue;
        rows.push({
          id: null,
          userId,
          startDate: dateStr,
          endDate: dateStr,
          type: 'paid',
          status: 'approved',
          reason: '勤務区分入力',
          created_at: null,
          _synthetic: true
        });
      }
    } catch (e) { /* attendance_daily may not exist */ }
    
    res.status(200).json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
exports.listUser = async (req, res) => {
  try {
    const userId = req.query.userId;
    if (!userId) return res.status(400).json({ message: 'Missing userId' });
    const rows = await repo.listByUser(userId, req.tenantId);
    res.status(200).json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
// API: Quản lý/Admin lấy danh sách yêu cầu nghỉ phép đang chờ duyệt
exports.listPending = async (req, res) => {
  try {
    const branchId = await resolveManagerBranchScope(req);
    const rows = await repo.listAllPending(req.tenantId, branchId);
    res.status(200).json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
exports.listAdminRequests = async (req, res) => {
  try {
    // Keep reconciliation best-effort only; never block list endpoint.
    await tryReconcileAttendance(req.tenantId || null);
    const statusRaw = String(req.query?.status || '').trim().toLowerCase();
    const status = ['pending', 'approved', 'rejected'].includes(statusRaw) ? statusRaw : null;
    const branchId = await resolveManagerBranchScope(req);
    // Stable path: always use simple query so FE never falls back to legacy pending.
    const rows = await repo.listAllRequestsSimple({ status, limit: 2000, tenantId: req.tenantId, branchId });
    res.status(200).json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
// API: Quản lý/Admin duyệt hoặc từ chối đơn xin nghỉ phép
exports.updateStatus = async (req, res) => {
  try {
    const id = req.params.id;
    const { status } = req.body || {};
    if (!id || !status || !['approved','rejected','pending'].includes(status)) {
      return res.status(400).json({ message: 'Missing id/status' });
    }
    const beforeRow = await repo.getById(id, req.tenantId);
    if (!beforeRow) return res.status(404).json({ message: 'Not found' });
    const allowed = await assertLeaveRequestInManagerBranch(req, beforeRow);
    if (!allowed) return res.status(403).json({ message: 'Forbidden: different branch' });
    await repo.updateStatus(id, status, req.tenantId, req.user?.id || null);
    try {
      await auditRepo.writeLog({
        userId: req.user?.id,
        action: 'leave_request_status_update',
        path: req.path,
        method: req.method,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        beforeData: JSON.stringify({ id: beforeRow.id, status: beforeRow.status }),
        afterData: JSON.stringify({ id: beforeRow.id, status, targetUserId: beforeRow.userId })
      });
    } catch (e) { /* silently ignored */ }
    try {
      const row = await repo.getById(id, req.tenantId);
      if (row && row.userId && status !== 'pending') {
        const statusLabel = status === 'approved' ? '承認' : (status === 'rejected' ? '差戻し' : status);
        await noticesRepo.createNotice({
          targetUserId: row.userId,
          targetDate: row.startDate ? String(row.startDate).slice(0, 10) : null,
          targetMonth: row.startDate ? String(row.startDate).slice(0, 7) : null,
          message: `休暇申請（${String(row.startDate || '').slice(0, 10)} ~ ${String(row.endDate || '').slice(0, 10)}）が${statusLabel}されました。`,
          createdBy: req.user?.id || null,
          kind: 'approval',
          title: '休暇申請'
        });
      }
    } catch (e) { /* silently ignored */ }
    res.status(200).json({ id, status });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
async function computeUserBalance(userId, tenantId = null) {
  const grants = await ensureUserGrants(userId, tenantId);
  if (!grants.length) {
    return { totalAvailable: 0, usedDays: 0, grants: [], upcomingGrantDate: null, obligation: { required: 0, taken: 0, remaining: 0 } };
  }
  // 取得日は勤怠実績(attendance_daily)を正とする。半休(有給)=0.5 / 有給休暇=1.0。
  // これにより「取得済み一覧」ポップアップと残数カードの数値が常に一致する。
  const usedDayList = await repo.listPaidLeaveUsedDays(userId, tenantId);
  const alloc = allocateUsageByDays(grants, usedDayList).grants;
  const totalAvailable = alloc.reduce((s, g) => s + Math.max(0, (new Date(g.expiryDate) >= new Date() ? g.daysRemaining : 0)), 0);
  const usedDays = usedDayList.reduce((s, u) => s + Number(u.days || 0), 0);
  const today = fmt(new Date());
  const latest = alloc[alloc.length - 1];
  let required = latest.daysGranted >= 10 ? 5 : 0;
  // 義務取得日数(5日)の判定期間: 最新付与日〜1年後。半休は0.5換算。
  const oneYearEnd = fmt(addYears(new Date(latest.grantDate + 'T00:00:00Z'), 1));
  let taken = 0;
  for (const u of usedDayList) {
    const d = String(u.date || '').slice(0, 10);
    if (d >= String(latest.grantDate).slice(0, 10) && d < oneYearEnd) taken += Number(u.days || 0);
  }
  const upcomingGrantDate = (() => {
    const lastGrant = alloc[alloc.length - 1];
    const next = fmt(addYears(new Date(lastGrant.grantDate + 'T00:00:00Z'), 1));
    if (next > today) return next;
    return null;
  })();
  return {
    totalAvailable,
    usedDays,
    grants: alloc.map(g => ({
      grantDate: g.grantDate,
      expiryDate: g.expiryDate,
      daysGranted: g.daysGranted,
      daysRemaining: g.daysRemaining
    })),
    upcomingGrantDate,
    obligation: { required, taken, remaining: Math.max(0, required - taken) }
  };
}
// 有給管理 admin一覧用: 部署名JOIN済みの active 社員一覧を取得し、1人ずつ computeUserBalance を実行する。
// ~200人規模の管理画面向け操作 (月次集計のrunRecomputeForTenantと同様、都度全件再計算する軽い処理として許容する)。
async function listAllUserBalancesWithMeta({ tenantId = null, dept = '', userId = null } = {}) {
  const db = require('../../core/database/mysql');
  const where = [`u.role = 'employee'`, `u.employment_status = 'active'`];
  const params = [];
  if (tenantId) { where.push('u.tenant_id = ?'); params.push(tenantId); }
  if (dept) { where.push('d.name = ?'); params.push(dept); }
  if (userId) { where.push('u.id = ?'); params.push(userId); }
  const [users] = await db.query(`
    SELECT u.id, u.employee_code AS employeeCode, u.username AS username, d.name AS departmentName
    FROM users u
    LEFT JOIN departments d ON d.id = u.departmentId
    WHERE ${where.join(' AND ')}
    ORDER BY COALESCE(u.employee_code, '') ASC, u.id ASC
  `, params);

  const items = [];
  for (const u of users) {
    let balance;
    try {
      balance = await computeUserBalance(u.id, tenantId);
    } catch (e) {
      balance = { totalAvailable: 0, usedDays: 0, grants: [], obligation: { required: 0, taken: 0, remaining: 0 } };
    }
    const grants = balance.grants || [];
    const latest = grants[grants.length - 1] || null;
    const granted = latest ? Number(latest.daysGranted) || 0 : 0;
    const carriedOver = Math.max(0, Number(balance.totalAvailable || 0) - (latest ? Number(latest.daysRemaining) || 0 : 0));
    items.push({
      userId: u.id,
      employeeCode: u.employeeCode,
      username: u.username,
      departmentName: u.departmentName,
      granted,
      carriedOver,
      usedDays: balance.usedDays,
      remaining: balance.totalAvailable,
      obligationTaken: balance.obligation?.taken || 0,
      obligationMet: (balance.obligation?.remaining || 0) <= 0
    });
  }
  return items;
}

// GET /api/leave/admin-balances?dept=&userId=
exports.adminBalances = async (req, res) => {
  try {
    const tenantId = req.tenantId || null;
    const dept = req.query.dept ? String(req.query.dept) : '';
    const userId = req.query.userId ? parseInt(String(req.query.userId), 10) : null;
    const items = await listAllUserBalancesWithMeta({ tenantId, dept, userId });
    res.status(200).json({ items });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/leave/admin-balances/export.xlsx?dept=&userId=
exports.exportBalancesXlsx = async (req, res) => {
  try {
    const ExcelJS = require('exceljs');
    const tenantId = req.tenantId || null;
    const dept = req.query.dept ? String(req.query.dept) : '';
    const userId = req.query.userId ? parseInt(String(req.query.userId), 10) : null;
    const items = await listAllUserBalancesWithMeta({ tenantId, dept, userId });

    const columns = [
      { header: '社員', width: 15 },
      { header: '部署', width: 13 },
      { header: '付与', width: 9 },
      { header: '繰越', width: 9 },
      { header: '取得', width: 9 },
      { header: '残', width: 9 },
      { header: '年5日義務', width: 12 }
    ];
    const xlsxRows = items.map(it => [
      it.username || '',
      it.departmentName || '',
      it.granted,
      it.carriedOver,
      it.usedDays,
      it.remaining,
      it.obligationMet ? '達成' : '要取得'
    ]);

    const HEADER_FILL = 'FFE74C3C';
    const ROW_FILL = 'FFFBE1E1';
    const BORDER_COLOR = 'FFE8B4B4';
    const thinBorder = {
      top: { style: 'thin', color: { argb: BORDER_COLOR } },
      left: { style: 'thin', color: { argb: BORDER_COLOR } },
      bottom: { style: 'thin', color: { argb: BORDER_COLOR } },
      right: { style: 'thin', color: { argb: BORDER_COLOR } }
    };

    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('有給管理'.slice(0, 31));
    ws.columns = columns.map(c => ({ header: c.header, width: c.width }));
    ws.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];

    const headerRow = ws.getRow(1);
    columns.forEach((c, ci) => {
      const cell = headerRow.getCell(ci + 1);
      cell.font = { name: 'MS Pゴシック', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = thinBorder;
    });
    headerRow.height = 20;

    xlsxRows.forEach((cells, ri) => {
      const wsRow = ws.getRow(ri + 2);
      cells.forEach((v, ci) => {
        const cell = wsRow.getCell(ci + 1);
        cell.value = v;
        cell.font = { name: 'MS Pゴシック', size: 11, color: { argb: 'FF000000' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ROW_FILL } };
        cell.border = thinBorder;
        cell.alignment = { vertical: 'middle', horizontal: ci === 0 ? 'left' : 'center' };
      });
    });

    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };

    const buf = await workbook.xlsx.writeBuffer();
    const filename = `leave_balances_${new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 7)}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(Buffer.from(buf));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// API: Kiểm tra số ngày phép còn lại của nhân viên
exports.myBalance = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    const data = await computeUserBalance(userId, req.tenantId || null);
    return res.status(200).json({ ...data, grantMode: getLeaveGrantMode() });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
exports.userBalance = async (req, res) => {
  try {
    const userId = parseInt(String(req.query.userId || ''), 10);
    if (!userId) return res.status(400).json({ message: 'Missing userId' });
    const data = await computeUserBalance(userId, req.tenantId || null);
    return res.status(200).json({ userId, ...data, grantMode: getLeaveGrantMode() });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
// API: 取得済み有給休暇（全日=1.0 / 半休(有給)=0.5）の日付一覧（Admin/Manager用）
exports.usedPaidLeaveDays = async (req, res) => {
  try {
    const userId = parseInt(String(req.query.userId || ''), 10);
    if (!userId) return res.status(400).json({ message: 'Missing userId' });
    const usedDayList = await repo.listPaidLeaveUsedDays(userId, req.tenantId || null);
    // counted: 残数から差し引いた日数（付与日前など按分先の無い取得は 0）
    const grants = await ensureUserGrants(userId, req.tenantId || null);
    const { days } = allocateUsageByDays(grants, usedDayList);
    const total = days.reduce((s, d) => s + Number(d.days || 0), 0);
    const countedTotal = days.reduce((s, d) => s + Number(d.counted || 0), 0);
    return res.status(200).json({ userId, days, total, countedTotal });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
// API: 入社日からの付与履歴（Admin/Manager用）。
// 法定付与スケジュール（入社日基準）と登録済み付与を突き合わせ、各付与枠の使用日・残日数を返す。
// 未登録の法定付与は registered=false で返すだけで、ここでは書き込まない（登録は /grant で管理者が行う）。
exports.grantHistory = async (req, res) => {
  try {
    const userId = parseInt(String(req.query.userId || ''), 10);
    if (!userId) return res.status(400).json({ message: 'Missing userId' });
    const tenantId = req.tenantId || null;
    const u = await userRepo.getUserById(userId, tenantId);
    if (!u) return res.status(404).json({ message: 'Not found' });
    const hireDate = resolveEmploymentStartDate(u);
    const today = fmt(new Date());
    const grants = (await repo.listGrants(userId, 'paid', tenantId))
      .map(g => ({ grantDate: String(g.grantDate).slice(0, 10), expiryDate: String(g.expiryDate).slice(0, 10), daysGranted: Number(g.daysGranted) }))
      .sort((a, b) => a.grantDate.localeCompare(b.grantDate));
    const usedDayList = await repo.listPaidLeaveUsedDays(userId, tenantId);
    const { grants: alloc, days } = allocateUsageByDays(grants, usedDayList);

    const byDate = new Map();
    for (const p of scheduleGrants(hireDate, today)) {
      const e = addYears(new Date(p.grantDate + 'T00:00:00Z'), 2);
      e.setUTCDate(e.getUTCDate() - 1);
      byDate.set(p.grantDate, { grantDate: p.grantDate, legalDays: p.days, registered: false, daysGranted: null, expiryDate: fmt(e), used: 0, remaining: null, usedDates: [] });
    }
    for (const g of alloc) {
      const legal = byDate.get(g.grantDate);
      byDate.set(g.grantDate, {
        grantDate: g.grantDate,
        legalDays: legal ? legal.legalDays : null,
        registered: true,
        daysGranted: g.daysGranted,
        expiryDate: g.expiryDate,
        used: g.daysUsedAlloc,
        remaining: g.daysRemaining,
        usedDates: g.usedDates
      });
    }
    const rows = [...byDate.values()]
      .sort((a, b) => a.grantDate.localeCompare(b.grantDate))
      .map(r => ({ ...r, expired: r.expiryDate < today }));
    // どの付与枠にも按分されなかった取得日（最初の登録付与より前、または期限切れ等）
    const unallocated = days.filter(d => d.counted < d.days).map(d => ({ date: d.date, days: d.days - d.counted }));
    return res.status(200).json({
      userId,
      hireDate,
      employmentType: u.employment_type || null,
      rows,
      unallocated
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
// API: 取得済み有給休暇の日付一覧（従業員本人用）。管理画面と同じく attendance_daily を正とし、
// 半休(有給)=0.5 / 有給休暇=1.0 を返す。これにより 休暇欠勤台帳 の「● 有休」も半休を正しく表示できる。
exports.myUsedPaidLeaveDays = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    const days = await repo.listPaidLeaveUsedDays(userId, req.tenantId || null);
    const total = days.reduce((s, d) => s + Number(d.days || 0), 0);
    return res.status(200).json({ userId, days, total });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
// API: Cấp phát thêm ngày nghỉ phép cho nhân viên (Admin)
exports.grant = async (req, res) => {
  try {
    const { userId, days, grantDate, expiryDate } = req.body || {};
    if (!userId || days === undefined || days === null || days === '') return res.status(400).json({ message: 'Missing userId/days' });
    const parsedDays = parseInt(String(days), 10);
    if (isNaN(parsedDays)) return res.status(400).json({ message: 'Missing userId/days' });
    
    const gDate = grantDate || fmt(new Date());
    let eDate = expiryDate;
    if (!eDate) {
      const et = addYears(new Date(gDate + 'T00:00:00Z'), 2);
      et.setUTCDate(et.getUTCDate() - 1);
      eDate = fmt(et);
    }
    const isDelete = parsedDays <= 0;
    if (isDelete) {
      await repo.deleteGrant({ userId, type: 'paid', grantDate: gDate, tenantId: req.tenantId || null });
    } else {
      await repo.upsertGrant({ userId, type: 'paid', grantDate: gDate, daysGranted: parsedDays, expiryDate: eDate, tenantId: req.tenantId || null });
    }
    try {
      await auditRepo.writeLog({
        userId: req.user?.id,
        action: isDelete ? 'leave_grant_delete' : 'leave_grant_manual',
        path: req.path,
        method: req.method,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        beforeData: null,
        afterData: JSON.stringify({ targetUserId: Number(userId), days: parsedDays, grantDate: gDate, expiryDate: eDate, deleted: isDelete })
      });
    } catch (e) { /* silently ignored */ }
    res.status(201).json({ ok: true, deleted: isDelete });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.eligibleList = async (req, res) => {
  try {
    const todayStr = fmt(new Date());
    // Tenant isolation: chỉ lấy users thuộc tenant của người gọi
    const tenantId = req.tenantId || null;
    const users = tenantId
      ? await userRepo.listUsersByTenant(tenantId)
      : await userRepo.listUsers();
    const out = [];
    for (const u of (users || [])) {
      const role = String(u?.role || '').toLowerCase();
      const empStatus = String(u?.employment_status || u?.employmentStatus || 'active').toLowerCase();
      if (role === 'admin' || role === 'manager') continue;
      if (empStatus === 'inactive' || empStatus === 'retired') continue;
      const hireDate = resolveEmploymentStartDate(u);
      if (!hireDate) continue;
      const existing = await repo.listGrants(u.id, 'paid', tenantId);
      const existSet = new Set((existing || []).map(g => String(g?.grantDate || '').slice(0, 10)));
      const plan = scheduleGrants(hireDate, todayStr);
      for (const g of plan) {
        const grantDate = String(g.grantDate || '').slice(0, 10);
        if (!grantDate || existSet.has(grantDate)) continue;
        const info = await getGrantAttendanceEligibility(u.id, hireDate, grantDate, tenantId);
        if (!info?.eligible) continue;
        out.push({
          userId: u.id,
          employeeCode: u.employee_code || u.employeeCode || '',
          username: u.username || u.email || '',
          hireDate,
          grantDate,
          days: Number(g.days || 0),
          attendanceRate: Number((Number(info.attendanceRate || 0) * 100).toFixed(2)),
          periodStart: info.periodStart,
          periodEnd: info.periodEnd
        });
      }
    }
    out.sort((a, b) => String(a.grantDate).localeCompare(String(b.grantDate)) || Number(a.userId) - Number(b.userId));
    res.status(200).json({ mode: getLeaveGrantMode(), count: out.length, rows: out });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.grantEligibleNow = async (req, res) => {
  try {
    const mode = getLeaveGrantMode();
    if (mode === 'MANUAL') {
      return res.status(400).json({ message: 'LEAVE_GRANT_MODE=MANUAL のため一括付与は無効です', mode });
    }
    const listReq = { user: req.user, query: {}, body: {}, tenantId: req.tenantId || null };
    const fakeRes = { statusCode: 200, _data: null, status(code) { this.statusCode = code; return this; }, json(v) { this._data = v; return this; } };
    await exports.eligibleList(listReq, fakeRes);
    const rows = Array.isArray(fakeRes?._data?.rows) ? fakeRes._data.rows : [];
    let granted = 0;
    for (const r of rows) {
      const gDate = String(r.grantDate || '').slice(0, 10);
      const d = Number(r.days || 0);
      if (!gDate || !d) continue;
      const et = addYears(new Date(gDate + 'T00:00:00Z'), 2);
      et.setUTCDate(et.getUTCDate() - 1);
      const expiryDate = fmt(et);
      await repo.upsertGrant({ userId: Number(r.userId), type: 'paid', grantDate: gDate, daysGranted: d, expiryDate, tenantId: req.tenantId || null });
      granted++;
    }
    try {
      await auditRepo.writeLog({
        userId: req.user?.id,
        action: 'leave_grant_bulk',
        path: req.path,
        method: req.method,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        beforeData: null,
        afterData: JSON.stringify({ mode, eligible: rows.length, granted })
      });
    } catch (e) { /* silently ignored */ }
    res.status(200).json({ mode, eligible: rows.length, granted });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
// Cái hàm này dùng để tạo một yêu cầu nghỉ
exports.createRequest = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { startDate, endDate, type, reason } = req.body || {};
    if (!userId || !startDate || !endDate) {
      return res.status(400).json({ message: 'Missing userId/startDate/endDate' });
    }
    const t = type || 'paid';
    const id = await repo.create({ userId, startDate, endDate, type: t, reason, tenantId: req.tenantId || null });
    try {
      const userName = String(req.user?.username || req.user?.email || `user#${userId}`);
      await noticesRepo.createAdminNotification({
        kind: 'leave_request',
        title: '休暇申請',
        message: `${userName} さんが休暇申請しました（${startDate} ~ ${endDate}）`,
        linkUrl: '/admin/leave/requests',
        payload: { source: 'leave', requestId: id, userId, startDate, endDate, type: t },
        createdBy: userId,
        audience: 'admin_manager'
      });
    } catch (e) { /* silently ignored */ }
    res.status(201).json({ id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
// Cái hàm này dùng để duyệt hoặc chối một yêu cầu nghỉ

exports.approve = async (req, res) => {
  try {
    const { id, status } = req.body || {};
    if (!id) return res.status(400).json({ message: 'Missing id' });
    const s = status || 'approved';
    if (!['approved','rejected','pending'].includes(s)) return res.status(400).json({ message: 'Invalid status' });
    const beforeRow = await repo.getById(id, req.tenantId || null);
    if (!beforeRow) return res.status(404).json({ message: 'Not found' });
    const allowed = await assertLeaveRequestInManagerBranch(req, beforeRow);
    if (!allowed) return res.status(403).json({ message: 'Forbidden: different branch' });
    await repo.updateStatus(id, s, req.tenantId || null, req.user?.id || null);
    try {
      await auditRepo.writeLog({
        userId: req.user?.id,
        action: 'leave_request_status_update',
        path: req.path,
        method: req.method,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        beforeData: JSON.stringify({ id: beforeRow.id, status: beforeRow.status }),
        afterData: JSON.stringify({ id: beforeRow.id, status: s, targetUserId: beforeRow.userId })
      });
    } catch (e) { /* silently ignored */ }
    try {
      const row = await repo.getById(id, req.tenantId || null);
      if (row && row.userId && s !== 'pending') {
        const statusLabel = s === 'approved' ? '承認' : (s === 'rejected' ? '差戻し' : s);
        await noticesRepo.createNotice({
          targetUserId: row.userId,
          targetDate: row.startDate ? String(row.startDate).slice(0, 10) : null,
          targetMonth: row.startDate ? String(row.startDate).slice(0, 7) : null,
          message: `休暇申請（${String(row.startDate || '').slice(0, 10)} ~ ${String(row.endDate || '').slice(0, 10)}）が${statusLabel}されました。`,
          createdBy: req.user?.id || null,
          kind: 'approval',
          title: '休暇申請'
        });
      }
    } catch (e) { /* silently ignored */ }
    res.status(200).json({ id, status: s });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
exports.balance = async (req, res) => {
  try {
    const userId = req.query.userId ? parseInt(String(req.query.userId), 10) : null;
    const role = String(req.user?.role || '').toLowerCase();
    if (userId && (role === 'admin' || role === 'manager')) {
      req.query.userId = String(userId);
      return exports.userBalance(req, res);
    }
    return exports.myBalance(req, res);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
// Mục đích của hàm này là tính toán tổng số ngày nghỉ đã được cấp cho mỗi người dùng và thông tin khác 

exports.summary = async (req, res) => {
  const startedAt = Date.now();
  let processedUsers = 0;
  let resultCount = 0;
  try {
    await tryReconcileAttendance(req.tenantId || null);
    // Tenant isolation: chỉ lấy users thuộc tenant của admin đang đăng nhập.
    // req.tenantId được set bởi resolveTenant middleware từ JWT field tid.
    const tenantId = req.tenantId || null;
    const list = tenantId
      ? await userRepo.listUsersByTenant(tenantId)
      : await userRepo.listUsers();
    const out = [];
    for (const u of list) {
      const role = String(u?.role || '').toLowerCase();
      if (role === 'admin' || role === 'manager') continue;
      processedUsers += 1;
      const b = await computeUserBalance(u.id, tenantId);
      const grants = b.grants || [];
      const today = new Date();
      const totalGranted = grants.reduce((s, g) => s + (new Date(g.expiryDate) >= today ? g.daysGranted : 0), 0);
      const upcoming = grants
        .filter(g => new Date(g.expiryDate) >= today && (g.daysRemaining || 0) > 0)
        .sort((a,b) => new Date(a.expiryDate) - new Date(b.expiryDate))[0] || null;
      // 有給管理タブ用: 直近の付与(今期分)と、それ以前からの繰越分を分けて表示できるように。
      const latestGrant = grants[grants.length - 1] || null;
      const daysGrantedLatest = latestGrant ? latestGrant.daysGranted : 0;
      const carriedOver = Math.max(0, b.totalAvailable - (latestGrant ? latestGrant.daysRemaining : 0));
      out.push({
        userId: u.id,
        employeeCode: u.employee_code || ('EMP' + String(u.id).padStart(3, '0')),
        name: u.username || u.email || '',
        departmentId: u.departmentId || null,
        totalGranted,
        daysGrantedLatest,
        carriedOver,
        usedDays: b.usedDays,
        remainingDays: b.totalAvailable,
        nearestExpiry: upcoming ? upcoming.expiryDate : null,
        nearestExpiryRemaining: upcoming ? upcoming.daysRemaining : 0,
        obligationRemaining: Math.max(0, b?.obligation?.remaining || 0),
        obligationRequired: Math.max(0, b?.obligation?.required || 0)
      });
    }
    resultCount = out.length;
    res.status(200).json(out);
  } catch (err) {
    res.status(500).json({ message: err.message });
  } finally {
    recordEndpointPerf('leave_summary', startedAt, {
      userId: req.user?.id || null,
      processedUsers,
      rows: resultCount
    });
  }
};
// Cái hàm này dùng để cấp nagfy nghỉ cho tất cả người dùng

// API: 指定月の 有給休暇/半休(有給) 取得実績（人数・日数）を集計して返す（勤怠実績ベース、残数と同じ基準）。
exports.monthlyUsageSummary = async (req, res) => {
  try {
    const month = String(req.query.month || '').slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ message: 'Missing/invalid month (YYYY-MM)' });
    }
    const branchId = await resolveManagerBranchScope(req);
    const data = await repo.getMonthlyPaidLeaveUsageSummary(month, req.tenantId || null, branchId);
    res.status(200).json({ month, ...data });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
exports.autoGrantNow = async (req, res) => {
  try {
    const mode = getLeaveGrantMode();
    if (mode === 'MANUAL') {
      return res.status(400).json({
        message: 'LEAVE_GRANT_MODE=MANUAL のため自動付与は無効です',
        mode
      });
    }
    // Tenant isolation: chỉ cấp phép cho users thuộc tenant của admin đang gọi.
    const tenantId = req.tenantId || null;
    const list = tenantId
      ? await userRepo.listUsersByTenant(tenantId)
      : await userRepo.listUsers();
    let ok = 0;
    for (const u of list) {
      try {
        await ensureUserGrants(u.id, tenantId);
        ok++;
      } catch (e) { /* silently ignored */ }
    }
    res.status(200).json({ processed: list.length, ok, mode });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

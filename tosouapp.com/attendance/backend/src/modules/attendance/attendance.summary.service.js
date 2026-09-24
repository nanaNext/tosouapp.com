'use strict';
// 月次サマリー(monthly_summaries)の再計算・36協定判定・アラート送信。
// 生データからの再計算は毎回フル再計算 (idempotent) — 小さな差分を積み上げない。
// 再計算のたびに dirty=0 に戻すだけで、他の場所は一切変更しない。

const repo = require('./attendance.repository');
const summaryRepo = require('./attendance.summary.repository');
const userRepo = require('../users/user.repository');
const noticesRepo = require('../notices/notices.repository');
const { computeRange } = require('./attendance.rules');
const { computeLegalOvertime } = require('./attendance.overtime-legal');
const historyService = require('../departments/department.history.service');
const tenantRepo = require('../tenants/tenant.repository');
const { reportQueue, enqueueJob, isQueueAvailable } = require('../../core/database/queue');

const HOLIDAY_WORK_KUBUN = new Set(['休日出勤', '法定休日出勤', '代替出勤']);

function _pad(n) { return String(n).padStart(2, '0'); }
function _lastDay(y, m) { return new Date(Date.UTC(y, m, 0)).getUTCDate(); }

// フル再計算 — 常に生データ(attendance/attendance_daily)から作り直す。差分更新はしない。
async function recomputeMonthlySummary(userId, year, month, tenantId = null) {
  const lastDay = _lastDay(year, month);
  const from = `${year}-${_pad(month)}-01`;
  const to = `${year}-${_pad(month)}-${_pad(lastDay)}`;

  const [rawRows, dailyRows] = await Promise.all([
    repo.listByUserBetween(userId, from, to, { tenantId }).catch(() => []),
    repo.listDailyBetween(userId, from, to, { tenantId }).catch(() => [])
  ]);
  const dailyByDate = new Map((dailyRows || []).map(d => [String(d.date).slice(0, 10), d]));

  const { days: computedDays } = await computeRange((rawRows || []).map(r => ({ ...r, userId })), tenantId || 0);
  const itemsByDate = new Map();
  for (const day of computedDays) {
    for (const item of day.items) itemsByDate.set(item.date, item);
  }

  let attendDays = 0;
  let regularMinutes = 0;
  let nightMinutes = 0;
  let holidayWorkMinutes = 0;
  const daysForOvertime = [];

  for (let d = 1; d <= lastDay; d++) {
    const dateStr = `${year}-${_pad(month)}-${_pad(d)}`;
    const item = itemsByDate.get(dateStr);
    if (!item) continue;
    attendDays += 1;
    const worked = (item.regularMinutes || 0) + (item.overtimeMinutes || 0);
    regularMinutes += item.regularMinutes || 0;
    nightMinutes += item.nightMinutes || 0;
    const kubun = dailyByDate.get(dateStr)?.kubun;
    const isHolidayWork = !!(kubun && HOLIDAY_WORK_KUBUN.has(kubun));
    if (isHolidayWork) {
      // 休日労働は8h/日・40h/週の法定内外判定に混ぜず、single_month_basis_minutes側だけに
      // 計上する (salary.service.js の休日労働を別集計する方式に合わせる)。混ぜると
      // 週40hの残業計算に休日分の時間が漏れて入り、二重計上になってしまう。
      holidayWorkMinutes += worked;
    } else {
      daysForOvertime.push({ date: dateStr, workedMinutes: worked });
    }
  }

  const { legalOverTotal: overtimeMinutes } = computeLegalOvertime(daysForOvertime);
  const singleMonthBasisMinutes = overtimeMinutes + holidayWorkMinutes;

  // 月末時点の所属部署 (今の所属ではない) — 部門管理機能の異動履歴をそのまま再利用する
  const monthEndDate = to;
  const departmentId = await historyService.getDepartmentAsOf(userId, monthEndDate, { tenantId }).catch(() => null);

  // 年間累積・移動平均は、既に確定済みの過去月のサマリー行を積み上げて計算する
  // (各月の値自体が idempotent に再計算されているので、これも常に正しい状態になる)
  const priorMonths = await summaryRepo.listSummariesForYear(userId, year, tenantId);
  const priorThisYear = priorMonths.filter(r => r.month < month);
  const annualOvertimeMinutes = priorThisYear.reduce((s, r) => s + (r.overtime_minutes || 0), 0) + overtimeMinutes;
  const monthsOver45hThisYear = priorThisYear.filter(r => r.overtime_minutes > 45 * 60).length + (overtimeMinutes > 45 * 60 ? 1 : 0);

  const recent = await summaryRepo.listRecentSummaries(userId, year, month, 5, tenantId); // 直近5ヶ月(古い順に並べ替える)
  const windowBasis = [...recent].reverse().map(r => r.single_month_basis_minutes || 0);
  windowBasis.push(singleMonthBasisMinutes); // 当月を含める
  let rollingAvgMaxMinutes = 0;
  for (let win = 2; win <= 6; win++) {
    if (windowBasis.length < win) break;
    const slice = windowBasis.slice(windowBasis.length - win);
    const avg = slice.reduce((s, v) => s + v, 0) / win;
    if (avg > rollingAvgMaxMinutes) rollingAvgMaxMinutes = avg;
  }

  const config = await summaryRepo.getLaborAgreementConfig(tenantId);
  let judgement = 'normal';
  const exceeded = overtimeMinutes > config.monthlyOtLimitMinutes
    || singleMonthBasisMinutes > config.singleMonthLimitMinutes
    || rollingAvgMaxMinutes > config.rollingAvgLimitMinutes
    || monthsOver45hThisYear > config.maxMonthsOverLimit
    || annualOvertimeMinutes > config.annualOtLimitMinutes;
  if (exceeded) {
    judgement = 'exceeded';
  } else if (overtimeMinutes >= config.monthlyOtLimitMinutes * config.cautionThresholdRatio) {
    judgement = 'caution';
  }

  await summaryRepo.upsertSummary({
    tenantId, userId, year, month, departmentId,
    attendDays, regularMinutes, overtimeMinutes, nightMinutes, holidayWorkMinutes,
    singleMonthBasisMinutes, annualOvertimeMinutes, rollingAvgMaxMinutes, monthsOver45hThisYear,
    judgement, ruleVersion: 'v1'
  });

  return {
    userId, year, month, departmentId, attendDays, regularMinutes, overtimeMinutes, nightMinutes,
    holidayWorkMinutes, singleMonthBasisMinutes, annualOvertimeMinutes, rollingAvgMaxMinutes,
    monthsOver45hThisYear, judgement
  };
}

// v1: 組織ツリーが無いので admin 全員 + 直属マネージャー (manager_id) を返す。
// 将来ツリー・代理承認が入ったら、この関数の中身だけ差し替える (呼び出し側は変更不要)。
async function getApprovers(employeeId, { tenantId = null } = {}) {
  const approverIds = new Set();
  const user = await userRepo.getUserById(employeeId, tenantId).catch(() => null);
  if (user?.manager_id) approverIds.add(Number(user.manager_id));
  const { rows: admins } = await userRepo.listUsersPaged({ role: 'admin', tenantId, limit: 1000 }).catch(() => ({ rows: [] }));
  for (const a of admins) approverIds.add(Number(a.id));
  approverIds.delete(Number(employeeId));
  return [...approverIds];
}

// 同じ閾値は月1回しか通知しない (notices テーブルに同じ kind/title/target_month/target_user_id が
// 無いか確認してから作成する — 既存の shiftSubmissionReminderCron と同じ重複防止パターン)。
async function _notifyOnce({ approverId, targetMonth, kind, title, message, tenantId }) {
  const db = require('../../core/database/mysql');
  const [existing] = await db.query(
    `SELECT id FROM notices WHERE target_user_id = ? AND target_month = ? AND kind = ? AND title = ? LIMIT 1`,
    [approverId, targetMonth, kind, title]
  );
  if (existing && existing.length) return false;
  await noticesRepo.createNotice({ targetUserId: approverId, targetMonth, message, createdBy: null, kind, title, tenantId });
  return true;
}

// summary: recomputeMonthlySummary() の戻り値。isCurrentMonth なら「このままのペースだと月末に
// 何時間になりそうか」の予測アラートも判定する (閾値到達を待つより早く気づけて実用的なため)。
async function checkAndSendAlerts(summary, { tenantId = null, isCurrentMonth = false, dayOfMonth = null, lastDay = null } = {}) {
  const config = await summaryRepo.getLaborAgreementConfig(tenantId);
  const targetMonth = `${summary.year}-${_pad(summary.month)}`;
  const approvers = await getApprovers(summary.userId, { tenantId });
  if (!approvers.length) return { sent: 0 };

  const employee = await userRepo.getUserById(summary.userId, tenantId).catch(() => null);
  const name = employee?.username || employee?.email || `ユーザー${summary.userId}`;
  let sent = 0;

  if (summary.judgement === 'exceeded' || summary.judgement === 'caution') {
    const label = summary.judgement === 'exceeded' ? '超過' : '注意';
    const kind = `overtime_${summary.judgement}`;
    const title = '36協定 時間外労働アラート';
    const message = `${name} さんの${targetMonth}分の時間外労働が「${label}」判定です（月間法定外残業 ${(summary.overtimeMinutes / 60).toFixed(1)}h / 上限 ${(config.monthlyOtLimitMinutes / 60).toFixed(0)}h）。`;
    for (const approverId of approvers) {
      if (await _notifyOnce({ approverId, targetMonth, kind, title, message, tenantId })) sent++;
    }
  }

  if (isCurrentMonth && dayOfMonth && lastDay && summary.overtimeMinutes > 0) {
    const projected = Math.round((summary.overtimeMinutes / dayOfMonth) * lastDay);
    if (projected > config.monthlyOtLimitMinutes && summary.judgement === 'normal') {
      const kind = 'overtime_forecast';
      const title = '36協定 時間外労働 予測アラート';
      const message = `${name} さんの${targetMonth}分は、現在のペースのままだと月末までに約${(projected / 60).toFixed(1)}h（上限 ${(config.monthlyOtLimitMinutes / 60).toFixed(0)}h）に達する見込みです。`;
      for (const approverId of approvers) {
        if (await _notifyOnce({ approverId, targetMonth, kind, title, message, tenantId })) sent++;
      }
    }
  }

  return { sent };
}

// テナント内の active な社員全員について、指定月を再計算 + アラート判定する。
// 深夜バッチからも、管理画面の手動実行ボタンからも、この1つの関数を呼ぶ。
async function runRecomputeForTenant({ tenantId = null, year, month, sendAlerts = true } = {}) {
  const now = new Date(Date.now() + 9 * 3600 * 1000); // JST
  const isCurrentMonth = now.getUTCFullYear() === year && (now.getUTCMonth() + 1) === month;
  const dayOfMonth = isCurrentMonth ? now.getUTCDate() : null;
  const lastDay = _lastDay(year, month);

  const { rows: users } = await userRepo.listUsersPaged({ role: 'employee', employmentStatus: 'active', tenantId, limit: 5000 });
  const results = [];
  let alertsSent = 0;
  for (const u of users) {
    try {
      const summary = await recomputeMonthlySummary(u.id, year, month, tenantId);
      results.push({ userId: u.id, judgement: summary.judgement });
      if (sendAlerts) {
        const r = await checkAndSendAlerts(summary, { tenantId, isCurrentMonth, dayOfMonth, lastDay });
        alertsSent += r.sent;
      }
    } catch (err) {
      results.push({ userId: u.id, error: err.message });
    }
  }
  return { year, month, total: users.length, alertsSent, results };
}

// 深夜バッチ本体: dirty フラグが立っている月だけでなく、当月は毎回フルで再計算して
// 取りこぼしを自己修復する (ユーザーの指示通り: 差分は dirty マークだけに頼らない)。
async function runNightlyBatch({ tenantId = null } = {}) {
  const now = new Date(Date.now() + 9 * 3600 * 1000);
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth() + 1;

  const dirtyRows = await summaryRepo.listDirty(tenantId, 2000);
  const dirtyDone = new Set();
  for (const row of dirtyRows) {
    const key = `${row.year}-${row.month}`;
    dirtyDone.add(key);
    try { await recomputeMonthlySummary(row.user_id, row.year, row.month, tenantId); } catch (e) { /* 次回リトライに任せる */ }
  }
  const currentMonthResult = await runRecomputeForTenant({ tenantId, year: currentYear, month: currentMonth, sendAlerts: true });
  return { dirtyProcessed: dirtyRows.length, currentMonth: currentMonthResult };
}

// 全テナント分を「1つの巨大な直列ループ」にしない — テナントごとに別ジョブとして
// キュー (BullMQ の reportQueue、既存) に積み、ワーカーが並行して処理する。
// Redis/キューが無い環境では enqueueJob 自身が「今すぐ直列実行」にフォールバックする
// (core/database/queue.js の既存動作、ここでは呼ぶだけで分岐を意識しない)。
async function runNightlyBatchAllTenants() {
  const tenants = await tenantRepo.listAllTenants();
  const activeTenants = (tenants || []).filter(t => String(t.status || '').toLowerCase() === 'active');
  const queued = [];
  for (const t of activeTenants) {
    const job = await enqueueJob(reportQueue, 'attendance-monthly-summary-recompute', { tenantId: t.id });
    if (job) {
      queued.push({ tenantId: t.id, jobId: job.id });
    } else {
      // キュー無し(Redis未接続)のフォールバック: このプロセス内で直列実行する
      try {
        const result = await runNightlyBatch({ tenantId: t.id });
        queued.push({ tenantId: t.id, ranInline: true, result });
      } catch (err) {
        queued.push({ tenantId: t.id, error: err.message });
      }
    }
  }
  return { totalTenants: activeTenants.length, queueAvailable: isQueueAvailable(), queued };
}

module.exports = { recomputeMonthlySummary, getApprovers, checkAndSendAlerts, runRecomputeForTenant, runNightlyBatch, runNightlyBatchAllTenants };

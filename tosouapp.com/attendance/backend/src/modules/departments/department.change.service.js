'use strict';

// 社員の部署を変えたときに、異動履歴（user_department_assignments）を自動で記録する。
// 部署の変更は 社員編集 だけで行い、管理者が「異動」を別に登録しなくても
// 過去の月の勤怠・交通費は当時の部署のまま集計されるようにするための唯一の入口。

const repo = require('./department.repository');
const auditRepo = require('../audit/audit.repository');

function todayJst() {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
}

function dayBefore(dateStr) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

const ds = (v) => {
  if (!v) return '';
  if (v instanceof Date) return new Date(v.getTime() + 9 * 3600 * 1000).toISOString().slice(0, 10);
  return String(v).slice(0, 10);
};

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

// 異動日の入力チェック（DB を変更する前に呼ぶ）。正しい異動日（YYYY-MM-DD）を返す
async function validateEffectiveDate(effectiveDate, { tenantId = null } = {}) {
  const today = todayJst();
  const date = effectiveDate ? String(effectiveDate).slice(0, 10) : today;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw httpError(400, '異動日の形式が正しくありません');
  if (date > today) throw httpError(400, '異動日に未来の日付は指定できません（当日になってから変更してください）');
  if (await repo.isDateInClosedMonth(date, tenantId)) {
    throw httpError(409, '異動日が締め済みの月です。締めを解除するか、締めていない月の日付にしてください');
  }
  return date;
}

function audit(actorId, tenantId, action, beforeData, afterData) {
  auditRepo.writeLog({
    userId: actorId || null,
    tenantId: tenantId || null,
    action,
    path: 'employee-department-change',
    method: 'PATCH',
    ip: null,
    userAgent: null,
    beforeData: beforeData != null ? JSON.stringify(beforeData) : null,
    afterData: afterData != null ? JSON.stringify(afterData) : null
  }).catch(() => { /* 監査ログの失敗で本処理は止めない */ });
}

/**
 * 部署変更を異動履歴に記録する。users.departmentId の更新は呼び出し側で行う。
 * - 部署が変わっていなければ何もしない
 * - 異動の記録がまだない社員は、先に「元の部署（入社日〜異動日の前日）」を記録する
 *   （記録しないと、過去の月まで新しい部署で集計されてしまうため）
 * - 今の異動は異動日の前日で終了させ、新しい部署の異動を追加する
 * - 同じ異動日にもう一度変えた場合（選び直し）は、その日の記録を書き換える
 * @returns {{ changed: boolean, effectiveDate?: string }}
 */
async function recordDepartmentChange({ userId, fromDepartmentId, toDepartmentId, effectiveDate, hireDate = null, actorId = null, tenantId = null }) {
  if (toDepartmentId == null || toDepartmentId === '') return { changed: false };
  if (fromDepartmentId != null && String(fromDepartmentId) === String(toDepartmentId)) return { changed: false };

  const date = await validateEffectiveDate(effectiveDate, { tenantId });
  const rows = (await repo.listAssignmentsForUser(userId, tenantId)).filter(r => r.assignment_type === 'regular');

  if (rows.some(r => ds(r.start_date) > date)) {
    throw httpError(409, 'この異動日より後に登録済みの異動があります。部門管理の履歴を確認してください');
  }

  // 同じ日に選び直した → その日の記録の部署を書き換えるだけ
  const sameDay = rows.find(r => ds(r.start_date) === date && !r.end_date);
  if (sameDay) {
    await repo.updateAssignment(sameDay.id, { departmentId: toDepartmentId, endDate: null, actorId, tenantId });
    audit(actorId, tenantId, 'department_assignment_update', sameDay, { id: sameDay.id, departmentId: toDepartmentId, startDate: date, endDate: null });
    return { changed: true, effectiveDate: date };
  }

  const created = [];
  let closed = null;
  try {
    if (!rows.length) {
      // 初めての異動: 元の部署にいた期間を記録しておく
      if (fromDepartmentId != null && fromDepartmentId !== '') {
        const hire = ds(hireDate);
        const start = hire && hire < date ? hire : '2000-01-01';
        if (start < date) {
          const id = await repo.createAssignment({
            userId, departmentId: fromDepartmentId, assignmentType: 'regular', startDate: start, endDate: dayBefore(date),
            reason: '部署変更前の所属（自動記録）', actorId, tenantId
          });
          created.push(id);
          audit(actorId, tenantId, 'department_assignment_create', null, { id, userId, departmentId: fromDepartmentId, assignmentType: 'regular', startDate: start, endDate: dayBefore(date), reason: '部署変更前の所属（自動記録）' });
        }
      }
    } else {
      const current = rows.find(r => ds(r.start_date) <= date && (!r.end_date || ds(r.end_date) >= date));
      if (current) {
        closed = current;
        await repo.updateAssignment(current.id, { endDate: dayBefore(date), actorId, tenantId });
        audit(actorId, tenantId, 'department_assignment_update', current, { id: current.id, endDate: dayBefore(date) });
      }
    }

    const id = await repo.createAssignment({
      userId, departmentId: toDepartmentId, assignmentType: 'regular', startDate: date, endDate: null,
      reason: '社員編集で部署を変更', actorId, tenantId
    });
    created.push(id);
    audit(actorId, tenantId, 'department_assignment_create', null, { id, userId, departmentId: toDepartmentId, assignmentType: 'regular', startDate: date, endDate: null, reason: '社員編集で部署を変更' });
  } catch (err) {
    // 途中で失敗したら、この処理で作った・変えた記録を元に戻す
    for (const id of created) { await repo.deleteAssignment(id, tenantId).catch(() => {}); }
    if (closed) { await repo.updateAssignment(closed.id, { endDate: closed.end_date ? ds(closed.end_date) : null, actorId, tenantId }).catch(() => {}); }
    throw err;
  }
  return { changed: true, effectiveDate: date };
}

/**
 * 社員の保存と部署変更の記録をまとめて行う（社員編集・マネージャー編集・申請承認・部署だけの変更 から使う）。
 * 1) 部署が変わるなら、DB を変える前に異動日をチェック（ダメならここでエラー、何も保存しない）
 * 2) save() で社員を保存
 * 3) 異動履歴を記録。失敗したら社員の部署を元に戻してエラーにする
 */
async function saveWithDepartmentChange({ before, toDepartmentId, effectiveDate, actorId = null, tenantId = null, save }) {
  if (!before) { await save(); return { changed: false }; }
  const fromDepartmentId = before.departmentId;
  const changing = toDepartmentId != null && toDepartmentId !== '' && String(fromDepartmentId ?? '') !== String(toDepartmentId);
  let date = null;
  if (changing) {
    date = await validateEffectiveDate(effectiveDate, { tenantId });
    const later = (await repo.listAssignmentsForUser(before.id, tenantId))
      .some(r => r.assignment_type === 'regular' && ds(r.start_date) > date);
    if (later) throw httpError(409, 'この異動日より後に登録済みの異動があります。異動日を見直してください');
  }
  await save();
  if (!changing) return { changed: false };
  try {
    return await recordDepartmentChange({
      userId: before.id, fromDepartmentId, toDepartmentId, effectiveDate: date,
      hireDate: before.hire_date || before.hireDate || null, actorId, tenantId
    });
  } catch (err) {
    const userRepo = require('../users/user.repository');
    await userRepo.setDepartment(before.id, fromDepartmentId ?? null, tenantId).catch(() => {});
    err.message = `部署の変更を記録できなかったため、部署は元のままです: ${err.message}`;
    throw err;
  }
}

module.exports = { recordDepartmentChange, saveWithDepartmentChange, validateEffectiveDate, todayJst };

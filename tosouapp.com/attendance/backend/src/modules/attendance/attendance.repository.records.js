'use strict';
const db = require('../../core/database/mysql');

const mergeLabels = (...values) => {
  const set = new Set();
  for (const value of values) {
    const parts = String(value || '').split(',').map(s => s.trim()).filter(Boolean);
    for (const part of parts) set.add(part);
  }
  return set.size ? Array.from(set).join(',') : null;
};

const todayJST = () => {
  try {
    return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
  } catch {
    return '';
  }
};

async function getAttendanceColumnSet() {
  try {
    const [cols] = await db.query(`
      SELECT COLUMN_NAME AS name 
      FROM information_schema.columns 
      WHERE table_schema = DATABASE() AND table_name = 'attendance'
    `);
    return new Set((cols || []).map(c => String(c.name)));
  } catch {
    return new Set();
  }
}

async function listColumns() {
  try {
    const [cols] = await db.query(`
      SELECT COLUMN_NAME AS name 
      FROM information_schema.columns 
      WHERE table_schema = DATABASE() AND table_name = 'attendance'
    `);
    return (cols || []).map(c => String(c.name));
  } catch {
    return [];
  }
}

async function getUSAColumnSet() {
  try {
    const [cols] = await db.query(`
      SELECT COLUMN_NAME AS name 
      FROM information_schema.columns 
      WHERE table_schema = DATABASE() AND table_name = 'user_shift_assignments'
    `);
    return new Set((cols || []).map(c => String(c.name)));
  } catch {
    try {
      const [cols2] = await db.query(`SHOW COLUMNS FROM user_shift_assignments`);
      return new Set((cols2 || []).map(c => String(c.Field)));
    } catch {
      return new Set();
    }
  }
}

function getUSAStartCol(set) {
  if (set && set.has && set.has('date')) return 'date';
  if (set && set.has && set.has('start_date')) return 'start_date';
  return 'start_date';
}

module.exports = {
  async createCheckIn(userId, time, loc, labels, workType) {
    const dateStr = String(time).slice(0, 10);
    const setUSA = await getUSAColumnSet();
    const startCol = getUSAStartCol(setUSA);
    const hasEnd = setUSA.has('end_date');
    const whereEnd = hasEnd ? 'AND (a.end_date IS NULL OR a.end_date >= ?)' : '';
    const params = hasEnd ? [userId, dateStr, dateStr] : [userId, dateStr];
    const [assignRows] = await db.query(`
      SELECT a.*
      FROM user_shift_assignments a
      WHERE a.userId = ? AND a.${startCol} <= ? ${whereEnd}
      ORDER BY a.${startCol} DESC
      LIMIT 1
    `, params);
    const assign = assignRows && assignRows[0] ? assignRows[0] : null;
    const set = await getAttendanceColumnSet();
    const cols = ['userId', 'checkIn'];
    const vals = [userId, time];
    let assignedShiftId = assign?.shiftId || null;
    if (!assignedShiftId && assign && Object.prototype.hasOwnProperty.call(assign, 'shift')) {
      const [defs] = await db.query(`SELECT id FROM shift_definitions WHERE name = ? LIMIT 1`, [assign.shift]);
      assignedShiftId = defs && defs[0] ? defs[0].id : null;
    }
    if (set.has('shiftId')) { cols.push('shiftId'); vals.push(assignedShiftId); }
    if (set.has('work_type')) { cols.push('work_type'); vals.push(workType || null); }
    if (set.has('in_latitude')) { cols.push('in_latitude'); vals.push(loc?.latitude ?? null); }
    if (set.has('in_longitude')) { cols.push('in_longitude'); vals.push(loc?.longitude ?? null); }
    if (set.has('in_accuracy')) { cols.push('in_accuracy'); vals.push(loc?.accuracy ?? null); }
    if (set.has('in_locationSource')) { cols.push('in_locationSource'); vals.push(loc?.locationSource ?? null); }
    if (set.has('in_countryCode')) { cols.push('in_countryCode'); vals.push(loc?.countryCode ?? null); }
    if (set.has('in_note')) { cols.push('in_note'); vals.push(loc?.note ?? null); }
    if (set.has('in_deviceId')) { cols.push('in_deviceId'); vals.push(loc?.deviceId ?? null); }
    if (set.has('in_tzOffset')) { cols.push('in_tzOffset'); vals.push(loc?.tzOffset ?? null); }
    if (set.has('labels')) { cols.push('labels'); vals.push(labels || null); }
    const placeholders = cols.map(() => '?').join(', ');
    const sql = `INSERT INTO attendance (${cols.join(', ')}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)`;
    const [result] = await db.query(sql, vals);
    return result.insertId;
  },
  async createCheckInTx(userId, time, loc, labels, workType) {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query(`SELECT id FROM users WHERE id = ? FOR UPDATE`, [userId]);
      const dateStr = String(time).slice(0, 10);
      const setUSA = await getUSAColumnSet();
      const startCol = getUSAStartCol(setUSA);
      const hasEnd = setUSA.has('end_date');
      const whereEnd = hasEnd ? 'AND (a.end_date IS NULL OR a.end_date >= ?)' : '';
      const orderCol = startCol;
      const hasShiftName = setUSA.has('shift');
      const hasShiftId = setUSA.has('shiftId');
      const sqlAssign = hasShiftName
        ? `
        SELECT COALESCE(a.shiftId, d.id) AS sid, d.start_time AS shift_start, d.end_time AS shift_end
        FROM user_shift_assignments a
        LEFT JOIN shift_definitions d ON d.name = a.shift
        WHERE a.userId = ? AND a.${startCol} <= ? ${whereEnd}
        ORDER BY a.${orderCol} DESC
        LIMIT 1
      `
        : (hasShiftId
          ? `
        SELECT a.shiftId AS sid, d.start_time AS shift_start, d.end_time AS shift_end
        FROM user_shift_assignments a
        LEFT JOIN shift_definitions d ON d.id = a.shiftId
        WHERE a.userId = ? AND a.${startCol} <= ? ${whereEnd}
        ORDER BY a.${orderCol} DESC
        LIMIT 1
      `
          : `
        SELECT NULL AS sid, NULL AS shift_start, NULL AS shift_end
        FROM user_shift_assignments a
        WHERE a.userId = ? AND a.${startCol} <= ? ${whereEnd}
        ORDER BY a.${orderCol} DESC
        LIMIT 1
      `);
      const paramsAssign = hasEnd ? [userId, dateStr, dateStr] : [userId, dateStr];
      const [assignRows] = await conn.query(sqlAssign, paramsAssign);
      const assignedShiftId = assignRows && assignRows[0] ? assignRows[0].sid : null;
      const assignedShiftStart = String(assignRows?.[0]?.shift_start || '08:00').trim() || '08:00';
      const assignedShiftEnd = String(assignRows?.[0]?.shift_end || '17:00').trim() || '17:00';

      // Simple stamp screen policy: only one check-in per day.
      const [openRows] = await conn.query(
        `SELECT id, checkIn, checkOut, work_type, labels
         FROM attendance
         WHERE userId = ? AND DATE(checkIn) = ?
         ORDER BY checkIn DESC
         LIMIT 1`,
        [userId, dateStr]
      );
      if (openRows && openRows.length) {
        const existing = openRows[0];
        const hasOut = !!existing?.checkOut;
        const inHm = String(existing?.checkIn || '').slice(11, 16);
        const outHm = String(existing?.checkOut || '').slice(11, 16);
        const looksPlannedShape = !!(inHm && inHm === assignedShiftStart && (!outHm || outHm === assignedShiftEnd));
        const canPromotePlanned = !!looksPlannedShape;
        if (canPromotePlanned) {
          const nextLabels = String(labels || '').trim() || null;
          await conn.query(
            `UPDATE attendance
             SET checkIn = ?, checkOut = NULL, work_type = COALESCE(?, work_type), labels = COALESCE(?, labels)
             WHERE id = ? AND userId = ?`,
            [time, workType || null, nextLabels, existing.id, userId]
          );
          await conn.commit();
          return existing.id;
        }
        await conn.rollback();
        return null;
      }
      const set = await getAttendanceColumnSet();
      const cols = ['userId', 'checkIn'];
      const vals = [userId, time];
      if (set.has('shiftId')) { cols.push('shiftId'); vals.push(assignedShiftId); }
      if (set.has('work_type')) { cols.push('work_type'); vals.push(workType || null); }
      if (set.has('in_latitude')) { cols.push('in_latitude'); vals.push(loc?.latitude ?? null); }
      if (set.has('in_longitude')) { cols.push('in_longitude'); vals.push(loc?.longitude ?? null); }
      if (set.has('in_accuracy')) { cols.push('in_accuracy'); vals.push(loc?.accuracy ?? null); }
      if (set.has('in_locationSource')) { cols.push('in_locationSource'); vals.push(loc?.locationSource ?? null); }
      if (set.has('in_countryCode')) { cols.push('in_countryCode'); vals.push(loc?.countryCode ?? null); }
      if (set.has('in_note')) { cols.push('in_note'); vals.push(loc?.note ?? null); }
      if (set.has('in_deviceId')) { cols.push('in_deviceId'); vals.push(loc?.deviceId ?? null); }
      if (set.has('in_tzOffset')) { cols.push('in_tzOffset'); vals.push(loc?.tzOffset ?? null); }
      if (set.has('labels')) { cols.push('labels'); vals.push(labels || null); }
      const placeholders = cols.map(() => '?').join(', ');
      const sql = `INSERT INTO attendance (${cols.join(', ')}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)`;
      const [result] = await conn.query(sql, vals);
      await conn.commit();
      return result.insertId;
    } catch (e) {
      try { await conn.rollback(); } catch {}
      throw e;
    } finally {
      conn.release();
    }
  },
  async getOpenAttendanceForUser(userId, dateStr) {
    const d = String(dateStr || todayJST()).slice(0, 10);
    const sql = `SELECT * FROM attendance WHERE userId = ? AND checkOut IS NULL AND DATE(checkIn) = ? ORDER BY checkIn DESC LIMIT 1`;
    const [rows] = await db.query(sql, [userId, d]);
    return rows[0];
  },
  async createMissingCheckIn(userId, checkOutTime, loc, labels, anomalyType) {
    const set = await getAttendanceColumnSet();
    const cols = ['userId', 'checkOut'];
    const vals = [userId, checkOutTime];
    if (set.has('is_anomaly')) { cols.push('is_anomaly'); vals.push(1); }
    if (set.has('anomaly_type')) { cols.push('anomaly_type'); vals.push(anomalyType); }
    if (set.has('out_latitude')) { cols.push('out_latitude'); vals.push(loc?.latitude ?? null); }
    if (set.has('out_longitude')) { cols.push('out_longitude'); vals.push(loc?.longitude ?? null); }
    if (set.has('out_accuracy')) { cols.push('out_accuracy'); vals.push(loc?.accuracy ?? null); }
    if (set.has('out_locationSource')) { cols.push('out_locationSource'); vals.push(loc?.locationSource ?? null); }
    if (set.has('out_countryCode')) { cols.push('out_countryCode'); vals.push(loc?.countryCode ?? null); }
    if (set.has('out_note')) { cols.push('out_note'); vals.push(loc?.note ?? null); }
    if (set.has('out_deviceId')) { cols.push('out_deviceId'); vals.push(loc?.deviceId ?? null); }
    if (set.has('out_tzOffset')) { cols.push('out_tzOffset'); vals.push(loc?.tzOffset ?? null); }
    if (set.has('labels')) { cols.push('labels'); vals.push(labels || null); }
    const placeholders = cols.map(() => '?').join(', ');
    const sql = `INSERT INTO attendance (${cols.join(', ')}) VALUES (${placeholders})`;
    const [result] = await db.query(sql, vals);
    return result.insertId;
  },
  async setCheckOut(attendanceId, time, loc, labels) {
    const set = await getAttendanceColumnSet();
    const updates = ['checkOut = ?'];
    const vals = [time];
    if (set.has('out_latitude')) { updates.push('out_latitude = ?'); vals.push(loc?.latitude ?? null); }
    if (set.has('out_longitude')) { updates.push('out_longitude = ?'); vals.push(loc?.longitude ?? null); }
    if (set.has('out_accuracy')) { updates.push('out_accuracy = ?'); vals.push(loc?.accuracy ?? null); }
    if (set.has('out_locationSource')) { updates.push('out_locationSource = ?'); vals.push(loc?.locationSource ?? null); }
    if (set.has('out_countryCode')) { updates.push('out_countryCode = ?'); vals.push(loc?.countryCode ?? null); }
    if (set.has('out_note')) { updates.push('out_note = ?'); vals.push(loc?.note ?? null); }
    if (set.has('out_deviceId')) { updates.push('out_deviceId = ?'); vals.push(loc?.deviceId ?? null); }
    if (set.has('out_tzOffset')) { updates.push('out_tzOffset = ?'); vals.push(loc?.tzOffset ?? null); }
    if (set.has('labels')) { updates.push('labels = ?'); vals.push(labels || null); }
    const sql = `UPDATE attendance SET ${updates.join(', ')} WHERE id = ?`;
    vals.push(attendanceId);
    await db.query(sql, vals);
  },
  async listByUserBetween(userId, fromDate, toDate) {
    const sql = `
      SELECT * FROM attendance
      WHERE userId = ?
        AND (
          (checkIn >= ? AND checkIn <= ?)
          OR (checkIn IS NULL AND checkOut >= ? AND checkOut <= ?)
        )
      ORDER BY COALESCE(checkIn, checkOut) ASC
    `;
    const start = fromDate + ' 00:00:00';
    const end = toDate + ' 23:59:59';
    const [rows] = await db.query(sql, [userId, start, end, start, end]);
    return rows;
  },
  async findCheckInByTime(userId, time) {
    const sql = `SELECT id FROM attendance WHERE userId = ? AND checkIn = ? LIMIT 1`;
    const [rows] = await db.query(sql, [userId, time]);
    return rows[0];
  },
  async findCheckOutByTime(userId, time) {
    const sql = `SELECT id FROM attendance WHERE userId = ? AND checkOut = ? LIMIT 1`;
    const [rows] = await db.query(sql, [userId, time]);
    return rows[0];
  },
  async getById(attendanceId) {
    const [rows] = await db.query(`SELECT * FROM attendance WHERE id = ? LIMIT 1`, [attendanceId]);
    return rows[0];
  },
  async updateTimes(attendanceId, checkIn, checkOut) {
    const inV = checkIn ? String(checkIn) : '';
    const outV = checkOut ? String(checkOut) : '';
    if (!inV && !outV) return;

    const current = await this.getById(attendanceId);
    if (!current) return;
    const currentUserId = parseInt(String(current.userId || 0), 10);
    if (!currentUserId) return;
    const nextIn = inV;
    
    // Allow saving missing checkIn by marking it as an anomaly
    const isAnomaly = (!inV && outV) ? 1 : 0;
    const anomalyType = (!inV && outV) ? 'missing_checkin' : null;

    const [dups] = await db.query(
      `SELECT id, checkOut, work_type, labels, shiftId FROM attendance WHERE userId = ? AND checkIn = ? AND id <> ? ORDER BY id ASC LIMIT 1`,
      [currentUserId, nextIn || '1970-01-01', attendanceId] // Prevent matching when nextIn is empty
    );
    const dup = dups && dups[0] ? dups[0] : null;
    if (dup && nextIn) {
      await db.query(`DELETE FROM attendance WHERE id = ?`, [dup.id]);
      const mergedLabels = mergeLabels(current.labels, dup.labels);
      const mergedShiftId = current.shiftId != null ? current.shiftId : dup.shiftId;
      await db.query(
        `
          UPDATE attendance
          SET checkIn = ?,
              checkOut = ?,
              work_type = ?,
              labels = ?,
              shiftId = ?,
              is_anomaly = ?,
              anomaly_type = ?
          WHERE id = ?
        `,
        [
          nextIn,
          outV || null,
          current.work_type || dup.work_type || null,
          mergedLabels,
          mergedShiftId != null ? mergedShiftId : null,
          isAnomaly,
          anomalyType,
          attendanceId
        ]
      );
      return;
    }
    
    // Check if table has is_anomaly and anomaly_type columns
    const [cols] = await db.query(`
      SELECT COLUMN_NAME AS name 
      FROM information_schema.columns 
      WHERE table_schema = DATABASE() AND table_name = 'attendance'
    `);
    const set = new Set((cols || []).map(c => String(c.name)));
    
    if (set.has('is_anomaly') && set.has('anomaly_type')) {
      const sql = `
        UPDATE attendance
        SET checkIn = ?,
            checkOut = ?,
            is_anomaly = ?,
            anomaly_type = ?
        WHERE id = ?
      `;
      await db.query(sql, [inV || null, outV || null, isAnomaly, anomalyType, attendanceId]);
    } else {
      const sql = `
        UPDATE attendance
        SET checkIn = ?,
            checkOut = ?
        WHERE id = ?
      `;
      await db.query(sql, [inV || null, outV || null, attendanceId]);
    }
  },
  /**
   * TRANSACTIONAL BULK UPSERT (Ưu tiên 1)
   * Xử lý cả attendance_daily và attendance segments trong 1 transaction.
   */
  async bulkUpsertAttendance(userId, { updates, dailyUpdates }) {
    const conn = await db.getConnection();

    // Helper: parse "HH:MM" → minutes from midnight
    const hmToMin = (hm) => {
      const m = /^(\d{1,2}):(\d{2})$/.exec(String(hm || ''));
      return m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : null;
    };

    // Helper: derive status from kubun + whether checkIn exists + whether late
    const deriveStatus = (kubun, checkInTime, shiftStart) => {
      const workKubunSet = new Set(['出勤', '半休', '半休(有給)', '振替出勤', '休日出勤', '代替出勤']);
      const nonWorkKubunSet = new Set(['休日', '代替休日', '有給休暇', '無給休暇', '欠勤']);
      const k = String(kubun || '').trim();

      if (k && nonWorkKubunSet.has(k)) return '未承認';

      if (!checkInTime) {
        // No check-in: 未入力 only for actual working days
        if (!k || workKubunSet.has(k)) return '未入力';
        return '未承認';
      }

      // Has check-in — compare against shift start time
      const ciMin = hmToMin(checkInTime);
      const ssMin = hmToMin(shiftStart || '08:00') ?? (8 * 60);
      const isLate = ciMin != null && ciMin > ssMin;
      return isLate ? '遅刻' : '未承認';
    };

    try {
      await conn.beginTransaction();

      let dailySaved = 0;
      let segCreated = 0;
      let segUpdated = 0;
      const createdIds = [];

      // Build a map of date → checkInTime from the updates payload (segments being saved)
      // This is used so dailyUpdates can compute status against the NEW check-in, not DB state.
      const checkInByDate = new Map();
      if (Array.isArray(updates)) {
        for (const u of updates) {
          if (u?.delete === true) continue;
          const ci = String(u?.checkIn || '').trim();
          if (!ci) continue;
          // checkIn is "YYYY-MM-DD HH:MM:SS" or "YYYY-MM-DDTHH:MM:SS"
          const dateStr = ci.slice(0, 10);
          const timePart = ci.slice(11, 16); // "HH:MM"
          if (dateStr && timePart && !checkInByDate.has(dateStr)) {
            checkInByDate.set(dateStr, timePart);
          }
        }
      }

      // 1. Process segments FIRST so that status calculation sees final state
      if (Array.isArray(updates)) {
        for (const u of updates) {
          if (u.id) {
            if (u.delete === true) {
              await conn.query(`DELETE FROM attendance WHERE id = ? AND userId = ?`, [u.id, userId]);
              segUpdated++;
              continue;
            }
            const [currentRows] = await conn.query(
              `SELECT id, checkIn, checkOut, work_type, labels, shiftId FROM attendance WHERE id = ? AND userId = ? LIMIT 1`,
              [u.id, userId]
            );
            const current = currentRows && currentRows[0] ? currentRows[0] : null;
            if (!current) continue;
            const nextCheckIn = u.checkIn ? String(u.checkIn) : null;
            if (nextCheckIn) {
              const [dupRows] = await conn.query(
                `SELECT id, checkOut, work_type, labels, shiftId FROM attendance WHERE userId = ? AND checkIn = ? AND id <> ? ORDER BY id ASC LIMIT 1`,
                [userId, nextCheckIn, u.id]
              );
              const dup = dupRows && dupRows[0] ? dupRows[0] : null;
              if (dup) {
                await conn.query(`DELETE FROM attendance WHERE id = ? AND userId = ?`, [dup.id, userId]);
                const mergedLabels = mergeLabels(current.labels, dup.labels);
                const mergedShiftId = current.shiftId != null ? current.shiftId : dup.shiftId;
                await conn.query(
                  `UPDATE attendance SET checkIn=?,checkOut=?,work_type=?,labels=?,shiftId=? WHERE id=? AND userId=?`,
                  [nextCheckIn, u.checkOut||null, u.workType||current.work_type||dup.work_type||null, mergedLabels, mergedShiftId!=null?mergedShiftId:null, u.id, userId]
                );
                segUpdated++;
                continue;
              }
            }
            const fields = ['checkIn = ?', 'checkOut = ?', 'work_type = ?'];
            const vals = [u.checkIn||null, u.checkOut||null, u.workType||null];
            
            if (u.location !== undefined) { fields.push('location = ?'); vals.push(u.location || null); }
            if (u.memo !== undefined) { fields.push('memo = ?'); vals.push(u.memo || null); }
            if (u.notes !== undefined) { fields.push('notes = ?'); vals.push(u.notes || null); }
            
            vals.push(u.id, userId);
            await conn.query(`UPDATE attendance SET ${fields.join(', ')} WHERE id = ? AND userId = ?`, vals);
            segUpdated++;
          } else if (u.checkIn) {
            const loc = u.location || null;
            const mem = u.memo || null;
            const not = u.notes || null;
            const [res] = await conn.query(
              `INSERT INTO attendance (userId, checkIn, checkOut, work_type, location, memo, notes) VALUES (?, ?, ?, ?, ?, ?, ?)
               ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id),checkOut=VALUES(checkOut),work_type=VALUES(work_type),location=VALUES(location),memo=VALUES(memo),notes=VALUES(notes)`,
              [userId, u.checkIn, u.checkOut||null, u.workType||null, loc, mem, not]
            );
            const newId = Number(res?.insertId||0)||null;
            const affected = Number(res?.affectedRows||0);
            if (affected===1) segCreated++;
            else segUpdated++;
            if (u.clientId && newId) {
              createdIds.push({ clientId: u.clientId, id: newId, checkIn: u.checkIn, checkOut: u.checkOut||null });
            }
          }
        }
      }

      // 2. Process dailyUpdates — now segments are already committed in same transaction
      if (Array.isArray(dailyUpdates)) {
        for (const d of dailyUpdates) {
          const date = String(d?.date || '').slice(0, 10);
          if (!date) continue;

          // Use checkIn from request payload; fall back to DB only if not in payload
          let checkInTime = checkInByDate.get(date) || null;
          if (!checkInTime && d.checkInTime) {
            checkInTime = String(d.checkInTime).slice(0, 5); // "HH:MM"
          }
          if (!checkInTime) {
            // Fall back: query DB for existing attendance
            const [attRows] = await conn.query(
              `SELECT checkIn FROM attendance WHERE userId = ? AND DATE(checkIn) = ? LIMIT 1`,
              [userId, date]
            );
            if (attRows?.[0]?.checkIn) {
              const ci = String(attRows[0].checkIn);
              checkInTime = ci.slice(11, 16); // "HH:MM"
            }
          }

          const shiftStart = String(d.shiftStart || '08:00').trim();
          const status = deriveStatus(d.kubun, checkInTime, shiftStart);

          await conn.query(
            `
            INSERT INTO attendance_daily (userId, date, kubun, kubun_confirmed, work_type, location, reason, memo, notes, late_minutes, early_minutes, break_minutes, night_break_minutes, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
              kubun = VALUES(kubun),
              kubun_confirmed = VALUES(kubun_confirmed),
              work_type = VALUES(work_type),
              location = VALUES(location),
              reason = VALUES(reason),
              memo = VALUES(memo),
              notes = VALUES(notes),
              late_minutes = VALUES(late_minutes),
              early_minutes = VALUES(early_minutes),
              break_minutes = VALUES(break_minutes),
              night_break_minutes = VALUES(night_break_minutes),
              status = VALUES(status)
          `,
            [
              userId,
              date,
              d.kubun || null,
              d.kubunConfirmed ? 1 : 0,
              d.workType || null,
              d.location != null ? String(d.location) : null,
              d.reason != null ? String(d.reason) : null,
              d.memo != null ? String(d.memo) : null,
              d.notes != null ? String(d.notes) : null,
              d.lateMinutes != null ? d.lateMinutes : null,
              d.earlyMinutes != null ? d.earlyMinutes : null,
              d.breakMinutes !== null && d.breakMinutes !== undefined ? d.breakMinutes : null,
              d.nightBreakMinutes !== null && d.nightBreakMinutes !== undefined ? d.nightBreakMinutes : null,
              status
            ]
          );
          dailySaved++;
        }
      }

      await conn.commit();
      return { 
        ok: true, 
        saved: { daily: dailySaved, segmentsCreated: segCreated, segmentsUpdated: segUpdated },
        created: createdIds
      };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }
};

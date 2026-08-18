'use strict';
const db = require('../../core/database/mysql');

function _tid(tenantId) {
  return tenantId != null ? parseInt(String(tenantId), 10) : null;
}

// ─── Column cache ─────────
let _usaColCache = null;
let _usaColCacheTs = 0;
let _attColCache = null;
let _attColCacheTs = 0;
const COL_CACHE_TTL = 600000; // 10 minutes

async function getUSAColumnSet() {
  const now = Date.now();
  if (_usaColCache && (now - _usaColCacheTs) < COL_CACHE_TTL) {
    return _usaColCache;
  }
  try {
    const [cols] = await db.query(`
      SELECT COLUMN_NAME AS name 
      FROM information_schema.columns 
      WHERE table_schema = DATABASE() AND table_name = 'user_shift_assignments'
    `);
    _usaColCache = new Set((cols || []).map(c => String(c.name)));
    _usaColCacheTs = now;
    return _usaColCache;
  } catch {
    try {
      const [cols2] = await db.query(`SHOW COLUMNS FROM user_shift_assignments`);
      _usaColCache = new Set((cols2 || []).map(c => String(c.Field)));
      _usaColCacheTs = now;
      return _usaColCache;
    } catch {
      return _usaColCache || new Set();
    }
  }
}

function getUSAStartCol(set) {
  if (set && set.has && set.has('date')) return 'date';
  if (set && set.has && set.has('start_date')) return 'start_date';
  return 'start_date';
}

async function getAttendanceColumnSet() {
  const now = Date.now();
  if (_attColCache && (now - _attColCacheTs) < COL_CACHE_TTL) {
    return _attColCache;
  }
  try {
    const [cols] = await db.query(`
      SELECT COLUMN_NAME AS name 
      FROM information_schema.columns 
      WHERE table_schema = DATABASE() AND table_name = 'attendance'
    `);
    _attColCache = new Set((cols || []).map(c => String(c.name)));
    _attColCacheTs = now;
    return _attColCache;
  } catch {
    return _attColCache || new Set();
  }
}

module.exports = {
  async upsertShiftDefinition({ name, start_time, end_time, break_minutes, working_days, tenantId }) {
    const tid = _tid(tenantId);
    const s = String(start_time || '').split(':').map(Number);
    const e = String(end_time || '').split(':').map(Number);
    const std = Math.max(0, (e[0]*60+e[1]) - (s[0]*60+s[1]) - (break_minutes || 0));
    await db.query(`
      INSERT INTO shift_definitions (name, start_time, end_time, break_minutes, standard_minutes, working_days, tenant_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE start_time = VALUES(start_time), end_time = VALUES(end_time), break_minutes = VALUES(break_minutes), standard_minutes = VALUES(standard_minutes), working_days = VALUES(working_days)
    `, [name, start_time, end_time, break_minutes || 0, std, working_days || null, tid]);
    const where = ['name = ?'];
    const params = [name];
    if (tid != null) { where.push('tenant_id = ?'); params.push(tid); }
    const [rows] = await db.query(`SELECT * FROM shift_definitions WHERE ${where.join(' AND ')} LIMIT 1`, params);
    return rows[0];
  },
  async listShiftDefinitions({ tenantId = null } = {}) {
    const tid = _tid(tenantId);
    const where = [];
    const params = [];
    if (tid != null) { where.push('tenant_id = ?'); params.push(tid); }
    const wsql = where.length ? ('WHERE ' + where.join(' AND ')) : '';
    const [rows] = await db.query(`SELECT * FROM shift_definitions ${wsql} ORDER BY id ASC`, params);
    return rows;
  },
  async getShiftById(id, { tenantId = null } = {}) {
    const tid = _tid(tenantId);
    const where = ['id = ?'];
    const params = [id];
    if (tid != null) { where.push('tenant_id = ?'); params.push(tid); }
    const [rows] = await db.query(`SELECT * FROM shift_definitions WHERE ${where.join(' AND ')} LIMIT 1`, params);
    return rows[0];
  },
  async getShiftByName(name, { tenantId = null } = {}) {
    const tid = _tid(tenantId);
    const where = ['name = ?'];
    const params = [name];
    if (tid != null) { where.push('tenant_id = ?'); params.push(tid); }
    const [rows] = await db.query('SELECT id, name, start_time, end_time, break_minutes FROM shift_definitions WHERE ' + where.join(' AND ') + ' LIMIT 1', params);
    return rows && rows[0] ? rows[0] : null;
  },
  async deleteShiftDefinitionById(id, { tenantId = null } = {}) {
    const tid = _tid(tenantId);
    const xid = Number(id);
    if (!xid) return { deleted: 0, notFound: true };
    const def = await this.getShiftById(xid, { tenantId: tid });
    if (!def) return { deleted: 0, notFound: true };
    let assignedCount = 0;
    try {
      const set = await getUSAColumnSet();
      if (set.has('shiftId')) {
        const whereUSA = ['shiftId = ?'];
        const paramsUSA = [xid];
        if (tid != null) { whereUSA.push('tenant_id = ?'); paramsUSA.push(tid); }
        const [rows] = await db.query(`SELECT COUNT(*) AS c FROM user_shift_assignments WHERE ${whereUSA.join(' AND ')}`, paramsUSA);
        assignedCount = rows && rows[0] ? Number(rows[0].c || 0) : 0;
      } else if (set.has('shift')) {
        const whereUSA = ['shift = ?'];
        const paramsUSA = [String(def.name || '')];
        if (tid != null) { whereUSA.push('tenant_id = ?'); paramsUSA.push(tid); }
        const [rows] = await db.query(`SELECT COUNT(*) AS c FROM user_shift_assignments WHERE ${whereUSA.join(' AND ')}`, paramsUSA);
        assignedCount = rows && rows[0] ? Number(rows[0].c || 0) : 0;
      }
    } catch {}
    if (assignedCount > 0) {
      return { deleted: 0, inUse: true, assignedCount };
    }
    try {
      const whereDel = ['id = ?'];
      const paramsDel = [xid];
      if (tid != null) { whereDel.push('tenant_id = ?'); paramsDel.push(tid); }
      const [res] = await db.query(`DELETE FROM shift_definitions WHERE ${whereDel.join(' AND ')}`, paramsDel);
      return { deleted: Number(res?.affectedRows || 0) };
    } catch (err) {
      const msg = String(err?.message || '');
      if (msg.toLowerCase().includes('foreign key') || msg.toLowerCase().includes('constraint')) {
        return { deleted: 0, inUse: true, assignedCount: null };
      }
      throw err;
    }
  },
  async assignShiftToUser(userId, shiftId, startDate, endDate, { tenantId = null } = {}) {
    const tid = _tid(tenantId);
    const set = await getUSAColumnSet();
    const hasShiftId = set.has('shiftId');
    const hasShiftName = set.has('shift');
    const startCol = getUSAStartCol(set);
    const hasDateCol = set.has('date');
    const hasStartDateCol = set.has('start_date');
    const hasEndDateCol = set.has('end_date');
    const hasTenantCol = set.has('tenant_id');

    let shiftName = null;
    try {
      const def = await this.getShiftById(shiftId, { tenantId: tid });
      shiftName = def?.name ? String(def.name) : null;
    } catch {}

    const cols = ['userId'];
    const vals = [userId];

    if (hasDateCol) {
      cols.push('date');
      vals.push(startDate);
    }
    if (hasStartDateCol) {
      cols.push('start_date');
      vals.push(startDate);
    }
    if (!hasDateCol && !hasStartDateCol) {
      cols.push(startCol);
      vals.push(startDate);
    }
    if (hasEndDateCol) {
      cols.push('end_date');
      vals.push(endDate || null);
    }
    if (hasShiftId) {
      cols.push('shiftId');
      vals.push(shiftId);
    }
    if (hasShiftName) {
      cols.push('shift');
      vals.push(shiftName || null);
    }
    if (hasTenantCol && tid != null) {
      cols.push('tenant_id');
      vals.push(tid);
    }

    const placeholders = cols.map(() => '?').join(', ');
    const upd = [];
    if (hasShiftId) upd.push(`shiftId = VALUES(shiftId)`);
    if (hasShiftName) upd.push(`shift = VALUES(shift)`);
    if (hasStartDateCol) upd.push(`start_date = VALUES(start_date)`);
    if (hasEndDateCol) upd.push(`end_date = VALUES(end_date)`);
    if (hasDateCol) upd.push(`date = VALUES(date)`);

    const sql = upd.length
      ? `INSERT INTO user_shift_assignments (${cols.join(', ')}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${upd.join(', ')}`
      : `INSERT INTO user_shift_assignments (${cols.join(', ')}) VALUES (${placeholders})`;

    try {
      await db.query(sql, vals);
    } catch (e) {
      const msg = String(e?.message || '');
      const needDate = msg.includes("Field 'date'") && hasDateCol === false;
      const needStartDate = msg.includes("Field 'start_date'") && hasStartDateCol === false;
      if (needDate || needStartDate) {
        const cols2 = cols.slice();
        const vals2 = vals.slice();
        const upd2 = upd.slice();
        if (needDate) { cols2.push('date'); vals2.push(startDate); upd2.push(`date = VALUES(date)`); }
        if (needStartDate) { cols2.push('start_date'); vals2.push(startDate); upd2.push(`start_date = VALUES(start_date)`); }
        const placeholders2 = cols2.map(() => '?').join(', ');
        const sql2 = upd2.length
          ? `INSERT INTO user_shift_assignments (${cols2.join(', ')}) VALUES (${placeholders2}) ON DUPLICATE KEY UPDATE ${upd2.join(', ')}`
          : `INSERT INTO user_shift_assignments (${cols2.join(', ')}) VALUES (${placeholders2})`;
        await db.query(sql2, vals2);
      } else {
        throw e;
      }
    }
    return { ok: true };
  },
  async updateShiftAssignment(id, userId, patch, { tenantId = null } = {}) {
    const tid = _tid(tenantId);
    const xid = parseInt(String(id), 10);
    const uid = parseInt(String(userId), 10);
    if (!xid || !uid) return { ok: false, updated: 0 };
    const set = await getUSAColumnSet();
    const shiftCol = set.has('shiftId') ? 'shiftId' : (set.has('shift') ? 'shift' : 'shiftId');
    const startCol = getUSAStartCol(set);
    const hasEnd = set.has('end_date');
    const p = patch && typeof patch === 'object' ? patch : {};
    const fields = [];
    const vals = [];
    if (Object.prototype.hasOwnProperty.call(p, 'shiftId')) {
      const v = p.shiftId == null ? null : parseInt(String(p.shiftId), 10);
      fields.push(`${shiftCol} = ?`);
      vals.push(v);
    }
    if (Object.prototype.hasOwnProperty.call(p, 'startDate')) {
      const v = String(p.startDate || '').slice(0, 10);
      fields.push(`${startCol} = ?`);
      vals.push(v);
      if (set.has('date') && startCol !== 'date') { fields.push(`date = ?`); vals.push(v); }
      if (set.has('start_date') && startCol !== 'start_date') { fields.push(`start_date = ?`); vals.push(v); }
    }
    if (hasEnd && Object.prototype.hasOwnProperty.call(p, 'endDate')) {
      const v = p.endDate == null || p.endDate === '' ? null : String(p.endDate).slice(0, 10);
      fields.push(`end_date = ?`);
      vals.push(v);
    }
    if (!fields.length) return { ok: false, updated: 0 };
    vals.push(xid, uid);
    const where = ['id = ?', 'userId = ?'];
    if (tid != null) { where.push('tenant_id = ?'); vals.splice(vals.length - 2, 0, tid); }
    const [res] = await db.query(
      `UPDATE user_shift_assignments SET ${fields.join(', ')} WHERE ${where.join(' AND ')}`,
      vals
    );
    return { ok: true, updated: Number(res?.affectedRows || 0) };
  },
  async deleteShiftAssignment(id, userId, { tenantId = null } = {}) {
    const tid = _tid(tenantId);
    const xid = parseInt(String(id), 10);
    const uid = parseInt(String(userId), 10);
    if (!xid || !uid) return { ok: false, deleted: 0 };
    const where = ['id = ?', 'userId = ?'];
    const params = [xid, uid];
    if (tid != null) { where.push('tenant_id = ?'); params.push(tid); }
    const [res] = await db.query(`DELETE FROM user_shift_assignments WHERE ${where.join(' AND ')}`, params);
    return { ok: true, deleted: Number(res?.affectedRows || 0) };
  },
  async getActiveAssignment(userId, dateStr, { tenantId = null } = {}) {
    const tid = _tid(tenantId);
    const set = await getUSAColumnSet();
    const startCol = getUSAStartCol(set);
    const hasEnd = set.has('end_date');
    const whereEnd = hasEnd ? 'AND (a.end_date IS NULL OR a.end_date >= ?)' : '';
    const orderCol = startCol;
    const whereTid = tid != null ? 'AND a.tenant_id = ?' : '';
    const sql = `
      SELECT a.*
      FROM user_shift_assignments a
      WHERE a.userId = ? AND a.${startCol} <= ? ${whereEnd} ${whereTid}
      ORDER BY a.${orderCol} DESC
      LIMIT 1
    `;
    const params = [userId, dateStr];
    if (hasEnd) params.push(dateStr);
    if (tid != null) params.push(tid);
    const [rows] = await db.query(sql, params);
    return rows[0];
  },
  async listShiftAssignmentsBetween(userId, fromDate, toDate, { tenantId = null } = {}) {
    const tid = _tid(tenantId);
    const set = await getUSAColumnSet();
    const startCol = getUSAStartCol(set);
    const hasEnd = set.has('end_date');
    const hasShiftId = set.has('shiftId');
    const hasShiftName = set.has('shift');
    const whereEnd = hasEnd ? 'AND (a.end_date IS NULL OR a.end_date >= ?)' : '';
    const whereTid = tid != null ? 'AND a.tenant_id = ?' : '';
    const sql = `
      SELECT
        a.id,
        a.userId,
        ${hasShiftId ? 'a.shiftId' : 'NULL'} AS shiftId,
        ${hasShiftName ? 'a.shift' : 'NULL'} AS shift,
        a.${startCol} AS start_date,
        ${hasEnd ? 'a.end_date' : 'NULL'} AS end_date
      FROM user_shift_assignments a
      WHERE a.userId = ?
        AND a.${startCol} <= ?
        ${whereEnd}
        ${whereTid}
      ORDER BY a.${startCol} ASC, a.id ASC
    `;
    const params = [userId, String(toDate).slice(0, 10)];
    if (hasEnd) params.push(String(fromDate).slice(0, 10));
    if (tid != null) params.push(tid);
    const [rows] = await db.query(sql, params);
    return rows || [];
  },
  async backfillShiftIdForUserRange(userId, fromDate, toDate, { tenantId = null } = {}) {
    const tid = _tid(tenantId);
    const set = await getUSAColumnSet();
    const startCol = getUSAStartCol(set);
    const hasEnd = set.has('end_date');
    const endCond = hasEnd ? 'AND (s.end_date IS NULL OR DATE(COALESCE(a.checkIn, a.checkOut)) <= s.end_date)' : '';
    const hasShiftName = set.has('shift');
    const joinDef = hasShiftName ? 'LEFT JOIN shift_definitions d ON d.name = s.shift' : '';
    const setExpr = hasShiftName ? 'COALESCE(s.shiftId, d.id)' : 's.shiftId';
    const whereTid = tid != null ? 'AND s.tenant_id = ?' : '';
    const sql = `
      UPDATE attendance a
      JOIN user_shift_assignments s
        ON s.userId = a.userId
       AND DATE(COALESCE(a.checkIn, a.checkOut)) >= s.${startCol}
       ${endCond}
       ${whereTid}
      ${joinDef}
      SET a.shiftId = ${setExpr}
      WHERE a.userId = ?
        AND DATE(COALESCE(a.checkIn, a.checkOut)) >= ?
        AND DATE(COALESCE(a.checkIn, a.checkOut)) <= ?
    `;
    const params = tid != null ? [tid, userId, fromDate, toDate] : [userId, fromDate, toDate];
    await db.query(sql, params);
    return { ok: true };
  },
  async batchGetActiveAssignments(userIds, dateStr, { tenantId = null } = {}) {
    const tid = _tid(tenantId);
    const result = new Map();
    if (!userIds || !userIds.length) return result;
    const set = await getUSAColumnSet();
    const startCol = getUSAStartCol(set);
    const hasEnd = set.has('end_date');
    const placeholders = userIds.map(() => '?').join(',');
    const whereEnd = hasEnd ? `AND (end_date IS NULL OR end_date >= ?)` : '';
    const whereTid = tid != null ? `AND tenant_id = ?` : '';
    const sql = `
      SELECT a.*
      FROM user_shift_assignments a
      INNER JOIN (
        SELECT userId, MAX(${startCol}) AS max_start
        FROM user_shift_assignments
        WHERE userId IN (${placeholders}) AND ${startCol} <= ?
        ${hasEnd ? 'AND (end_date IS NULL OR end_date >= ?)' : ''}
        ${whereTid}
        GROUP BY userId
      ) latest ON latest.userId = a.userId AND a.${startCol} = latest.max_start
      WHERE a.userId IN (${placeholders})
      ORDER BY a.userId
    `;
    const params = [...userIds, dateStr];
    if (hasEnd) params.push(dateStr);
    if (tid != null) params.push(tid);
    params.push(...userIds);
    try {
      const [rows] = await db.query(sql, params);
      for (const row of (rows || [])) {
        if (!result.has(row.userId)) result.set(row.userId, row);
      }
    } catch (e) {
      // Fallback: if the batch query fails (schema mismatch), return empty map
      // The caller will use individual queries
    }
    return result;
  },
  async batchGetAllShiftDefinitions({ tenantId = null } = {}) {
    const tid = _tid(tenantId);
    const where = [];
    const params = [];
    if (tid != null) { where.push('tenant_id = ?'); params.push(tid); }
    const wsql = where.length ? ('WHERE ' + where.join(' AND ')) : '';
    const [rows] = await db.query(`SELECT id, name, start_time, end_time, break_minutes FROM shift_definitions ${wsql}`, params);
    const map = new Map();
    for (const r of (rows || [])) {
      map.set(r.id, r);
    }
    return map;
  }
};

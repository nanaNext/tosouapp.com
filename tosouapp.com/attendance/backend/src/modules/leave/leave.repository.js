const db = require('../../core/database/mysql');

function _tid(tenantId) {
  return tenantId != null ? parseInt(String(tenantId), 10) : null;
}

async function ensureSchema() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS leave_requests (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      userId BIGINT UNSIGNED NOT NULL,
      startDate DATE NOT NULL,
      endDate DATE NOT NULL,
      type VARCHAR(32) NOT NULL,
      reason VARCHAR(255) NULL,
      status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_user (userId),
      INDEX idx_status (status),
      INDEX idx_type (type),
      INDEX idx_period (startDate, endDate),
      CONSTRAINT fk_leave_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  try {
    const [cols] = await db.query(`
      SELECT COLUMN_NAME AS name, DATA_TYPE AS dtype, COLUMN_TYPE AS ctype
      FROM information_schema.columns
      WHERE table_schema = DATABASE() AND table_name = 'leave_requests'
    `);
    const colMap = new Map((cols || []).map(c => [String(c.name), c]));
    const typeCol = colMap.get('type');
    if (typeCol && String(typeCol.dtype || '').toLowerCase() !== 'varchar') {
      try {
        await db.query(`ALTER TABLE leave_requests MODIFY COLUMN type VARCHAR(32) NOT NULL`);
      } catch (e) { /* silently ignored */ }
    }

    const [idx] = await db.query(`
      SELECT index_name
      FROM information_schema.statistics
      WHERE table_schema = DATABASE() AND table_name = 'leave_requests'
    `);
    const idxSet = new Set((idx || []).map(i => String(i.index_name)));
    if (!idxSet.has('idx_user_status')) {
      try { await db.query(`ALTER TABLE leave_requests ADD INDEX idx_user_status (userId, status)`); } catch (e) { /* silently ignored */ }
    }
    if (!idxSet.has('idx_status_period')) {
      try { await db.query(`ALTER TABLE leave_requests ADD INDEX idx_status_period (status, startDate, endDate)`); } catch (e) { /* silently ignored */ }
    }
    if (!idxSet.has('idx_leave_user_type_status_period')) {
      try { await db.query(`ALTER TABLE leave_requests ADD INDEX idx_leave_user_type_status_period (userId, type, status, startDate, endDate)`); } catch (e) { /* silently ignored */ }
    }
    if (!idxSet.has('idx_leave_status_created')) {
      try { await db.query(`ALTER TABLE leave_requests ADD INDEX idx_leave_status_created (status, created_at, id)`); } catch (e) { /* silently ignored */ }
    }
  } catch (e) { /* silently ignored */ }
  try {
    const [tbls] = await db.query(`
      SELECT table_name AS name
      FROM information_schema.tables
      WHERE table_schema = DATABASE() AND table_name IN ('paid_leave_grants','leave_grants')
    `);
    const set = new Set((tbls || []).map(t => String(t.name)));
    const grantsTable = set.has('paid_leave_grants') ? 'paid_leave_grants' : 'leave_grants';
    if (!set.has('paid_leave_grants') && !set.has('leave_grants')) {
      await db.query(`
        CREATE TABLE paid_leave_grants (
          id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          userId BIGINT UNSIGNED NOT NULL,
          type VARCHAR(32) NOT NULL DEFAULT 'paid',
          grantDate DATE NOT NULL,
          daysGranted INT NOT NULL,
          expiryDate DATE NOT NULL,
          daysUsed INT NOT NULL DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE KEY uniq_user_grant (userId, type, grantDate),
          INDEX idx_user_expiry (userId, expiryDate),
          CONSTRAINT fk_leave_grant_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
    } else {
      const [cols] = await db.query(`
        SELECT COLUMN_NAME AS name, COLUMN_TYPE AS ctype
        FROM information_schema.columns
        WHERE table_schema = DATABASE() AND table_name = ?
      `, [grantsTable]);
      const colSet = new Set((cols || []).map(c => String(c.name)));
      if (!colSet.has('userId')) {
        await db.query(`ALTER TABLE ${grantsTable} ADD COLUMN userId BIGINT UNSIGNED NOT NULL`);
      } else {
        const userCol = (cols || []).find(c => String(c.name) === 'userId');
        if (userCol && !/bigint\(\d+\)\s+unsigned/i.test(String(userCol.ctype))) {
          try {
            const [fks] = await db.query(`
              SELECT CONSTRAINT_NAME 
              FROM information_schema.KEY_COLUMN_USAGE
              WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = 'userId' AND REFERENCED_TABLE_NAME IS NOT NULL
            `, [grantsTable]);
            for (const fk of (fks || [])) {
              try { await db.query(`ALTER TABLE ${grantsTable} DROP FOREIGN KEY ${fk.CONSTRAINT_NAME}`); } catch (e) { /* silently ignored */ }
            }
          } catch (e) { /* silently ignored */ }
          await db.query(`ALTER TABLE ${grantsTable} MODIFY COLUMN userId BIGINT UNSIGNED NOT NULL`);
        }
      }
      if (!colSet.has('type')) await db.query(`ALTER TABLE ${grantsTable} ADD COLUMN type VARCHAR(32) NOT NULL DEFAULT 'paid'`);
      if (!colSet.has('grantDate')) await db.query(`ALTER TABLE ${grantsTable} ADD COLUMN grantDate DATE NOT NULL`);
      if (!colSet.has('daysGranted')) await db.query(`ALTER TABLE ${grantsTable} ADD COLUMN daysGranted INT NOT NULL`);
      if (!colSet.has('expiryDate')) await db.query(`ALTER TABLE ${grantsTable} ADD COLUMN expiryDate DATE NOT NULL`);
      if (!colSet.has('daysUsed')) await db.query(`ALTER TABLE ${grantsTable} ADD COLUMN daysUsed INT NOT NULL DEFAULT 0`);
      const [idx] = await db.query(`
        SELECT index_name 
        FROM information_schema.statistics
        WHERE table_schema = DATABASE() AND table_name = ?
      `, [grantsTable]);
      const idxSet = new Set((idx || []).map(i => String(i.index_name)));
      if (!idxSet.has('uniq_user_grant')) {
        try { await db.query(`ALTER TABLE ${grantsTable} ADD UNIQUE KEY uniq_user_grant (userId, type, grantDate)`); } catch (e) { /* silently ignored */ }
      }
      if (!idxSet.has('idx_user_expiry')) {
        try { await db.query(`ALTER TABLE ${grantsTable} ADD INDEX idx_user_expiry (userId, expiryDate)`); } catch (e) { /* silently ignored */ }
      }
      const [fk] = await db.query(`
        SELECT CONSTRAINT_NAME 
        FROM information_schema.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = 'userId' AND REFERENCED_TABLE_NAME IS NOT NULL
      `, [grantsTable]);
      if (!fk || !fk.length) {
        try { await db.query(`ALTER TABLE ${grantsTable} ADD CONSTRAINT fk_leave_grant_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE`); } catch (e) { /* silently ignored */ }
      }
    }
  } catch (e) { /* silently ignored */ }
}

async function resolveGrantsTable() {
  const [[row]] = await db.query(`
    SELECT table_name AS name
    FROM information_schema.tables
    WHERE table_schema = DATABASE() AND table_name IN ('paid_leave_grants','leave_grants')
    ORDER BY CASE table_name WHEN 'paid_leave_grants' THEN 0 ELSE 1 END
    LIMIT 1
  `);
  return row ? String(row.name) : 'paid_leave_grants';
}

module.exports = {
  ensureSchema,
  async create({ userId, startDate, endDate, type, reason, tenantId = null }) {
    const tid = _tid(tenantId);
    if (tid != null) {
      const sql = `
        INSERT INTO leave_requests (userId, startDate, endDate, type, reason, tenant_id)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      const [res] = await db.query(sql, [userId, startDate, endDate, type, reason || null, tid]);
      return res.insertId;
    }
    const sql = `
      INSERT INTO leave_requests (userId, startDate, endDate, type, reason)
      VALUES (?, ?, ?, ?, ?)
    `;
    const [res] = await db.query(sql, [userId, startDate, endDate, type, reason || null]);
    return res.insertId;
  },
  async listMine(userId, tenantId = null) {
    const tid = _tid(tenantId);
    const params = [userId];
    let where = 'WHERE userId = ?';
    if (tid != null) { where += ' AND tenant_id = ?'; params.push(tid); }
    const sql = `
      SELECT * FROM leave_requests
      ${where}
      ORDER BY created_at DESC
    `;
    const [rows] = await db.query(sql, params);
    return rows;
  },
  async findExactRequest({ userId, startDate, endDate, type = 'paid', statuses = ['pending', 'approved'], tenantId = null }) {
    const tid = _tid(tenantId);
    const list = Array.isArray(statuses) && statuses.length
      ? statuses.filter(s => ['pending', 'approved', 'rejected'].includes(String(s || '').toLowerCase()))
      : ['pending', 'approved'];
    const marks = list.map(() => '?').join(',');
    const params = [userId, startDate, endDate, type, ...list];
    let tenantFilter = '';
    if (tid != null) { tenantFilter = 'AND tenant_id = ?'; params.push(tid); }
    const sql = `
      SELECT id, userId, startDate, endDate, type, status
      FROM leave_requests
      WHERE userId = ?
        AND startDate = ?
        AND endDate = ?
        AND type = ?
        AND status IN (${marks})
        ${tenantFilter}
      ORDER BY id DESC
      LIMIT 1
    `;
    const [rows] = await db.query(sql, params);
    return rows && rows[0] ? rows[0] : null;
  },
  async listByUser(userId, tenantId = null) {
    const tid = _tid(tenantId);
    const params = [userId];
    let where = 'WHERE userId = ?';
    if (tid != null) { where += ' AND tenant_id = ?'; params.push(tid); }
    const sql = `
      SELECT * FROM leave_requests
      ${where}
      ORDER BY created_at DESC
    `;
    const [rows] = await db.query(sql, params);
    return rows;
  },
  async getById(id, tenantId = null) {
    const tid = _tid(tenantId);
    const params = [id];
    let where = 'WHERE id = ?';
    if (tid != null) { where += ' AND tenant_id = ?'; params.push(tid); }
    const [rows] = await db.query(`SELECT * FROM leave_requests ${where} LIMIT 1`, params);
    return rows && rows[0] ? rows[0] : null;
  },
  async listApprovedByUserOverlap(userId, fromDate, toDate, tenantId = null) {
    const tid = _tid(tenantId);
    const params = [userId, fromDate, toDate];
    let tenantFilter = '';
    if (tid != null) { tenantFilter = 'AND tenant_id = ?'; params.push(tid); }
    const sql = `
      SELECT *
      FROM leave_requests
      WHERE userId = ?
        AND status = 'approved'
        AND endDate >= ?
        AND startDate <= ?
        ${tenantFilter}
      ORDER BY startDate DESC
    `;
    const [rows] = await db.query(sql, params);
    return rows;
  },
  async listAllPending(tenantId = null) {
    const hasTid = tenantId != null && Number.isFinite(Number(tenantId));
    const params = [];
    const where = ['lr.status = \'pending\''];
    if (hasTid) { where.push('u.tenant_id = ?'); params.push(parseInt(String(tenantId), 10)); }
    const sql = `
      SELECT
        lr.*,
        u.username,
        u.employee_code,
        COALESCE(t.id, 0) AS tenant_id,
        COALESCE(t.name, '未設定') AS tenant_name,
        COALESCE(b.id, 0) AS branch_id,
        COALESCE(b.name, '') AS branch_name
      FROM leave_requests lr
      LEFT JOIN users u ON u.id = lr.userId
      LEFT JOIN tenants t ON t.id = u.tenant_id
      LEFT JOIN branches b ON b.id = u.branch_id
      WHERE ${where.join('\n      AND ')}
      ORDER BY COALESCE(t.id, 0) ASC, COALESCE(b.id, 0) ASC, lr.created_at DESC, lr.id DESC
    `;
    const [rows] = await db.query(sql, params);
    return rows;
  },
  async listAllRequests({ status = null, limit = 1000, tenantId = null } = {}) {
    const lim = Math.max(1, Math.min(5000, Number(limit || 1000)));
    const hasStatus = ['pending', 'approved', 'rejected'].includes(String(status || '').toLowerCase());
    const hasTid = tenantId != null && Number.isFinite(Number(tenantId));
    const params = [];
    const conditions = [];
    if (hasStatus) {
      conditions.push('lr.status = ?');
      params.push(String(status).toLowerCase());
    }
    conditions.push(`
      NOT (
        lr.type = 'paid'
        AND lr.status = 'approved'
        AND lr.startDate = lr.endDate
        AND (
          COALESCE(aw.hasWork, 0) = 1
          OR (
            ad.userId IS NOT NULL
            AND REPLACE(TRIM(COALESCE(ad.kubun, '')), '　', '') <> '有給休暇'
          )
        )
      )
    `);
    conditions.push(`
      NOT (
        lr.type = 'paid'
        AND lr.status = 'rejected'
        AND (
          COALESCE(lr.reason, '') LIKE '%[AUTO_CANCEL]%'
          OR COALESCE(lr.reason, '') LIKE '%[AUTO_RECONCILE]%'
        )
      )
    `);
    conditions.push(`u.role NOT IN ('admin', 'manager')`);
    if (hasTid) {
      conditions.push('u.tenant_id = ?');
      params.push(parseInt(String(tenantId), 10));
    }
    params.push(lim);
    const sql = `
      SELECT
        lr.*,
        u.username,
        u.employee_code,
        COALESCE(t.id, 0) AS tenant_id,
        COALESCE(t.name, '未設定') AS tenant_name,
        COALESCE(b.id, 0) AS branch_id,
        COALESCE(b.name, '') AS branch_name
      FROM leave_requests lr
      LEFT JOIN users u ON u.id = lr.userId
      LEFT JOIN tenants t ON t.id = u.tenant_id
      LEFT JOIN branches b ON b.id = u.branch_id
      LEFT JOIN attendance_daily ad
        ON ad.userId = lr.userId
       AND ad.date = lr.startDate
      LEFT JOIN (
        SELECT userId, DATE(COALESCE(checkIn, checkOut)) AS d,
               MAX(CASE WHEN checkIn IS NOT NULL OR checkOut IS NOT NULL THEN 1 ELSE 0 END) AS hasWork
        FROM attendance
        GROUP BY userId, DATE(COALESCE(checkIn, checkOut))
      ) aw
        ON aw.userId = lr.userId
       AND aw.d = lr.startDate
      WHERE ${conditions.join('\n      AND ')}
      ORDER BY COALESCE(t.id, 0) ASC, COALESCE(b.id, 0) ASC, lr.created_at DESC, lr.id DESC
      LIMIT ?
    `;
    try {
      const [rows] = await db.query(sql, params);
      return rows;
    } catch {
      const whereParts = [];
      const fbParams = [];
      if (hasStatus) { whereParts.push('lr.status = ?'); fbParams.push(String(status).toLowerCase()); }
      whereParts.push(`u.role NOT IN ('admin', 'manager')`);
      if (hasTid) { whereParts.push('u.tenant_id = ?'); fbParams.push(parseInt(String(tenantId), 10)); }
      fbParams.push(lim);
      const fallbackSql = `
        SELECT
          lr.*,
          u.username,
          u.employee_code,
          COALESCE(t.id, 0) AS tenant_id,
          COALESCE(t.name, '未設定') AS tenant_name,
          COALESCE(b.id, 0) AS branch_id,
          COALESCE(b.name, '') AS branch_name
        FROM leave_requests lr
        LEFT JOIN users u ON u.id = lr.userId
        LEFT JOIN tenants t ON t.id = u.tenant_id
        LEFT JOIN branches b ON b.id = u.branch_id
        ${whereParts.length ? 'WHERE ' + whereParts.join('\n        AND ') : ''}
        ORDER BY COALESCE(t.id, 0) ASC, COALESCE(b.id, 0) ASC, lr.created_at DESC, lr.id DESC
        LIMIT ?
      `;
      const [rows] = await db.query(fallbackSql, fbParams);
      return rows;
    }
  },
  async listAllRequestsSimple({ status = null, limit = 1000, tenantId = null } = {}) {
    const lim = Math.max(1, Math.min(5000, Number(limit || 1000)));
    const hasStatus = ['pending', 'approved', 'rejected'].includes(String(status || '').toLowerCase());
    const hasTid = tenantId != null && Number.isFinite(Number(tenantId));
    const whereParts = [`u.role NOT IN ('admin', 'manager')`];
    const params = [];
    if (hasStatus) { whereParts.push('lr.status = ?'); params.push(String(status).toLowerCase()); }
    if (hasTid) { whereParts.push('u.tenant_id = ?'); params.push(parseInt(String(tenantId), 10)); }
    params.push(lim);
    const sql = `
      SELECT
        lr.*,
        u.username,
        u.employee_code,
        COALESCE(t.id, 0) AS tenant_id,
        COALESCE(t.name, '未設定') AS tenant_name,
        COALESCE(b.id, 0) AS branch_id,
        COALESCE(b.name, '') AS branch_name
      FROM leave_requests lr
      LEFT JOIN users u ON u.id = lr.userId
      LEFT JOIN tenants t ON t.id = u.tenant_id
      LEFT JOIN branches b ON b.id = u.branch_id
      WHERE ${whereParts.join('\n      AND ')}
      ORDER BY COALESCE(t.id, 0) ASC, COALESCE(b.id, 0) ASC, lr.created_at DESC, lr.id DESC
      LIMIT ?
    `;
    const [rows] = await db.query(sql, params);
    return rows;
  },
  async getById(id, tenantId = null) {
    const hasTid = tenantId != null && Number.isFinite(Number(tenantId));
    const params = [id];
    const where = ['lr.id = ?'];
    if (hasTid) { where.push('u.tenant_id = ?'); params.push(parseInt(String(tenantId), 10)); }
    const [rows] = await db.query(`
      SELECT lr.*
      FROM leave_requests lr
      LEFT JOIN users u ON u.id = lr.userId
      WHERE ${where.join(' AND ')}
      LIMIT 1
    `, params);
    return rows && rows[0] ? rows[0] : null;
  },
  async listByUser(userId, tenantId = null) {
    const hasTid = tenantId != null && Number.isFinite(Number(tenantId));
    const params = [userId];
    const where = ['lr.userId = ?'];
    if (hasTid) { where.push('u.tenant_id = ?'); params.push(parseInt(String(tenantId), 10)); }
    const sql = `
      SELECT lr.*
      FROM leave_requests lr
      LEFT JOIN users u ON u.id = lr.userId
      WHERE ${where.join(' AND ')}
      ORDER BY lr.created_at DESC
    `;
    const [rows] = await db.query(sql, params);
    return rows;
  },
  async updateStatus(id, status, tenantId = null) {
    if (tenantId != null && Number.isFinite(Number(tenantId))) {
      const tid = parseInt(String(tenantId), 10);
      // 注意: JOIN を含む UPDATE では LIMIT を使用できない（MySQL: Incorrect usage of UPDATE and LIMIT）。
      // WHERE lr.id = ? が主キー条件で1行に限定されるため LIMIT は不要。
      const sql = `
        UPDATE leave_requests lr
        INNER JOIN users u ON u.id = lr.userId
        SET lr.status = ?
        WHERE lr.id = ? AND u.tenant_id = ?
      `;
      await db.query(sql, [status, id, tid]);
      return;
    }
    const sql = `
      UPDATE leave_requests
      SET status = ?
      WHERE id = ?
    `;
    await db.query(sql, [status, id]);
  },
  async cancelOwnPaidByDate(userId, date, tenantId = null) {
    const tid = _tid(tenantId);
    const params = [userId, date, date];
    let tenantFilter = '';
    if (tid != null) { tenantFilter = 'AND tenant_id = ?'; params.push(tid); }
    const sql = `
      UPDATE leave_requests
      SET
        status = 'rejected',
        reason = CASE
          WHEN COALESCE(reason, '') = '' THEN '[AUTO_CANCEL] kubun changed from 有給休暇'
          ELSE CONCAT(reason, ' / [AUTO_CANCEL] kubun changed from 有給休暇')
        END
      WHERE userId = ?
        AND type = 'paid'
        AND status IN ('pending', 'approved')
        AND startDate <= ?
        AND endDate >= ?
        ${tenantFilter}
    `;
    const [res] = await db.query(sql, params);
    return Number(res?.affectedRows || 0);
  },
  async reconcileApprovedPaidWithAttendance(tenantId = null) {
    const tid = _tid(tenantId);
    // Safety scope: reconcile only one-day paid requests to avoid changing multi-day requests unexpectedly.
    try {
      const params = [];
      let tenantFilter = '';
      if (tid != null) { tenantFilter = 'AND lr.tenant_id = ?'; params.push(tid); }
      const sql = `
        UPDATE leave_requests lr
        LEFT JOIN attendance_daily ad
          ON ad.userId = lr.userId
         AND ad.date = lr.startDate
        LEFT JOIN attendance a
          ON a.userId = lr.userId
         AND DATE(COALESCE(a.checkIn, a.checkOut)) = lr.startDate
        SET
          lr.status = 'rejected',
          lr.reason = CASE
            WHEN COALESCE(lr.reason, '') = '' THEN '[AUTO_RECONCILE] attendance kubun is not 有給休暇'
            WHEN lr.reason LIKE '%[AUTO_RECONCILE]%' THEN lr.reason
            ELSE CONCAT(lr.reason, ' / [AUTO_RECONCILE] attendance kubun is not 有給休暇')
          END
        WHERE lr.type = 'paid'
          AND lr.status = 'approved'
          AND lr.startDate = lr.endDate
          AND (
            (ad.userId IS NOT NULL AND REPLACE(TRIM(COALESCE(ad.kubun, '')), '　', '') <> '有給休暇')
            OR (a.id IS NOT NULL AND (a.checkIn IS NOT NULL OR a.checkOut IS NOT NULL))
          )
          ${tenantFilter}
      `;
      const [res] = await db.query(sql, params);
      return Number(res?.affectedRows || 0);
    } catch {
      // Fallback for environments where attendance table/join may fail.
      const params2 = [];
      let tenantFilter2 = '';
      if (tid != null) { tenantFilter2 = 'AND lr.tenant_id = ?'; params2.push(tid); }
      const sql2 = `
        UPDATE leave_requests lr
        INNER JOIN attendance_daily ad
          ON ad.userId = lr.userId
         AND ad.date = lr.startDate
        SET
          lr.status = 'rejected',
          lr.reason = CASE
            WHEN COALESCE(lr.reason, '') = '' THEN '[AUTO_RECONCILE] attendance kubun is not 有給休暇'
            WHEN lr.reason LIKE '%[AUTO_RECONCILE]%' THEN lr.reason
            ELSE CONCAT(lr.reason, ' / [AUTO_RECONCILE] attendance kubun is not 有給休暇')
          END
        WHERE lr.type = 'paid'
          AND lr.status = 'approved'
          AND lr.startDate = lr.endDate
          AND REPLACE(TRIM(COALESCE(ad.kubun, '')), '　', '') <> '有給休暇'
          ${tenantFilter2}
      `;
      const [res2] = await db.query(sql2, params2);
      return Number(res2?.affectedRows || 0);
    }
  },
  async upsertGrant({ userId, type = 'paid', grantDate, daysGranted, expiryDate, tenantId = null }) {
    const tid = _tid(tenantId);
    if (tid != null) {
      // Verify userId belongs to tenant before upserting
      const [check] = await db.query(`SELECT id FROM users WHERE id = ? AND tenant_id = ?`, [userId, tid]);
      if (!check || !check.length) return;
    }
    const table = await resolveGrantsTable();
    const sql = `
      INSERT INTO ${table} (userId, type, grantDate, daysGranted, expiryDate)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE daysGranted = VALUES(daysGranted), expiryDate = VALUES(expiryDate)
    `;
    await db.query(sql, [userId, type, grantDate, daysGranted, expiryDate]);
  },
  async deleteGrant({ userId, type = 'paid', grantDate, tenantId = null }) {
    const tid = _tid(tenantId);
    if (tid != null) {
      const [check] = await db.query(`SELECT id FROM users WHERE id = ? AND tenant_id = ?`, [userId, tid]);
      if (!check || !check.length) return 0;
    }
    const table = await resolveGrantsTable();
    const [res] = await db.query(`
      DELETE FROM ${table}
      WHERE userId = ? AND type = ? AND grantDate = ?
    `, [userId, type, grantDate]);
    return Number(res?.affectedRows || 0);
  },
  async listGrants(userId, type = 'paid', tenantId = null) {
    const tid = _tid(tenantId);
    if (tid != null) {
      const [check] = await db.query(`SELECT id FROM users WHERE id = ? AND tenant_id = ?`, [userId, tid]);
      if (!check || !check.length) return [];
    }
    const table = await resolveGrantsTable();
    const [rows] = await db.query(`
      SELECT * FROM ${table}
      WHERE userId = ? AND type = ?
        AND COALESCE(daysGranted, 0) > 0
      ORDER BY grantDate ASC
    `, [userId, type]);
    return rows;
  },
  async listApprovedPaidLeaves(userId, fromDate, toDate, tenantId = null) {
    const tid = _tid(tenantId);
    const params = [userId, fromDate, toDate];
    let tenantFilter = '';
    if (tid != null) { tenantFilter = 'AND lr.tenant_id = ?'; params.push(tid); }
    try {
      const [rows] = await db.query(`
        SELECT lr.id, lr.userId, lr.startDate, lr.endDate, lr.type, lr.status
        FROM leave_requests lr
        LEFT JOIN attendance_daily ad
          ON ad.userId = lr.userId
         AND ad.date = lr.startDate
        LEFT JOIN (
          SELECT userId, DATE(COALESCE(checkIn, checkOut)) AS d,
                 MAX(CASE WHEN checkIn IS NOT NULL OR checkOut IS NOT NULL THEN 1 ELSE 0 END) AS hasWork
          FROM attendance
          GROUP BY userId, DATE(COALESCE(checkIn, checkOut))
        ) aw
          ON aw.userId = lr.userId
         AND aw.d = lr.startDate
        WHERE lr.userId = ? 
          AND lr.type = 'paid' 
          AND lr.status = 'approved'
          AND lr.endDate >= ? AND lr.startDate <= ?
          AND NOT (
            lr.startDate = lr.endDate
            AND (
              COALESCE(aw.hasWork, 0) = 1
              OR (
                ad.userId IS NOT NULL
                AND REPLACE(TRIM(COALESCE(ad.kubun, '')), '　', '') <> '有給休暇'
              )
            )
          )
          ${tenantFilter}
        ORDER BY startDate ASC
      `, params);
      return rows;
    } catch {
      // Hard fallback: preserve page availability when advanced join fails.
      const fbParams = [userId, fromDate, toDate];
      let fbFilter = '';
      if (tid != null) { fbFilter = 'AND tenant_id = ?'; fbParams.push(tid); }
      const [rows] = await db.query(`
        SELECT id, userId, startDate, endDate, type, status
        FROM leave_requests
        WHERE userId = ? 
          AND type = 'paid' 
          AND status = 'approved'
          AND endDate >= ? AND startDate <= ?
          ${fbFilter}
        ORDER BY startDate ASC
      `, fbParams);
      return rows;
    }
  },
  // 有給休暇（全日=1.0）と半休(有給)（半日=0.5）の取得済み日を勤怠実績(attendance_daily)から取得。
  // 半休(有給) は leave_requests に半日情報が無いため、kubun を正とする。
  async listPaidLeaveUsedDays(userId, tenantId = null) {
    const tid = _tid(tenantId);
    const params = [userId];
    let tenantFilter = '';
    if (tid != null) {
      const [check] = await db.query(`SELECT id FROM users WHERE id = ? AND tenant_id = ?`, [userId, tid]);
      if (!check || !check.length) return [];
      tenantFilter = 'AND ad.tenant_id = ?';
      params.push(tid);
    }
    const [rows] = await db.query(`
      SELECT ad.date AS date,
             REPLACE(TRIM(COALESCE(ad.kubun, '')), '　', '') AS kubun
      FROM attendance_daily ad
      WHERE ad.userId = ?
        AND REPLACE(TRIM(COALESCE(ad.kubun, '')), '　', '') IN ('有給休暇', '半休(有給)')
        ${tenantFilter}
      ORDER BY ad.date ASC
    `, params);
    return (rows || []).map(r => {
      const kubun = String(r.kubun || '');
      const days = kubun === '半休(有給)' ? 0.5 : 1.0;
      return { date: String(r.date).slice(0, 10), kubun, days };
    });
  },
  async getAttendanceStats(userId, fromDate, toDate, tenantId = null) {
    const tid = _tid(tenantId);
    if (tid != null) {
      const [check] = await db.query(`SELECT id FROM users WHERE id = ? AND tenant_id = ?`, [userId, tid]);
      if (!check || !check.length) return { workDays: 0, presentDays: 0 };
    }
    // Workdays: rows that are not explicit holidays.
    // Present days: workdays excluding explicit absence types.
    const [rows] = await db.query(`
      SELECT
        COALESCE(SUM(CASE WHEN COALESCE(kubun, '') NOT IN ('', '休日', '代替休日') THEN 1 ELSE 0 END), 0) AS workDays,
        COALESCE(SUM(CASE WHEN COALESCE(kubun, '') NOT IN ('', '休日', '代替休日', '欠勤', '無給休暇') THEN 1 ELSE 0 END), 0) AS presentDays
      FROM attendance_daily
      WHERE userId = ?
        AND date >= ?
        AND date <= ?
    `, [userId, fromDate, toDate]);
    const r = (rows && rows[0]) || {};
    return {
      workDays: Number(r.workDays || 0),
      presentDays: Number(r.presentDays || 0)
    };
  }
};

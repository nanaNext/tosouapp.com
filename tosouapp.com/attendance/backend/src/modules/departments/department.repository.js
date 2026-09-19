const db = require('../../core/database/mysql');

function _tid(tenantId) {
  return tenantId != null ? parseInt(String(tenantId), 10) : null;
}

function _prevMonth(year, month) {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
}

function _nextMonth(year, month) {
  return month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
}

async function ensureDepartmentsTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS departments (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  try { await db.query(`ALTER TABLE departments ADD COLUMN code VARCHAR(32) NULL`); } catch (e) { /* silently ignored */ }
  try { await db.query(`ALTER TABLE departments ADD UNIQUE KEY uniq_departments_code (code)`); } catch (e) { /* silently ignored */ }
  try { await db.query(`ALTER TABLE departments ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1`); } catch (e) { /* silently ignored */ }
}

// 部署名/コードの変更履歴。改名しても過去の月次レポートは当時の名前で表示するために必要
// (改名前提: departments.name/code は常に最新版のミラー)
async function ensureNameHistoryTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS department_name_history (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      department_id BIGINT UNSIGNED NOT NULL,
      name VARCHAR(255) NOT NULL,
      code VARCHAR(32) NULL,
      valid_from DATE NOT NULL,
      valid_to DATE NULL,
      tenant_id BIGINT UNSIGNED NULL,
      created_by BIGINT UNSIGNED NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_dnh_department_from (department_id, valid_from)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

// 異動台帳 (SCD2)。temporary_support は regular の上に一時的に重なる (応援) だけで、
// end_date を過ぎれば自動的に regular へ戻る -> 別テーブルの「復帰処理」は不要。
async function ensureAssignmentsTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS user_department_assignments (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      user_id BIGINT UNSIGNED NOT NULL,
      department_id BIGINT UNSIGNED NOT NULL,
      assignment_type ENUM('regular','temporary_support') NOT NULL DEFAULT 'regular',
      start_date DATE NOT NULL,
      end_date DATE NULL,
      reason VARCHAR(255) NULL,
      tenant_id BIGINT UNSIGNED NULL,
      created_by BIGINT UNSIGNED NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_by BIGINT UNSIGNED NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_uda_user_start (user_id, start_date),
      INDEX idx_uda_department_start (department_id, start_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

// 月次締め (全社単位。ユーザー単位の attendance_month_status とは別物)
async function ensureMonthLocksTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS department_month_locks (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      tenant_id BIGINT UNSIGNED NULL,
      year INT NOT NULL,
      month INT NOT NULL,
      status ENUM('open','closed') NOT NULL DEFAULT 'open',
      closed_at DATETIME NULL,
      closed_by BIGINT UNSIGNED NULL,
      reopened_at DATETIME NULL,
      reopened_by BIGINT UNSIGNED NULL,
      reopen_reason VARCHAR(500) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_dml_tenant_year_month (tenant_id, year, month)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

async function ensureAll() {
  await ensureDepartmentsTable();
  await ensureNameHistoryTable();
  await ensureAssignmentsTable();
  await ensureMonthLocksTable();
}

const repo = {
  // ---- departments ----
  async getAllDepartments(tenantId = null, { includeInactive = false } = {}) {
    await ensureDepartmentsTable();
    const tid = _tid(tenantId);
    const where = [];
    const params = [];
    if (!includeInactive) where.push('is_active = 1');
    if (tid) { where.push('tenant_id = ?'); params.push(tid); }
    const wsql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const [rows] = await db.query(`SELECT id, name, code, is_active FROM departments ${wsql} ORDER BY name ASC`, params);
    return rows;
  },

  async getDepartmentById(id, tenantId = null) {
    await ensureDepartmentsTable();
    const tid = _tid(tenantId);
    if (tid) {
      const sql = `SELECT id, name, code, is_active FROM departments WHERE id = ? AND tenant_id = ? LIMIT 1`;
      const [rows] = await db.query(sql, [id, tid]);
      return rows[0];
    }
    const sql = `SELECT id, name, code, is_active FROM departments WHERE id = ? LIMIT 1`;
    const [rows] = await db.query(sql, [id]);
    return rows[0];
  },

  async createDepartment(name, code = null, tenantId = null, actorId = null) {
    await ensureDepartmentsTable();
    await ensureNameHistoryTable();
    const tid = _tid(tenantId);
    const sql = `INSERT INTO departments (name, code, tenant_id) VALUES (?, ?, ?)`;
    const [result] = await db.query(sql, [name, code, tid]);
    const id = result.insertId;
    await db.query(
      `INSERT INTO department_name_history (department_id, name, code, valid_from, tenant_id, created_by) VALUES (?, ?, ?, CURDATE(), ?, ?)`,
      [id, name, code || null, tid, actorId]
    );
    return id;
  },

  // 改名/コード変更があれば旧バージョンを閉じて新バージョンを追加する (department_name_history)。
  // departments.name/code はこれまで通り最新版を指すので、既存の読み取りコードは変更不要。
  async updateDepartment(id, name, code = null, tenantId = null, actorId = null) {
    await ensureDepartmentsTable();
    await ensureNameHistoryTable();
    const tid = _tid(tenantId);
    const current = await repo.getDepartmentById(id, tenantId);
    if (!current) return;
    const nameChanged = !!name && name !== current.name;
    const codeChanged = !!code && code !== current.code;
    if (nameChanged || codeChanged) {
      await db.query(
        `UPDATE department_name_history SET valid_to = DATE_SUB(CURDATE(), INTERVAL 1 DAY) WHERE department_id = ? AND valid_to IS NULL`,
        [id]
      );
      await db.query(
        `INSERT INTO department_name_history (department_id, name, code, valid_from, tenant_id, created_by) VALUES (?, ?, ?, CURDATE(), ?, ?)`,
        [id, name || current.name, code || current.code, tid, actorId]
      );
    }
    if (tid) {
      await db.query(`UPDATE departments SET name = COALESCE(?, name), code = COALESCE(?, code) WHERE id = ? AND tenant_id = ?`, [name || null, code || null, id, tid]);
      return;
    }
    await db.query(`UPDATE departments SET name = COALESCE(?, name), code = COALESCE(?, code) WHERE id = ?`, [name || null, code || null, id]);
  },

  // 削除ではなく無効化。異動履歴・監査ログが指す部署IDを消さないため
  async deactivateDepartment(id, tenantId = null) {
    await ensureDepartmentsTable();
    const tid = _tid(tenantId);
    const sql = tid ? `UPDATE departments SET is_active = 0 WHERE id = ? AND tenant_id = ?` : `UPDATE departments SET is_active = 0 WHERE id = ?`;
    await db.query(sql, tid ? [id, tid] : [id]);
  },

  async createMany(names, tenantId = null) {
    await ensureDepartmentsTable();
    const tid = _tid(tenantId);
    const createdIds = [];
    for (const n of (names || [])) {
      if (!n || !String(n).trim()) continue;
      const tidClause = tid ? 'AND tenant_id = ?' : '';
      const tidParam = tid ? [tid] : [];
      const [rows] = await db.query(
        `SELECT id FROM departments WHERE name = ? ${tidClause} LIMIT 1`,
        [n, ...tidParam]
      );
      if (Array.isArray(rows) && rows.length) {
        createdIds.push(rows[0].id);
        continue;
      }
      const id = await repo.createDepartment(n, null, tenantId);
      createdIds.push(id);
    }
    return createdIds;
  },

  // ---- department name history ----
  async getDepartmentNameAsOf(departmentId, dateStr, tenantId = null) {
    await ensureNameHistoryTable();
    const [rows] = await db.query(
      `SELECT name, code FROM department_name_history
       WHERE department_id = ? AND valid_from <= ? AND (valid_to IS NULL OR valid_to >= ?)
       ORDER BY valid_from DESC LIMIT 1`,
      [departmentId, dateStr, dateStr]
    );
    if (rows[0]) return rows[0];
    const current = await repo.getDepartmentById(departmentId, tenantId);
    return current ? { name: current.name, code: current.code } : { name: null, code: null };
  },

  // ---- assignments (異動) ----
  async listAssignmentsForUser(userId, tenantId = null) {
    await ensureAssignmentsTable();
    const tid = _tid(tenantId);
    const sql = tid
      ? `SELECT * FROM user_department_assignments WHERE user_id = ? AND tenant_id = ? ORDER BY start_date DESC, id DESC`
      : `SELECT * FROM user_department_assignments WHERE user_id = ? ORDER BY start_date DESC, id DESC`;
    const params = tid ? [userId, tid] : [userId];
    const [rows] = await db.query(sql, params);
    return rows;
  },

  async listAssignmentsAll({ tenantId = null, from = null, to = null } = {}) {
    await ensureAssignmentsTable();
    const tid = _tid(tenantId);
    const where = [];
    const params = [];
    if (tid != null) { where.push('a.tenant_id = ?'); params.push(tid); }
    if (from) { where.push('a.start_date >= ?'); params.push(from); }
    if (to) { where.push('a.start_date <= ?'); params.push(to); }
    const wsql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const [rows] = await db.query(`
      SELECT a.*, u.username, u.email, u.employee_code, d.name AS department_name
      FROM user_department_assignments a
      JOIN users u ON u.id = a.user_id
      JOIN departments d ON d.id = a.department_id
      ${wsql}
      ORDER BY a.start_date DESC, a.id DESC
    `, params);
    return rows;
  },

  async getAssignmentById(id, tenantId = null) {
    await ensureAssignmentsTable();
    const tid = _tid(tenantId);
    const sql = tid ? `SELECT * FROM user_department_assignments WHERE id = ? AND tenant_id = ? LIMIT 1` : `SELECT * FROM user_department_assignments WHERE id = ? LIMIT 1`;
    const [rows] = await db.query(sql, tid ? [id, tid] : [id]);
    return rows[0] || null;
  },

  // 同じ user × assignment_type の期間重複を検出 (temporary_support は regular に重ねてOKなので type ごとにしか見ない)
  async findOverlappingAssignment({ userId, assignmentType, startDate, endDate, excludeId = null, tenantId = null }) {
    await ensureAssignmentsTable();
    const tid = _tid(tenantId);
    const params = [userId, assignmentType, endDate || '9999-12-31', startDate];
    let sql = `
      SELECT * FROM user_department_assignments
      WHERE user_id = ? AND assignment_type = ?
        AND start_date <= ? AND (end_date IS NULL OR end_date >= ?)
    `;
    if (excludeId) { sql += ' AND id != ?'; params.push(excludeId); }
    if (tid != null) { sql += ' AND tenant_id = ?'; params.push(tid); }
    const [rows] = await db.query(sql, params);
    return rows;
  },

  async createAssignment({ userId, departmentId, assignmentType = 'regular', startDate, endDate = null, reason = null, actorId = null, tenantId = null }) {
    await ensureAssignmentsTable();
    const tid = _tid(tenantId);
    const overlaps = await repo.findOverlappingAssignment({ userId, assignmentType, startDate, endDate, tenantId });
    if (overlaps.length) {
      const err = new Error('指定期間に既存の異動と重複があります');
      err.status = 409;
      throw err;
    }
    const [result] = await db.query(
      `INSERT INTO user_department_assignments (user_id, department_id, assignment_type, start_date, end_date, reason, tenant_id, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, departmentId, assignmentType, startDate, endDate, reason, tid, actorId]
    );
    return result.insertId;
  },

  async updateAssignment(id, { departmentId, startDate, endDate, reason, actorId = null, tenantId = null }) {
    await ensureAssignmentsTable();
    const tid = _tid(tenantId);
    // end_date は明示的に null を許す (COALESCE だと「期限を撤廃して継続扱いに戻す」ができなくなる)
    const sql = tid
      ? `UPDATE user_department_assignments SET department_id = COALESCE(?, department_id), start_date = COALESCE(?, start_date), end_date = ?, reason = COALESCE(?, reason), updated_by = ? WHERE id = ? AND tenant_id = ?`
      : `UPDATE user_department_assignments SET department_id = COALESCE(?, department_id), start_date = COALESCE(?, start_date), end_date = ?, reason = COALESCE(?, reason), updated_by = ? WHERE id = ?`;
    const params = tid
      ? [departmentId || null, startDate || null, endDate ?? null, reason || null, actorId, id, tid]
      : [departmentId || null, startDate || null, endDate ?? null, reason || null, actorId, id];
    await db.query(sql, params);
  },

  async deleteAssignment(id, tenantId = null) {
    await ensureAssignmentsTable();
    const tid = _tid(tenantId);
    const sql = tid ? `DELETE FROM user_department_assignments WHERE id = ? AND tenant_id = ?` : `DELETE FROM user_department_assignments WHERE id = ?`;
    await db.query(sql, tid ? [id, tid] : [id]);
  },

  // ---- month locks (月次締め) ----
  async getMonthLocks(tenantId = null) {
    await ensureMonthLocksTable();
    const tid = _tid(tenantId);
    const sql = tid
      ? `SELECT * FROM department_month_locks WHERE tenant_id = ? ORDER BY year DESC, month DESC`
      : `SELECT * FROM department_month_locks WHERE tenant_id IS NULL ORDER BY year DESC, month DESC`;
    const [rows] = await db.query(sql, tid ? [tid] : []);
    return rows;
  },

  async getMonthLock(year, month, tenantId = null) {
    await ensureMonthLocksTable();
    const tid = _tid(tenantId);
    const sql = tid
      ? `SELECT * FROM department_month_locks WHERE tenant_id = ? AND year = ? AND month = ? LIMIT 1`
      : `SELECT * FROM department_month_locks WHERE tenant_id IS NULL AND year = ? AND month = ? LIMIT 1`;
    const params = tid ? [tid, year, month] : [year, month];
    const [rows] = await db.query(sql, params);
    return rows[0] || null;
  },

  async getLatestClosedMonth(tenantId = null) {
    const rows = await repo.getMonthLocks(tenantId);
    const closed = rows.filter(r => r.status === 'closed');
    if (!closed.length) return null;
    return closed.reduce((a, b) => (a.year * 12 + a.month) > (b.year * 12 + b.month) ? a : b);
  },

  async isMonthClosed(year, month, tenantId = null) {
    const lock = await repo.getMonthLock(year, month, tenantId);
    return lock?.status === 'closed';
  },

  async isDateInClosedMonth(dateStr, tenantId = null) {
    const d = String(dateStr || '').slice(0, 10);
    const m = /^(\d{4})-(\d{2})-\d{2}$/.exec(d);
    if (!m) return false;
    return repo.isMonthClosed(parseInt(m[1], 10), parseInt(m[2], 10), tenantId);
  },

  // 締められるのは「直近に締めた月の翌月」のみ、かつ月末を過ぎていること (古い月から順に締める)
  async closeMonth(year, month, actorId, tenantId = null) {
    await ensureMonthLocksTable();
    const latest = await repo.getLatestClosedMonth(tenantId);
    if (latest) {
      const next = _nextMonth(latest.year, latest.month);
      if (next.year !== year || next.month !== month) {
        const err = new Error('締める月は直近に締めた月の翌月である必要があります');
        err.status = 409;
        throw err;
      }
    }
    const now = new Date();
    const isPast = year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1);
    if (!isPast) {
      const err = new Error('月末を過ぎるまで締められません');
      err.status = 400;
      throw err;
    }
    const tid = _tid(tenantId);
    const existing = await repo.getMonthLock(year, month, tenantId);
    if (existing) {
      await db.query(`UPDATE department_month_locks SET status='closed', closed_at=NOW(), closed_by=? WHERE id=?`, [actorId, existing.id]);
    } else {
      await db.query(
        `INSERT INTO department_month_locks (tenant_id, year, month, status, closed_at, closed_by) VALUES (?, ?, ?, 'closed', NOW(), ?)`,
        [tid, year, month, actorId]
      );
    }
  },

  // 指定月以降で締まっている月をまとめて再オープン (「締め済み = 先頭から連続」を維持するため)
  // 戻り値: 実際に再オープンされた月の一覧 (監査ログに1件ずつ残すため)
  async reopenMonth(year, month, actorId, reason, tenantId = null) {
    await ensureMonthLocksTable();
    if (!reason || !String(reason).trim()) {
      const err = new Error('再オープンには理由が必須です');
      err.status = 400;
      throw err;
    }
    const rows = await repo.getMonthLocks(tenantId);
    const target = rows.find(r => r.year === year && r.month === month);
    if (!target || target.status !== 'closed') {
      const err = new Error('指定された月は締められていません');
      err.status = 400;
      throw err;
    }
    const toReopen = rows.filter(r => r.status === 'closed' && (r.year * 12 + r.month) >= (year * 12 + month));
    for (const r of toReopen) {
      await db.query(
        `UPDATE department_month_locks SET status='open', reopened_at=NOW(), reopened_by=?, reopen_reason=? WHERE id=?`,
        [actorId, reason, r.id]
      );
    }
    return toReopen.map(r => ({ year: r.year, month: r.month })).sort((a, b) => (a.year * 12 + a.month) - (b.year * 12 + b.month));
  }
};

module.exports = repo;

'use strict';
/**
 * @module tenantDb
 *
 * A lightweight wrapper around the MySQL connection pool that automatically
 * injects `tenant_id` into every query so individual repositories don't need
 * to remember to add it.
 *
 * Usage:
 *   const { withTenant } = require('../../core/database/tenantDb');
 *   const tdb = withTenant(req.tenantId);           // from middleware
 *   const users = await tdb.select('users', { role: 'employee' });
 *   const id    = await tdb.insert('departments', { name: '工事部' });
 *   await       tdb.update('departments', { name: '新名前' }, { id: 3 });
 *   await       tdb.del('departments', { id: 3 });
 *
 * For complex raw queries, use tdb.raw() which still passes the pool through,
 * and always add AND tenant_id = ? manually for those.
 */

const db = require('./mysql');

class TenantDB {
  /**
   * @param {number|null} tenantId
   */
  constructor(tenantId) {
    this.tenantId = tenantId ? parseInt(String(tenantId), 10) : null;
  }

  // ── Internal helpers ──────────────────────────────────────────────────────

  _tid() {
    if (!this.tenantId) throw new Error('TenantDB: tenantId is required but not set');
    return this.tenantId;
  }

  _whereClause(conditions = {}) {
    const withTenant = { ...conditions, tenant_id: this._tid() };
    const keys = Object.keys(withTenant);
    const sql = keys.map(k => `\`${k}\` = ?`).join(' AND ');
    const vals = keys.map(k => withTenant[k]);
    return { sql, vals };
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * SELECT rows with automatic tenant_id filter.
   * @param {string} table
   * @param {Object} [conditions]  e.g. { role: 'employee' }
   * @param {string} [cols]        e.g. 'id, username, email'  (default: *)
   * @param {string} [extra]       e.g. 'ORDER BY username ASC LIMIT 100'
   * @returns {Promise<Array>}
   */
  async select(table, conditions = {}, cols = '*', extra = '') {
    const { sql: where, vals } = this._whereClause(conditions);
    const [rows] = await db.query(
      `SELECT ${cols} FROM \`${table}\` WHERE ${where} ${extra}`,
      vals
    );
    return rows;
  }

  /**
   * SELECT single row.
   * @returns {Promise<Object|null>}
   */
  async selectOne(table, conditions = {}, cols = '*') {
    const rows = await this.select(table, conditions, cols, 'LIMIT 1');
    return rows[0] || null;
  }

  /**
   * COUNT rows.
   * @param {string} table
   * @param {Object} [conditions]
   * @returns {Promise<number>}
   */
  async count(table, conditions = {}) {
    const { sql: where, vals } = this._whereClause(conditions);
    const [[{ c }]] = await db.query(
      `SELECT COUNT(*) AS c FROM \`${table}\` WHERE ${where}`,
      vals
    );
    return Number(c);
  }

  /**
   * INSERT a row with tenant_id automatically set.
   * @param {string} table
   * @param {Object} data
   * @returns {Promise<number>} insertId
   */
  async insert(table, data) {
    const row = { ...data, tenant_id: this._tid() };
    const [result] = await db.query(`INSERT INTO \`${table}\` SET ?`, [row]);
    return result.insertId;
  }

  /**
   * INSERT multiple rows (bulk).
   * @param {string} table
   * @param {Array<Object>} rows
   * @returns {Promise<number>} affectedRows
   */
  async insertMany(table, rows) {
    if (!rows || rows.length === 0) return 0;
    const withTid = rows.map(r => ({ ...r, tenant_id: this._tid() }));
    const cols = Object.keys(withTid[0]);
    const placeholders = withTid.map(() => `(${cols.map(() => '?').join(',')})`).join(',');
    const vals = withTid.flatMap(r => cols.map(c => r[c]));
    const [result] = await db.query(
      `INSERT INTO \`${table}\` (\`${cols.join('`,`')}\`) VALUES ${placeholders}`,
      vals
    );
    return result.affectedRows;
  }

  /**
   * UPDATE rows matching conditions (always scoped to tenant_id).
   * @param {string} table
   * @param {Object} data    — fields to update
   * @param {Object} [where] — additional WHERE conditions
   * @returns {Promise<number>} affectedRows
   */
  async update(table, data, where = {}) {
    const setCols = Object.keys(data);
    if (setCols.length === 0) return 0;
    const setClause = setCols.map(k => `\`${k}\` = ?`).join(', ');
    const setVals = setCols.map(k => data[k]);
    const { sql: whereClause, vals: whereVals } = this._whereClause(where);
    const [result] = await db.query(
      `UPDATE \`${table}\` SET ${setClause} WHERE ${whereClause}`,
      [...setVals, ...whereVals]
    );
    return result.affectedRows;
  }

  /**
   * DELETE rows (always scoped to tenant_id).
   * @param {string} table
   * @param {Object} where
   * @returns {Promise<number>} affectedRows
   */
  async del(table, where = {}) {
    const { sql: whereClause, vals } = this._whereClause(where);
    const [result] = await db.query(
      `DELETE FROM \`${table}\` WHERE ${whereClause}`,
      vals
    );
    return result.affectedRows;
  }

  /**
   * Raw query passthrough — use when you need complex JOINs.
   * You must add AND tenant_id = ? yourself for tenant-scoped tables.
   * @returns {Promise<Array>}
   */
  async raw(sql, params = []) {
    const [rows] = await db.query(sql, params);
    return rows;
  }

  /**
   * Get the underlying pool for transactions.
   */
  get pool() { return db; }
}

/**
 * Factory: create a TenantDB instance for a given tenant.
 * @param {number|null} tenantId — typically from req.tenantId
 * @returns {TenantDB}
 */
function withTenant(tenantId) {
  return new TenantDB(tenantId);
}

/**
 * Tenant-aware query helper for use directly in route handlers.
 * Adds AND tenant_id = ? to a WHERE clause string.
 *
 * Example:
 *   const { tWhere, tVals } = tenantScope(req.tenantId, 'u.employment_status = ?', ['active']);
 *   db.query(`SELECT * FROM users u WHERE ${tWhere}`, tVals);
 */
function tenantScope(tenantId, extraWhere = '1=1', extraVals = []) {
  const tid = tenantId ? parseInt(String(tenantId), 10) : null;
  if (!tid) return { tWhere: extraWhere, tVals: extraVals };
  return {
    tWhere: `(${extraWhere}) AND tenant_id = ?`,
    tVals: [...extraVals, tid],
  };
}

module.exports = { TenantDB, withTenant, tenantScope };

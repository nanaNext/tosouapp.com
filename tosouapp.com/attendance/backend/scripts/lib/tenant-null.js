'use strict';
/**
 * Dùng chung cho check-tenant-null.js / migrate-tenant-null.js.
 */

const { TENANT_TABLES, USER_COLS } = require('../../src/core/database/tenantTriggers');

async function columnsOf(db, table) {
  const [rows] = await db.query(
    `SELECT column_name AS c FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = ?`,
    [table]
  );
  return new Set(rows.map(r => r.c || r.COLUMN_NAME));
}

/**
 * @returns {Promise<{skip?:string, userCol?:string|null, nullCount:number, totalCount:number,
 *   byTenant:Object<string,number>, unresolvable:number}>}
 */
async function inspectTable(db, table) {
  const cols = await columnsOf(db, table);
  if (cols.size === 0) return { skip: 'bảng chưa tồn tại' };
  if (!cols.has('tenant_id')) return { skip: 'không có cột tenant_id' };
  const userCol = USER_COLS.find(c => cols.has(c)) || null;

  const [[{ nullCount, totalCount }]] = await db.query(
    `SELECT SUM(tenant_id IS NULL) AS nullCount, COUNT(*) AS totalCount FROM \`${table}\``
  );
  const info = {
    userCol,
    nullCount: Number(nullCount || 0),
    totalCount: Number(totalCount || 0),
    byTenant: {},
    unresolvable: 0,
  };
  if (info.nullCount === 0) return info;
  if (!userCol) {
    info.unresolvable = info.nullCount;
    return info;
  }
  const [groups] = await db.query(
    `SELECT u.tenant_id AS tid, COUNT(*) AS c
     FROM \`${table}\` t LEFT JOIN users u ON u.id = t.\`${userCol}\`
     WHERE t.tenant_id IS NULL
     GROUP BY u.tenant_id`
  );
  for (const g of groups) {
    if (g.tid == null) info.unresolvable += Number(g.c);
    else info.byTenant[g.tid] = Number(g.c);
  }
  return info;
}

module.exports = { TENANT_TABLES, inspectTable };

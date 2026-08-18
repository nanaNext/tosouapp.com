/**
 * Branch (支店) Repository
 * Manages company branches/offices.
 */

const db = require('../../core/database/mysql');

function _tid(tenantId) {
  return tenantId != null ? parseInt(String(tenantId), 10) : null;
}

async function ensureTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS branches (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      code VARCHAR(32) NULL UNIQUE,
      address VARCHAR(500) NULL,
      phone VARCHAR(32) NULL,
      manager_user_id BIGINT UNSIGNED NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_code (code)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  try {
    await db.query(`ALTER TABLE branches ADD COLUMN tenant_id BIGINT UNSIGNED NULL`);
  } catch (e) { /* column may exist */ }
  try {
    await db.query(`ALTER TABLE branches ADD INDEX idx_branches_tid (tenant_id)`);
  } catch (e) { /* index may exist */ }

  try {
    await db.query(`ALTER TABLE departments ADD COLUMN branch_id BIGINT UNSIGNED NULL`);
  } catch (e) { /* column already exists */ }

  try {
    await db.query(`ALTER TABLE users ADD COLUMN branch_id BIGINT UNSIGNED NULL`);
  } catch (e) { /* column already exists */ }

  try {
    await db.query(`CREATE INDEX idx_users_branch ON users (branch_id)`);
  } catch (e) { /* index already exists */ }

  try {
    await db.query(`CREATE INDEX idx_departments_branch ON departments (branch_id)`);
  } catch (e) { /* index already exists */ }
}

async function listBranches(tenantId = null) {
  const tid = _tid(tenantId);
  const where = [];
  const params = [];
  if (tid != null) { where.push('b.tenant_id = ?'); params.push(tid); }
  const wsql = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const [rows] = await db.query(`
    SELECT b.*, 
           (SELECT COUNT(*) FROM users u WHERE u.branch_id = b.id AND u.employment_status = 'active') as employeeCount,
           (SELECT username FROM users u2 WHERE u2.id = b.manager_user_id LIMIT 1) as managerName
    FROM branches b 
    ${wsql}
    ORDER BY b.name
  `, params);
  return rows || [];
}

async function getBranchById(id, tenantId = null) {
  const tid = _tid(tenantId);
  const where = ['id = ?'];
  const params = [id];
  if (tid != null) { where.push('tenant_id = ?'); params.push(tid); }
  const [[row]] = await db.query(`SELECT * FROM branches WHERE ${where.join(' AND ')}`, params);
  return row || null;
}

async function createBranch({ name, code, address, phone, managerUserId, tenantId }) {
  const tid = _tid(tenantId);
  const [result] = await db.query(
    `INSERT INTO branches (name, code, address, phone, manager_user_id, tenant_id) VALUES (?, ?, ?, ?, ?, ?)`,
    [name, code || null, address || null, phone || null, managerUserId || null, tid]
  );
  return result.insertId;
}

async function updateBranch(id, { name, code, address, phone, managerUserId, tenantId }) {
  const tid = _tid(tenantId);
  const fields = [];
  const params = [];
  if (name !== undefined) { fields.push('name = ?'); params.push(name); }
  if (code !== undefined) { fields.push('code = ?'); params.push(code || null); }
  if (address !== undefined) { fields.push('address = ?'); params.push(address || null); }
  if (phone !== undefined) { fields.push('phone = ?'); params.push(phone || null); }
  if (managerUserId !== undefined) { fields.push('manager_user_id = ?'); params.push(managerUserId || null); }
  if (fields.length === 0) return;
  params.push(id);
  const where = ['id = ?'];
  if (tid != null) { where.push('tenant_id = ?'); params.push(tid); }
  await db.query(`UPDATE branches SET ${fields.join(', ')} WHERE ${where.join(' AND ')}`, params);
}

async function deleteBranch(id, tenantId = null) {
  const tid = _tid(tenantId);
  const where = ['branch_id = ?'];
  const params = [id];
  if (tid != null) {
    where.push('tenant_id = ?');
    params.push(tid);
  }
  await db.query(`UPDATE users SET branch_id = NULL WHERE ${where.join(' AND ')}`, params);
  const deptWhere = ['branch_id = ?'];
  const deptParams = [id];
  if (tid != null) {
    deptWhere.push('tenant_id = ?');
    deptParams.push(tid);
  }
  await db.query(`UPDATE departments SET branch_id = NULL WHERE ${deptWhere.join(' AND ')}`, deptParams);
  const delWhere = ['id = ?'];
  const delParams = [id];
  if (tid != null) { delWhere.push('tenant_id = ?'); delParams.push(tid); }
  await db.query(`DELETE FROM branches WHERE ${delWhere.join(' AND ')}`, delParams);
}

async function assignUserToBranch(userId, branchId, tenantId = null) {
  const tid = _tid(tenantId);
  const where = ['id = ?'];
  const params = [branchId];
  if (tid != null) { where.push('tenant_id = ?'); params.push(tid); }
  const [branches] = await db.query(`SELECT id FROM branches WHERE ${where.join(' AND ')} LIMIT 1`, params);
  if (!branches || !branches.length) return;
  const userWhere = ['id = ?'];
  const userParams = [userId];
  if (tid != null) { userWhere.push('tenant_id = ?'); userParams.push(tid); }
  await db.query(`UPDATE users SET branch_id = ? WHERE ${userWhere.join(' AND ')}`, [branchId, ...userParams]);
}

async function assignDepartmentToBranch(departmentId, branchId, tenantId = null) {
  const tid = _tid(tenantId);
  const bWhere = ['id = ?'];
  const bParams = [branchId];
  if (tid != null) { bWhere.push('tenant_id = ?'); bParams.push(tid); }
  const [branches] = await db.query(`SELECT id FROM branches WHERE ${bWhere.join(' AND ')} LIMIT 1`, bParams);
  if (!branches || !branches.length) return;
  const dWhere = ['id = ?'];
  const dParams = [departmentId];
  if (tid != null) { dWhere.push('tenant_id = ?'); dParams.push(tid); }
  await db.query(`UPDATE departments SET branch_id = ? WHERE ${dWhere.join(' AND ')}`, [branchId, ...dParams]);
}

async function listBranchUsers(branchId, tenantId = null) {
  const tid = _tid(tenantId);
  const where = ['branch_id = ?', "employment_status = 'active'"];
  const params = [branchId];
  if (tid != null) { where.push('tenant_id = ?'); params.push(tid); }
  const [rows] = await db.query(
    `SELECT id, employee_code, username, email, role, departmentId, employment_status 
     FROM users WHERE ${where.join(' AND ')} ORDER BY username`,
    params
  );
  return rows || [];
}

module.exports = {
  ensureTable,
  listBranches,
  getBranchById,
  createBranch,
  updateBranch,
  deleteBranch,
  assignUserToBranch,
  assignDepartmentToBranch,
  listBranchUsers
};

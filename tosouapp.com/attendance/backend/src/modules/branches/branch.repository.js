/**
 * Branch (支店) Repository
 * Manages company branches/offices.
 * 
 * Schema:
 *   branches: id, name, code, address, phone, created_at
 *   departments: + branch_id (FK to branches)
 *   users: + branch_id (FK to branches)
 */

const db = require('../../core/database/mysql');

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

  // Add branch_id to departments if not exists
  try {
    await db.query(`ALTER TABLE departments ADD COLUMN branch_id BIGINT UNSIGNED NULL`);
  } catch (e) { /* column already exists */ }

  // Add branch_id to users if not exists
  try {
    await db.query(`ALTER TABLE users ADD COLUMN branch_id BIGINT UNSIGNED NULL`);
  } catch (e) { /* column already exists */ }

  // Add index
  try {
    await db.query(`CREATE INDEX idx_users_branch ON users (branch_id)`);
  } catch (e) { /* index already exists */ }

  try {
    await db.query(`CREATE INDEX idx_departments_branch ON departments (branch_id)`);
  } catch (e) { /* index already exists */ }
}

async function listBranches() {
  const [rows] = await db.query(`
    SELECT b.*, 
           (SELECT COUNT(*) FROM users u WHERE u.branch_id = b.id AND u.employment_status = 'active') as employeeCount,
           (SELECT username FROM users u2 WHERE u2.id = b.manager_user_id LIMIT 1) as managerName
    FROM branches b 
    ORDER BY b.name
  `);
  return rows || [];
}

async function getBranchById(id) {
  const [[row]] = await db.query(`SELECT * FROM branches WHERE id = ?`, [id]);
  return row || null;
}

async function createBranch({ name, code, address, phone, managerUserId }) {
  const [result] = await db.query(
    `INSERT INTO branches (name, code, address, phone, manager_user_id) VALUES (?, ?, ?, ?, ?)`,
    [name, code || null, address || null, phone || null, managerUserId || null]
  );
  return result.insertId;
}

async function updateBranch(id, { name, code, address, phone, managerUserId }) {
  const fields = [];
  const params = [];
  if (name !== undefined) { fields.push('name = ?'); params.push(name); }
  if (code !== undefined) { fields.push('code = ?'); params.push(code || null); }
  if (address !== undefined) { fields.push('address = ?'); params.push(address || null); }
  if (phone !== undefined) { fields.push('phone = ?'); params.push(phone || null); }
  if (managerUserId !== undefined) { fields.push('manager_user_id = ?'); params.push(managerUserId || null); }
  if (fields.length === 0) return;
  params.push(id);
  await db.query(`UPDATE branches SET ${fields.join(', ')} WHERE id = ?`, params);
}

async function deleteBranch(id) {
  // Unset branch_id from users and departments first
  await db.query(`UPDATE users SET branch_id = NULL WHERE branch_id = ?`, [id]);
  await db.query(`UPDATE departments SET branch_id = NULL WHERE branch_id = ?`, [id]);
  await db.query(`DELETE FROM branches WHERE id = ?`, [id]);
}

async function assignUserToBranch(userId, branchId) {
  await db.query(`UPDATE users SET branch_id = ? WHERE id = ?`, [branchId, userId]);
}

async function assignDepartmentToBranch(departmentId, branchId) {
  await db.query(`UPDATE departments SET branch_id = ? WHERE id = ?`, [branchId, departmentId]);
}

async function listBranchUsers(branchId) {
  const [rows] = await db.query(
    `SELECT id, employee_code, username, email, role, departmentId, employment_status 
     FROM users WHERE branch_id = ? AND employment_status = 'active' ORDER BY username`,
    [branchId]
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

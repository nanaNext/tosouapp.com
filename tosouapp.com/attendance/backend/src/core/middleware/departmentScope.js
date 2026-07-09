/**
 * Department Scope Middleware
 * 
 * Restricts data access based on user's role and department:
 * - Admin: sees ALL departments (no filter)
 * - Manager: sees ONLY employees in their own department
 * - Employee: sees ONLY their own data
 * 
 * Attaches `req.scope` object for use in queries:
 *   req.scope.departmentId — null (admin) or specific dept ID (manager)
 *   req.scope.userId — null (admin/manager) or specific user ID (employee)
 *   req.scope.isAdmin — true if admin
 *   req.scope.isManager — true if manager
 * 
 * Usage:
 *   router.get('/employees', departmentScope(), handler);
 *   // In handler: if (req.scope.departmentId) { WHERE departmentId = req.scope.departmentId }
 */

function departmentScope() {
  return (req, res, next) => {
    const role = String(req.user?.role || '').toLowerCase();
    const userId = req.user?.id;
    const departmentId = req.user?.departmentId || null;

    req.scope = {
      isAdmin: role === 'admin',
      isManager: role === 'manager',
      isEmployee: role === 'employee',
      departmentId: null,
      branchId: null,
      userId: null,
      role
    };

    if (role === 'admin') {
      // Admin sees everything
      req.scope.departmentId = null;
      req.scope.branchId = null;
      req.scope.userId = null;
    } else if (role === 'manager') {
      // Manager sees only their branch (or department if no branch)
      req.scope.branchId = req.user?.branchId || null;
      req.scope.departmentId = departmentId;
      req.scope.userId = null;
    } else {
      // Employee sees only themselves
      req.scope.branchId = req.user?.branchId || null;
      req.scope.departmentId = departmentId;
      req.scope.userId = userId;
    }

    next();
  };
}

/**
 * Build WHERE clause from scope
 * @param {Object} scope - req.scope
 * @param {string} userIdColumn - column name for userId (default: 'u.id')
 * @param {string} deptColumn - column name for departmentId (default: 'u.departmentId')
 * @returns {{ where: string, params: Array }}
 */
function buildScopeFilter(scope, userIdColumn = 'u.id', deptColumn = 'u.departmentId') {
  const conditions = [];
  const params = [];

  if (scope.userId) {
    conditions.push(`${userIdColumn} = ?`);
    params.push(scope.userId);
  } else if (scope.departmentId) {
    conditions.push(`${deptColumn} = ?`);
    params.push(scope.departmentId);
  }
  // Admin: no conditions added → sees all

  return {
    where: conditions.length > 0 ? conditions.join(' AND ') : '',
    params
  };
}

module.exports = { departmentScope, buildScopeFilter };

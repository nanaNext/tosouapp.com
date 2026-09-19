const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../core/middleware/authMiddleware');
const { permit } = require('../../core/middleware/rbac');
const { resolveTenant } = require('../../core/middleware/tenantMiddleware');
const { rateLimit } = require('../../core/middleware/rateLimit');
const controller = require('./department.controller');
router.get('/', authenticate, resolveTenant, permit('departments', 'view'), controller.list);
router.post('/',
  rateLimit({ windowMs: 60_000, max: 10 }),
  authenticate, resolveTenant, permit('departments', 'full'), controller.create);
router.post('/bulk',
  rateLimit({ windowMs: 60_000, max: 5 }),
  authenticate, resolveTenant, permit('departments', 'full'), controller.createBulk);
router.patch('/:id',
  rateLimit({ windowMs: 60_000, max: 30 }),
  authenticate, resolveTenant, permit('departments', 'full'), controller.update);
router.delete('/:id',
  rateLimit({ windowMs: 60_000, max: 10 }),
  authenticate, resolveTenant, permit('departments', 'full'), controller.remove);

router.get('/:id/users', authenticate, resolveTenant, permit('departments', 'view'), controller.listDepartmentUsers);

// 異動 (transfer history)
router.get('/assignments', authenticate, resolveTenant, permit('departments', 'view'), controller.listAssignments);
router.post('/assignments',
  rateLimit({ windowMs: 60_000, max: 30 }),
  authenticate, resolveTenant, permit('departments', 'full'), controller.createAssignment);
router.patch('/assignments/:id',
  rateLimit({ windowMs: 60_000, max: 30 }),
  authenticate, resolveTenant, permit('departments', 'full'), controller.updateAssignment);
router.delete('/assignments/:id',
  rateLimit({ windowMs: 60_000, max: 30 }),
  authenticate, resolveTenant, permit('departments', 'full'), controller.deleteAssignment);

// 月次締め
router.get('/month-locks', authenticate, resolveTenant, permit('departments', 'view'), controller.getMonthLocks);
router.post('/month-locks/close',
  rateLimit({ windowMs: 60_000, max: 10 }),
  authenticate, resolveTenant, permit('departments', 'full'), controller.closeMonth);
router.post('/month-locks/reopen',
  rateLimit({ windowMs: 60_000, max: 10 }),
  authenticate, resolveTenant, permit('departments', 'full'), controller.reopenMonth);

// 部署別集計 (当時 vs 現在)
router.get('/report', authenticate, resolveTenant, permit('departments', 'view'), controller.getReport);

module.exports = router;

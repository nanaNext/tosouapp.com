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
module.exports = router;

const express = require('express');
const router = express.Router();
const { authenticate } = require('../../core/middleware/authMiddleware');
const { permit } = require('../../core/middleware/rbac');
const { resolveTenant } = require('../../core/middleware/tenantMiddleware');
const { rateLimit } = require('../../core/middleware/rateLimit');
const controller = require('./corporation.controller');

router.get('/', authenticate, resolveTenant, permit('corporations', 'view'), controller.list);
router.post('/',
  rateLimit({ windowMs: 60_000, max: 10 }),
  authenticate, resolveTenant, permit('corporations', 'full'), controller.create);
router.patch('/:id',
  rateLimit({ windowMs: 60_000, max: 30 }),
  authenticate, resolveTenant, permit('corporations', 'full'), controller.update);
router.delete('/:id',
  rateLimit({ windowMs: 60_000, max: 10 }),
  authenticate, resolveTenant, permit('corporations', 'full'), controller.remove);

module.exports = router;

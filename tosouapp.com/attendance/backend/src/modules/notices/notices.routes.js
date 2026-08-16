const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../core/middleware/authMiddleware');
const { resolveTenant } = require('../../core/middleware/tenantMiddleware');
const ctrl = require('./notices.controller');

router.get('/', authenticate, resolveTenant, authorize('employee','manager','admin'), ctrl.listForMe);
router.post('/read', authenticate, resolveTenant, authorize('employee','manager','admin'), ctrl.markRead);
router.post('/hide', authenticate, resolveTenant, authorize('employee','manager','admin'), ctrl.hideForMe);

router.get('/admin', authenticate, resolveTenant, authorize('manager','admin'), ctrl.listAdmin);
router.post('/admin', authenticate, resolveTenant, authorize('manager','admin'), ctrl.create);
router.delete('/admin/:id', authenticate, resolveTenant, authorize('manager','admin'), ctrl.remove);

module.exports = router;

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../core/middleware/authMiddleware');
const { resolveTenant } = require('../../core/middleware/tenantMiddleware');
const controller = require('./adjust.controller');
const exportCtrl = require('./adjust.export.controller');
router.use(authenticate, resolveTenant);
// export phải trước /admin để không bị param route bắt nhầm
router.get('/admin/export', authorize('admin','manager'), exportCtrl.exportAdjust);
router.get('/admin', authorize('admin','manager'), controller.listAll);
router.get('/my', authorize('employee','manager','admin'), controller.listMine);
router.get('/:id/messages', authorize('employee','manager','admin'), controller.listMessages);
router.post('/:id/messages', authorize('employee','manager','admin'), controller.addMessage);
router.patch('/:id/status', authorize('manager','admin'), controller.updateStatus);
router.post('/', authorize('employee','manager','admin'), controller.create);
router.get('/', authorize('manager','admin'), controller.listUser);
router.patch('/:id', authorize('employee','manager','admin'), controller.updateByActor);
router.delete('/:id', authorize('employee','manager','admin'), controller.remove);
module.exports = router;

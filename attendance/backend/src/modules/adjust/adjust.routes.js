const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../core/middleware/authMiddleware');
const controller = require('./adjust.controller');
// Routes yêu cầu sửa giờ
router.post('/', authenticate, authorize('employee','manager','admin'), controller.create);
router.get('/my', authenticate, authorize('employee','manager','admin'), controller.listMine);
router.get('/', authenticate, authorize('manager','admin'), controller.listUser);
router.patch('/:id/status', authenticate, authorize('manager','admin'), controller.updateStatus);
module.exports = router;

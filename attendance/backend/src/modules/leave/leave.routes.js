const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../core/middleware/authMiddleware');
const controller = require('./leave.controller');
// Routes yêu cầu nghỉ
router.post('/', authenticate, authorize('employee','manager','admin'), controller.create);
router.get('/my', authenticate, authorize('employee','manager','admin'), controller.listMine);
router.get('/my-balance', authenticate, authorize('employee','manager','admin'), controller.myBalance);
router.get('/', authenticate, authorize('manager','admin'), controller.listUser);
router.get('/pending', authenticate, authorize('manager','admin'), controller.listPending);
router.patch('/:id/status', authenticate, authorize('manager','admin'), controller.updateStatus);
module.exports = router;

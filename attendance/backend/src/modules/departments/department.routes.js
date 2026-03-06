const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../core/middleware/authMiddleware');
const controller = require('./department.controller');
// Routes quản trị phòng ban
router.get('/', authenticate, authorize('admin'), controller.list);
router.post('/', authenticate, authorize('admin'), controller.create);
router.post('/bulk', authenticate, authorize('admin'), controller.createBulk);
router.patch('/:id', authenticate, authorize('admin'), controller.update);
router.delete('/:id', authenticate, authorize('admin'), controller.remove);
module.exports = router;

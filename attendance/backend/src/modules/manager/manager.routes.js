const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../core/middleware/authMiddleware');
const controller = require('./manager.controller');
// Routes quản lý
router.get('/report', authenticate, authorize('manager','admin'), controller.groupReport);
router.post('/shifts', authenticate, authorize('manager','admin'), controller.assignShift);
module.exports = router;

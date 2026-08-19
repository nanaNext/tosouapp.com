const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../core/middleware/authMiddleware');
const controller = require('./settings.controller');
// Routes cấu hình hệ thống
router.get('/', authenticate, authorize('admin'), controller.get);
router.patch('/', authenticate, authorize('admin'), controller.update);

// Password policy
router.get('/password-policy', authenticate, authorize('admin'), controller.getPasswordPolicy);
router.post('/password-policy', authenticate, authorize('admin'), controller.updatePasswordPolicy);

// 2FA enforcement policy
router.get('/2fa-policy', authenticate, authorize('admin'), controller.get2FAPolicy);
router.post('/2fa-policy', authenticate, authorize('admin'), controller.update2FAPolicy);

module.exports = router;

const express = require('express');
const router = express.Router();
const controller = require('./webauthn.controller');
const { authenticate } = require('../../core/middleware/authMiddleware');

router.use((req, res, next) => {
  const enabled = String(process.env.ENABLE_WEBAUTHN || '').toLowerCase() === 'true';
  if (!enabled) return res.status(404).json({ message: 'Not Found' });
  next();
});

router.post('/register/options', authenticate, controller.registerOptions);
router.post('/register/verify', authenticate, controller.registerVerify);
router.post('/login/options', controller.loginOptions);
router.post('/login/verify', controller.loginVerify);

// List registered passkeys for current user
router.get('/passkeys', authenticate, async (req, res) => {
  try {
    const passkeyRepo = require('./webauthn.repository');
    const passkeys = await passkeyRepo.listUserPasskeys(req.user.id);
    res.status(200).json({ data: passkeys.map(p => ({ id: p.id, created_at: p.created_at || null })) });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;

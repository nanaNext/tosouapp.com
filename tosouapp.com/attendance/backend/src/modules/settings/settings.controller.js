const repo = require('./settings.repository');
// Controller cấu hình hệ thống
exports.get = async (req, res) => {
  try {
    const s = await repo.getSettings(req.tenantId || null);
    res.status(200).json(s || {});
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
exports.update = async (req, res) => {
  try {
    await repo.updateSettings(req.body || {}, req.tenantId || null);
    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── Password Policy ────────────────────────────────────────────────────────────
exports.getPasswordPolicy = async (req, res) => {
  try {
    const policy = await repo.getPasswordPolicy(req.tenantId || null);
    res.status(200).json(policy || {
      minLength: 8,
      requireUpper: true,
      requireLower: true,
      requireDigit: true,
      requireSymbol: false,
      expiryDays: 0
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updatePasswordPolicy = async (req, res) => {
  try {
    const { minLength, requireUpper, requireLower, requireDigit, requireSymbol, expiryDays } = req.body || {};
    await repo.updatePasswordPolicy({
      minLength: Math.max(4, Math.min(128, Number(minLength) || 8)),
      requireUpper: !!requireUpper,
      requireLower: !!requireLower,
      requireDigit: !!requireDigit,
      requireSymbol: !!requireSymbol,
      expiryDays: Math.max(0, Math.min(365, Number(expiryDays) || 0))
    }, req.tenantId || null);
    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── 2FA Policy ─────────────────────────────────────────────────────────────────
exports.get2FAPolicy = async (req, res) => {
  try {
    const policy = await repo.get2FAPolicy(req.tenantId || null);
    res.status(200).json(policy || { enforced: false });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.update2FAPolicy = async (req, res) => {
  try {
    const { enforced } = req.body || {};
    await repo.update2FAPolicy({ enforced: !!enforced }, req.tenantId || null);
    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

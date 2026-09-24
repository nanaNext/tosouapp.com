const repo = require('./corporation.repository');
const auditRepo = require('../audit/audit.repository');

function _logAudit(req, action, beforeData, afterData) {
  auditRepo.writeLog({
    userId: req.user?.id,
    tenantId: req.tenantId || null,
    action,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    beforeData: beforeData != null ? JSON.stringify(beforeData) : null,
    afterData: afterData != null ? JSON.stringify(afterData) : null
  }).catch(() => { /* audit ログ失敗で本処理は止めない */ });
}

exports.list = async (req, res) => {
  try {
    const includeInactive = String(req.query.includeInactive || '') === '1';
    const rows = await repo.getAllCorporations(req.tenantId || null, { includeInactive });
    res.status(200).json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { name, code } = req.body || {};
    if (!name) return res.status(400).json({ message: 'Missing name' });
    const id = await repo.createCorporation(name, code || null, req.tenantId || null);
    _logAudit(req, 'corporation_create', null, { id, name, code: code || null });
    res.status(201).json({ id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const id = req.params.id;
    const { name, code } = req.body || {};
    if (!id || (!name && !code)) return res.status(400).json({ message: 'Missing id or fields' });
    const before = await repo.getCorporationById(id, req.tenantId || null);
    await repo.updateCorporation(id, name || null, code || null, req.tenantId || null);
    _logAudit(req, 'corporation_update', before, { id, name: name || before?.name, code: code || before?.code });
    res.status(200).json({ id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) return res.status(400).json({ message: 'Missing id' });
    const before = await repo.getCorporationById(id, req.tenantId || null);
    await repo.deactivateCorporation(id, req.tenantId || null);
    _logAudit(req, 'corporation_deactivate', before, { id, is_active: 0 });
    res.status(200).json({ id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

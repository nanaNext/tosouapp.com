const repo = require('./user.repository');
const bcrypt = require('bcrypt');
const { bcryptRounds } = require('../../config/env');
// Controller quản trị người dùng
exports.list = async (req, res) => {
  try {
    const rows = await repo.listUsers();
    res.status(200).json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
const authRepo = require('../auth/auth.repository');
const refreshRepo = require('../auth/refresh.repository');
exports.create = async (req, res) => {
  try {
    const { username, email, password, role, departmentId } = req.body || {};
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Missing username/email/password' });
    }
    const existing = await authRepo.findUserByEmail(email);
    if (existing) {
      return res.status(409).json({ message: 'Email đã tồn tại!' });
    }
    const hashed = bcrypt.hashSync(password, bcryptRounds);
    const id = await repo.createUser({ username, email, password: hashed, role, departmentId });
    res.status(201).json({ id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
exports.update = async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) return res.status(400).json({ message: 'Missing id' });
    await repo.updateUser(id, req.body || {});
    res.status(200).json({ id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
exports.remove = async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) return res.status(400).json({ message: 'Missing id' });
    await repo.deleteUser(id);
    res.status(200).json({ id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
exports.setRole = async (req, res) => {
  try {
    const id = req.params.id;
    const { role } = req.body || {};
    if (!id || !role) return res.status(400).json({ message: 'Missing id/role' });
    await repo.setRole(id, role);
    await refreshRepo.deleteUserTokens(id);
    res.status(200).json({ id, role });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
exports.setDepartment = async (req, res) => {
  try {
    const id = req.params.id;
    const { departmentId } = req.body || {};
    if (!id || !departmentId) return res.status(400).json({ message: 'Missing id/departmentId' });
    await repo.setDepartment(id, departmentId);
    res.status(200).json({ id, departmentId });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
exports.setPassword = async (req, res) => {
  try {
    const id = req.params.id;
    const { password } = req.body || {};
    if (!id || !password) return res.status(400).json({ message: 'Missing id/password' });
    const isHash = typeof password === 'string' && /^\$2[aby]\$\d+\$/.test(password);
    const hashed = isHash ? password : bcrypt.hashSync(password, bcryptRounds);
    await repo.setPassword(id, hashed);
    await refreshRepo.deleteUserTokens(id);
    res.status(200).json({ id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

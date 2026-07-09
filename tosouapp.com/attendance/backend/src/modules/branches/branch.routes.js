const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../core/middleware/authMiddleware');
const repo = require('./branch.repository');

router.use(authenticate);

// List all branches
router.get('/', authorize('admin', 'manager'), async (req, res) => {
  try {
    const branches = await repo.listBranches();
    res.status(200).json({ data: branches });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// Get single branch
router.get('/:id', authorize('admin', 'manager'), async (req, res) => {
  try {
    const branch = await repo.getBranchById(req.params.id);
    if (!branch) return res.status(404).json({ message: 'Branch not found' });
    res.status(200).json(branch);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// Create branch (admin only)
router.post('/', authorize('admin'), async (req, res) => {
  try {
    const { name, code, address, phone, managerUserId } = req.body;
    if (!name) return res.status(400).json({ message: 'Name is required' });
    const id = await repo.createBranch({ name, code, address, phone, managerUserId });
    res.status(201).json({ id, name });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'Branch code already exists' });
    res.status(500).json({ message: e.message });
  }
});

// Update branch (admin only)
router.patch('/:id', authorize('admin'), async (req, res) => {
  try {
    await repo.updateBranch(req.params.id, req.body);
    res.status(200).json({ id: req.params.id, updated: true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// Delete branch (admin only)
router.delete('/:id', authorize('admin'), async (req, res) => {
  try {
    await repo.deleteBranch(req.params.id);
    res.status(200).json({ deleted: true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// Assign user to branch
router.post('/:id/assign-user', authorize('admin'), async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ message: 'userId required' });
    await repo.assignUserToBranch(userId, req.params.id);
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// Assign department to branch
router.post('/:id/assign-department', authorize('admin'), async (req, res) => {
  try {
    const { departmentId } = req.body;
    if (!departmentId) return res.status(400).json({ message: 'departmentId required' });
    await repo.assignDepartmentToBranch(departmentId, req.params.id);
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// List users in a branch
router.get('/:id/users', authorize('admin', 'manager'), async (req, res) => {
  try {
    const users = await repo.listBranchUsers(req.params.id);
    res.status(200).json({ data: users });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;

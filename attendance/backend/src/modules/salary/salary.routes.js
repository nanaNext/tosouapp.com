const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../core/middleware/authMiddleware');
const salaryService = require('./salary.service');
const payslipRepo = require('../payslip/payslip.repository');
const { companyName } = require('../../config/env');

router.get('/my', authenticate, authorize('employee','manager','admin'), async (req, res) => {
  try {
    const month = req.query.month;
    if (!month) return res.status(400).json({ message: 'Missing month' });
    const today = new Date();
    const pad = n => String(n).padStart(2, '0');
    const issueDate = `${today.getUTCFullYear()}-${pad(today.getUTCMonth() + 1)}-${pad(today.getUTCDate())}`;
    const { employees } = await salaryService.computePayslips([req.user.id], month);
    res.status(200).json({ companyName, issueDate, month, employees });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/my/:year/:month', authenticate, authorize('employee','manager','admin'), async (req, res) => {
  try {
    const y = req.params.year;
    const m = req.params.month;
    const month = `${y}-${String(m).padStart(2,'0')}`;
    const { employees } = await salaryService.computePayslips([req.user.id], month);
    res.status(200).json(employees[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/me/:year/:month/download', authenticate, authorize('employee','manager','admin'), async (req, res) => {
  try {
    const y = req.params.year;
    const m = req.params.month;
    const month = `${y}-${String(m).padStart(2,'0')}`;
    const row = await payslipRepo.findLatestByUserMonth(req.user.id, month);
    if (!row) return res.status(404).json({ message: 'Not found for month' });
    res.status(200).json({ secureUrl: `/api/payslips/me/file/${row.id}` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

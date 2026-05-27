// File đăng ký (mount) tất cả các đường dẫn API của hệ thống
const express = require('express');
const router = express.Router();

// Nhập (import) các file chứa đường dẫn API của từng tính năng
const authRoutes = require('../modules/auth/auth.routes');
const attendanceRoutes = require('../modules/attendance/attendance.routes');
const leaveRoutes = require('../modules/leave/leave.routes');
const adjustRoutes = require('../modules/adjust/adjust.routes');
const managerRoutes = require('../modules/manager/manager.routes');
const adminRoutes = require('../modules/admin/admin.routes');
const meRoutes = require('../modules/me/me.routes');
const userRoutes = require('../modules/users/user.routes');
const salaryRoutes = require('../modules/salary/salary.routes');
const db = require('../core/database/mysql');
const payslipRoutes = require('../modules/payslip/payslip.routes');
const { authenticate, authorize } = require('../core/middleware/authMiddleware');
const employeeRoutes = require('../modules/employee/employee.routes');
const workReportsRoutes = require('../modules/workReports/workReports.routes');
const workReportsAdminRoutes = require('../modules/workReports/workReports.admin.routes');
const noticesRoutes = require('../modules/notices/notices.routes');
const expensesRoutes = require('../modules/expenses/expenses.routes');
const webauthnRoutes = require('../modules/webauthn/webauthn.routes');
const requestsRoutes = require('../modules/requests/requests.routes');
const faqRoutes = require('../modules/faq/faq.routes');

const BUILD_ID = process.env.BUILD_ID || 'navy-20260331-1';
const STARTED_AT = Date.now();
const allowDebugRoutes = process.env.NODE_ENV !== 'production' || String(process.env.ENABLE_DEBUG_ROUTES || '').toLowerCase() === 'true';

module.exports = function(app) {
  console.log('Mounting API routes...');
  
  // Điều hướng người dùng vào trang chủ khi truy cập trang gốc
  app.get('/', (req, res) => {
    return res.redirect(302, '/ui/portal');
  });

  // API kiểm tra tình trạng kết nối Database
  app.get('/health', async (req, res) => {
    try {
      const conn = await db.getConnection();
      await conn.ping();
      conn.release();
      res.json({ status: 'ok' });
    } catch (e) {
      res.status(500).json({ status: 'error', message: e.message });
    }
  });
  app.get('/health/ready', async (req, res) => {
    try {
      const missing = [];
      const [cols] = await db.query(`
        SELECT table_name AS t, column_name AS c
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND (
            (table_name = 'users' AND column_name IN ('token_version'))
            OR (table_name = 'departments' AND column_name IN ('code'))
          )
      `);
      const set = new Set((cols || []).map(r => `${String(r.t)}.${String(r.c)}`));
      if (!set.has('users.token_version')) missing.push('users.token_version');
      if (!set.has('departments.code')) missing.push('departments.code');
      if (missing.length) {
        return res.status(500).json({ status: 'error', ready: false, missing });
      }
      res.status(200).json({ status: 'ok', ready: true });
    } catch (e) {
      res.status(500).json({ status: 'error', ready: false, message: e.message });
    }
  });
  console.log('Registering routers: auth, attendance, leave, adjust, manager, admin, me, users, salary, payslips');
  // ------------------------------------------------------------------------
  // ĐĂNG KÝ CÁC ĐƯỜNG DẪN API CHO TỪNG MODULE
  // ------------------------------------------------------------------------
  app.use('/api/auth', authRoutes); // Đăng nhập, đăng xuất
  app.use('/api/attendance', attendanceRoutes); // Chấm công
  try {
    const attendanceController = require('../modules/attendance/attendance.controller');
    app.get('/api/attendance/month/export.xlsx', authenticate, authorize('employee','manager','admin','payroll'), attendanceController.exportMonthXlsx);
  } catch {}
  app.use('/api/leave', leaveRoutes); // Nghỉ phép
  console.log('🔧 About to mount /api/adjust routes');
  app.use('/api/adjust', adjustRoutes); // Điều chỉnh chấm công
  console.log('✅ /api/adjust routes mounted successfully');
  app.use('/api/manager', managerRoutes); // Dành cho quản lý
  app.use('/api/admin', adminRoutes); // Dành cho Admin
  app.use('/api/me', meRoutes); // Thông tin cá nhân
  app.use('/api/users', userRoutes); // Quản lý nhân viên
  app.use('/api/salary', salaryRoutes); // Lương
  app.use('/api/payslips', payslipRoutes); // Phiếu lương
  app.use('/api/employee', employeeRoutes); // Dành cho nhân viên
  app.use('/api/work-reports', workReportsRoutes); // Báo cáo công việc
  app.use('/api/admin/work-reports', workReportsAdminRoutes); // Quản lý báo cáo công việc
  app.use('/api/notices', noticesRoutes); // Thông báo
  app.use('/api/expenses', expensesRoutes); // Chi phí
  const stationsRoutes = require('../modules/stations/stations.routes');
  app.use('/api/stations', stationsRoutes); // Trạm tàu/xe
  app.use('/api/webauthn', webauthnRoutes); // Đăng nhập sinh trắc học
  app.use('/api/requests', requestsRoutes); // Quản lý các loại yêu cầu
  app.use('/api/faq', faqRoutes); // Hỏi đáp (FAQ)

  // TEMP TEST ROUTE FOR EMAIL
  app.get('/api/test-mail', async (req, res) => {
    try {
      const emailService = require('../core/notifications/email.service');
      const { mailFrom, mailProvider, smtpHost, smtpUser } = require('../config/env');
      await emailService.sendViaResend({
        from: mailFrom,
        to: req.query.email || 'nana123thanhcong@gmail.com',
        subject: 'TEST EMAIL SYSTEM',
        text: 'This is a test email sent from /api/test-mail',
        html: '<p>This is a test email sent from /api/test-mail</p>'
      });
      res.json({ 
        ok: true, 
        message: 'Mail sent successfully',
        debug: {
          mailProvider,
          mailFrom,
          smtpHost,
          smtpUser: smtpUser ? '***' + smtpUser.slice(3) : null,
          canSend: emailService.canSendMail()
        }
      });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  if (allowDebugRoutes) {
    app.get('/api/debug/version', authenticate, authorize('employee','manager','admin','payroll'), (req, res) => {
      res.status(200).json({ buildId: BUILD_ID, startedAt: STARTED_AT, pid: process.pid });
    });
    app.get('/api/debug/routes', authenticate, authorize('admin'), (req, res) => {
      try {
        const stack = (app._router?.stack || []);
        const list = [];
        for (const layer of stack) {
          if (layer.route) {
            list.push({
              path: layer.route.path,
              methods: Object.keys(layer.route.methods || {})
            });
          } else if (layer?.name === 'router' && layer?.handle?.stack) {
            const base = layer?.regexp?.fast_star ? '' : (layer?.regexp?.source || '').replace('^\\', '').replace('\\/?(?=\\/|$)', '');
            for (const l2 of layer.handle.stack) {
              if (l2.route) {
                list.push({
                  path: (base || '') + l2.route.path,
                  methods: Object.keys(l2.route.methods || {})
                });
              }
            }
          }
        }
        res.status(200).json({ routes: list });
      } catch (err) {
        res.status(500).json({ message: err.message });
      }
    });
    app.post('/api/debug/routes', authenticate, authorize('admin'), (req, res) => {
      try {
        const stack = (app._router?.stack || []);
        const list = [];
        for (const layer of stack) {
          if (layer.route) {
            list.push({
              path: layer.route.path,
              methods: Object.keys(layer.route.methods || {})
            });
          } else if (layer?.name === 'router' && layer?.handle?.stack) {
            const base = layer?.regexp?.fast_star ? '' : (layer?.regexp?.source || '').replace('^\\', '').replace('\\/?(?=\\/|$)', '');
            for (const l2 of layer.handle.stack) {
              if (l2.route) {
                list.push({
                  path: (base || '') + l2.route.path,
                  methods: Object.keys(l2.route.methods || {})
                });
              }
            }
          }
        }
        res.status(200).json({ routes: list });
      } catch (err) {
        res.status(500).json({ message: err.message });
      }
    });
  }
};

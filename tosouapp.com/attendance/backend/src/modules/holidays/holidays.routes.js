const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../core/middleware/authMiddleware');
const { permit } = require('../../core/middleware/rbac');
const { rateLimit } = require('../../core/middleware/rateLimit');
const controller = require('./holidays.controller');

// GET /api/holidays/jp — 日本の祝日一覧 (Japan national holidays)
router.get('/jp',
  authenticate,
  controller.jpHolidays
);

// GET /api/holidays — 一覧取得 (list holidays, filter by dept/year/month)
router.get('/',
  authenticate,
  permit('departments', 'view'),
  controller.list
);

// GET /api/holidays/:id — 詳細取得
router.get('/:id',
  authenticate,
  permit('departments', 'view'),
  controller.getOne
);

// POST /api/holidays/company — 全社休日を追加 (applies to all employees)
router.post('/company',
  rateLimit({ windowMs: 60_000, max: 30 }),
  authenticate,
  permit('departments', 'full'),
  controller.createCompanyHoliday
);

// POST /api/holidays — 新規登録
router.post('/',
  rateLimit({ windowMs: 60_000, max: 30 }),
  authenticate,
  permit('departments', 'full'),
  controller.create
);

// POST /api/holidays/bulk — 一括登録
router.post('/bulk',
  rateLimit({ windowMs: 60_000, max: 10 }),
  authenticate,
  permit('departments', 'full'),
  controller.createBulk
);

// POST /api/holidays/copy — コピー (別部署からコピー)
router.post('/copy',
  rateLimit({ windowMs: 60_000, max: 5 }),
  authenticate,
  permit('departments', 'full'),
  controller.copy
);

// PATCH /api/holidays/:id — 更新
router.patch('/:id',
  rateLimit({ windowMs: 60_000, max: 30 }),
  authenticate,
  permit('departments', 'full'),
  controller.update
);

// DELETE /api/holidays/:id — 削除
router.delete('/:id',
  rateLimit({ windowMs: 60_000, max: 20 }),
  authenticate,
  permit('departments', 'full'),
  controller.remove
);

// DELETE /api/holidays/department/:departmentId/year/:year — 一括削除
router.delete('/department/:departmentId/year/:year',
  rateLimit({ windowMs: 60_000, max: 5 }),
  authenticate,
  permit('departments', 'full'),
  controller.removeByDeptYear
);

module.exports = router;

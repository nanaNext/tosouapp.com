const repo = require('./holidays.repository');
const deptRepo = require('../departments/department.repository');
const calendarRepo = require('../calendar/calendar.repository');

/**
 * Controller quản lý ngày nghỉ theo bộ phận (休日設定)
 */

// GET /api/holidays/jp?year= — Lấy ngày lễ cố định của Nhật Bản (祝日) + ngày nghỉ công ty
exports.jpHolidays = async (req, res) => {
  try {
    const year = parseInt(req.query.year || new Date().getFullYear(), 10);
    let holidays = [];
    let companyHolidays = [];
    try {
      await calendarRepo.ensureTable();
      const data = await calendarRepo.computeYear(year);
      holidays = (data.detail || []).filter(r =>
        ['jp_auto', 'jp_substitute', 'jp_bridge'].includes(r.type) && r.is_off
      );
      // Lấy ngày nghỉ công ty (fixed/custom) — ví dụ Obon, 年末年始
      companyHolidays = (data.detail || []).filter(r =>
        ['fixed', 'custom'].includes(r.type) && r.is_off
      );
    } catch (dbErr) {
      // Fallback: compute Japan holidays without full DB materialization
      try {
        holidays = await calendarRepo.computeJapanHolidays(year);
        holidays = holidays.map(r => ({
          date: r.date,
          name: r.name,
          name_en: r.name_en || null,
          type: r.type,
          is_off: 1
        }));
      } catch (fallbackErr) {
        console.error('[holidays/jp] Fallback also failed:', fallbackErr.message);
        holidays = [];
      }
      // Fallback for company holidays
      try {
        const fixedRows = await calendarRepo.listFixed(year);
        companyHolidays = (fixedRows || []).filter(r => r.is_off).map(r => ({
          date: String(r.date).slice(0, 10),
          name: r.name || null,
          type: r.type || 'fixed',
          is_off: 1
        }));
      } catch (e) { /* ignore */ }
    }
    // Also return departments list for the holidays page UI
    let departments = [];
    try {
      departments = await deptRepo.getAllDepartments();
    } catch (e) { /* ignore */ }
    res.status(200).json({ year, holidays, companyHolidays, departments });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/holidays/company — 全社休日を追加 (company_holidays テーブル)
exports.createCompanyHoliday = async (req, res) => {
  try {
    console.log('[holidays/company] POST received:', JSON.stringify(req.body));
    const { date, name, type, is_off } = req.body || {};
    if (!date) return res.status(400).json({ message: '日付は必須です (date required)' });
    await calendarRepo.ensureTable();
    await calendarRepo.upsertFixed([{
      date: String(date).slice(0, 10),
      name: name || null,
      type: type || 'fixed',
      is_off: is_off !== undefined ? (is_off ? 1 : 0) : 1
    }]);
    console.log('[holidays/company] SUCCESS: saved', date);
    res.status(201).json({ message: '全社休日を登録しました' });
  } catch (err) {
    console.error('[holidays/company] ERROR:', err.message);
    res.status(500).json({ message: err.message });
  }
};

// GET /api/holidays?department_id=&year=&month=
exports.list = async (req, res) => {
  try {
    const departmentId = req.query.department_id ? parseInt(req.query.department_id, 10) : null;
    const year = parseInt(req.query.year || new Date().getFullYear(), 10);
    const month = req.query.month || null; // format: YYYY-MM

    if (departmentId && month) {
      const rows = await repo.listByDepartmentAndMonth(departmentId, month);
      return res.status(200).json({ rows, department_id: departmentId, month });
    }
    if (departmentId) {
      const rows = await repo.listByDepartmentAndYear(departmentId, year);
      return res.status(200).json({ rows, department_id: departmentId, year });
    }
    // No department filter — return all
    const rows = await repo.listAllByYear(year);
    return res.status(200).json({ rows, year });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/holidays/:id
exports.getOne = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ message: 'Missing id' });
    const row = await repo.getById(id);
    if (!row) return res.status(404).json({ message: 'Not found' });
    res.status(200).json(row);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/holidays
// Body: { department_id, date, name, type, is_off }
exports.create = async (req, res) => {
  try {
    console.log('[holidays] POST received:', JSON.stringify(req.body));
    const { department_id, date, name, type, is_off } = req.body || {};
    if (!department_id) return res.status(400).json({ message: '部署IDは必須です (department_id required)' });
    if (!date) return res.status(400).json({ message: '日付は必須です (date required)' });

    // Validate department exists
    const dept = await deptRepo.getDepartmentById(department_id);
    if (!dept) return res.status(404).json({ message: '部署が見つかりません (department not found)' });

    const id = await repo.create({
      departmentId: department_id,
      date,
      name: name || null,
      type: type || 'custom',
      isOff: is_off !== undefined ? is_off : true
    });
    console.log('[holidays] SUCCESS: created id=', id);
    res.status(201).json({ id, message: '登録しました' });
  } catch (err) {
    console.error('[holidays] ERROR:', err.message);
    res.status(500).json({ message: err.message });
  }
};

// POST /api/holidays/bulk
// Body: { department_id, items: [{ date, name, type, is_off }] }
exports.createBulk = async (req, res) => {
  try {
    const { department_id, items } = req.body || {};
    if (!department_id) return res.status(400).json({ message: '部署IDは必須です' });
    if (!Array.isArray(items) || !items.length) return res.status(400).json({ message: 'items[] is required' });

    const dept = await deptRepo.getDepartmentById(department_id);
    if (!dept) return res.status(404).json({ message: '部署が見つかりません' });

    const results = await repo.createMany(department_id, items);
    res.status(201).json({ results, count: results.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/holidays/:id
// Body: { date?, name?, type?, is_off? }
exports.update = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ message: 'Missing id' });

    const existing = await repo.getById(id);
    if (!existing) return res.status(404).json({ message: 'Not found' });

    const { date, name, type, is_off } = req.body || {};
    const result = await repo.update(id, {
      date,
      name,
      type,
      isOff: is_off
    });
    res.status(200).json({ id, ...result, message: '更新しました' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/holidays/:id
exports.remove = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ message: 'Missing id' });

    const existing = await repo.getById(id);
    if (!existing) return res.status(404).json({ message: 'Not found' });

    const result = await repo.deleteById(id);
    res.status(200).json({ id, ...result, message: '削除しました' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/holidays/department/:departmentId/year/:year
exports.removeByDeptYear = async (req, res) => {
  try {
    const departmentId = parseInt(req.params.departmentId, 10);
    const year = parseInt(req.params.year, 10);
    if (!departmentId || !year) return res.status(400).json({ message: 'Missing departmentId or year' });

    const result = await repo.deleteByDepartmentAndYear(departmentId, year);
    res.status(200).json({ department_id: departmentId, year, ...result, message: '一括削除しました' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/holidays/copy
// Body: { source_department_id, target_department_id, year }
exports.copy = async (req, res) => {
  try {
    const { source_department_id, target_department_id, year } = req.body || {};
    if (!source_department_id || !target_department_id || !year) {
      return res.status(400).json({ message: 'source_department_id, target_department_id, year are required' });
    }

    const sourceDept = await deptRepo.getDepartmentById(source_department_id);
    if (!sourceDept) return res.status(404).json({ message: 'コピー元の部署が見つかりません' });

    const targetDept = await deptRepo.getDepartmentById(target_department_id);
    if (!targetDept) return res.status(404).json({ message: 'コピー先の部署が見つかりません' });

    const results = await repo.copyFromDepartment(source_department_id, target_department_id, year);
    res.status(201).json({ results, count: results.length, message: 'コピーしました' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

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
      const data = await calendarRepo.computeYear(year, req.tenantId || 0);
      holidays = (data.detail || []).filter(r =>
        ['jp_auto', 'jp_substitute', 'jp_bridge'].includes(r.type) && r.is_off
      );
      // Lấy ngày nghỉ công ty (fixed/custom) — ví dụ Obon, 年末年始 — chỉ của công ty đang đăng nhập
      // (computeYear đã tự lọc tenant_id IN (0, tenantId) nên data.detail chỉ chứa đúng phạm vi này)
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
        const fixedRows = await calendarRepo.listFixed(year, req.tenantId || 0);
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
      departments = await deptRepo.getAllDepartments(req.tenantId || null);
    } catch (e) { /* ignore */ }
    res.status(200).json({ year, holidays, companyHolidays, departments });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/holidays/company — 全社休日を追加 (company_holidays テーブル)
exports.createCompanyHoliday = async (req, res) => {
  try {
    const { date, name, type, is_off } = req.body || {};
    if (!date) return res.status(400).json({ message: '日付は必須です (date required)' });
    await calendarRepo.ensureTable();
    // tenant_id を必ず自社IDで書く — ここを 0 (全社共通) にしてしまうと、この会社が
    // 追加した休日が他の全テナントにも見えてしまう（実際に見つかった漏洩バグの修正箇所）。
    await calendarRepo.upsertFixed([{
      date: String(date).slice(0, 10),
      name: name || null,
      type: type || 'fixed',
      is_off: is_off !== undefined ? (is_off ? 1 : 0) : 1
    }], req.tenantId || 0);
    res.status(201).json({ message: '全社休日を登録しました' });
  } catch (err) {
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
      const rows = await repo.listByDepartmentAndMonth(departmentId, month, req.tenantId || null);
      return res.status(200).json({ rows, department_id: departmentId, month });
    }
    if (departmentId) {
      const rows = await repo.listByDepartmentAndYear(departmentId, year, req.tenantId || null);
      return res.status(200).json({ rows, department_id: departmentId, year });
    }
    // No department filter — return all
    const rows = await repo.listAllByYear(year, req.tenantId || null);
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
    const row = await repo.getById(id, req.tenantId || null);
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
    const { department_id, date, name, type, is_off } = req.body || {};
    if (!department_id) return res.status(400).json({ message: '部署IDは必須です (department_id required)' });
    if (!date) return res.status(400).json({ message: '日付は必須です (date required)' });

    // Validate department exists
    const dept = await deptRepo.getDepartmentById(department_id, req.tenantId || null);
    if (!dept) return res.status(404).json({ message: '部署が見つかりません (department not found)' });

    const id = await repo.create({
      departmentId: department_id,
      date,
      name: name || null,
      type: type || 'custom',
      isOff: is_off !== undefined ? is_off : true,
      tenantId: req.tenantId || null
    });
    res.status(201).json({ id, message: '登録しました' });
  } catch (err) {
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

    const dept = await deptRepo.getDepartmentById(department_id, req.tenantId || null);
    if (!dept) return res.status(404).json({ message: '部署が見つかりません' });

    const results = await repo.createMany(department_id, items, req.tenantId || null);
    res.status(201).json({ results, count: results.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Trả về danh sách { date: 'YYYY-MM-DD', week } cho từng lần xuất hiện của 1 thứ trong
// tuần (weekday: 0=Sun..6=Sat) trong suốt 1 năm, week = lần thứ mấy trong tháng đó (1-5).
function _nthWeekdayDatesOfYear(year, weekday) {
  const result = [];
  for (let m = 0; m < 12; m++) {
    const d = new Date(Date.UTC(year, m, 1));
    while (d.getUTCDay() !== weekday) d.setUTCDate(d.getUTCDate() + 1);
    let week = 1;
    while (d.getUTCMonth() === m) {
      result.push({ date: d.toISOString().slice(0, 10), week });
      d.setUTCDate(d.getUTCDate() + 7);
      week += 1;
    }
  }
  return result;
}

// POST /api/holidays/department/:departmentId/generate-recurring — 定期休日ルール生成
// Body: { year, weekday? (0=日..6=土, デフォルト6), off_weeks: [第何週が休みか, 例: [4]] }
// 指定した曜日のうち off_weeks に含まれない週を「出勤日」として department_holidays に
// is_off=0 で登録する（off_weeks に含まれる週は基本カレンダー通り休みのまま＝登録不要）。
exports.generateRecurringRule = async (req, res) => {
  try {
    const departmentId = parseInt(req.params.departmentId, 10);
    if (!departmentId) return res.status(400).json({ message: 'Missing departmentId' });

    const year = parseInt(req.body?.year, 10);
    if (!year) return res.status(400).json({ message: 'year is required' });

    const weekday = req.body?.weekday !== undefined ? parseInt(req.body.weekday, 10) : 6;
    if (Number.isNaN(weekday) || weekday < 0 || weekday > 6) {
      return res.status(400).json({ message: 'weekday must be 0-6' });
    }

    const rawOffWeeks = Array.isArray(req.body?.off_weeks) ? req.body.off_weeks : [req.body?.off_weeks];
    const offWeeks = new Set(
      rawOffWeeks.map(n => parseInt(n, 10)).filter(n => n >= 1 && n <= 5)
    );
    if (!offWeeks.size) return res.status(400).json({ message: 'off_weeks is required' });

    const dept = await deptRepo.getDepartmentById(departmentId, req.tenantId || null);
    if (!dept) return res.status(404).json({ message: '部署が見つかりません' });

    const items = _nthWeekdayDatesOfYear(year, weekday)
      .filter(d => !offWeeks.has(d.week))
      .map(d => ({ date: d.date, name: req.body?.name || '出勤日（規則）', type: 'recurring_work', is_off: 0 }));

    const results = await repo.createMany(departmentId, items, req.tenantId || null);
    res.status(201).json({
      department_id: departmentId,
      year,
      weekday,
      off_weeks: Array.from(offWeeks),
      generated: results.length,
      message: `${results.length}件の勤務日を登録しました`
    });
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

    const existing = await repo.getById(id, req.tenantId || null);
    if (!existing) return res.status(404).json({ message: 'Not found' });

    const { date, name, type, is_off } = req.body || {};
    const result = await repo.update(id, {
      date,
      name,
      type,
      isOff: is_off,
      tenantId: req.tenantId || null
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

    const existing = await repo.getById(id, req.tenantId || null);
    if (!existing) return res.status(404).json({ message: 'Not found' });

    const result = await repo.deleteById(id, req.tenantId || null);
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

    const result = await repo.deleteByDepartmentAndYear(departmentId, year, req.tenantId || null);
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

    const sourceDept = await deptRepo.getDepartmentById(source_department_id, req.tenantId || null);
    if (!sourceDept) return res.status(404).json({ message: 'コピー元の部署が見つかりません' });

    const targetDept = await deptRepo.getDepartmentById(target_department_id, req.tenantId || null);
    if (!targetDept) return res.status(404).json({ message: 'コピー先の部署が見つかりません' });

    const results = await repo.copyFromDepartment(source_department_id, target_department_id, year, req.tenantId || null);
    res.status(201).json({ results, count: results.length, message: 'コピーしました' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

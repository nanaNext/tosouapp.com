/**
 * @file attendance.calendar.controller.js
 * @description Xử lý các API liên quan đến lịch công ty và ngày làm việc.
 *
 * Các API trong file này:
 *   - getCalendar         → Lấy toàn bộ lịch nghỉ của năm (bao gồm rule riêng cho bộ phận 工事部)
 *   - getCalendarDay      → Kiểm tra 1 ngày cụ thể có phải ngày nghỉ không
 *   - getCalendarWorkingDays → Lấy danh sách ngày làm việc trong tháng/năm
 *
 * Kết nối:
 *   calendar.repository.js  → Tính toán lịch năm từ DB (ngày lễ cố định, lễ Nhật, thứ 7 tuần 4...)
 *   attendance.utils.js     → getUserOffDaySet (calendar chung + department_holidays theo từng công ty/bộ phận)
 */
'use strict';

// ─── Dependencies ─────────────────────────────────────────────────────────────
const calendarRepo = require('../calendar/calendar.repository'); // Lịch công ty theo năm
const {
  getUserOffDaySet,            // Set ngày nghỉ thật của user (calendar + department_holidays override)
} = require('./attendance.utils');

// ─── API: Lấy toàn bộ lịch nghỉ của năm ─────────────────────────────────────
// GET /api/attendance/calendar?year=2026
// Lưu ý: quy tắc ngày nghỉ riêng theo bộ phận (vd 工事部 chỉ nghỉ CN + thứ 7 tuần 4) không còn
// hardcode theo tên bộ phận nữa — mỗi công ty tự cấu hình qua 休日設定 (department_holidays).
exports.getCalendar = async (req, res) => {
  try {
    const year = parseInt(String(req.query.year || new Date().getUTCFullYear()), 10);
    const r = await calendarRepo.computeYear(year, req.tenantId || 0);
    const off = await getUserOffDaySet(year, req.user?.id, req.tenantId || 0);
    const detailBase = Array.isArray(r?.detail) ? r.detail : [];
    // 各エントリの is_off を、この社員個人の実際の休日設定(部署の上書き込み)に合わせて反映する
    const detailPolicy = detailBase.map(it => ({
      ...it,
      is_off: off.has(String(it?.date || '').slice(0, 10)) ? 1 : 0
    }));
    // Hỗ trợ đa ngôn ngữ nhãn ngày lễ (ja/en/bilingual)
    const lang      = (req.query.lang || req.headers['accept-language'] || '').toLowerCase();
    const isJa      = lang.startsWith('ja');
    const bilingual = String(req.query.bilingual || '').toLowerCase() === 'true';
    const labelOf = (ja, en) => {
      const j = ja || null, e = en || null;
      if (bilingual) return [j, e || j].filter(Boolean).join(' / ');
      return isJa ? (j || e || null) : (e || j || null);
    };
    const mapLabel = list => Array.isArray(list)
      ? list.map(x => ({ ...x, label: labelOf(x.name_ja || x.name, x.name_en || null) }))
      : list;
    res.status(200).json({
      ...r,
      off_days: Array.from(off).sort(),
      jp_auto:       mapLabel(r.jp_auto),
      jp_substitute: mapLabel(r.jp_substitute),
      jp_bridge:     mapLabel(r.jp_bridge),
      detail: Array.isArray(detailPolicy)
        ? detailPolicy.map(x => ({ ...x, label: labelOf(x.name, x.name_en || null) }))
        : detailPolicy,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── API: Kiểm tra 1 ngày cụ thể có phải ngày nghỉ không ─────────────────────
// GET /api/attendance/calendar/day/:date
exports.getCalendarDay = async (req, res) => {
  try {
    const date = String(req.params.date || '').slice(0, 10);
    if (!date) return res.status(400).json({ message: 'Missing date' });
    const year = parseInt(String(date).slice(0, 4), 10);
    const cal  = await calendarRepo.computeYear(year, req.tenantId || 0);
    const off = await getUserOffDaySet(year, req.user?.id, req.tenantId || 0);
    const detail = Array.isArray(cal?.detail) ? cal.detail : [];
    // Lấy lý do ngày nghỉ (có thể có nhiều lý do cùng 1 ngày: vừa Chủ nhật vừa ngày lễ)
    const reasons = detail
      .filter(it => String(it?.date || '').slice(0, 10) === date)
      .map(it => {
        const t = String(it?.type || '');
        return { type: t, name: it?.name || null, is_off: off.has(date) ? 1 : 0 };
      });
    res.status(200).json({ date, is_off: off.has(date) ? 1 : 0, reasons });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── API: Lấy danh sách ngày làm việc trong tháng/năm ────────────────────────
// GET /api/attendance/calendar/working-days?year=2026&month=3
// Hỗ trợ các filter: include_sunday, include_saturday, exclude_holidays, only_weekdays...
exports.getCalendarWorkingDays = async (req, res) => {
  try {
    const year  = parseInt(String(req.query.year || new Date().getUTCFullYear()), 10);
    const month = req.query.month ? parseInt(String(req.query.month), 10) : null;
    // Các tùy chọn filter ngày
    const includeSunday      = String(req.query.include_sunday      || '').toLowerCase() === 'true';
    const includeSaturday    = String(req.query.include_saturday    || 'true').toLowerCase() === 'true';
    const includeLastSaturday = String(req.query.include_last_saturday || '').toLowerCase() === 'true';
    const excludeHolidays    = String(req.query.exclude_holidays    || '').toLowerCase() === 'true';
    const includeHolidayTypes = String(req.query.include_holiday_types || '').split(',').map(s => s.trim()).filter(Boolean);
    const onlyWeekdays       = String(req.query.only_weekdays       || '').toLowerCase() === 'true';
    const pad = n => String(n).padStart(2, '0');
    const r   = await calendarRepo.computeYear(year, req.tenantId || 0);
    const off = new Set((r.off_days || []).map(d => String(d)));
    // Bỏ Chủ nhật khỏi danh sách ngày nghỉ nếu được yêu cầu
    if (includeSunday) for (const ds of (r.sundays || [])) off.delete(String(ds));
    if (includeLastSaturday) for (const ds of (r.saturday_4th || [])) off.delete(String(ds));
    if (includeHolidayTypes.length > 0) {
      const allow = new Set(includeHolidayTypes.map(t => String(t)));
      for (const it of (r.detail || [])) if (allow.has(String(it.type))) off.delete(String(it.date));
    } else if (excludeHolidays) {
      const holidayTypes = new Set(['fixed', 'jp_auto', 'jp_substitute', 'jp_bridge']);
      for (const it of (r.detail || [])) if (holidayTypes.has(String(it.type))) off.delete(String(it.date));
    }
    // Duyệt từng ngày trong khoảng thời gian
    const from = new Date(Date.UTC(year, month ? (month - 1) : 0, 1));
    const to   = month ? new Date(Date.UTC(year, month, 0)) : new Date(Date.UTC(year, 11, 31));
    const list = [];
    let d = new Date(from);
    while (d.getTime() <= to.getTime()) {
      const ds  = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
      const dow = d.getUTCDay();
      if (onlyWeekdays && (dow === 0 || dow === 6)) { d.setUTCDate(d.getUTCDate() + 1); continue; }
      if (!includeSaturday && dow === 6) off.add(ds);
      if (!off.has(ds)) list.push(ds);
      d.setUTCDate(d.getUTCDate() + 1);
    }
    res.status(200).json({ year, month: month || null, count: list.length, days: list });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

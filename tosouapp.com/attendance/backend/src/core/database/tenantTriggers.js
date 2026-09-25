'use strict';
/**
 * @module tenantTriggers
 *
 * Nhiều câu INSERT cũ không ghi tenant_id (work_reports, attendance, payslip_files,
 * salary_inputs...) nên dòng mới bị tenant_id = NULL — vô hình với truy vấn có lọc
 * công ty, hoặc lộ ra với truy vấn không lọc. Thay vì trông chờ từng câu INSERT
 * (kể cả code viết sau này) nhớ ghi tenant_id, mỗi bảng có cột user được gắn một
 * trigger BEFORE INSERT: nếu tenant_id NULL thì lấy công ty của user sở hữu dòng.
 *
 * Giá trị tenant_id truyền vào tường minh (kể cả 0) luôn được giữ nguyên.
 * Idempotent: chạy mỗi lần khởi động, trigger đã có thì bỏ qua. Nếu DB không cho
 * tạo trigger (thiếu quyền) thì chỉ ghi log, không chặn app khởi động.
 */

// Theo migrations/20260808000001_add_tenant_id_all_tables.js (+ work_details cũ)
const TENANT_TABLES = [
  'attendance', 'attendance_daily', 'attendance_go_out', 'attendance_month_status',
  'attendance_month_summary', 'attendance_plan', 'departments', 'branches',
  'leave_requests', 'leave_grants', 'paid_leave_grants',
  'expense_claims', 'expense_months', 'expense_month_profiles', 'expense_monthly_closures', 'expense_types',
  'notices', 'notice_reads', 'notice_hides', 'settings', 'flex_config',
  'shift_definitions', 'shift_requests', 'shift_month_status', 'user_shift_assignments',
  'salary_inputs', 'salary', 'salary_history', 'work_reports', 'work_report_month_closures',
  'company_holidays', 'employee_requests', 'time_adjust_requests', 'payslip_files', 'payslip_deliveries',
  'user_work_details', 'employee_documents', 'employee_profile_photos',
  'chatbot_user_questions', 'faq_user_questions', 'user_passkeys', 'user_change_requests',
  'work_details',
];

// Cột trỏ tới user sở hữu dòng.
const USER_COLS = ['userId', 'user_id'];

const triggerName = (table) => `trg_tenant_fill_${table}`;

async function ensureTenantInsertTriggers(db, log = console) {
  const [colRows] = await db.query(
    `SELECT table_name AS t, column_name AS c FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name IN (?)`,
    [TENANT_TABLES]
  );
  const cols = new Map();
  for (const r of colRows) {
    const t = r.t || r.TABLE_NAME;
    if (!cols.has(t)) cols.set(t, new Set());
    cols.get(t).add(r.c || r.COLUMN_NAME);
  }
  const [trgRows] = await db.query(
    `SELECT trigger_name AS n FROM information_schema.triggers WHERE trigger_schema = DATABASE()`
  );
  const existing = new Set(trgRows.map(r => r.n || r.TRIGGER_NAME));

  const created = [];
  for (const table of TENANT_TABLES) {
    const c = cols.get(table);
    if (!c || !c.has('tenant_id')) continue;
    const userCol = USER_COLS.find(u => c.has(u));
    if (!userCol || existing.has(triggerName(table))) continue;
    try {
      await db.query(
        `CREATE TRIGGER \`${triggerName(table)}\` BEFORE INSERT ON \`${table}\` FOR EACH ROW
         SET NEW.tenant_id = COALESCE(NEW.tenant_id, (SELECT u.tenant_id FROM users u WHERE u.id = NEW.\`${userCol}\` LIMIT 1))`
      );
      created.push(table);
    } catch (e) {
      log.warn('tenant_trigger_create_failed', { table, error_message: e.message });
    }
  }
  if (created.length) log.info('tenant_triggers_created', { tables: created });
  return created;
}

module.exports = { TENANT_TABLES, USER_COLS, triggerName, ensureTenantInsertTriggers };

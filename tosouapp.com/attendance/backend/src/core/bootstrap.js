const db = require('../core/database/mysql');
const bcrypt = require('bcrypt');
const { bcryptRounds } = require('../config/env');

async function ensureMigrationsTable(conn) {
  await conn.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id VARCHAR(64) PRIMARY KEY,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

async function runMigrations() {
  const conn = await db.getConnection();
  try {
    await ensureMigrationsTable(conn);
    const [rows] = await conn.query(`SELECT id FROM schema_migrations`);
    const applied = new Set((rows || []).map(r => String(r.id)));
    const migrations = [
      {
        id: '20260316_01_users_extended_columns',
        up: async () => {
          try { await conn.query(`ALTER TABLE users ADD COLUMN birth_date DATE NULL`); } catch (e) { /* silently ignored */ }
          try { await conn.query(`ALTER TABLE users ADD COLUMN gender VARCHAR(16) NULL`); } catch (e) { /* silently ignored */ }
          try { await conn.query(`ALTER TABLE users ADD COLUMN phone VARCHAR(32) NULL`); } catch (e) { /* silently ignored */ }
          try { await conn.query(`ALTER TABLE users ADD COLUMN avatar_url VARCHAR(255) NULL`); } catch (e) { /* silently ignored */ }
          try { await conn.query(`ALTER TABLE users ADD COLUMN probation_date DATE NULL`); } catch (e) { /* silently ignored */ }
          try { await conn.query(`ALTER TABLE users ADD COLUMN official_date DATE NULL`); } catch (e) { /* silently ignored */ }
          try { await conn.query(`ALTER TABLE users ADD COLUMN manager_id BIGINT UNSIGNED NULL`); } catch (e) { /* silently ignored */ }
          try { await conn.query(`ALTER TABLE users ADD COLUMN level VARCHAR(32) NULL`); } catch (e) { /* silently ignored */ }
          try { await conn.query(`ALTER TABLE users ADD COLUMN contract_end DATE NULL`); } catch (e) { /* silently ignored */ }
          try { await conn.query(`ALTER TABLE users ADD COLUMN base_salary DECIMAL(12,2) NULL`); } catch (e) { /* silently ignored */ }
          try { await conn.query(`ALTER TABLE users ADD COLUMN shift_id BIGINT UNSIGNED NULL`); } catch (e) { /* silently ignored */ }
          try { await conn.query(`ALTER TABLE users ADD COLUMN last_login DATETIME NULL`); } catch (e) { /* silently ignored */ }
        }
      },
      {
        id: '20260316_02_departments_code_column',
        up: async () => {
          await conn.query(`
            CREATE TABLE IF NOT EXISTS departments (
              id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
              name VARCHAR(255) NOT NULL UNIQUE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
          `);
          try { await conn.query(`ALTER TABLE departments ADD COLUMN code VARCHAR(32) NULL`); } catch (e) { /* silently ignored */ }
          try { await conn.query(`ALTER TABLE departments ADD UNIQUE KEY uniq_departments_code (code)`); } catch (e) { /* silently ignored */ }
        }
      },
      {
        id: '20260323_01_notices_target_user',
        up: async () => {
          await conn.query(`
            CREATE TABLE IF NOT EXISTS notices (
              id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
              target_user_id BIGINT UNSIGNED NULL,
              target_date DATE NULL,
              target_month CHAR(7) NULL,
              message TEXT NOT NULL,
              created_by BIGINT UNSIGNED NULL,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              INDEX idx_target_user_id (target_user_id),
              INDEX idx_target_date (target_date),
              INDEX idx_target_month (target_month),
              INDEX idx_created_at (created_at),
              INDEX idx_created_by (created_by)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
          `);
          try { await conn.query(`ALTER TABLE notices ADD COLUMN target_user_id BIGINT UNSIGNED NULL`); } catch (e) { /* silently ignored */ }
          try { await conn.query(`CREATE INDEX idx_target_user_id ON notices (target_user_id)`); } catch (e) { /* silently ignored */ }
        }
      },
      {
        id: '20260323_02_notice_reads',
        up: async () => {
          await conn.query(`
            CREATE TABLE IF NOT EXISTS notice_reads (
              notice_id BIGINT UNSIGNED NOT NULL,
              user_id BIGINT UNSIGNED NOT NULL,
              read_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
              PRIMARY KEY (notice_id, user_id),
              INDEX idx_user_id (user_id),
              INDEX idx_read_at (read_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
          `);
        }
      },
      {
        id: '20260714_01_shift_requests_table',
        up: async () => {
          await conn.query(`
            CREATE TABLE IF NOT EXISTS shift_requests (
              id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
              userId BIGINT UNSIGNED NOT NULL,
              date DATE NOT NULL,
              status VARCHAR(32) NOT NULL,
              leaveType VARCHAR(32) NULL,
              reason VARCHAR(255) NULL,
              detail TEXT NULL,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
              UNIQUE KEY uniq_user_date (userId, date),
              INDEX idx_date (date),
              CONSTRAINT fk_shift_req_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
          `);
        }
      },
      {
        id: '20260714_02_shift_month_status_table',
        up: async () => {
          await conn.query(`
            CREATE TABLE IF NOT EXISTS shift_month_status (
              id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
              userId BIGINT UNSIGNED NOT NULL,
              month VARCHAR(7) NOT NULL,
              status ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
              UNIQUE KEY uniq_user_month (userId, month),
              CONSTRAINT fk_sms_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
          `);
        }
      },
      {
        id: '20260714_03_user_change_requests_table',
        up: async () => {
          await conn.query(`
            CREATE TABLE IF NOT EXISTS user_change_requests (
              id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
              user_id BIGINT UNSIGNED NOT NULL,
              field_name VARCHAR(64) NOT NULL,
              old_value TEXT NULL,
              new_value TEXT NULL,
              status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              reviewed_at TIMESTAMP NULL,
              reviewed_by BIGINT UNSIGNED NULL,
              INDEX idx_user_id (user_id),
              INDEX idx_status (status)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
          `);
        }
      },
      {
        id: '20260717_01_performance_indexes',
        up: async () => {
          // attendance_daily: speed up monthly queries by user+date
          try { await conn.query(`CREATE INDEX idx_attendance_daily_user_date ON attendance_daily(userId, date)`); } catch (e) { /* already exists */ }
          // shift_requests: speed up bulk month queries
          try { await conn.query(`CREATE INDEX idx_shift_requests_user_date ON shift_requests(userId, date)`); } catch (e) { /* already exists */ }
          // users: speed up branch-based filtering
          try { await conn.query(`CREATE INDEX idx_users_branch_status ON users(branch_id, employment_status)`); } catch (e) { /* already exists */ }
          // users: speed up department-based listing
          try { await conn.query(`CREATE INDEX idx_users_dept_status ON users(departmentId, employment_status)`); } catch (e) { /* already exists */ }
          // attendance records: speed up user+date range queries
          try { await conn.query(`CREATE INDEX idx_attendance_records_user_checkin ON attendance_records(userId, checkIn)`); } catch (e) { /* already exists */ }
        }
      },
      {
        // Backfill tenant_id = 1 cho tất cả records NULL.
        // Sinh ra do các route thiếu resolveTenant middleware trước bản fix này.
        // Chỉ chạy 1 lần nhờ schema_migrations tracking — an toàn khi redeploy.
        id: '20260916_01_backfill_tenant_id_1',
        up: async () => {
          const tables = [
            'attendance',
            'attendance_daily',
            'attendance_month_status',
            'attendance_plan',
            'attendance_month_summary',
            'user_shift_assignments',
            'shift_definitions',
          ];
          for (const table of tables) {
            try {
              // Chỉ chạy nếu bảng và cột tồn tại
              const [hasTid] = await conn.query(
                `SELECT COUNT(*) AS c FROM information_schema.columns
                 WHERE table_schema = DATABASE() AND table_name = ? AND column_name = 'tenant_id'`,
                [table]
              );
              if (!hasTid[0].c) continue;
              await conn.query(
                `UPDATE \`${table}\` SET tenant_id = 1 WHERE tenant_id IS NULL`
              );
            } catch (e) { /* bảng chưa tồn tại hoặc không có cột — bỏ qua */ }
          }
        }
      },
      {
        // salary_config: bảng cấu hình tỷ lệ bảo hiểm/thuế theo năm — trước đây
        // salary.repository.js đã gọi SELECT tới bảng này nhưng chưa từng có
        // migration nào tạo nó, nên mọi lần auto-calc bảo hiểm/thuế đều fallback
        // về biến môi trường (mặc định = 0). Migration này vá đúng lỗ hổng đó.
        id: '20260918_01_salary_config_table',
        up: async () => {
          await conn.query(`
            CREATE TABLE IF NOT EXISTS salary_config (
              id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
              tenant_id BIGINT UNSIGNED NOT NULL,
              year INT NOT NULL,
              health_insurance_rate DECIMAL(7,5) NOT NULL DEFAULT 0,
              care_insurance_rate DECIMAL(7,5) NOT NULL DEFAULT 0,
              pension_rate DECIMAL(7,5) NOT NULL DEFAULT 0,
              employment_insurance_rate DECIMAL(7,5) NOT NULL DEFAULT 0,
              tax_rate DECIMAL(7,5) NOT NULL DEFAULT 0,
              overtime_rate DECIMAL(4,2) NOT NULL DEFAULT 1.25,
              holiday_rate DECIMAL(4,2) NOT NULL DEFAULT 1.35,
              late_night_rate DECIMAL(4,2) NOT NULL DEFAULT 1.25,
              working_minutes_per_month INT NOT NULL DEFAULT 9600,
              standard_days_per_month DECIMAL(5,2) NOT NULL DEFAULT 21.75,
              base_hourly_rate DECIMAL(10,2) NULL,
              rounding_minutes INT NOT NULL DEFAULT 5,
              rounding_mode VARCHAR(16) NOT NULL DEFAULT 'half_up',
              commute_allowance_tax_free_limit DECIMAL(10,2) NOT NULL DEFAULT 150000,
              company_name VARCHAR(255) NULL,
              prefecture VARCHAR(64) NULL,
              updated_by BIGINT UNSIGNED NULL,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
              UNIQUE KEY uniq_tenant_year (tenant_id, year)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
          `);
        }
      },
      {
        // Mở rộng users với các trường phục vụ tính lương chính xác hơn sau này
        // (扶養人数, 甲欄/乙欄, 就業手当) — hiện tại thuế vẫn tính theo % phẳng
        // trong salary_config, các cột này chỉ để lưu/hiển thị trước.
        id: '20260918_02_users_payroll_columns',
        up: async () => {
          try { await conn.query(`ALTER TABLE users ADD COLUMN dependents_count TINYINT UNSIGNED NOT NULL DEFAULT 0`); } catch (e) { /* silently ignored */ }
          try { await conn.query(`ALTER TABLE users ADD COLUMN tax_category VARCHAR(8) NOT NULL DEFAULT 'kou'`); } catch (e) { /* silently ignored */ }
          try { await conn.query(`ALTER TABLE users ADD COLUMN qualification_allowance DECIMAL(12,2) NULL`); } catch (e) { /* silently ignored */ }
        }
      },
      {
        // 交通費の「設定」画面: 期限アラート日数（何日前から表示するか）をテナントごとに保存。
        // 電車・バス通勤の非課税上限は salary_config.commute_allowance_tax_free_limit を
        // そのまま共用するため、ここでは重複して持たない。
        id: '20260919_01_expense_settings_table',
        up: async () => {
          await conn.query(`
            CREATE TABLE IF NOT EXISTS expense_settings (
              id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
              tenant_id BIGINT UNSIGNED NOT NULL,
              deadline_alert_days INT NOT NULL DEFAULT 30,
              updated_by BIGINT UNSIGNED NULL,
              updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
              UNIQUE KEY uniq_tenant (tenant_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
          `);
        }
      },
      {
        // マイカー等通勤の片道距離別 非課税額（国税庁の目安値）— テナントごとに編集可能。
        // 行が無いテナントは expenseSettings.repository.js 側のハードコード既定値にフォールバックする。
        id: '20260919_02_expense_mileage_tiers_table',
        up: async () => {
          await conn.query(`
            CREATE TABLE IF NOT EXISTS expense_mileage_tiers (
              id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
              tenant_id BIGINT UNSIGNED NOT NULL,
              min_km DECIMAL(6,2) NOT NULL,
              max_km DECIMAL(6,2) NULL,
              tax_free_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
              sort_order INT NOT NULL DEFAULT 0,
              created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
              INDEX idx_tenant_sort (tenant_id, sort_order)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
          `);
        }
      },
      {
        // 月次締め（expense_monthly_closures）に、非課税限度額を超えた分の課税対象額を記録する。
        id: '20260919_03_expense_monthly_closures_taxable',
        up: async () => {
          try { await conn.query(`ALTER TABLE expense_monthly_closures ADD COLUMN taxable_amount DECIMAL(12,2) NOT NULL DEFAULT 0`); } catch (e) { /* silently ignored */ }
        }
      }
    ];
    for (const m of migrations) {
      if (applied.has(m.id)) continue;
      await m.up();
      await conn.query(`INSERT INTO schema_migrations (id) VALUES (?)`, [m.id]);
    }
  } finally {
    conn.release();
  }
}

async function ensureUsersTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      employee_code VARCHAR(32) NULL,
      username VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      email_lower VARCHAR(255) NULL,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(16) NOT NULL DEFAULT 'employee',
      departmentId BIGINT NULL,
      employment_type VARCHAR(16) NOT NULL DEFAULT 'full_time',
      hire_date DATE NULL,
      lang VARCHAR(8) NULL,
      region VARCHAR(16) NULL,
      timezone VARCHAR(64) NULL,
      address VARCHAR(255) NULL,
      contract_type VARCHAR(32) NULL,
      visa_number VARCHAR(64) NULL,
      visa_expiry DATE NULL,
      insurance_number VARCHAR(64) NULL,
      employment_status VARCHAR(16) NOT NULL DEFAULT 'active',
      birth_date DATE NULL,
      gender VARCHAR(16) NULL,
      phone VARCHAR(32) NULL,
      avatar_url VARCHAR(255) NULL,
      probation_date DATE NULL,
      official_date DATE NULL,
      manager_id BIGINT UNSIGNED NULL,
      level VARCHAR(32) NULL,
      contract_end DATE NULL,
      base_salary DECIMAL(12,2) NULL,
      shift_id BIGINT UNSIGNED NULL,
      last_login DATETIME NULL,
      join_date DATE NULL,
      login_fail_count INT DEFAULT 0,
      locked_until DATETIME NULL,
      token_version INT NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_employee_code (employee_code),
      UNIQUE KEY uniq_email_lower (email_lower)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

async function ensureSuperAdmin() {
  const email = process.env.SUPER_ADMIN_EMAIL;
  const password = process.env.SUPER_ADMIN_PASSWORD;
  const username = process.env.SUPER_ADMIN_NAME || 'Super Admin';
  if (!email || !password) return;
  const [rows] = await db.query(`SELECT id FROM users WHERE email_lower = LOWER(?) LIMIT 1`, [email]);
  if (rows && rows.length) return;
  const hashed = /^\$2[aby]\$\d+\$/.test(password) ? password : bcrypt.hashSync(password, bcryptRounds);
  await db.query(
    `INSERT INTO users (employee_code, username, email, email_lower, password, role, employment_type, employment_status, hire_date, join_date)
     VALUES (NULL, ?, ?, LOWER(?), ?, 'admin', 'full_time', 'active', CURRENT_DATE, CURRENT_DATE)`,
    [username, email, email, hashed]
  );
}

async function ensureModuleTables() {
  const attendanceRepo = require('../modules/attendance/attendance.repository');
  const auditRepo = require('../modules/audit/audit.repository');
  const authRepo = require('../modules/auth/auth.repository');
  const refreshRepo = require('../modules/auth/refresh.repository');
  const passwordResetRepo = require('../modules/auth/password_reset.repository');
  const leaveRepo = require('../modules/leave/leave.repository');
  const workReportsRepo = require('../modules/workReports/workReports.repository');
  const calendarRepo = require('../modules/calendar/calendar.repository');
  const settingsRepo = require('../modules/settings/settings.repository');
  const salaryInputRepo = require('../modules/salary/salaryInput.repository');
  const payslipDeliveryRepo = require('../modules/salary/payslipDelivery.repository');
  const documentsRepo = require('../modules/documents/documents.repository');
  const payslipRepo = require('../modules/payslip/payslip.repository');
  const adjustRepo = require('../modules/adjust/adjust.repository');
  const expensesRepo = require('../modules/expenses/expenses.repository');
  const stationsRepo = require('../modules/stations/stations.repository');
  const expenseTypesRepo = require('../modules/expenses/expenseTypes.repository');
  const salaryRepo = require('../modules/salary/salary.repository');
  const requestsRepo = require('../modules/requests/requests.repository');
  const webauthnRepo = require('../modules/webauthn/webauthn.repository');
  const faqRepo = require('../modules/faq/faq.repository');
  const branchRepo = require('../modules/branches/branch.repository');
  await attendanceRepo.ensureAttendanceTables();
  await auditRepo.ensureTable();
  await authRepo.ensureUserSecurityColumns();
  await refreshRepo.ensureTable();
  await passwordResetRepo.ensureTable();
  await leaveRepo.ensureSchema();
  await workReportsRepo.ensureSchema();
  await workReportsRepo.ensureMonthClosureSchema();
  await calendarRepo.ensureTable();
  // Auto-seed: Obon 2026 company holidays + 8/10 override
  try {
    await calendarRepo.upsertFixed([
      { date: '2026-08-10', name: '山の日 振替休日 / Substitute Holiday (Mountain Day)', type: 'jp_substitute', is_off: 0 },
      { date: '2026-08-12', name: 'お盆休み / Obon Holiday', type: 'fixed', is_off: 1 },
      { date: '2026-08-13', name: 'お盆休み / Obon Holiday', type: 'fixed', is_off: 1 },
      { date: '2026-08-14', name: 'お盆休み / Obon Holiday', type: 'fixed', is_off: 1 },
    ]);
  } catch (e) { /* silently ignored — already exists */ }
  await settingsRepo.ensureFlagsSchema();
  await salaryInputRepo.ensureTable();
  await payslipDeliveryRepo.ensureTable();
  await documentsRepo.ensureTable();
  await payslipRepo.ensureTable();
  await adjustRepo.ensureSchema();
  await expensesRepo.ensureTable();
  await expenseTypesRepo.ensureTable();
  await stationsRepo.ensureTable();
  await webauthnRepo.ensureTable();
  await requestsRepo.ensureTable();
  await faqRepo.ensureTable();
  // TEMP: Skip branchRepo for debugging
  // console.log('DEBUG branchRepo type:', typeof branchRepo, 'keys:', Object.keys(branchRepo));
  // try {
  //   await branchRepo.ensureTable();
  // } catch (branchErr) {
  //   console.error('branchRepo.ensureTable error:', branchErr.message, branchErr.stack);
  //   throw branchErr;
  // }
  try {
    await faqRepo.seedIfEmpty();
  } catch (e) { /* silently ignored */ }
  try {
    await salaryRepo.listHistory({ page: 1, pageSize: 1 });
  } catch (e) { /* silently ignored */ }
}

let initPromise = null;

async function init() {
  if (!initPromise) {
    initPromise = (async () => {
      await ensureUsersTable();
      await runMigrations();
      await ensureModuleTables();
      await ensureSuperAdmin();
      await autoAssignEmployeeCodes();
    })();
  }
  return initPromise;
}

async function autoAssignEmployeeCodes() {
  try {
    const [users] = await db.query(
      "SELECT id FROM users WHERE (employee_code IS NULL OR employee_code = '') ORDER BY id ASC"
    );
    if (!users || users.length === 0) return;
    const [maxRows] = await db.query(
      "SELECT employee_code FROM users WHERE employee_code REGEXP '^EMP[0-9]+$' ORDER BY CAST(SUBSTRING(employee_code, 4) AS UNSIGNED) DESC LIMIT 1"
    );
    let nextNum = 1;
    if (maxRows && maxRows.length > 0) {
      nextNum = parseInt(maxRows[0].employee_code.replace('EMP', ''), 10) + 1;
    }
    for (const u of users) {
      const code = 'EMP' + String(nextNum).padStart(3, '0');
      await db.query('UPDATE users SET employee_code = ? WHERE id = ? AND (employee_code IS NULL OR employee_code = ?)', [code, u.id, '']);
      nextNum++;
    }
  } catch (e) { /* silently ignored — non-critical */ }
}

module.exports = { init };

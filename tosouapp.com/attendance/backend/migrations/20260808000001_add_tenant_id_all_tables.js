/**
 * Migration: Add tenant_id to all core tables for multi-tenant isolation.
 *
 * SAFE STRATEGY:
 * - All columns added as nullable first (no data loss, prod keeps running)
 * - All existing rows assigned to tenant_id = 1 (飯塚塗研) automatically
 * - Indexes added for query performance
 *
 * Tables covered:
 * attendance, attendance_daily, attendance_go_out, attendance_month_status,
 * attendance_month_summary, attendance_plan, departments, branches,
 * leave_requests, leave_grants, paid_leave_grants,
 * expense_claims, expense_months, expense_month_profiles, expense_monthly_closures,
 * notices, notice_reads, notice_hides,
 * settings, flex_config,
 * shift_definitions, shift_requests, shift_month_status, user_shift_assignments,
 * salary_inputs, salary, salary_history,
 * work_reports, work_report_month_closures,
 * company_holidays, employee_requests, time_adjust_requests,
 * payslip_files, payslip_deliveries,
 * user_work_details, employee_documents
 */

const TENANT_ID = 1; // 飯塚塗研 — all existing data belongs here

// Tables that need tenant_id + their primary key for bulk update
const TABLES = [
  'attendance',
  'attendance_daily',
  'attendance_go_out',
  'attendance_month_status',
  'attendance_month_summary',
  'attendance_plan',
  'departments',
  'branches',
  'leave_requests',
  'leave_grants',
  'paid_leave_grants',
  'expense_claims',
  'expense_months',
  'expense_month_profiles',
  'expense_monthly_closures',
  'expense_types',
  'notices',
  'notice_reads',
  'notice_hides',
  'settings',
  'flex_config',
  'shift_definitions',
  'shift_requests',
  'shift_month_status',
  'user_shift_assignments',
  'salary_inputs',
  'salary',
  'salary_history',
  'work_reports',
  'work_report_month_closures',
  'company_holidays',
  'employee_requests',
  'time_adjust_requests',
  'payslip_files',
  'payslip_deliveries',
  'user_work_details',
  'employee_documents',
  'employee_profile_photos',
  'chatbot_user_questions',
  'faq_user_questions',
  'user_passkeys',
  'user_change_requests',
];

exports.up = async function (knex) {
  let added = 0;
  let skipped = 0;

  for (const table of TABLES) {
    // Check table exists
    const exists = await knex.schema.hasTable(table);
    if (!exists) { console.log(`  [SKIP] Table ${table} does not exist`); skipped++; continue; }

    // Check column already exists
    const hasTid = await knex.schema.hasColumn(table, 'tenant_id');
    if (hasTid) { console.log(`  [SKIP] ${table} already has tenant_id`); skipped++; continue; }

    // Add tenant_id column
    await knex.schema.alterTable(table, (t) => {
      t.bigInteger('tenant_id').unsigned().nullable().defaultTo(null);
    });

    // Assign all existing rows to tenant 1
    const updated = await knex(table).whereNull('tenant_id').update({ tenant_id: TENANT_ID });

    // Add index for query performance
    try {
      await knex.schema.alterTable(table, (t) => {
        t.index(['tenant_id'], `idx_${table.substring(0, 20)}_tid`);
      });
    } catch (e) { /* index may already exist */ }

    console.log(`  [OK] ${table}: added tenant_id, assigned ${updated} rows → tenant ${TENANT_ID}`);
    added++;
  }

  // Special: settings table — ensure tenant 1 row is properly tagged
  // settings may have only 1 row globally; now each tenant gets its own
  try {
    await knex('settings').whereNull('tenant_id').update({ tenant_id: TENANT_ID });
    console.log('  [OK] settings: existing row assigned to tenant 1');
  } catch (e) { /* silently ignored */ }

  console.log(`\n✅ tenant_id migration complete: ${added} tables updated, ${skipped} skipped`);
};

exports.down = async function (knex) {
  for (const table of TABLES) {
    try {
      const exists = await knex.schema.hasTable(table);
      if (!exists) continue;
      const hasTid = await knex.schema.hasColumn(table, 'tenant_id');
      if (!hasTid) continue;
      await knex.schema.alterTable(table, (t) => {
        t.dropIndex([], `idx_${table.substring(0, 20)}_tid`);
      }).catch(() => {});
      await knex.schema.alterTable(table, (t) => {
        t.dropColumn('tenant_id');
      });
    } catch (e) { console.warn(`  [WARN] Could not drop tenant_id from ${table}:`, e.message); }
  }
};

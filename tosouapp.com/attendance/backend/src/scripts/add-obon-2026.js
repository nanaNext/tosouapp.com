/**
 * Script: Add Obon 2026 company holidays
 * - Aug 12, 13, 14: お盆休み (company holiday, is_off=1)
 * - Aug 10 (山の日 振替休日): override to working day (is_off=0) since company decides to work
 */
require('../config/loadEnv');
const db = require('../core/database/mysql');

async function main() {
  try {
    console.log('Connecting to database...');

    // 1. Override Aug 10 (山の日 振替休日) → is_off = 0 (working day)
    await db.query(`
      INSERT INTO company_holidays (date, name, type, is_off)
      VALUES ('2026-08-10', '山の日 振替休日 / Substitute Holiday (Mountain Day)', 'jp_substitute', 0)
      ON DUPLICATE KEY UPDATE is_off = 0, name = VALUES(name), type = VALUES(type)
    `);
    console.log('✅ 2026-08-10: 山の日振替休日 → 出勤日 (is_off=0)');

    // 2. Add Obon holidays (Aug 12-14)
    const obonDays = [
      { date: '2026-08-12', name: 'お盆休み / Obon Holiday' },
      { date: '2026-08-13', name: 'お盆休み / Obon Holiday' },
      { date: '2026-08-14', name: 'お盆休み / Obon Holiday' },
    ];

    for (const day of obonDays) {
      await db.query(`
        INSERT INTO company_holidays (date, name, type, is_off)
        VALUES (?, ?, 'fixed', 1)
        ON DUPLICATE KEY UPDATE name = VALUES(name), type = VALUES(type), is_off = 1
      `, [day.date, day.name]);
      console.log(`✅ ${day.date}: ${day.name} → 休日 (is_off=1)`);
    }

    // 3. Verify
    const [rows] = await db.query(
      `SELECT date, name, type, is_off FROM company_holidays WHERE date BETWEEN '2026-08-10' AND '2026-08-14' ORDER BY date`
    );
    console.log('\n--- 確認 (Verification) ---');
    console.table(rows);

    console.log('\n✅ Done! お盆休み 2026 設定完了');
    console.log('  8/10 (月): 出勤日 (山の日振替だが会社は出勤)');
    console.log('  8/11 (火): 山の日 (祝日 - 元々休み)');
    console.log('  8/12 (水): お盆休み');
    console.log('  8/13 (木): お盆休み');
    console.log('  8/14 (金): お盆休み');
    console.log('\n※ 休日出勤: 従業員がお盆期間に出勤した場合、勤怠は「休日出勤」として記録されます。');

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

main();

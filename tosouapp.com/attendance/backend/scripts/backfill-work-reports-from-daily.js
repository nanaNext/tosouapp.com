'use strict';
/**
 * 1回限りのバックフィル: attendance_daily.location/memo に既に入っている
 * 現場・作業内容のテキストを、正式な work_reports レコードとして作成する。
 *
 * 背景: 作業報告タブを work_reports テーブル直読みの新設計に変更したところ、
 * 以前は 月次勤怠入力(管理者) 画面から attendance_daily に直接入力されていた
 * 現場・作業内容が、work_reports には一度も書き込まれていなかったことが判明した。
 * このスクリプトはその過去データを work_reports に複製する（過去データなので
 * status='approved' として作成、既に work_reports がある日はスキップ＝冪等）。
 *
 * 実行: node attendance/backend/scripts/backfill-work-reports-from-daily.js
 * Dry run（変更せず件数だけ確認）: node attendance/backend/scripts/backfill-work-reports-from-daily.js --dry-run
 */

require('../src/config/loadEnv');
const db = require('../src/core/database/mysql');

const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  const mode = DRY_RUN ? '[DRY RUN — 変更なし]' : '[LIVE — DBを更新します]';
  console.log(`\n=== work_reports バックフィル (attendance_daily から) ${mode} ===\n`);

  if (!DRY_RUN) {
    console.log('  ⚠️  LIVE で実行します。3秒以内に Ctrl+C でキャンセルできます...');
    await new Promise(r => setTimeout(r, 3000));
    console.log('  開始します...\n');
  }

  const conn = await db.getConnection();
  let created = 0;
  let skippedExisting = 0;
  let skippedEmpty = 0;

  try {
    if (!DRY_RUN) await conn.beginTransaction();

    const [existingRows] = await conn.query(
      `SELECT userId, date FROM work_reports`
    );
    const existingKeys = new Set(
      existingRows.map(r => `${r.userId}|${String(r.date).slice(0, 10)}`)
    );

    const [dailyRows] = await conn.query(`
      SELECT userId, date, location, memo, work_type
      FROM attendance_daily
      WHERE (location IS NOT NULL AND location <> '')
         OR (memo IS NOT NULL AND memo <> '')
    `);

    console.log(`  対象候補: ${dailyRows.length} 件 (attendance_daily に現場/作業内容あり)\n`);

    for (const row of dailyRows) {
      const work = String(row.memo || '').trim();
      if (!work) { skippedEmpty++; continue; }

      const dateStr = String(row.date).slice(0, 10);
      const key = `${row.userId}|${dateStr}`;
      if (existingKeys.has(key)) { skippedExisting++; continue; }

      const [[times]] = await conn.query(`
        SELECT MIN(checkIn) AS minIn, MAX(checkOut) AS maxOut
        FROM attendance
        WHERE userId = ? AND DATE(COALESCE(checkIn, checkOut)) = ?
      `, [row.userId, dateStr]);
      const startTime = times?.minIn ? String(times.minIn).slice(11, 19) : null;
      const endTime = times?.maxOut ? String(times.maxOut).slice(11, 19) : null;

      const site = String(row.location || '').trim();
      const workType = ['onsite', 'remote', 'satellite'].includes(row.work_type) ? row.work_type : null;

      if (!DRY_RUN) {
        await conn.query(`
          INSERT INTO work_reports (userId, date, start_time, end_time, work_type, site, work, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'approved')
        `, [row.userId, dateStr, startTime, endTime, workType, site, work]);
      }
      existingKeys.add(key);
      created++;
      if (created % 100 === 0) console.log(`  ... ${created} 件処理済み`);
    }

    if (!DRY_RUN) {
      await conn.commit();
    }

    console.log(`\n✅ 完了。`);
    console.log(`   作成: ${created} 件`);
    console.log(`   スキップ（既に work_reports あり）: ${skippedExisting} 件`);
    console.log(`   スキップ（作業内容が空）: ${skippedEmpty} 件`);
    if (DRY_RUN) console.log('\n   --dry-run を外して実行すると実際に作成されます。\n');
  } catch (err) {
    if (!DRY_RUN) {
      await conn.rollback();
      console.error('\n❌ エラーのためロールバックしました。何も変更されていません。');
    }
    throw err;
  } finally {
    conn.release();
    await db.end?.();
    process.exit(0);
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});

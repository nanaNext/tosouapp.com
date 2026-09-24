'use strict';
/**
 * 1回限りのクリーンアップ: work_reports の重複行を削除する。
 *
 * 背景: 出勤打刻のたびに空の work_reports 行を無条件で作成していたバグ
 * (attendance.checkin.controller.js, 修正済み: dc981e5) により、同じ日に
 * 複数回出勤した社員は同じ userId+date の work_reports 行が複数できていた。
 * ロースター側の JOIN 集計は修正済み(dc981e5)だが、work_reports テーブル
 * 自体に残った重複行は消えていない — 作業報告の承認一覧では今も重複して
 * 表示され得る。
 *
 * このスクリプトが削除するのは「情報を失わない」ケースだけ:
 *   (a) 同じ userId+date に、内容あり(site/work が空でない)行が既にあるのに
 *       内容が空("scaffold")の行が残っている → その空行を削除
 *   (b) 同じ userId+date に、site+work が完全に同じ文字列の行が複数ある
 *       → 1件だけ残して残りを削除（承認済み/更新日時が新しい方を優先して残す）
 * それ以外（同じ日に内容が異なる複数の行がある = 本当に複数セッション分の
 * 別々の報告の可能性がある）には一切手を触れない。
 *
 * 実行前に必ず: node scripts/db-backup.js でバックアップを取ってください。
 *
 * Dry run（削除せず対象件数だけ確認）:
 *   node attendance/backend/scripts/dedupe-work-reports.js --dry-run
 * 本実行:
 *   node attendance/backend/scripts/dedupe-work-reports.js
 */

require('../src/config/loadEnv');
const fs = require('fs');
const path = require('path');
const db = require('../src/core/database/mysql');

const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  const mode = DRY_RUN ? '[DRY RUN — 変更なし]' : '[LIVE — DBを更新します]';
  console.log(`\n=== work_reports 重複クリーンアップ ${mode} (DB_HOST=${process.env.DB_HOST}) ===\n`);

  if (!DRY_RUN) {
    console.log('  ⚠️  LIVE で実行します。5秒以内に Ctrl+C でキャンセルできます...');
    await new Promise(r => setTimeout(r, 5000));
    console.log('  開始します...\n');
  }

  const conn = await db.getConnection();
  const toDelete = []; // { id, userId, date, reason, snapshot }
  let groupsWithBlankScaffoldRemoved = 0;
  let groupsWithExactDuplicateRemoved = 0;
  let groupsSkippedAmbiguous = 0;

  try {
    const [dupGroups] = await conn.query(`
      SELECT userId, date, COUNT(*) AS cnt
      FROM work_reports
      GROUP BY userId, date
      HAVING cnt > 1
    `);

    console.log(`  重複候補グループ (同じ userId+date が複数件): ${dupGroups.length} 件\n`);

    for (const g of dupGroups) {
      const [rows] = await conn.query(
        `SELECT * FROM work_reports WHERE userId = ? AND date = ? ORDER BY id ASC`,
        [g.userId, g.date]
      );

      const hasContent = (r) => !!(String(r.site || '').trim() || String(r.work || '').trim());
      const contentKey = (r) => `${String(r.site || '').trim()}\u0001${String(r.work || '').trim()}`;

      const withContent = rows.filter(hasContent);
      const blank = rows.filter(r => !hasContent(r));

      if (withContent.length === 0) {
        // 全行が空のscaffold — 1件だけ残す（最も古いid）
        const keep = blank[0];
        for (const r of blank.slice(1)) {
          toDelete.push({ id: r.id, userId: g.userId, date: g.date, reason: 'all-blank-duplicate', snapshot: r, keptId: keep.id });
        }
        if (blank.length > 1) groupsWithBlankScaffoldRemoved++;
        continue;
      }

      // 内容ありが1件だけ、他は空 → 空行を全部削除（情報は失われない）
      const distinctContents = new Set(withContent.map(contentKey));
      if (distinctContents.size === 1) {
        if (withContent.length > 1) {
          // 内容は完全一致でも、レビュー済み(承認/却下)の行が2件以上あって
          // それぞれ状態が食い違う場合(例: 別の承認者が別々に承認/却下)だけは
          // 自動削除せず人の確認に回す。レビュー済みが1件だけなら、残りの
          // pending重複は情報を持たないので安全に削除できる。
          const reviewKey = (r) => `${r.status}\u0001${r.approved_by || ''}\u0001${r.rejected_reason || ''}`;
          const nonPending = withContent.filter(r => r.status !== 'pending');
          const distinctNonPendingReviewStates = new Set(nonPending.map(reviewKey));
          if (distinctNonPendingReviewStates.size > 1) {
            for (const r of blank) {
              toDelete.push({ id: r.id, userId: g.userId, date: g.date, reason: 'blank-scaffold-with-conflicting-review-states', snapshot: r, keptId: null });
            }
            groupsSkippedAmbiguous++;
            continue;
          }
        }
        // 内容(と承認状態)が完全一致 = 純粋な重複。承認済み/却下済みを優先して残し、
        // 同格なら最新更新のものを残す（pendingの重複だけを消す想定）。
        const statusRank = { approved: 2, rejected: 2, pending: 1 };
        const keep = withContent.slice().sort((a, b) => {
          const rankDiff = (statusRank[b.status] || 0) - (statusRank[a.status] || 0);
          if (rankDiff !== 0) return rankDiff;
          return new Date(b.updated_at) - new Date(a.updated_at);
        })[0];
        for (const r of rows) {
          if (r.id === keep.id) continue;
          toDelete.push({ id: r.id, userId: g.userId, date: g.date, reason: hasContent(r) ? 'exact-duplicate-content' : 'blank-scaffold-with-content-sibling', snapshot: r, keptId: keep.id });
        }
        if (withContent.length > 1) groupsWithExactDuplicateRemoved++;
        else groupsWithBlankScaffoldRemoved++;
        continue;
      }

      // 内容が異なる複数の行 → 本当に複数セッション分かもしれないので触らない。
      // ただし付随する空のscaffold行だけは削除して良い（情報は失われない）。
      for (const r of blank) {
        toDelete.push({ id: r.id, userId: g.userId, date: g.date, reason: 'blank-scaffold-with-distinct-content-siblings', snapshot: r, keptId: null });
      }
      groupsSkippedAmbiguous++;
    }

    console.log(`  削除対象行: ${toDelete.length} 件`);
    console.log(`    - 空scaffoldのみのグループから整理: ${groupsWithBlankScaffoldRemoved} グループ`);
    console.log(`    - 完全一致の重複を整理: ${groupsWithExactDuplicateRemoved} グループ`);
    console.log(`    - 内容が異なるため一部の空行のみ整理（本体はそのまま残す）: ${groupsSkippedAmbiguous} グループ\n`);

    if (toDelete.length) {
      const byReason = {};
      for (const d of toDelete) byReason[d.reason] = (byReason[d.reason] || 0) + 1;
      console.log('  内訳:', byReason, '\n');

      const backupDir = path.join(__dirname, '..', '..', 'backups');
      fs.mkdirSync(backupDir, { recursive: true });
      const backupFile = path.join(backupDir, `work-reports-dedupe-${Date.now()}.json`);
      fs.writeFileSync(backupFile, JSON.stringify(toDelete, null, 2), 'utf-8');
      console.log(`  削除前スナップショットを保存: ${backupFile}\n`);
    }

    if (!DRY_RUN && toDelete.length) {
      await conn.beginTransaction();
      const ids = toDelete.map(d => d.id);
      const marks = ids.map(() => '?').join(',');
      const [res] = await conn.query(`DELETE FROM work_reports WHERE id IN (${marks})`, ids);
      await conn.commit();
      console.log(`✅ 完了。削除: ${res.affectedRows} 件\n`);
    } else if (DRY_RUN) {
      console.log('  --dry-run を外して実行すると実際に削除されます。\n');
    } else {
      console.log('✅ 削除対象なし。\n');
    }
  } catch (err) {
    if (!DRY_RUN) {
      try { await conn.rollback(); } catch (e) { /* ignore */ }
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

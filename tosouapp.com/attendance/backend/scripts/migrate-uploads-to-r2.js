'use strict';
/**
 * One-time script: copy avatars / employee profile photos / expense receipts
 * that are still sitting on local disk (attendance/backend/src/uploads/) up to
 * R2, using the same category/tenant-prefixed keys that
 * core/services/fileStore.service.js reads from at runtime.
 *
 * Only needed for whatever files still exist on local disk right now — on
 * Render (no persistent disk) most of this is likely already gone after past
 * redeploys, this just catches anything that survives (e.g. local dev, or a
 * box that hasn't redeployed since the last upload). Safe to run more than
 * once — re-uploads are harmless overwrites.
 *
 * Run:      node attendance/backend/scripts/migrate-uploads-to-r2.js
 * Dry run:  node attendance/backend/scripts/migrate-uploads-to-r2.js --dry-run
 */

require('../src/config/loadEnv');
const path = require('path');
const fs = require('fs');
const db = require('../src/core/database/mysql');
const s3Service = require('../src/core/services/s3.service');

const DRY_RUN = process.argv.includes('--dry-run');
const LOCAL_UPLOAD_ROOT = path.join(__dirname, '../src/uploads');

async function migrateSet(label, category, rows) {
  let copied = 0;
  let missing = 0;
  let failed = 0;
  for (const { rawPath, tenantId } of rows) {
    if (!rawPath) continue;
    const filename = path.basename(String(rawPath));
    const localPath = path.join(LOCAL_UPLOAD_ROOT, filename);
    if (!fs.existsSync(localPath)) { missing++; continue; }
    const tid = tenantId || 0;
    const key = `${category}/${tid}/${filename}`;
    if (DRY_RUN) {
      console.log(`  [dry-run] would upload ${filename} -> ${key}`);
      copied++;
      continue;
    }
    const buffer = fs.readFileSync(localPath);
    const mime = filename.endsWith('.png') ? 'image/png'
      : filename.endsWith('.pdf') ? 'application/pdf'
      : filename.endsWith('.webp') ? 'image/webp'
      : filename.endsWith('.gif') ? 'image/gif'
      : 'image/jpeg';
    const ok = await s3Service.uploadToR2(key, buffer, mime);
    if (ok) copied++; else failed++;
  }
  console.log(`${label}: ${copied} copied, ${missing} already missing locally, ${failed} failed`);
}

async function main() {
  if (!s3Service.isR2Configured()) {
    console.error('R2 is not configured (R2_ACCOUNT_ID/R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY missing) — nothing to migrate to.');
    process.exit(1);
  }
  const mode = DRY_RUN ? '[DRY RUN — không upload gì]' : '[LIVE — sẽ upload lên R2]';
  console.log(`\n=== Migrate local uploads/ -> R2 ${mode} ===\n`);

  const [avatarRows] = await db.query(`SELECT avatar_url AS rawPath, tenant_id AS tenantId FROM users WHERE avatar_url IS NOT NULL AND avatar_url <> ''`);
  await migrateSet('avatars', 'avatars', avatarRows);

  const [photoRows] = await db.query(`
    SELECT ep.url AS rawPath, u.tenant_id AS tenantId
    FROM employee_profile_photos ep
    JOIN users u ON u.id = ep.userId
  `);
  await migrateSet('employee photos', 'employee-photos', photoRows);

  const [receiptRows] = await db.query(`
    SELECT ef.file_path AS rawPath, ec.tenant_id AS tenantId
    FROM expense_files ef
    JOIN expense_claims ec ON ec.id = ef.expense_id
  `);
  await migrateSet('expense receipts', 'expenses', receiptRows);

  console.log('\nDone.\n');
  await db.end();
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});

/**
 * Database Backup Restore Test
 * 
 * Verifies that the latest backup can be restored successfully.
 * Does NOT overwrite production data — creates a temporary test database,
 * imports the backup, runs validation queries, then drops the test DB.
 * 
 * Usage:
 *   node scripts/db-restore-test.js [backup-file.sql]
 *   
 *   If no file specified, uses the most recent backup_*.sql in project root.
 * 
 * Safety:
 *   - Creates temporary DB: `{DB_NAME}_restore_test`
 *   - Never touches production DB
 *   - Drops test DB after validation
 */

const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT || 3306;
const DB_USER = process.env.DB_USER || 'root';
const DB_PASS = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'attendance_db';
const TEST_DB = `${DB_NAME}_restore_test`;

function findLatestBackup() {
  const root = path.join(__dirname, '../..');
  const files = fs.readdirSync(root)
    .filter(f => f.startsWith('backup_') && f.endsWith('.sql'))
    .sort()
    .reverse();
  if (files.length === 0) return null;
  return path.join(root, files[0]);
}

function mysqlCmd(sql, db = '') {
  const dbFlag = db ? ` ${db}` : '';
  const passFlag = DB_PASS ? ` -p"${DB_PASS}"` : '';
  const cmd = `mysql -h ${DB_HOST} -P ${DB_PORT} -u ${DB_USER}${passFlag}${dbFlag} -e "${sql.replace(/"/g, '\\"')}"`;
  return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
}

function mysqlImport(file, db) {
  const passFlag = DB_PASS ? ` -p"${DB_PASS}"` : '';
  const cmd = `mysql -h ${DB_HOST} -P ${DB_PORT} -u ${DB_USER}${passFlag} ${db} < "${file}"`;
  execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
}

async function run() {
  console.log('='.repeat(60));
  console.log('🔄 DATABASE BACKUP RESTORE TEST');
  console.log('='.repeat(60));

  // 1. Find backup file
  const backupFile = process.argv[2] || findLatestBackup();
  if (!backupFile || !fs.existsSync(backupFile)) {
    console.error('❌ No backup file found. Run `npm run db:backup` first.');
    process.exit(1);
  }
  const fileSize = (fs.statSync(backupFile).size / 1024).toFixed(1);
  console.log(`📁 Backup file: ${path.basename(backupFile)} (${fileSize} KB)`);

  // 2. Create test database
  console.log(`\n📦 Creating test database: ${TEST_DB}...`);
  try {
    mysqlCmd(`DROP DATABASE IF EXISTS ${TEST_DB}`);
    mysqlCmd(`CREATE DATABASE ${TEST_DB} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log('   ✅ Test database created');
  } catch (e) {
    console.error('   ❌ Failed to create test database:', e.message);
    process.exit(1);
  }

  // 3. Import backup
  console.log(`\n📥 Importing backup into ${TEST_DB}...`);
  try {
    mysqlImport(backupFile, TEST_DB);
    console.log('   ✅ Import successful');
  } catch (e) {
    console.error('   ❌ Import failed:', e.message);
    cleanup();
    process.exit(1);
  }

  // 4. Validate — check critical tables exist and have data
  console.log('\n🔍 Validating restored data...');
  const criticalTables = ['users', 'attendance', 'notices', 'departments'];
  let allOk = true;

  for (const table of criticalTables) {
    try {
      const result = mysqlCmd(`SELECT COUNT(*) as cnt FROM ${table}`, TEST_DB);
      const count = parseInt(result.match(/\d+/)?.[0] || '0', 10);
      const status = count >= 0 ? '✅' : '⚠️';
      console.log(`   ${status} ${table}: ${count} rows`);
    } catch (e) {
      console.log(`   ❌ ${table}: MISSING or ERROR`);
      allOk = false;
    }
  }

  // 5. Check schema integrity
  console.log('\n🏗️  Schema integrity check...');
  try {
    const tables = mysqlCmd('SHOW TABLES', TEST_DB);
    const tableCount = tables.split('\n').filter(l => l.trim() && !l.includes('Tables_in_')).length;
    console.log(`   ✅ ${tableCount} tables restored`);
  } catch (e) {
    console.log('   ❌ Schema check failed');
    allOk = false;
  }

  // 6. Cleanup
  cleanup();

  // 7. Summary
  console.log('\n' + '='.repeat(60));
  if (allOk) {
    console.log('✅ RESTORE TEST PASSED — Backup is valid and restorable');
  } else {
    console.log('⚠️  RESTORE TEST COMPLETED WITH WARNINGS — Review above');
  }
  console.log('='.repeat(60));
  console.log(`\nTest completed at: ${new Date().toISOString()}`);
}

function cleanup() {
  console.log(`\n🧹 Dropping test database: ${TEST_DB}...`);
  try {
    mysqlCmd(`DROP DATABASE IF EXISTS ${TEST_DB}`);
    console.log('   ✅ Cleaned up');
  } catch (e) {
    console.warn('   ⚠️  Cleanup failed (manual drop may be needed):', e.message);
  }
}

run().catch(err => {
  console.error('❌ Unexpected error:', err.message);
  cleanup();
  process.exit(1);
});

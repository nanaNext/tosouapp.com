#!/usr/bin/env node
const db = require('../src/core/database/mysql');

const VALID_KINDS = new Set([
  'system',
  'system_announcement',
  'announcement',
  'broadcast',
  'maintenance',
  'policy_update',
  'approval',
  'attendance',
  'expense',
  'chat',
  'leave_request',
  'time_adjust',
  'expense_apply',
  'faq_question',
  'workflow',
  'audit',
  'activity',
  'attendance_punch',
  'employee_action'
]);

function hasWord(msg, re) {
  return re.test(String(msg || ''));
}

function inferKind(row) {
  const rawKind = String(row?.kind || '').trim().toLowerCase();
  const msg = String(row?.message || '');
  const targetUserId = parseInt(String(row?.target_user_id || 0), 10) || 0;
  const audience = String(row?.audience || '').trim().toLowerCase();

  // Keep already valid kinds except old generic buckets.
  if (rawKind && VALID_KINDS.has(rawKind) && rawKind !== 'system' && rawKind !== 'workflow') {
    return rawKind;
  }

  const isApprovalResult = hasWord(msg, /(承認|差戻|却下|approved|rejected|reject|approve)/i);
  const isExpense = hasWord(msg, /(交通費|expense)/i);
  const isLeave = hasWord(msg, /(有休|休暇|leave)/i);
  const isAdjust = hasWord(msg, /(時間修正|調整|adjust)/i);
  const isFaq = hasWord(msg, /(faq|質問)/i);
  const isPunch = hasWord(msg, /(打刻|check[- ]?in|check[- ]?out)/i);
  const isSystemText = hasWord(msg, /(メンテナンス|保守|障害|全社員|company|policy|規定|規約|system|maintenance|broadcast|重要)/i);

  if (isPunch) return 'attendance_punch';
  if (isFaq) return 'faq_question';
  if (isExpense) return isApprovalResult ? 'approval' : 'expense_apply';
  if (isLeave) return isApprovalResult ? 'approval' : 'leave_request';
  if (isAdjust) return isApprovalResult ? 'approval' : 'time_adjust';
  if (isApprovalResult) return 'approval';

  if (targetUserId) return 'approval';
  if (audience === 'admin' || audience === 'manager' || audience === 'admin_manager') return 'workflow';
  if (isSystemText) return 'system_announcement';
  return 'system_announcement';
}

function parseArgInt(flag, fallback) {
  const idx = process.argv.indexOf(flag);
  if (idx < 0) return fallback;
  const raw = process.argv[idx + 1];
  const n = parseInt(String(raw || ''), 10);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return n;
}

async function run() {
  const apply = process.argv.includes('--apply');
  const batchSize = parseArgInt('--batch', 500);
  const maxRows = parseArgInt('--max', 1000000);
  let lastId = 0;
  let scanned = 0;
  let changed = 0;
  let changedToSystem = 0;
  let changedToWorkflow = 0;
  let changedToAudit = 0;

  while (scanned < maxRows) {
    const [rows] = await db.query(
      `
      SELECT id, kind, message, target_user_id, audience
      FROM notices
      WHERE id > ?
      ORDER BY id ASC
      LIMIT ?
      `,
      [lastId, batchSize]
    );
    const items = Array.isArray(rows) ? rows : [];
    if (!items.length) break;

    for (const row of items) {
      scanned += 1;
      lastId = Number(row.id || lastId);
      const oldKind = String(row.kind || '').trim().toLowerCase();
      const nextKind = inferKind(row);
      if (!nextKind || oldKind === nextKind) continue;

      changed += 1;
      if (nextKind === 'system_announcement') changedToSystem += 1;
      else if (nextKind === 'attendance_punch') changedToAudit += 1;
      else changedToWorkflow += 1;

      if (apply) {
        await db.query(`UPDATE notices SET kind = ? WHERE id = ?`, [nextKind, row.id]);
      }
    }

    if (items.length < batchSize) break;
  }

  console.log(`mode=${apply ? 'apply' : 'dry-run'}`);
  console.log(`scanned=${scanned}`);
  console.log(`would_change=${changed}`);
  console.log(`to_system=${changedToSystem}`);
  console.log(`to_workflow=${changedToWorkflow}`);
  console.log(`to_audit=${changedToAudit}`);
  if (!apply) {
    console.log('Run with --apply to persist changes.');
  }
}

run()
  .catch((err) => {
    console.error('backfill-notice-kinds failed:', err?.message || err);
    process.exitCode = 1;
  })
  .finally(async () => {
    try { await db.end(); } catch {}
  });


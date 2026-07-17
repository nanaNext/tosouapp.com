'use strict';
/**
 * Health Monitor Cron
 * Runs every 60 seconds. Checks DB + Redis connectivity.
 * Alerts via ERROR_WEBHOOK_URL (Discord/Slack) if any service is down.
 * 
 * This provides built-in uptime monitoring without external services.
 */

const WEBHOOK_URL = process.env.ERROR_WEBHOOK_URL || '';
const CHECK_INTERVAL_MS = 60_000; // 1 minute
const APP_NAME = process.env.COMPANY_NAME || 'tosouapp';

let lastAlertTime = 0;
const ALERT_COOLDOWN_MS = 5 * 60_000; // Don't spam — max 1 alert per 5 minutes
let consecutiveFailures = 0;

async function sendAlert(message) {
  if (!WEBHOOK_URL) return;
  const now = Date.now();
  if (now - lastAlertTime < ALERT_COOLDOWN_MS) return;
  lastAlertTime = now;
  try {
    await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: `🔴 **[${APP_NAME}] Health Alert**\n${message}\n**Time:** ${new Date().toISOString()}`
      })
    });
  } catch (e) {
    console.error('[HealthMonitor] Failed to send alert:', e.message);
  }
}

async function sendRecoveryNotice() {
  if (!WEBHOOK_URL) return;
  try {
    await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: `🟢 **[${APP_NAME}] Recovered**\nAll services are healthy again.\n**Time:** ${new Date().toISOString()}`
      })
    });
  } catch (e) { /* silently ignored */ }
}

async function checkHealth() {
  const issues = [];

  // Check DB
  try {
    const db = require('../core/database/mysql');
    const conn = await db.getConnection();
    await conn.ping();
    conn.release();
  } catch (e) {
    issues.push(`**DB:** ${e.message}`);
  }

  // Check Redis
  try {
    const redis = require('../core/database/redis');
    if (redis && redis.status === 'ready') {
      await redis.ping();
    } else if (redis && redis.status !== 'end') {
      issues.push(`**Redis:** status=${redis.status} (not ready)`);
    }
    // If redis is null or ended, skip — it's optional
  } catch (e) {
    issues.push(`**Redis:** ${e.message}`);
  }

  // Check memory usage
  const mem = process.memoryUsage();
  const heapUsedMB = Math.round(mem.heapUsed / 1024 / 1024);
  const rssMB = Math.round(mem.rss / 1024 / 1024);
  if (rssMB > 450) { // Near 512MB limit (Starter) or high usage on Standard
    issues.push(`**Memory:** RSS=${rssMB}MB, Heap=${heapUsedMB}MB (high)`);
  }

  if (issues.length > 0) {
    consecutiveFailures++;
    // Alert after 2 consecutive failures to avoid false positives
    if (consecutiveFailures >= 2) {
      await sendAlert(issues.join('\n'));
    }
  } else {
    if (consecutiveFailures >= 2) {
      // Was failing, now recovered
      await sendRecoveryNotice();
    }
    consecutiveFailures = 0;
  }
}

function initHealthMonitor() {
  if (String(process.env.DISABLE_SCHEDULERS || '').toLowerCase() === 'true') return;
  if (String(process.env.NODE_ENV || '').toLowerCase() === 'test') return;

  console.log('[HealthMonitor] Started (interval: 60s)');
  setInterval(checkHealth, CHECK_INTERVAL_MS);
  // Run first check after 30s (let the server warm up)
  setTimeout(checkHealth, 30_000);
}

module.exports = { initHealthMonitor };

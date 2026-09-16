'use strict';
/**
 * Plan Expiry Checker Cron
 *
 * Runs daily at 09:00 JST and:
 *  1. Suspends tenants whose plan_expires_at has passed
 *  2. Sends a warning email 7 days before expiry
 *
 * ENV requirements (optional but recommended):
 *  MAIL_PROVIDER / MAIL_API_KEY — email delivery
 *  SUPER_ADMIN_EMAIL             — CC address for all billing alerts
 */

const cron = require('node-cron');
const db = require('../core/database/mysql');
const emailService = require('../core/notifications/email.service');
const log = require('../core/logger');

async function checkPlanExpiry() {
  log.info('[PlanExpiryCron] Checking tenant plan expiry...');
  try {
    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 3600 * 1000);

    // ── 1. Suspend expired tenants ────────────────────────────────────────────
    const [expired] = await db.query(
      `SELECT id, name, billing_email, plan_expires_at
       FROM tenants
       WHERE status = 'active'
         AND plan_expires_at IS NOT NULL
         AND plan_expires_at < NOW()`,
    );

    for (const tenant of (expired || [])) {
      try {
        await db.query(
          `UPDATE tenants SET status = 'suspended' WHERE id = ?`,
          [tenant.id]
        );
        log.warn('[PlanExpiryCron] Suspended tenant due to expired plan', {
          tenantId: tenant.id, tenantName: tenant.name, expired_at: tenant.plan_expires_at
        });

        // Notify billing contact
        const to = tenant.billing_email || process.env.SUPER_ADMIN_EMAIL;
        if (to && emailService.canSendMail()) {
          await emailService.sendGenericEmail({
            to,
            subject: `[${tenant.name}] アカウントが停止されました`,
            html: `
              <p>お客様のアカウント <strong>${tenant.name}</strong> はご利用プランの有効期限（${tenant.plan_expires_at}）が過ぎたため、一時停止されました。</p>
              <p>引き続きご利用される場合は、システム管理者までお問い合わせください。</p>
            `,
          }).catch(() => {});
        }
      } catch (e) {
        log.error('[PlanExpiryCron] Failed to suspend tenant', { tenantId: tenant.id, error: e.message });
      }
    }

    // ── 2. Send 7-day warning ─────────────────────────────────────────────────
    const [expiringSoon] = await db.query(
      `SELECT id, name, billing_email, plan_expires_at
       FROM tenants
       WHERE status = 'active'
         AND plan_expires_at IS NOT NULL
         AND plan_expires_at BETWEEN NOW() AND ?`,
      [in7Days.toISOString().slice(0, 19).replace('T', ' ')]
    );

    for (const tenant of (expiringSoon || [])) {
      try {
        const to = tenant.billing_email || process.env.SUPER_ADMIN_EMAIL;
        if (to && emailService.canSendMail()) {
          await emailService.sendGenericEmail({
            to,
            subject: `[${tenant.name}] プランの有効期限が7日以内に切れます`,
            html: `
              <p>お客様のアカウント <strong>${tenant.name}</strong> のご利用プランは <strong>${tenant.plan_expires_at}</strong> に期限切れとなります。</p>
              <p>継続してご利用されたい場合は、システム管理者に更新をご依頼ください。</p>
            `,
          }).catch(() => {});
        }
      } catch (e) {
        log.error('[PlanExpiryCron] Failed to send expiry warning', { tenantId: tenant.id, error: e.message });
      }
    }

    if ((expired || []).length > 0 || (expiringSoon || []).length > 0) {
      log.info('[PlanExpiryCron] Done', {
        suspended: (expired || []).length,
        warned: (expiringSoon || []).length,
      });
    }
  } catch (err) {
    log.error('[PlanExpiryCron] Unhandled error', { error: err.message });
  }
}

function initPlanExpiryCheckerCron() {
  // Run daily at 09:00 JST (00:00 UTC)
  cron.schedule('0 0 * * *', checkPlanExpiry, { timezone: 'UTC' });
  log.info('[PlanExpiryCron] Registered (runs daily at 00:00 UTC / 09:00 JST)');
}

module.exports = { checkPlanExpiry, initPlanExpiryCheckerCron };

'use strict';
/**
 * Migration: Add billing fields to tenants table
 * - plan_expires_at: when the plan expires (NULL = no expiry / permanent)
 * - billing_email:   email to send billing alerts to
 * - notes:           internal sysadmin notes (not visible to tenant admins)
 */

exports.up = async function (knex) {
  const hasExpiry = await knex.schema.hasColumn('tenants', 'plan_expires_at');
  const hasEmail = await knex.schema.hasColumn('tenants', 'billing_email');
  const hasNotes = await knex.schema.hasColumn('tenants', 'notes');

  if (!hasExpiry || !hasEmail || !hasNotes) {
    await knex.schema.alterTable('tenants', (t) => {
      if (!hasExpiry) t.datetime('plan_expires_at').nullable().defaultTo(null);
      if (!hasEmail) t.string('billing_email', 255).nullable().defaultTo(null);
      if (!hasNotes) t.text('notes').nullable();
    });
  }
};

exports.down = async function (knex) {
  await knex.schema.alterTable('tenants', (t) => {
    t.dropColumn('plan_expires_at');
    t.dropColumn('billing_email');
    t.dropColumn('notes');
  });
};

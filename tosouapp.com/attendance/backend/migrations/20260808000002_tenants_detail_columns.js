/**
 * Migration: Add detail columns to tenants table
 * address, phone, fax, license_number, representative, business_type
 */
exports.up = async function (knex) {
  await knex.schema.alterTable('tenants', (t) => {
    t.string('address', 500).nullable();
    t.string('phone', 64).nullable();
    t.string('fax', 64).nullable();
    t.string('license_number', 255).nullable();
    t.string('representative', 255).nullable();
    t.string('business_type', 255).nullable();
    t.text('description').nullable();
  });
  console.log('✅ Added detail columns to tenants');
};

exports.down = async function (knex) {
  await knex.schema.alterTable('tenants', (t) => {
    t.dropColumn('address');
    t.dropColumn('phone');
    t.dropColumn('fax');
    t.dropColumn('license_number');
    t.dropColumn('representative');
    t.dropColumn('business_type');
    t.dropColumn('description');
  });
};

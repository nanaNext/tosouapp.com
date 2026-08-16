/**
 * Migration: Multi-tenant support
 * - Creates tenants table
 * - Creates tenant_users mapping table (1 user can belong to multiple tenants)
 * - Adds tenant_id to users table (nullable initially, safe for prod)
 *
 * SAFE: All existing users get tenant_id = 1 (飯塚塗研) automatically.
 * Prod continues running normally until ENABLE_MULTI_TENANT=true is set.
 */

exports.up = async function (knex) {
  // 1. Create tenants table
  await knex.schema.createTable('tenants', (t) => {
    t.bigIncrements('id').unsigned().primary();
    t.string('name', 255).notNullable();           // 飯塚塗研株式会社
    t.string('slug', 64).unique().notNullable();    // iizuka, yamaguchi, hoshino, makealife
    t.string('logo_url', 500).nullable();           // /static/images/logo1.png
    t.string('logo_name', 255).nullable();          // display name on brand bar e.g. "IIZUKA"
    t.string('primary_color', 16).defaultTo('#0b5ed7');
    t.string('plan', 32).defaultTo('basic');
    t.enum('status', ['active', 'suspended', 'cancelled']).defaultTo('active');
    t.string('timezone', 64).defaultTo('Asia/Tokyo');
    t.string('locale', 8).defaultTo('ja');
    t.string('mail_from', 255).nullable();          // 会社ごとのメール送信者
    t.string('app_url', 255).nullable();            // 会社ごとのURL
    t.integer('max_users').defaultTo(200);
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // 2. Create tenant_users mapping: 1 user can belong to multiple tenants
  await knex.schema.createTable('tenant_users', (t) => {
    t.bigIncrements('id').unsigned().primary();
    t.bigInteger('user_id').unsigned().notNullable();
    t.bigInteger('tenant_id').unsigned().notNullable();
    t.string('role_in_tenant', 32).notNullable().defaultTo('employee'); // role override per tenant
    t.timestamp('granted_at').defaultTo(knex.fn.now());
    t.unique(['user_id', 'tenant_id']);
    t.index(['user_id']);
    t.index(['tenant_id']);
  });

  // 3. Add tenant_id to users (nullable = safe for prod, no data loss)
  const hasCol = await knex.schema.hasColumn('users', 'tenant_id');
  if (!hasCol) {
    await knex.schema.alterTable('users', (t) => {
      t.bigInteger('tenant_id').unsigned().nullable().after('id');
      t.index(['tenant_id'], 'idx_users_tenant');
    });
  }

  // 4. Seed 4 tenants
  await knex('tenants').insert([
    {
      id: 1,
      name: '飯塚塗研株式会社',
      slug: 'iizuka',
      logo_url: '/static/images/logo1.png',
      logo_name: 'IIZUKA',
      primary_color: '#0b5ed7',
      mail_from: process.env.MAIL_FROM || '"飯塚塗研株式会社" <iizuka_token@tosouapp.com>',
      app_url: process.env.APP_URL || 'https://tosouapp.com/',
      status: 'active',
    },
    {
      id: 2,
      name: '株式会社山口工業',
      slug: 'yamaguchi',
      logo_url: '/static/images/yamaguchi.png',
      logo_name: '山口工業',
      primary_color: '#0b5ed7',
      mail_from: null,
      app_url: null,
      status: 'active',
    },
    {
      id: 3,
      name: '星野建設株式会社',
      slug: 'hoshino',
      logo_url: '/static/images/Hoshino.png',
      logo_name: '星野建設',
      primary_color: '#0b5ed7',
      mail_from: null,
      app_url: null,
      status: 'active',
    },
    {
      id: 4,
      name: 'Make A Life株式会社',
      slug: 'makealife',
      logo_url: '/static/images/makeAlife.png',
      logo_name: 'Make A Life',
      primary_color: '#0b5ed7',
      mail_from: null,
      app_url: null,
      status: 'active',
    },
  ]);

  // 5. Assign all existing users to tenant 1 (飯塚塗研) — preserves prod data
  await knex.raw('UPDATE users SET tenant_id = 1 WHERE tenant_id IS NULL');

  // 6. Populate tenant_users for all existing users in tenant 1
  await knex.raw(`
    INSERT IGNORE INTO tenant_users (user_id, tenant_id, role_in_tenant)
    SELECT id, 1, role FROM users WHERE tenant_id = 1
  `);

  console.log('✅ Multi-tenant migration complete. All existing users assigned to tenant 1 (飯塚塗研).');
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('tenant_users');
  await knex.schema.dropTableIfExists('tenants');
  const hasCol = await knex.schema.hasColumn('users', 'tenant_id');
  if (hasCol) {
    await knex.schema.alterTable('users', (t) => {
      t.dropIndex([], 'idx_users_tenant');
      t.dropColumn('tenant_id');
    });
  }
};

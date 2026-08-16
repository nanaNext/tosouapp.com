/**
 * Migration: Add 'owner' to users.role enum
 * Safe: ALTER TABLE on enum just extends the set, no data loss.
 */
exports.up = async function (knex) {
  await knex.raw(`
    ALTER TABLE users
    MODIFY COLUMN role
      ENUM('admin','hr','employee','manager','sysadmin','payroll','owner')
      NOT NULL DEFAULT 'employee'
  `);
  console.log("✅ Added 'owner' to users.role enum");
};

exports.down = async function (knex) {
  // Remove 'owner' — only safe if no rows use 'owner'
  await knex.raw(`
    ALTER TABLE users
    MODIFY COLUMN role
      ENUM('admin','hr','employee','manager','sysadmin','payroll')
      NOT NULL DEFAULT 'employee'
  `);
};

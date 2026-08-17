/**
 * Script tạo owner cho một tenant
 * Chạy: node attendance/backend/scripts/create-owner.js
 *
 * Sửa các biến bên dưới trước khi chạy:
 */
const USERNAME    = 'Owner 山口';        // Tên hiển thị
const EMAIL       = 'owner-yamaguchi@tosouapp.com'; // Email đăng nhập
const PASSWORD    = 'OwnerPass@2026!';  // Mật khẩu
const TENANT_ID   = 2;                  // 1=飯塚, 2=山口, 3=星野, 4=MakeALife

// ─── Không cần sửa bên dưới ───────────────────────────────────────────────
require('./attendance/backend/src/config/loadEnv');
const db     = require('./attendance/backend/src/core/database/mysql');
const bcrypt = require('bcrypt');

async function run() {
  const hash       = bcrypt.hashSync(PASSWORD, 12);
  const emailLower = EMAIL.trim().toLowerCase();

  // Kiểm tra email trùng
  const [existing] = await db.query(
    'SELECT id FROM users WHERE email_lower = ?',
    [emailLower]
  );
  if (existing.length > 0) {
    console.error('❌ Email đã tồn tại! id =', existing[0].id);
    process.exit(1);
  }

  const [result] = await db.query(
    `INSERT INTO users
       (username, email, email_lower, password, role, tenant_id, employment_status, token_version)
     VALUES (?, ?, ?, ?, 'owner', ?, 'active', 1)`,
    [USERNAME, EMAIL, emailLower, hash, TENANT_ID]
  );

  // Thêm vào tenant_users để select-tenant hoạt động
  await db.query(
    `INSERT IGNORE INTO tenant_users (user_id, tenant_id, role_in_tenant)
     VALUES (?, ?, 'owner')`,
    [result.insertId, TENANT_ID]
  );

  console.log(`✅ Owner created! id=${result.insertId} email=${EMAIL} tenant_id=${TENANT_ID}`);
  process.exit(0);
}

run().catch(e => { console.error('❌', e.message); process.exit(1); });

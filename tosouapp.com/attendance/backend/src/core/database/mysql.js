const mysql = require('mysql2/promise');
require('../../config/loadEnv');
// Khởi tạo pool kết nối MySQL dùng mysql2 (promise)

const sslEnabled = String(process.env.DB_SSL || '').toLowerCase() === 'true';
const sslStrict = String(process.env.DB_SSL_STRICT || '').toLowerCase() === 'true';
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS || process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT || '3306', 10),
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_CONN_LIMIT || '200', 10),
  queueLimit: parseInt(process.env.DB_QUEUE_LIMIT || '0', 10),
  dateStrings: true,
  charset: 'utf8mb4',
  timezone: '+09:00',
  ssl: sslEnabled ? (sslStrict ? { rejectUnauthorized: true } : {}) : undefined
});

// Kiểm tra kết nối DB khi khởi động server (bỏ qua khi NODE_ENV=test để tránh log async trong môi trường test)
if (String(process.env.NODE_ENV || '').toLowerCase() !== 'test') {
  (async () => {
    try {
      const connection = await pool.getConnection();
      await connection.ping();
      console.log('✅ Kết nối MySQL thành công!');
      connection.release();
    } catch (err) {
      console.error('❌ Kết nối MySQL thất bại:', err.message);
      console.error('Kiểm tra biến môi trường DB_HOST/DB_USER/DB_PASS/DB_NAME');
    }
  })();
  
  // Keep-alive mechanism to prevent ETIMEDOUT on idle connections
  setInterval(async () => {
    try {
      const connection = await pool.getConnection();
      await connection.ping();
      connection.release();
    } catch (err) {
      console.error('[MySQL Keep-alive] Ping failed:', err.message);
    }
  }, 60000); // Ping every 1 minute
}

const origPoolQuery = pool.query.bind(pool);
pool.query = async function(...args) {
  const t0 = Date.now();
  const res = await origPoolQuery(...args);
  const dur = Date.now() - t0;
  if (dur > 200) {
    try {
      console.warn(JSON.stringify({ level: 'warn', type: 'slow_query', duration_ms: dur }));
      try { require('../metrics').inc('slow_query_count', 1); } catch (e) { console.error('[mysql.js] Swallowed error:', e); }
    } catch (e) { console.error('[mysql.js] Swallowed error:', e); }
  }
  return res;
};
const origGetConnection = pool.getConnection.bind(pool);
pool.getConnection = async function() {
  const conn = await origGetConnection();
  try {
    await conn.query(`SET NAMES utf8mb4`);
    try { await conn.query(`SET collation_connection = utf8mb4_0900_ai_ci`); } catch (e) { console.error('[mysql.js] Swallowed error:', e); }
    try { await conn.query(`SET time_zone = '+09:00'`); } catch (e) { console.error('[mysql.js] Swallowed error:', e); }
  } catch (e) { console.error('[mysql.js] Swallowed error:', e); }
  const origConnQuery = conn.query.bind(conn);
  conn.query = async function(...args) {
    const t0 = Date.now();
    const res = await origConnQuery(...args);
    const dur = Date.now() - t0;
    if (dur > 200) {
      try {
        console.warn(JSON.stringify({ level: 'warn', type: 'slow_query', duration_ms: dur }));
        try { require('../metrics').inc('slow_query_count', 1); } catch (e) { console.error('[mysql.js] Swallowed error:', e); }
      } catch (e) { console.error('[mysql.js] Swallowed error:', e); }
    }
    return res;
  };
  return conn;
};

module.exports = pool;

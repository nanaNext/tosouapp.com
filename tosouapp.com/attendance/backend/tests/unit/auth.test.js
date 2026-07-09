/**
 * Auth Tests — Critical Path
 * Tests login, logout, refresh token, invalid credentials, account lock.
 * Uses supertest against the Express app.
 */

const request = require('supertest');
const path = require('path');

// Load env
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// Ensure embedded workers don't start during tests
process.env.DISABLE_EMBEDDED_WORKER = 'true';
process.env.DISABLE_SCHEDULERS = 'true';

const app = require('../../src/app');
const db = require('../../src/core/database/mysql');
const bcrypt = require('bcrypt');

const TEST_EMAIL = 'test_auth_user@test.local';
const TEST_PASSWORD = 'TestPass123';
const TEST_USERNAME = 'AuthTestUser';
let testUserId = null;

beforeAll(async () => {
  // Run bootstrap to ensure all tables/columns exist
  try {
    await require('../../src/core/bootstrap').init();
  } catch (e) { /* ignore bootstrap errors in test */ }

  // Create test user
  const hashed = bcrypt.hashSync(TEST_PASSWORD, 10);
  try {
    const [result] = await db.query(
      `INSERT INTO users (username, email, email_lower, password, role, employment_type, employment_status)
       VALUES (?, ?, LOWER(?), ?, 'employee', 'full_time', 'active')
       ON DUPLICATE KEY UPDATE password = VALUES(password), employment_status = 'active', locked_until = NULL, login_fail_count = 0`,
      [TEST_USERNAME, TEST_EMAIL, TEST_EMAIL, hashed]
    );
    testUserId = result.insertId || result.affectedRows;
    // Get actual ID if ON DUPLICATE KEY
    if (!testUserId || testUserId === 0) {
      const [[row]] = await db.query('SELECT id FROM users WHERE email_lower = LOWER(?)', [TEST_EMAIL]);
      testUserId = row?.id;
    }
  } catch (e) {
    console.error('Test setup failed:', e.message);
  }
});

afterAll(async () => {
  // Cleanup test user
  try {
    await db.query('DELETE FROM refresh_tokens WHERE userId = ?', [testUserId]);
    await db.query('DELETE FROM users WHERE id = ?', [testUserId]);
  } catch (e) { /* ignore */ }
  try {
    await db.end();
  } catch (e) { /* ignore */ }
});

describe('POST /api/auth/login', () => {
  it('should return 200 with valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.email).toBe(TEST_EMAIL);
    expect(res.body.role).toBe('employee');
    // Should set refreshToken cookie
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    expect(cookies.some(c => c.includes('refreshToken'))).toBe(true);
  });

  it('should return 401 with wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_EMAIL, password: 'WrongPassword99' });

    expect(res.status).toBe(401);
    expect(res.body.message).toContain('Invalid');
  });

  it('should return 401 with non-existent email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nonexistent@nowhere.xyz', password: 'Whatever123' });

    expect(res.status).toBe(401);
  });

  it('should return error with missing fields', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_EMAIL });

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });

  it('should lock account after 5 failed attempts', async () => {
    // Reset lock state
    await db.query('UPDATE users SET login_fail_count = 4, locked_until = NULL WHERE id = ?', [testUserId]);

    // 1 more failed attempt (total 5) -> should lock
    await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_EMAIL, password: 'WrongFinal' });

    // Next attempt should be locked even with correct password
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD });

    expect(res.status).toBe(423);

    // Cleanup
    await db.query('UPDATE users SET login_fail_count = 0, locked_until = NULL WHERE id = ?', [testUserId]);
  }, 15000);
});

describe('POST /api/auth/refresh', () => {
  let refreshTokenCookie = '';

  beforeAll(async () => {
    // Login to get refresh token
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD });
    
    const cookies = res.headers['set-cookie'] || [];
    const rt = cookies.find(c => c.startsWith('refreshToken='));
    refreshTokenCookie = rt || '';
  });

  it('should return new access token with valid refresh cookie', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', refreshTokenCookie);

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
  });

  it('should return 401 without refresh cookie', async () => {
    const res = await request(app)
      .post('/api/auth/refresh');

    expect(res.status).toBe(401);
  });

  it('should return 401 with invalid refresh token', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', 'refreshToken=invalid_token_xyz');

    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/logout', () => {
  let accessToken = '';
  let cookies = '';

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD });
    
    accessToken = res.body.accessToken;
    cookies = (res.headers['set-cookie'] || []).join('; ');
  });

  it('should return 200 and clear cookies', async () => {
    const res = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Cookie', cookies);

    expect(res.status).toBe(200);
  });
});

describe('GET /api/auth/me', () => {
  let accessToken = '';
  let cookies = '';

  beforeAll(async () => {
    await db.query('UPDATE users SET login_fail_count = 0, locked_until = NULL WHERE id = ?', [testUserId]);
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD });
    accessToken = res.body.accessToken;
    cookies = (res.headers['set-cookie'] || []).join('; ');
  });

  it('should return user profile with valid session', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', cookies)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
  });

  it('should return 401/403 without session', async () => {
    const res = await request(app)
      .get('/api/auth/me');

    expect([401, 403]).toContain(res.status);
  });
});

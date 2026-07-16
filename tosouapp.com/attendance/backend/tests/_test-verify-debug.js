// Simulate the full registration flow to find exact error
require('../src/config/loadEnv');
const app = require('../src/app');
const request = require('supertest');

(async () => {
  // 1. Setup test user
  const db = require('../src/core/database/mysql');
  const bcrypt = require('bcrypt');
  const h = bcrypt.hashSync('TestPass123', 10);
  await db.query(
    `INSERT INTO users (username, email, email_lower, password, role, employment_type, employment_status)
     VALUES (?, ?, LOWER(?), ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE password=VALUES(password), employment_status='active', locked_until=NULL, login_fail_count=0`,
    ['WebAuthnTest', 'webauthn_test@test.local', 'webauthn_test@test.local', h, 'admin', 'full_time', 'active']
  );

  // 2. Login
  const login = await request(app).post('/api/auth/login').send({
    email: 'webauthn_test@test.local',
    password: 'TestPass123'
  });
  console.log('1. Login:', login.status);
  if (login.status !== 200) { console.log('   FAIL:', login.body); process.exit(1); }

  const cookies = (login.headers['set-cookie'] || []).join('; ');
  const token = login.body.accessToken;
  const email = login.body.email;

  // 3. Get register options
  const optRes = await request(app)
    .post('/api/webauthn/register/options')
    .set('Cookie', cookies)
    .set('Authorization', 'Bearer ' + token)
    .send({ email });
  console.log('2. Register options:', optRes.status);
  if (optRes.status !== 200) { console.log('   FAIL:', optRes.body); process.exit(1); }
  console.log('   Challenge:', optRes.body.challenge?.slice(0, 20) + '...');
  console.log('   RP ID:', optRes.body.rp?.id);

  // 4. Simulate browser response (fake — will fail verification but shows WHERE it fails)
  const fakeResponse = {
    id: 'fake_credential_id',
    rawId: 'ZmFrZV9jcmVkZW50aWFsX2lk',
    type: 'public-key',
    response: {
      attestationObject: 'o2NmbXRkbm9uZWdhdHRTdG10oGhhdXRoRGF0YVikSZYN5YgOjGh0NBcPZHZgW4_krrmihjLHmVzzuoMdl2NFAAAAAK3OAAI1vMYKZIsLJfHwVQMAIGZha2VfY3JlZGVudGlhbF9pZKUBAgMmIAEhWCAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACIlggAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      clientDataJSON: Buffer.from(JSON.stringify({
        type: 'webauthn.create',
        challenge: optRes.body.challenge,
        origin: 'http://127.0.0.1:3000'
      })).toString('base64url')
    }
  };

  // 5. Try verify
  const verRes = await request(app)
    .post('/api/webauthn/register/verify')
    .set('Cookie', cookies)
    .set('Authorization', 'Bearer ' + token)
    .send({ email, response: fakeResponse });
  console.log('3. Register verify:', verRes.status);
  console.log('   Response:', JSON.stringify(verRes.body).slice(0, 500));

  // Cleanup
  await db.query('DELETE FROM users WHERE email_lower = LOWER(?)', ['webauthn_test@test.local']);
  await db.end();
  process.exit(0);
})().catch(e => { console.log('FATAL:', e.message, e.stack?.slice(0, 300)); process.exit(1); });

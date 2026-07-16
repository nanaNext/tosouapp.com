require('../src/config/loadEnv');
const app = require('../src/app');
const request = require('supertest');

(async () => {
  // Login
  const login = await request(app).post('/api/auth/login').send({
    email: 'test_auth_user@test.local',
    password: 'TestPass123'
  });
  console.log('Login:', login.status, login.body?.email || login.body?.message);
  if (login.status !== 200) { process.exit(1); }

  const cookies = (login.headers['set-cookie'] || []).join('; ');
  const token = login.body.accessToken;

  // Register options
  const res = await request(app)
    .post('/api/webauthn/register/options')
    .set('Cookie', cookies)
    .set('Authorization', 'Bearer ' + token)
    .send({ email: login.body.email });

  console.log('Register:', res.status, JSON.stringify(res.body).slice(0, 300));
  process.exit(0);
})().catch(e => { console.log('ERR:', e.message, e.stack?.slice(0, 300)); process.exit(1); });

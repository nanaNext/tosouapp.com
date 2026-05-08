require('dotenv').config({ path: './attendance/backend/.env' });
const http = require('http');

const token = require('jsonwebtoken').sign({ id: 1, role: 'admin' }, process.env.JWT_SECRET_CURRENT);

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/admin/notifications/feed?limit=100',
  method: 'GET',
  headers: {
    'Cookie': 'jwt=' + token + '; ' + 'session=' + token
  }
};

const req = http.request(options, res => {
  console.log(`STATUS: ${res.statusCode}`);
  let data = '';
  res.on('data', chunk => { data += chunk; });
  res.on('end', () => {
    console.log('BODY:', data);
  });
});
req.end();
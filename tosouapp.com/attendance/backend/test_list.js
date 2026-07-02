const jwt = require('jsonwebtoken');
const token = jwt.sign({ userId: 1, role: 'admin' }, 'nana-secret-123456789', { expiresIn: '1d' });

const http = require('http');

http.get('http://localhost:3000/api/admin/work-reports/month/list?month=2026-07', {
  headers: {
    Authorization: 'Bearer ' + token,
    cookie: 'access_token=' + token
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log(data.slice(0, 1000)));
}).on('error', err => console.log("Error:", err.message));

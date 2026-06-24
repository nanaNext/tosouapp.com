const http = require('http');

const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/admin/work-reports?date=2026-06-24',
  method: 'GET',
  headers: {
    'Authorization': 'Bearer test'
  }
}, res => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => console.log(body));
});
req.end();

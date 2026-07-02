const http = require('http');

http.get('http://localhost:3000/api/admin/work-reports?date=2026-07-01', {
  headers: {
    // we need to mock admin role or pass a token. I'll just change the sql to not filter by role in the backend momentarily, or I'll just restart the server to see it in action.
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log(data));
}).on('error', err => console.log("Error:", err.message));

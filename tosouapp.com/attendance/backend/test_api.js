const http = require('http');

http.get('http://localhost:3000/api/attendance/today-roster?date=2026-07-01', {
  headers: {
    // Assuming the API requires auth, we might need a cookie. 
    // Let's just bypass auth in a mock or we can see the controller.
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log(data));
}).on('error', err => console.log("Error:", err.message));

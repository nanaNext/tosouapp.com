const http = require('http');

const options = {
  hostname: 'localhost',
  port: process.env.PORT || 3000,
  path: '/api/attendance/date/2026-06-05/daily',
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json'
    // I don't have the auth token, so I might need to bypass or mock it.
  }
};

// Instead of HTTP request, let's just test the exact controller function
const controller = require('./src/modules/attendance/attendance.controller');
const repo = require('./src/modules/attendance/attendance.repository');

async function test() {
  const req = {
    user: { id: 2, role: 'admin' },
    params: { date: '2026-06-05' },
    query: { userId: 2 },
    body: {
      location: '飯塚塗研',
      memo: ' ',
      notes: 'test reason from UI',
      lateMinutes: 15,
      earlyMinutes: null,
      kubun: '出勤',
      workType: 'onsite',
      breakMinutes: 60,
      nightBreakMinutes: 0
    }
  };
  
  const res = {
    status: function(code) {
      this.statusCode = code;
      return this;
    },
    json: function(data) {
      console.log('Response JSON:', data);
    }
  };

  try {
    await controller.putDaily(req, res);
    const daily = await repo.getDaily(2, '2026-06-05');
    console.log('DB Daily Notes:', daily?.notes);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

test();

const mysql = require('mysql2/promise');
async function run() {
  const conn = await mysql.createConnection({host:'localhost',user:'root',password:'1234567',database:'attendance_db'});
  const [rows] = await conn.query("SELECT @@global.time_zone, @@session.time_zone");
  console.log(rows);
  process.exit(0);
}
run();
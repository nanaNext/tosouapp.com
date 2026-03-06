const mysql = require('mysql2/promise');
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '1234567',
    database:'attendance_app',
    charset: 'utf8mb4'

})

module.exports = pool;

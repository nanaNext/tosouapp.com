// Khởi chạy toàn bộ Worker của hệ thống
// Khi deploy lên Production, file này có thể được chạy như một Process độc lập 
// (Ví dụ: `node attendance/backend/src/workers/index.js`) để tách biệt hoàn toàn khỏi Web API.

require('../config/loadEnv'); // Nạp biến môi trường

console.log('🚀 Khởi động hệ thống Background Workers...');

// Nạp các Worker
require('./email.worker');

console.log('✅ Hệ thống Worker đã sẵn sàng nhận việc từ Redis!');
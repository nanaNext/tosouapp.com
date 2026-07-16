// Khởi chạy toàn bộ Worker của hệ thống
// Khi deploy lên Production, file này có thể được chạy như một Process độc lập
// (Ví dụ: `node attendance/backend/src/workers/index.js`) để tách biệt hoàn toàn khỏi Web API.

require('../config/loadEnv');

const { isQueueAvailable } = require('../core/database/queue');

function startWorkers() {
  console.log('🚀 Khởi động hệ thống Background Workers...');

  if (!isQueueAvailable()) {
    console.warn('⚠️ [Worker Bootstrap] Redis chưa sẵn sàng hoặc queue chưa khả dụng, worker sẽ dừng ngay.');
    return false;
  }

  require('./email.worker');
  console.log('✅ Hệ thống Worker đã sẵn sàng nhận việc từ Redis!');
  return true;
}

if (require.main === module) {
  startWorkers();
}

module.exports = { startWorkers };
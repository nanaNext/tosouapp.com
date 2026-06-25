const Redis = require('ioredis');
require('../../config/loadEnv');

let redisClient = null;

const REDIS_URL = process.env.REDIS_URL;

if (REDIS_URL) {
  try {
    redisClient = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 1,
      retryStrategy(times) {
        if (times > 3) {
          console.warn('[Redis] Quá số lần kết nối lại, đang dùng fallback in-memory...');
          return null; // Stop retrying
        }
        return Math.min(times * 100, 3000);
      }
    });

    redisClient.on('connect', () => {
      console.log('✅ Kết nối Redis thành công!');
    });

    redisClient.on('error', (err) => {
      console.error('❌ Lỗi kết nối Redis:', err.message);
    });
  } catch (error) {
    console.error('❌ Không thể khởi tạo Redis:', error.message);
  }
} else {
  console.log('⚠️ Không tìm thấy REDIS_URL, hệ thống sẽ chạy ở chế độ In-Memory Fallback.');
}

module.exports = redisClient;

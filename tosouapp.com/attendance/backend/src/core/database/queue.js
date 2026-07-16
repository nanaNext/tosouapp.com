const { Queue, Worker, QueueEvents } = require('bullmq');
const redisClient = require('./redis');

const queueConfig = {
  connection: redisClient,
  defaultJobOptions: {
    attempts: 3, // Thử lại tối đa 3 lần nếu lỗi
    backoff: {
      type: 'exponential',
      delay: 2000 // Thử lại sau 2s, 4s, 8s...
    },
    removeOnComplete: true, // Xóa khỏi bộ nhớ Redis khi xong
    removeOnFail: false // Giữ lại để debug nếu thất bại hoàn toàn
  }
};

// Khởi tạo các hàng đợi (Queues)
const emailQueue = redisClient && redisClient.status === 'ready' 
  ? new Queue('email-queue', queueConfig) 
  : null;

const reportQueue = redisClient && redisClient.status === 'ready' 
  ? new Queue('report-queue', queueConfig) 
  : null;

const cronQueue = redisClient && redisClient.status === 'ready'
  ? new Queue('cron-queue', queueConfig)
  : null;

// Hàm hỗ trợ ném việc vào Queue an toàn
async function enqueueJob(queue, jobName, data, options = {}) {
  if (!queue) {
    console.warn(`[Queue] Fallback: Không có Redis, chạy ngay task ${jobName} trên main thread`);
    return null;
  }
  return await queue.add(jobName, data, options);
}

function isQueueAvailable() {
  return Boolean(redisClient && redisClient.status === 'ready');
}

module.exports = {
  emailQueue,
  reportQueue,
  cronQueue,
  enqueueJob,
  queueConfig,
  isQueueAvailable
};
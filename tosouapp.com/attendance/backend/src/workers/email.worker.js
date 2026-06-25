const { Worker } = require('bullmq');
const { queueConfig } = require('../core/database/queue');

// Giả lập một hàm gửi email mất 2 giây
async function sendEmailSimulated(data) {
  return new Promise(resolve => setTimeout(() => resolve(`Đã gửi email tới ${data.to}`), 2000));
}

if (!queueConfig.connection || queueConfig.connection.status !== 'ready') {
  console.log('⚠️ [Email Worker] Redis chưa sẵn sàng, Worker tạm dừng.');
} else {
  const emailWorker = new Worker('email-queue', async job => {
    console.log(`[Email Worker] Bắt đầu xử lý Job ID: ${job.id} - ${job.name}`);
    
    if (job.name === 'send-payslip-notification') {
      const result = await sendEmailSimulated(job.data);
      console.log(`[Email Worker] Job ID: ${job.id} hoàn thành: ${result}`);
      return result;
    }
    
  }, queueConfig);

  emailWorker.on('failed', (job, err) => {
    console.error(`[Email Worker] Job ID: ${job.id} thất bại: ${err.message}`);
  });

  console.log('✅ [Email Worker] Đang lắng nghe hàng đợi "email-queue"...');
}
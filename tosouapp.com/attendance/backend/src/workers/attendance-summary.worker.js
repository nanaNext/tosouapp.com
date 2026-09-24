const { Worker } = require('bullmq');
const { queueConfig } = require('../core/database/queue');

// 1テナント分の月次サマリー再計算 + 36協定アラート判定を処理するワーカー。
// runNightlyBatchAllTenants() がテナントごとに積んだジョブを、ここで並行して消化する。
if (!queueConfig.connection || queueConfig.connection.status !== 'ready') {
  console.log('⚠️ [Attendance Summary Worker] Redis chưa sẵn sàng, Worker tạm dừng.');
} else {
  const summaryWorker = new Worker('report-queue', async job => {
    if (job.name !== 'attendance-monthly-summary-recompute') return null;
    const { tenantId } = job.data || {};
    console.log(`[Attendance Summary Worker] Bắt đầu xử lý tenant ${tenantId} (Job ID: ${job.id})`);
    const summaryService = require('../modules/attendance/attendance.summary.service');
    const result = await summaryService.runNightlyBatch({ tenantId });
    console.log(`[Attendance Summary Worker] Tenant ${tenantId} hoàn thành: dirty=${result.dirtyProcessed}, alerts=${result.currentMonth?.alertsSent ?? 0}`);
    return result;
  }, { ...queueConfig, concurrency: 3 }); // 3テナントまで同時実行 (DB接続を食い過ぎないよう抑える)

  summaryWorker.on('failed', (job, err) => {
    console.error(`[Attendance Summary Worker] Job ID: ${job.id} (tenant ${job?.data?.tenantId}) thất bại: ${err.message}`);
  });

  console.log('✅ [Attendance Summary Worker] Đang lắng nghe hàng đợi "report-queue" (attendance-monthly-summary-recompute)...');
}

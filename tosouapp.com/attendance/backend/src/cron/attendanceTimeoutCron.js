const pool = require('../core/database/mysql');

/**
 * Quét và đóng các ca làm việc đã mở quá 12 tiếng mà không có check-out.
 * Chống rác dữ liệu và ngăn chặn ghép sai ca làm việc ngày hôm sau.
 */
async function processMissingCheckouts() {
  try {
    console.log('[AttendanceTimeout] Bắt đầu quét các ca quên check-out quá 12 tiếng...');
    
    // Tìm và cập nhật các bản ghi chưa check-out và đã qua 12h kể từ lúc check-in
    // Lưu ý: Cần điều chỉnh tên bảng 'attendance_records' cho đúng với schema thực tế của bạn
    const [result] = await pool.query(`
      UPDATE attendance_records 
      SET 
        status = 'missing_checkout',
        notes = CONCAT(IFNULL(notes, ''), ' [Hệ thống tự động đóng ca do quá 12h]')
      WHERE check_out IS NULL 
        AND check_in < NOW() - INTERVAL 12 HOUR
    `);
    
    if (result.affectedRows > 0) {
      console.log(`[AttendanceTimeout] Đã đóng thành công ${result.affectedRows} ca quên check-out.`);
      // TODO: Có thể tích hợp gọi hàm gửi notification cho User/Manager tại đây
    } else {
      console.log('[AttendanceTimeout] Không phát hiện ca nào quá hạn.');
    }
  } catch (error) {
    console.error('[AttendanceTimeout] Lỗi khi xử lý timeout ca làm việc:', error);
  }
}

function initAttendanceTimeoutCron() {
  // Chạy lần đầu ngay khi worker khởi động
  processMissingCheckouts();
  
  // Thiết lập chạy định kỳ mỗi 1 tiếng (3600000 ms)
  setInterval(processMissingCheckouts, 60 * 60 * 1000);
  console.log('[AttendanceTimeout] Đã đăng ký cron quét quên check-out (1h/lần).');
}

module.exports = { processMissingCheckouts, initAttendanceTimeoutCron };

const pool = require('./mysql');

/**
 * Chạy một callback function bên trong một MySQL Transaction nguyên tử.
 * Tự động COMMIT nếu thành công, và tự động ROLLBACK nếu có lỗi.
 * 
 * @param {Function} callback Hàm bất đồng bộ nhận vào đối tượng connection đã mở transaction
 * @param {Object} options Tùy chọn cho transaction
 * @param {string} options.isolationLevel Mức độ cô lập (vd: 'READ COMMITTED', 'REPEATABLE READ')
 * @returns Kết quả của callback
 */
async function withTransaction(callback, options = {}) {
  const connection = await pool.getConnection();
  
  try {
    // Thiết lập Isolation Level nếu có yêu cầu (Rất quan trọng cho Optimistic Locking)
    if (options.isolationLevel) {
      await connection.query(`SET TRANSACTION ISOLATION LEVEL ${options.isolationLevel}`);
    }
    
    await connection.beginTransaction();
    
    // Chạy các queries với connection này
    const result = await callback(connection);
    
    await connection.commit();
    return result;
  } catch (error) {
    // Bắt lỗi và rollback
    try {
      await connection.rollback();
      console.warn('[UnitOfWork] Transaction Rollback thành công do lỗi nghiệp vụ:', error.message);
    } catch (rollbackError) {
      console.error('[UnitOfWork] CRITICAL: Lỗi khi Rollback!', rollbackError);
    }
    throw error;
  } finally {
    // Luôn luôn trả connection về pool, bất chấp commit hay rollback thành công hay không
    connection.release();
  }
}

module.exports = { withTransaction };

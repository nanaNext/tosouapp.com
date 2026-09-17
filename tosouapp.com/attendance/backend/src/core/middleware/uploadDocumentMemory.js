const multer = require('multer');

// Memory storage (not disk) vì cần Buffer để đẩy thẳng lên R2, giống cách
// uploadPdf.js làm cho payslip. Chấp nhận ảnh + PDF như upload.js dùng chung
// cho toàn hệ thống (ID card scan, hợp đồng, chứng chỉ...).
const storage = multer.memoryStorage();

const uploadDocumentMemory = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const ok = file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf';
    if (ok) cb(null, true);
    else cb(new Error('Chỉ cho phép upload ảnh hoặc PDF!'), false);
  }
});

module.exports = uploadDocumentMemory;

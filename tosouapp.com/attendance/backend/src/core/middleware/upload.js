const multer = require('multer');
const path = require('path');
const fs = require('fs');

function extFromMime(mime) {
  const m = String(mime || '').toLowerCase();
  if (m === 'image/jpeg' || m === 'image/jpg') return '.jpg';
  if (m === 'image/png') return '.png';
  if (m === 'image/webp') return '.webp';
  if (m === 'image/gif') return '.gif';
  if (m === 'application/pdf') return '.pdf';
  return '';
}

// Cấu hình nơi lưu file và tên file
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, '../../uploads/');
    try { fs.mkdirSync(dir, { recursive: true }); } catch {}
    cb(null, dir); // Thư mục lưu file
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extRaw = path.extname(String(file.originalname || '')).toLowerCase();
    const ext = extRaw || extFromMime(file.mimetype) || '';
    cb(null, `${uniqueSuffix}${ext}`);
  }
});

// Giới hạn loại file và dung lượng (ảnh điện thoại thường lớn hơn 2MB)
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const ok = file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf';
    if (ok) cb(null, true);
    else cb(new Error('Chỉ cho phép upload ảnh hoặc PDF!'), false);
  }
});

module.exports = upload;

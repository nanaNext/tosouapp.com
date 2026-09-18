const multer = require('multer');
const path = require('path');

// Memory storage (not disk) — files never touch the ephemeral local disk, they
// go straight to R2 as a Buffer (with local-disk fallback only when R2 isn't
// configured, e.g. local dev). Used for avatars, employee profile photos and
// expense receipts, which previously used core/middleware/upload.js (disk
// storage) and were lost on every Render redeploy (no persistent disk there).
const uploadMemory = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const ok = file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf';
    if (ok) cb(null, true);
    else cb(new Error('Chỉ cho phép upload ảnh hoặc PDF!'), false);
  }
});

function extFromMime(mime) {
  const m = String(mime || '').toLowerCase();
  if (m === 'image/jpeg' || m === 'image/jpg') return '.jpg';
  if (m === 'image/png') return '.png';
  if (m === 'image/webp') return '.webp';
  if (m === 'image/gif') return '.gif';
  if (m === 'application/pdf') return '.pdf';
  return '';
}

// Bảo mật: Ép buộc đuôi file theo đúng mimetype để tránh upload mã độc
// (ví dụ: .html, .php) — không tin tưởng phần mở rộng client gửi lên.
function safeFilename(file) {
  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
  let ext = extFromMime(file.mimetype);
  if (!ext) {
    const extRaw = path.extname(String(file.originalname || '')).toLowerCase();
    ext = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.pdf'].includes(extRaw) ? extRaw : '.bin';
  }
  return `${uniqueSuffix}${ext}`;
}

module.exports = { uploadMemory, safeFilename };

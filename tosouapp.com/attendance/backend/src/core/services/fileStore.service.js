const fs = require('fs');
const path = require('path');
const s3Service = require('./s3.service');

// Historical flat "uploads/" root used by avatars, employee profile photos and
// expense receipts (see core/middleware/upload.js). Kept as the local-dev /
// R2-unavailable fallback so filenames already referenced by existing DB rows
// keep resolving.
const LOCAL_UPLOAD_ROOT = path.join(__dirname, '../../uploads');

/**
 * Store an uploaded file buffer. Prefers R2 (tenant-prefixed key); falls back
 * to the local uploads/ root when R2 isn't configured or the upload fails —
 * same reasoning as modules/employee/employee.routes.js's document upload.
 * @param {{buffer: Buffer, mimetype: string, tenantId: number|null, category: string, filename: string}} args
 * @returns {Promise<{key: string, storedOnR2: boolean}>}
 */
async function storeUploadedFile({ buffer, mimetype, tenantId, category, filename }) {
  const tid = tenantId || 0;
  const key = `${category}/${tid}/${filename}`;
  if (s3Service.isR2Configured()) {
    const ok = await s3Service.uploadToR2(key, buffer, mimetype);
    if (ok) return { key, storedOnR2: true };
  }
  fs.mkdirSync(LOCAL_UPLOAD_ROOT, { recursive: true });
  fs.writeFileSync(path.join(LOCAL_UPLOAD_ROOT, filename), buffer);
  return { key, storedOnR2: false };
}

/**
 * Read a previously stored file back as a Buffer. Tries R2 first (current
 * tenant-prefixed key, then the legacy no-tenant-prefix key for anything
 * migrated before tenantId was known), then falls back to local disk.
 * @param {{tenantId: number|null, category: string, filename: string}} args
 * @returns {Promise<Buffer|null>}
 */
async function readUploadedFile({ tenantId, category, filename }) {
  if (!filename) return null;
  const safeName = path.basename(String(filename));
  if (s3Service.isR2Configured()) {
    const tid = tenantId || 0;
    let buf = await s3Service.downloadFromR2(`${category}/${tid}/${safeName}`).catch(() => null);
    if (!buf) buf = await s3Service.downloadFromR2(`${category}/${safeName}`).catch(() => null);
    if (buf) return buf;
  }
  const p = path.join(LOCAL_UPLOAD_ROOT, safeName);
  if (fs.existsSync(p)) return fs.readFileSync(p);
  return null;
}

/**
 * Delete a previously stored file from both R2 (current + legacy key) and
 * local disk. Best-effort — a missing file on either side is not an error.
 */
async function deleteUploadedFile({ tenantId, category, filename }) {
  if (!filename) return;
  const safeName = path.basename(String(filename));
  if (s3Service.isR2Configured()) {
    const tid = tenantId || 0;
    await s3Service.deleteFromR2(`${category}/${tid}/${safeName}`).catch(() => {});
    await s3Service.deleteFromR2(`${category}/${safeName}`).catch(() => {});
  }
  try {
    const p = path.join(LOCAL_UPLOAD_ROOT, safeName);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  } catch (e) { /* silently ignored */ }
}

module.exports = { storeUploadedFile, readUploadedFile, deleteUploadedFile, LOCAL_UPLOAD_ROOT };

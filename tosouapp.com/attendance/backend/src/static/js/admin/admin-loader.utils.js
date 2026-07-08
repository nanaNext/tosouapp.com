/**
 * admin-loader.utils.js
 * Dynamic module loader với cache cho admin SPA.
 * Tách ra từ admin.page.js để dễ bảo trì.
 */

// Đọc asset version từ <meta name="asset-v"> hoặc window.__assetV
const assetV = (() => {
  try {
    const meta = document.querySelector('meta[name="asset-v"]');
    const v = meta ? (meta.getAttribute('content') || '') : '';
    if (v) return String(v);
  } catch (e) { /* silently ignored */ }
  try {
    const v2 = window.__assetV;
    return v2 ? String(v2) : '';
  } catch (e) { /* silently ignored */ }
  return '';
})();

/**
 * Thêm ?v=xxx vào path nếu chưa có — tránh cache cũ trên production
 */
export const withAssetV = (path) => {
  const p = String(path || '');
  if (!assetV) return p;
  if (!p) return p;
  if (p.includes('v=')) return p;
  return p + (p.includes('?') ? '&' : '?') + 'v=' + encodeURIComponent(assetV);
};

const moduleCache = new Map();

/**
 * Tạo loadModule function gắn với import.meta.url của caller.
 * Dùng như sau trong admin.page.js:
 *   import { createLoader } from './admin-loader.utils.js';
 *   const loadModule = createLoader(import.meta.url);
 *
 * @param {string} callerImportMetaUrl - import.meta.url của file gọi
 */
export const createLoader = (callerImportMetaUrl) => {
  return async (path) => {
    const spec = withAssetV(path);
    let url = '';
    try { url = new URL(spec, callerImportMetaUrl).href; } catch { url = String(spec || ''); }
    const key = String(url || '');
    if (moduleCache.has(key)) return moduleCache.get(key);
    const p = (async () => {
      try {
        return await import(url);
      } catch (e) {
        const msg = String((e && e.message) ? e.message : (e || 'unknown'));
        throw new Error(`Module load failed: ${url || spec}\n${msg}`);
      }
    })();
    moduleCache.set(key, p);
    return p;
  };
};

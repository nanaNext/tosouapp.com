/**
 * Input Sanitization Middleware
 * Strips dangerous HTML/script tags from request body fields.
 * Prevents stored XSS attacks without external dependencies.
 * 
 * Usage:
 *   app.use(sanitizeInput()); // Global
 *   router.post('/api/data', sanitizeInput(), handler); // Per-route
 */

// HTML entities to escape
const ESCAPE_MAP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/**
 * Escape HTML special characters
 */
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ESCAPE_MAP[c] || c);
}

const xss = require('xss');

const myXss = new xss.FilterXSS({
  whiteList: xss.getDefaultWhiteList(), // Cho phép các thẻ HTML an toàn cơ bản
  stripIgnoreTag: true, // Xóa luôn các thẻ không nằm trong whitelist thay vì escape
  stripIgnoreTagBody: ['script', 'style', 'iframe', 'object', 'embed'] // Xóa toàn bộ nội dung của các thẻ nguy hiểm
});

/**
 * Strip script tags and event handlers (aggressive)
 */
function stripDangerous(str) {
  return myXss.process(String(str));
}

/**
 * Recursively sanitize an object's string values
 */
function sanitizeValue(value, options = {}) {
  if (value === null || value === undefined) return value;
  if (typeof value === 'number' || typeof value === 'boolean') return value;

  if (typeof value === 'string') {
    let sanitized = stripDangerous(value);
    if (options.escapeHtml) {
      sanitized = escapeHtml(sanitized);
    }
    return sanitized.trim();
  }

  if (Array.isArray(value)) {
    return value.map(v => sanitizeValue(v, options));
  }

  if (typeof value === 'object') {
    const result = {};
    for (const key of Object.keys(value)) {
      result[key] = sanitizeValue(value[key], options);
    }
    return result;
  }

  return value;
}

/**
 * Express middleware
 * @param {Object} options
 * @param {boolean} options.escapeHtml - Also escape HTML entities (default: false, only strip dangerous)
 * @param {string[]} options.excludeFields - Fields to skip sanitization (e.g., 'password', 'html_content')
 */
function sanitizeInput(options = {}) {
  const { escapeHtml: doEscape = false, excludeFields = ['password', 'currentPassword', 'newPassword'] } = options;
  const excludeSet = new Set(excludeFields);

  return (req, res, next) => {
    if (req.body && typeof req.body === 'object') {
      for (const key of Object.keys(req.body)) {
        if (excludeSet.has(key)) continue; // Don't sanitize passwords
        req.body[key] = sanitizeValue(req.body[key], { escapeHtml: doEscape });
      }
    }

    if (req.query && typeof req.query === 'object') {
      for (const key of Object.keys(req.query)) {
        if (typeof req.query[key] === 'string') {
          req.query[key] = stripDangerous(req.query[key]).trim();
        }
      }
    }

    if (req.params && typeof req.params === 'object') {
      for (const key of Object.keys(req.params)) {
        if (typeof req.params[key] === 'string') {
          req.params[key] = stripDangerous(req.params[key]).trim();
        }
      }
    }

    next();
  };
}

module.exports = { sanitizeInput, escapeHtml, stripDangerous, sanitizeValue };

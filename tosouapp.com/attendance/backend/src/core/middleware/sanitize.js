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

/**
 * Strip script tags and event handlers (aggressive)
 */
function stripDangerous(str) {
  let s = String(str);
  // Remove <script>...</script> tags
  s = s.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  // Remove on* event handlers in tags
  s = s.replace(/\bon\w+\s*=\s*["'][^"']*["']/gi, '');
  s = s.replace(/\bon\w+\s*=\s*[^\s>]*/gi, '');
  // Remove javascript: protocol
  s = s.replace(/javascript\s*:/gi, '');
  // Remove data: protocol in links (potential XSS)
  s = s.replace(/data\s*:\s*text\/html/gi, '');
  return s;
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

/**
 * Structured Logger
 * Output JSON logs for production (easy to parse by log aggregators).
 * Human-readable in development.
 * 
 * Usage:
 *   const log = require('./core/logger');
 *   log.info('Server started', { port: 3000 });
 *   log.warn('Slow query', { duration_ms: 520, query: 'SELECT...' });
 *   log.error('DB connection failed', { error: err.message });
 */

const IS_PROD = String(process.env.NODE_ENV || '').toLowerCase() === 'production';

function formatTimestamp() {
  return new Date().toISOString();
}

function serialize(level, message, meta = {}) {
  const entry = {
    timestamp: formatTimestamp(),
    level,
    message: String(message || ''),
    ...meta
  };

  // Add request context if available
  if (meta.request_id) entry.request_id = meta.request_id;
  if (meta.user_id) entry.user_id = meta.user_id;

  if (IS_PROD) {
    // JSON format for production (Render logs, log aggregators)
    return JSON.stringify(entry);
  }

  // Human-readable for development
  const metaStr = Object.keys(meta).length > 0 ? ' ' + JSON.stringify(meta) : '';
  return `[${entry.timestamp}] [${level.toUpperCase()}] ${entry.message}${metaStr}`;
}

const logger = {
  info(message, meta) {
    console.log(serialize('info', message, meta));
  },

  warn(message, meta) {
    console.warn(serialize('warn', message, meta));
  },

  error(message, meta) {
    // Include stack trace if error object provided
    if (meta && meta.error instanceof Error) {
      meta.error_message = meta.error.message;
      meta.stack = meta.error.stack;
      delete meta.error;
    } else if (meta && meta.error && typeof meta.error === 'string') {
      meta.error_message = meta.error;
      delete meta.error;
    }
    console.error(serialize('error', message, meta));
  },

  debug(message, meta) {
    if (!IS_PROD) {
      console.debug(serialize('debug', message, meta));
    }
  },

  /**
   * Express middleware: attach logger to req for request-scoped logging
   */
  middleware() {
    return (req, res, next) => {
      req.log = {
        info: (msg, m) => logger.info(msg, { request_id: req.id, user_id: req.user?.id, ...m }),
        warn: (msg, m) => logger.warn(msg, { request_id: req.id, user_id: req.user?.id, ...m }),
        error: (msg, m) => logger.error(msg, { request_id: req.id, user_id: req.user?.id, ...m }),
      };
      next();
    };
  }
};

module.exports = logger;

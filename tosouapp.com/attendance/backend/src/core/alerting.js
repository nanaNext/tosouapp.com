const metrics = require('./metrics');
const logger = require('./logger');

function alert(name, details = {}) {
  metrics.inc(`alert_${name}`, 1);
  logger.warn(`alert:${name}`, { alert: name, ...details });
}

function trackRequest(req, res, startTime) {
  const durationMs = Date.now() - startTime;
  metrics.observe('http_request_duration_ms', durationMs);
  if (durationMs > 1000) {
    alert('slow_request', { path: req.path, method: req.method, duration_ms: durationMs, status: res.statusCode });
  }
}

function trackError(context, error) {
  metrics.inc('application_errors', 1);
  alert('application_error', { context, message: error?.message || String(error) });
}

module.exports = { alert, trackRequest, trackError };

const buckets = new Map();

function getClientIp(req) {
  const xf = String(req.headers['x-forwarded-for'] || '').split(',')[0]?.trim();
  return String(req.ip || xf || 'unknown');
}

function resolveIdentity(req, keyBy = 'ip') {
  const mode = String(keyBy || 'ip').toLowerCase();
  const userId = req?.user?.id;
  if ((mode === 'user' || mode === 'user_or_ip') && userId != null && userId !== '') {
    return `u:${String(userId)}`;
  }
  return `ip:${getClientIp(req)}`;
}

function key(req, keyBy = 'ip') {
  const rawPath = String(req.originalUrl || req.baseUrl || req.url || '');
  const path = rawPath.split('?')[0] || '';
  const method = String(req.method || 'GET').toUpperCase();
  const identity = resolveIdentity(req, keyBy);
  return `${method}:${path}:${identity}`;
}

function rateLimit({ windowMs = 60_000, max = 10, keyBy = 'ip' } = {}) {
  return (req, res, next) => {
    const k = key(req, keyBy);
    const now = Date.now();
    const bucket = buckets.get(k) || [];
    const fresh = bucket.filter(ts => now - ts < windowMs);
    if (fresh.length >= max) {
      try { require('../metrics').inc('rate_limit_hits', 1); } catch {}
      return res.status(429).json({ message: 'Too many requests' });
    }
    fresh.push(now);
    buckets.set(k, fresh);
    next();
  };
}
function rateLimitNamed(name, defaults = {}) {
  const base = 'RATE_' + String(name || '').toUpperCase().replace(/[^A-Z0-9_]/g, '_');
  const defW = defaults.windowMs != null ? Number(defaults.windowMs) : 60_000;
  const defM = defaults.max != null ? Number(defaults.max) : 10;
  const defKeyBy = String(defaults.keyBy || 'ip');
  const w = parseInt(process.env[`${base}_WINDOW_MS`] || process.env.RATE_WINDOW_MS || String(defW), 10) || defW;
  const m = parseInt(process.env[`${base}_MAX`] || process.env.RATE_MAX || String(defM), 10) || defM;
  const keyBy = String(process.env[`${base}_KEY_BY`] || defKeyBy).toLowerCase();
  return rateLimit({ windowMs: w, max: m, keyBy });
}
module.exports = { rateLimit, rateLimitNamed };

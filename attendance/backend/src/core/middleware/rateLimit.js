const buckets = new Map();
function key(req) {
  const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
  return `login:${ip}`;
}
function rateLimit({ windowMs = 60_000, max = 10 } = {}) {
  return (req, res, next) => {
    const k = key(req);
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
module.exports = { rateLimit };

const redisClient = require('../database/redis');

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
  return `ratelimit:${method}:${path}:${identity}`;
}

function rateLimit({ windowMs = 60_000, max = 600, keyBy = 'user_or_ip' } = {}) {
  return async (req, res, next) => {
    const k = key(req, keyBy);
    const now = Date.now();

    if (redisClient && redisClient.status === 'ready') {
      try {
        const windowStart = now - windowMs;
        const pipeline = redisClient.pipeline();
        
        // 1. Xóa các request cũ ngoài cửa sổ thời gian
        pipeline.zremrangebyscore(k, 0, windowStart);
        // 2. Đếm số lượng request còn lại trong cửa sổ
        pipeline.zcard(k);
        // 3. Thêm request hiện tại vào (dùng now làm score và value, nối thêm random để chống trùng)
        pipeline.zadd(k, now, `${now}-${Math.random()}`);
        // 4. Set thời gian hết hạn cho key để tự động dọn rác
        pipeline.pexpire(k, windowMs);

        const results = await pipeline.exec();
        // results[1] là kết quả của zcard
        const requestCount = results[1][1];

        if (requestCount >= max) {
          try { require('../metrics').inc('rate_limit_hits', 1); } catch (e) { /* silently ignored */ }
          return res.status(429).json({ message: 'Too many requests' });
        }
        return next();
      } catch (err) {
        console.error('[RateLimit] Redis error, fallback to in-memory:', err.message);
        // Fallback xuống In-Memory nếu Redis có lỗi đột xuất
      }
    }

    // In-Memory Fallback
    const bucket = buckets.get(k) || [];
    const fresh = bucket.filter(ts => now - ts < windowMs);
    if (fresh.length >= max) {
      try { require('../metrics').inc('rate_limit_hits', 1); } catch (e) { /* silently ignored */ }
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
  const defM = defaults.max != null ? Number(defaults.max) : 600;
  const defKeyBy = String(defaults.keyBy || 'user_or_ip');
  const w = parseInt(process.env[`${base}_WINDOW_MS`] || process.env.RATE_WINDOW_MS || String(defW), 10) || defW;
  const m = parseInt(process.env[`${base}_MAX`] || process.env.RATE_MAX || String(defM), 10) || defM;
  const keyBy = String(process.env[`${base}_KEY_BY`] || defKeyBy).toLowerCase();
  return rateLimit({ windowMs: w, max: m, keyBy });
}
module.exports = { rateLimit, rateLimitNamed };

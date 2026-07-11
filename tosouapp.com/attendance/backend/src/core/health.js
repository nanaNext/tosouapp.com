const metrics = require('./metrics');

async function checkRedis(redis) {
  if (!redis) {
    return true;
  }
  try {
    if (typeof redis.ping !== 'function') {
      return String(redis.status || '').toLowerCase() === 'ready';
    }
    const result = await redis.ping();
    return result === 'PONG';
  } catch (error) {
    console.error('[Health Check] Redis ping error:', error.message);
    return false;
  }
}

function registerHealthRoutes(app, deps = {}) {
  const db = deps.db || null;
  const redis = deps.redis || null;

  app.get('/healthz', async (req, res) => {
    try {
      const dbOk = db && typeof db.ping === 'function' ? await db.ping() : true;
      const redisOk = await checkRedis(redis);
      const ready = Boolean(dbOk && redisOk);
      res.status(200).json({
        status: ready ? 'ok' : 'degraded',
        service: 'attendance-backend',
        timestamp: new Date().toISOString(),
        dependencies: {
          db: dbOk ? 'ok' : 'error',
          redis: redisOk ? 'ok' : 'error'
        },
        checks: {
          live: true,
          ready
        }
      });
    } catch (error) {
      res.status(200).json({ status: 'degraded', service: 'attendance-backend', error: error.message, dependencies: { db: 'error', redis: 'error' }, checks: { live: true, ready: false } });
    }
  });

  app.get('/readyz', async (req, res) => {
    try {
      const dbOk = db && typeof db.ping === 'function' ? await db.ping() : true;
      const redisOk = await checkRedis(redis);
      const ready = Boolean(dbOk && redisOk);
      res.status(ready ? 200 : 503).json({ ready, timestamp: new Date().toISOString(), dependencies: { db: dbOk ? 'ok' : 'error', redis: redisOk ? 'ok' : 'error' } });
    } catch (error) {
      res.status(503).json({ ready: false, error: error.message });
    }
  });

  app.get('/metrics', (req, res) => {
    res.status(200).json(metrics.snapshot());
  });
}

module.exports = { registerHealthRoutes };

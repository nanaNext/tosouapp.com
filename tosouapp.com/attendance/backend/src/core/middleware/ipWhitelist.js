/**
 * IP Whitelist Middleware
 * Restricts admin panel access to specified IPs only.
 * 
 * Set env: ADMIN_IP_WHITELIST=203.0.113.1,203.0.113.2
 * If empty/unset → allow all (no restriction)
 * 
 * Usage:
 *   app.use('/api/admin', ipWhitelist(), adminRoutes);
 */

const log = require('../logger');

function getClientIp(req) {
  const xf = String(req.headers['x-forwarded-for'] || '').split(',')[0]?.trim();
  return xf || req.ip || req.connection?.remoteAddress || 'unknown';
}

function ipWhitelist() {
  const whitelist = String(process.env.ADMIN_IP_WHITELIST || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  // If no whitelist configured, allow all
  if (whitelist.length === 0) {
    return (req, res, next) => next();
  }

  const allowedSet = new Set(whitelist);
  // Always allow localhost
  allowedSet.add('127.0.0.1');
  allowedSet.add('::1');
  allowedSet.add('::ffff:127.0.0.1');

  return (req, res, next) => {
    const ip = getClientIp(req);

    if (allowedSet.has(ip)) return next();

    // Check subnet patterns (e.g., "192.168.1.*")
    for (const pattern of whitelist) {
      if (pattern.includes('*')) {
        const prefix = pattern.replace(/\*/g, '');
        if (ip.startsWith(prefix)) return next();
      }
    }

    log.warn('IP blocked from admin', { ip, path: req.path });
    return res.status(403).json({ message: 'Access denied: IP not allowed' });
  };
}

module.exports = { ipWhitelist };

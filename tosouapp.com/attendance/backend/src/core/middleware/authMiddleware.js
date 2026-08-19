const jwt = require('jsonwebtoken');
const userRepo = require('../../modules/users/user.repository');
const redisClient = require('../database/redis');
const { normalizeRole } = require('../../utils/normalizeRole');
// Middleware xác thực và phân quyền dựa trên JWT

const tokenVersionCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 phút

const lastActiveTouch = new Map();
const touchMinMs = Math.max(5_000, Number.parseInt(process.env.LAST_ACTIVE_TOUCH_MIN_MS || '60000', 10) || 60_000);

function nextUrl(req) {
  try {
    return String(req.originalUrl || req.url || '/');
  } catch {
    return '/';
  }
}

function redirectToLogin(req, res) {
  const next = nextUrl(req);
  const target = '/ui/login' + (next ? ('?next=' + encodeURIComponent(next)) : '');
  return res.redirect(302, target);
}

async function getCachedUser(id) {
  const now = Date.now();
  
  // Dùng Redis nếu có
  if (redisClient && redisClient.status === 'ready') {
    const redisKey = `auth:user:${id}`;
    try {
      const cachedData = await redisClient.get(redisKey);
      if (cachedData) {
        return JSON.parse(cachedData);
      }
    } catch (err) {
      console.error('[AuthCache] Redis error, fallback to DB:', err.message);
    }
  } else {
    // In-memory fallback
    const cached = tokenVersionCache.get(id);
    if (cached && (now - cached.timestamp < CACHE_TTL_MS)) {
      return cached.user;
    }
  }

  const user = await userRepo.getUserById(id);
  
  if (user) {
    const userDataToCache = {
      id: user.id,
      role: user.role,
      token_version: user.token_version,
      email: user.email,
      username: user.username,
      departmentId: user.departmentId || null,
      branchId: user.branch_id || null
    };

    if (redisClient && redisClient.status === 'ready') {
      try {
        await redisClient.setex(`auth:user:${id}`, Math.floor(CACHE_TTL_MS / 1000), JSON.stringify(userDataToCache));
      } catch (err) {
        console.error('[AuthCache] Lỗi khi lưu Redis:', err.message);
      }
    } else {
      tokenVersionCache.set(id, { 
        user: userDataToCache, 
        timestamp: now 
      });
      
      if (tokenVersionCache.size > 2000) {
        for (const [k, v] of tokenVersionCache.entries()) {
          if (now - v.timestamp >= CACHE_TTL_MS) tokenVersionCache.delete(k);
        }
      }
    }
  }
  
  return user;
}

/**
 * Immediately invalidates the cached user entry so the next request re-reads
 * from DB. Call this whenever token_version is bumped (password change, admin
 * revoke, role change) so the revocation takes effect without waiting for TTL.
 * @param {number|string} id
 */
async function invalidateUserCache(id) {
  if (!id) return;
  const uid = String(id);
  // Clear in-memory fallback
  tokenVersionCache.delete(uid);
  // Clear Redis cache
  if (redisClient && redisClient.status === 'ready') {
    try {
      await redisClient.del(`auth:user:${uid}`);
    } catch (err) {
      console.error('[AuthCache] Failed to invalidate Redis cache for user', uid, err.message);
    }
  }
}

async function authenticateToken(token) {
  const secrets = [
    process.env.JWT_SECRET_CURRENT || process.env.JWT_SECRET,
    process.env.JWT_SECRET_PREVIOUS || ''
  ].filter(Boolean);
  let decoded = null;
  for (const s of secrets) {
    try {
      decoded = jwt.verify(token, s);
      break;
    } catch (e) { /* silently ignored */ }
  }
  if (!decoded) {
    const err = new Error('Invalid or expired token');
    err.status = 403;
    throw err;
  }
  const user = await getCachedUser(decoded.id);
  const dbVersion = user?.token_version || 1;
  const tokenVersion = decoded?.v || 1;
  if (!user || dbVersion !== tokenVersion) {
    const err = new Error('Invalid token version');
    err.status = 401;
    throw err;
  }
  return {
    id: user.id,
    // When JWT has tid (after select-tenant), use role from JWT.
    // This allows owner to act as admin within a specific tenant.
    // When no tid, fall back to DB role (normal login flow).
    role: normalizeRole(decoded?.tid ? (decoded.role || user.role) : (user.role || decoded.role)),
    v: dbVersion,
    email: user.email,
    username: user.username,
    departmentId: user.departmentId || null,
    branchId: user.branchId || user.branch_id || null,
    tid: decoded?.tid ? parseInt(String(decoded.tid), 10) : null,
    _impersonate: !!decoded?._impersonate,
  };
}

async function attachUserActivity(req, fallbackDecoded) {
  try {
    const uid = String(req.user?.id || fallbackDecoded?.id || '');
    const now = Date.now();
    const prev = lastActiveTouch.get(uid) || 0;
    if (uid && (now - prev) >= touchMinMs) {
      lastActiveTouch.set(uid, now);
      void userRepo.touchLastActive(uid).catch(() => {});
    }
  } catch (e) { /* silently ignored */ }
}

async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  let token = '';
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else {
    token = req.cookies?.session_token || '';
  }
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }
  try {
    req.user = await authenticateToken(token);
  } catch (e) {
    try { console.error('auth_db_error', e && e.message ? e.message : e); } catch (e) { /* silently ignored */ }
    return res.status(Number(e?.status || 401)).json({ message: e?.message || 'Unauthorized' });
  }
  await attachUserActivity(req, req.user);
  next();
}

async function authenticateFromCookie(req, res, next) {
  const token = req.cookies?.session_token;
  if (!token) {
    return redirectToLogin(req, res);
  }
  try {
    req.user = await authenticateToken(token);
  } catch {
    return redirectToLogin(req, res);
  }
  await attachUserActivity(req, req.user);
  next();
}


// Phân quyền theo role
function authorize(...allowedRoles) {
    const { normalizeRole, roleLevel } = require('../../utils/normalizeRole');
    const allowedNorm = (allowedRoles || []).map(r => normalizeRole(r));
    const allowed = new Set(allowedNorm);
    // Minimum level required = lowest level among allowed roles
    const minRequired = Math.min(...allowedNorm.map(r => roleLevel(r)));
    return (req, res, next) => {
        const role = normalizeRole(req.user?.role);
        const level = roleLevel(role);
        // sysadmin (level 100) and owner (level 80) pass everything
        // _impersonate flag means sysadmin acting as admin in a tenant → still has sysadmin access
        const ok = level >= 80 || req.user?._impersonate || (role && allowed.has(role));
        if (!ok) {
            return res.status(403).json({ message: 'Forbidden: Access denied' });
        }
        next();
    };
}

module.exports = { authenticate, authenticateFromCookie, authorize, invalidateUserCache };

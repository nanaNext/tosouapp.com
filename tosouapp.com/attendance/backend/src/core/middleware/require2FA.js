/**
 * 2FA Enforcement Middleware
 * 
 * For admin/manager accounts that have registered a passkey:
 * - Login with password only gives a temporary "pending_2fa" session
 * - Full access requires completing WebAuthn verification
 * 
 * Usage:
 *   router.use('/admin', require2FA, adminRoutes);
 * 
 * Flow:
 *   1. User login with email/password → if has passkey → response includes `requires2FA: true`
 *   2. Frontend prompts for WebAuthn verification
 *   3. User verifies → gets full session token
 *   4. Without 2FA completion, admin routes return 403
 */

const passkeyRepo = require('../../modules/webauthn/webauthn.repository');

// Cache: userId → hasPasskeys (avoid DB hit every request)
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function userHasPasskeys(userId) {
  const now = Date.now();
  const cached = cache.get(userId);
  if (cached && (now - cached.ts) < CACHE_TTL) return cached.val;

  try {
    const passkeys = await passkeyRepo.listUserPasskeys(userId);
    const has = passkeys && passkeys.length > 0;
    cache.set(userId, { val: has, ts: now });
    // Cleanup old cache entries
    if (cache.size > 500) {
      for (const [k, v] of cache) {
        if (now - v.ts > CACHE_TTL) cache.delete(k);
      }
    }
    return has;
  } catch (e) {
    return false; // Fail open — don't block if DB error
  }
}

/**
 * Middleware: check if current session has completed 2FA
 * Only enforces for admin/manager with registered passkeys.
 * 
 * JWT payload includes `mfa: true` when 2FA is completed.
 */
function require2FA(req, res, next) {
  // Only enforce for admin/manager
  const role = String(req.user?.role || '').toLowerCase();
  if (role !== 'admin' && role !== 'manager') return next();

  // If token already has mfa flag, pass through
  if (req.user?.mfa === true) return next();

  // Check async if user has passkeys registered
  userHasPasskeys(req.user?.id).then(has => {
    if (!has) return next(); // No passkeys registered — don't enforce
    // Has passkeys but session doesn't have mfa flag → block
    return res.status(403).json({
      message: '2FAが必要です。パスキーで認証してください。',
      code: '2FA_REQUIRED',
      requires2FA: true
    });
  }).catch(() => next()); // Fail open
}

/**
 * Helper: check if user needs 2FA (used in login response)
 */
async function check2FARequired(userId, role) {
  const r = String(role || '').toLowerCase();
  if (r !== 'admin' && r !== 'manager') return false;
  return userHasPasskeys(userId);
}

module.exports = { require2FA, check2FARequired, userHasPasskeys };

module.exports = (app) => {
  const crypto = require('crypto');

  const allowedOrigins = String(process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  const isBrowserUA = (ua) => {
    const s = String(ua || '').toLowerCase();
    if (!s) return false;
    if (/(postman|insomnia|curl|httpie)/i.test(s)) return false;
    return /(mozilla|applewebkit|chrome|safari|android|iphone|ipad|edg|edge)/i.test(s);
  };

  const isAllowedOrigin = (req, origin) => {
    if (!origin) return true;
    if (allowedOrigins.includes(origin)) return true;
    try {
      const u = new URL(origin);
      const host = String(req.headers.host || '').toLowerCase();
      return host && u.host.toLowerCase() === host;
    } catch { return false; }
  };

  // --- SECURITY HEADERS ---
  app.disable('x-powered-by');

  app.use((req, res, next) => {
    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // XSS protection (legacy browsers)
    res.setHeader('X-XSS-Protection', '1; mode=block');
    // Referrer policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    // Permissions policy (disable unnecessary features)
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self), payment=()');
    // HSTS (if enabled)
    if (String(process.env.ENABLE_HSTS || '').toLowerCase() === 'true') {
      const hstsValue = process.env.HSTS_VALUE || 'max-age=31536000; includeSubDomains';
      res.setHeader('Strict-Transport-Security', hstsValue);
    }
    // Content Security Policy (relaxed for inline scripts/styles in admin SPA)
    res.setHeader('Content-Security-Policy', [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com https://cdn.jsdelivr.net",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' https://api.resend.com",
      "frame-ancestors 'self'"
    ].join('; '));
    next();
  });

  // --- CSRF TOKEN ---
  app.use((req, res, next) => {
    if (req.method === 'GET') {
      const has = req.cookies && req.cookies.csrfToken;
      if (!has) {
        const token = crypto.randomBytes(16).toString('hex');
        try {
          const xfProto = String(req.headers['x-forwarded-proto'] || '').toLowerCase();
          const isHttps = xfProto.includes('https') || (req.protocol === 'https');
          res.cookie('csrfToken', token, {
            httpOnly: false,
            sameSite: 'Lax',
            secure: isHttps,
            path: '/'
          });
        } catch (e) { /* silently ignored */ }
      }
    }
    next();
  });
  app.use((req, res, next) => {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      const enforceCsrf = String(process.env.ENFORCE_CSRF || '').toLowerCase() === 'true';
      const origin = req.headers.origin || '';
      const path = String(req.path || '');
      const original = String(req.originalUrl || req.url || '');
      
      // Bỏ qua check CSRF chỉ cho route login (vì lúc này chưa có token)
      if (path.includes('/api/auth/login') || original.includes('/api/auth/login')) {
        return next();
      }
      
      const skipCsrf = false; // Xóa ngoại lệ cho toàn bộ /api/auth/ để bảo vệ route reset mật khẩu, đăng ký, v.v.
        
      if (!isAllowedOrigin(req, origin)) {
        return res.status(403).json({ message: 'Forbidden: invalid origin' });
      }
      
      // Strict CSRF check: Enforce token validation regardless of sameHost
      if (enforceCsrf && !skipCsrf) {
        const csrfHeader = req.headers['x-csrf-token'];
        const csrfCookie = req.cookies?.csrfToken;
        if (!csrfHeader || !csrfCookie || csrfHeader !== csrfCookie) {
          return res.status(401).json({ message: 'CSRF validation failed' });
        }
      }
    }
    next();
  });
};

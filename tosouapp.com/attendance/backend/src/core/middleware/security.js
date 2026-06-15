module.exports = (app) => {
  const crypto = require('crypto');
  // Lấy biến môi trường allowes_origins, tách thành mảng dựa trên dấu phẩy, trim khoảng trắng, loại bỏ chuỗi rỗng
  // Kết quả là bạn có danh sách domain được phép gửi request đến API
  const allowedOrigins = String(process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
    // Kiểm tra user-agent có phải browser hay ko, nếu ua rỗng ko phải browser, nếu chứa postman , curl, insomnia ko phải browser, nếu chứa mozilla, chrome, safari, edge là browser
    // Mục đích chặn request từ script/tool ko phải trình duyệt

  const isBrowserUA = (ua) => {
    const s = String(ua || '').toLowerCase();
    if (!s) return false;
    if (/(postman|insomnia|curl|httpie)/i.test(s)) return false;
    return /(mozilla|applewebkit|chrome|safari|android|iphone|ipad|edg|edge)/i.test(s);
  };
  // Kiểm tra Origin có hợp lệ không, nếu request ko có origin, cho phép thường là mobile app hoặc curl, nếu origin nằm trong danh sách cho phép thì ok , nếu origin có cùng host với server thì ok nếu parse URL lỗi thì từ chối
  // Mục đích chống fake origin header

  const isAllowedOrigin = (req, origin) => {
    if (!origin) return true;
    if (allowedOrigins.includes(origin)) return true;
    try {
      const u = new URL(origin);
      const host = String(req.headers.host || '').toLowerCase();
      return host && u.host.toLowerCase() === host;
    } catch { return false; }
  };
  // Tắt header"X-Powered-By"
  // Ý nghĩa ko để lộ server dùng Express để tăng bảo mật
  app.disable('x-powered-by');
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

const repo = require('./settings.repository');
const caches = new Map(); // tenantKey -> {cache, cachedAt}
let globalCache = null; // fallback for tenantId=null
let globalCachedAt = 0;
const TTL_MS = 5000;

function _k(tenantId) {
  return tenantId == null ? '__default__' : String(tenantId);
}
function _tid(tenantId) {
  return tenantId != null ? parseInt(String(tenantId), 10) : null;
}

module.exports = {
  async getFlags(tenantId = null) {
    const tid = _tid(tenantId);
    const now = Date.now();
    const key = _k(tid);
    if (tid == null) {
      if (!globalCache || now - globalCachedAt > TTL_MS) {
        globalCache = await repo.getFlags(null);
        globalCachedAt = now;
      }
      return globalCache;
    }
    const entry = caches.get(key);
    if (!entry || now - entry.cachedAt > TTL_MS) {
      const cache = await repo.getFlags(tid);
      caches.set(key, { cache, cachedAt: now });
      return cache;
    }
    return entry.cache;
  },
  async setFlags(payload, tenantId = null) {
    const tid = _tid(tenantId);
    await repo.updateFlags({
      maintenanceMode: String(payload.MAINTENANCE_MODE || payload.maintenanceMode || '').toLowerCase() === 'true',
      disablePayslipUpload: String(payload.DISABLE_PAYSLIP_UPLOAD || payload.disablePayslipUpload || '').toLowerCase() === 'true',
      disablePayslipDownload: String(payload.DISABLE_PAYSLIP_DOWNLOAD || payload.disablePayslipDownload || '').toLowerCase() === 'true',
      lockLoginExceptSuper: String(payload.LOCK_LOGIN_EXCEPT_SUPER || payload.lockLoginExceptSuper || '').toLowerCase() === 'true',
      remotePolicy: String(payload.REMOTE_POLICY || payload.remotePolicy || 'anywhere'),
      requireGPS: String(payload.REQUIRE_GPS || payload.requireGPS || 'true').toLowerCase() === 'true',
      minAccuracyMeters: Number(payload.MIN_ACCURACY_METERS || payload.minAccuracyMeters || 100),
      requireNoteOnRemote: String(payload.REQUIRE_NOTE_ON_REMOTE || payload.requireNoteOnRemote || 'false').toLowerCase() === 'true',
      countryWhitelist: payload.COUNTRY_WHITELIST != null ? String(payload.COUNTRY_WHITELIST) : (payload.countryWhitelist != null ? String(payload.countryWhitelist) : null),
      maxDevicesPerUser: Number(payload.MAX_DEVICES_PER_USER || payload.maxDevicesPerUser || 5),
      tenantId: tid
    });
    const cache = await repo.getFlags(tid);
    const now = Date.now();
    if (tid == null) {
      globalCache = cache;
      globalCachedAt = now;
    } else {
      caches.set(_k(tid), { cache, cachedAt: now });
    }
    return cache;
  },
  async reload(tenantId = null) {
    const tid = _tid(tenantId);
    const cache = await repo.getFlags(tid);
    const now = Date.now();
    if (tid == null) {
      globalCache = cache;
      globalCachedAt = now;
    } else {
      caches.set(_k(tid), { cache, cachedAt: now });
    }
    return cache;
  }
};

const db = require('../../core/database/mysql');

function _tid(tenantId) {
  return tenantId != null ? parseInt(String(tenantId), 10) : null;
}

module.exports = {
  async ensureFlagsSchema() {
    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS settings (
          id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          tenant_id BIGINT UNSIGNED NULL UNIQUE,
          workStart CHAR(5) NULL,
          workEnd CHAR(5) NULL,
          breakMinutes INT NULL,
          rounding VARCHAR(16) NULL,
          MAINTENANCE_MODE TINYINT(1) DEFAULT 0,
          DISABLE_PAYSLIP_UPLOAD TINYINT(1) DEFAULT 0,
          DISABLE_PAYSLIP_DOWNLOAD TINYINT(1) DEFAULT 0,
          LOCK_LOGIN_EXCEPT_SUPER TINYINT(1) DEFAULT 0,
          REMOTE_POLICY VARCHAR(32) DEFAULT 'anywhere',
          REQUIRE_GPS TINYINT(1) DEFAULT 1,
          MIN_ACCURACY_METERS INT DEFAULT 100,
          REQUIRE_NOTE_ON_REMOTE TINYINT(1) DEFAULT 0,
          COUNTRY_WHITELIST VARCHAR(255) NULL,
          MAX_DEVICES_PER_USER INT DEFAULT 5,
          INDEX idx_settings_tid (tenant_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
    } catch (e) { /* table may already exist with legacy schema */ }
    try {
      const [cols] = await db.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = DATABASE() AND table_name = 'settings'
      `);
      const set = new Set((cols || []).map(c => String(c.column_name)));
      const alters = [];
      if (!set.has('tenant_id')) alters.push(`ADD COLUMN tenant_id BIGINT UNSIGNED NULL`);
      if (!set.has('MAINTENANCE_MODE')) alters.push(`ADD COLUMN MAINTENANCE_MODE TINYINT(1) DEFAULT 0`);
      if (!set.has('DISABLE_PAYSLIP_UPLOAD')) alters.push(`ADD COLUMN DISABLE_PAYSLIP_UPLOAD TINYINT(1) DEFAULT 0`);
      if (!set.has('DISABLE_PAYSLIP_DOWNLOAD')) alters.push(`ADD COLUMN DISABLE_PAYSLIP_DOWNLOAD TINYINT(1) DEFAULT 0`);
      if (!set.has('LOCK_LOGIN_EXCEPT_SUPER')) alters.push(`ADD COLUMN LOCK_LOGIN_EXCEPT_SUPER TINYINT(1) DEFAULT 0`);
      if (!set.has('REMOTE_POLICY')) alters.push(`ADD COLUMN REMOTE_POLICY VARCHAR(32) DEFAULT 'anywhere'`);
      if (!set.has('REQUIRE_GPS')) alters.push(`ADD COLUMN REQUIRE_GPS TINYINT(1) DEFAULT 1`);
      if (!set.has('MIN_ACCURACY_METERS')) alters.push(`ADD COLUMN MIN_ACCURACY_METERS INT DEFAULT 100`);
      if (!set.has('REQUIRE_NOTE_ON_REMOTE')) alters.push(`ADD COLUMN REQUIRE_NOTE_ON_REMOTE TINYINT(1) DEFAULT 0`);
      if (!set.has('COUNTRY_WHITELIST')) alters.push(`ADD COLUMN COUNTRY_WHITELIST VARCHAR(255) NULL`);
      if (!set.has('MAX_DEVICES_PER_USER')) alters.push(`ADD COLUMN MAX_DEVICES_PER_USER INT DEFAULT 5`);
      if (alters.length) {
        await db.query(`ALTER TABLE settings ${alters.join(', ')}`);
      }
      try { await db.query(`ALTER TABLE settings ADD UNIQUE INDEX idx_settings_tid (tenant_id)`); } catch (e) { /* index exists */ }
      // Migrate legacy id=1 row to tenant_id if needed
      try {
        const [legacy] = await db.query(`SELECT id, tenant_id FROM settings WHERE id = 1 LIMIT 1`);
        if (legacy && legacy.length && (legacy[0].tenant_id == null)) {
          await db.query(`UPDATE settings SET tenant_id = 1 WHERE id = 1 AND tenant_id IS NULL LIMIT 1`);
        }
      } catch (e) { /* ignore */ }
      // Ensure tenant 1 row always exists
      const [rows] = await db.query(`SELECT id FROM settings WHERE tenant_id = 1 OR id = 1 LIMIT 1`);
      if (!rows || !rows.length) {
        await db.query(`INSERT INTO settings (tenant_id) VALUES (1)`);
      }
    } catch (e) { /* silently ignored */ }
  },
  async getSettings(tenantId = null) {
    const tid = _tid(tenantId);
    const where = tid != null ? `WHERE tenant_id = ?` : `WHERE id = 1`;
    const params = tid != null ? [tid] : [];
    const sql = `SELECT * FROM settings ${where} LIMIT 1`;
    const [rows] = await db.query(sql, params);
    if (rows && rows.length) return rows[0];
    // If tenant settings don't exist yet, create them on read
    if (tid != null) {
      try {
        await db.query(`INSERT IGNORE INTO settings (tenant_id) VALUES (?)`, [tid]);
        const [r2] = await db.query(`SELECT * FROM settings WHERE tenant_id = ? LIMIT 1`, [tid]);
        if (r2 && r2.length) return r2[0];
      } catch (e) { /* ignore */ }
    }
    return null;
  },

  async updateSettings(data, tenantId = null) {
    const tid = _tid(tenantId);
    if (tid != null) {
      await db.query(`INSERT IGNORE INTO settings (tenant_id) VALUES (?)`, [tid]);
    }
    const where = tid != null ? `tenant_id = ?` : `id = 1`;
    const params = tid != null ? [tid] : [];
    const sql = `
      UPDATE settings 
      SET workStart = ?, workEnd = ?, breakMinutes = ?, rounding = ?
      WHERE ${where}
    `;
    await db.query(sql, [
      data.workStart,
      data.workEnd,
      data.breakMinutes,
      data.rounding,
      ...params
    ]);
  },
  async getFlags(tenantId = null) {
    const tid = _tid(tenantId);
    const where = tid != null ? `WHERE tenant_id = ?` : `WHERE id = 1`;
    const params = tid != null ? [tid] : [];
    const [rows] = await db.query(`
      SELECT MAINTENANCE_MODE, DISABLE_PAYSLIP_UPLOAD, DISABLE_PAYSLIP_DOWNLOAD, LOCK_LOGIN_EXCEPT_SUPER,
             REMOTE_POLICY, REQUIRE_GPS, MIN_ACCURACY_METERS, REQUIRE_NOTE_ON_REMOTE, COUNTRY_WHITELIST, MAX_DEVICES_PER_USER
      FROM settings ${where} LIMIT 1
    `, params);
    const r = rows && rows[0] ? rows[0] : {};
    return {
      maintenanceMode: !!Number(r.MAINTENANCE_MODE || 0),
      disablePayslipUpload: !!Number(r.DISABLE_PAYSLIP_UPLOAD || 0),
      disablePayslipDownload: !!Number(r.DISABLE_PAYSLIP_DOWNLOAD || 0),
      lockLoginExceptSuper: !!Number(r.LOCK_LOGIN_EXCEPT_SUPER || 0),
      remotePolicy: String(r.REMOTE_POLICY || 'anywhere'),
      requireGPS: !!Number(r.REQUIRE_GPS || 0),
      minAccuracyMeters: Number(r.MIN_ACCURACY_METERS || 100),
      requireNoteOnRemote: !!Number(r.REQUIRE_NOTE_ON_REMOTE || 0),
      countryWhitelist: String(r.COUNTRY_WHITELIST || ''),
      maxDevicesPerUser: Number(r.MAX_DEVICES_PER_USER || 5)
    };
  },
  async updateFlags({ maintenanceMode, disablePayslipUpload, disablePayslipDownload, lockLoginExceptSuper, remotePolicy, requireGPS, minAccuracyMeters, requireNoteOnRemote, countryWhitelist, maxDevicesPerUser, tenantId }) {
    const tid = _tid(tenantId);
    if (tid != null) {
      await db.query(`INSERT IGNORE INTO settings (tenant_id) VALUES (?)`, [tid]);
    }
    const m = maintenanceMode ? 1 : 0;
    const u = disablePayslipUpload ? 1 : 0;
    const d = disablePayslipDownload ? 1 : 0;
    const l = lockLoginExceptSuper ? 1 : 0;
    const rp = String(remotePolicy || 'anywhere');
    const rg = requireGPS ? 1 : 0;
    const acc = Number.isFinite(minAccuracyMeters) ? Number(minAccuracyMeters) : 100;
    const rn = requireNoteOnRemote ? 1 : 0;
    const cw = countryWhitelist != null ? String(countryWhitelist).slice(0, 255) : null;
    const md = Number.isFinite(maxDevicesPerUser) ? Number(maxDevicesPerUser) : 5;
    const where = tid != null ? `tenant_id = ?` : `id = 1`;
    const params = tid != null ? [tid] : [];
    await db.query(`
      UPDATE settings 
      SET MAINTENANCE_MODE = ?, DISABLE_PAYSLIP_UPLOAD = ?, DISABLE_PAYSLIP_DOWNLOAD = ?, LOCK_LOGIN_EXCEPT_SUPER = ?,
          REMOTE_POLICY = ?, REQUIRE_GPS = ?, MIN_ACCURACY_METERS = ?, REQUIRE_NOTE_ON_REMOTE = ?, COUNTRY_WHITELIST = ?, MAX_DEVICES_PER_USER = ?
      WHERE ${where}
    `, [m, u, d, l, rp, rg, acc, rn, cw, md, ...params]);
  }
};

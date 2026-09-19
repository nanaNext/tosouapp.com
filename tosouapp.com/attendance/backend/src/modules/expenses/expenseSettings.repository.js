const db = require('../../core/database/mysql');

function _tid(tenantId) {
  return (tenantId != null ? parseInt(String(tenantId), 10) : null) ?? 1;
}

// 国税庁の「マイカー・自転車通勤者の通勤手当」非課税限度額の目安値。
// テナントが expense_mileage_tiers に行を持たない場合のフォールバック。
const DEFAULT_MILEAGE_TIERS = [
  { minKm: 0, maxKm: 2, taxFreeAmount: 0 },
  { minKm: 2, maxKm: 10, taxFreeAmount: 4200 },
  { minKm: 10, maxKm: 15, taxFreeAmount: 7100 },
  { minKm: 15, maxKm: 25, taxFreeAmount: 12900 },
  { minKm: 25, maxKm: 35, taxFreeAmount: 18700 },
  { minKm: 35, maxKm: 45, taxFreeAmount: 24400 },
  { minKm: 45, maxKm: 55, taxFreeAmount: 28000 },
  { minKm: 55, maxKm: null, taxFreeAmount: 31600 }
];

const DEFAULT_DEADLINE_ALERT_DAYS = 30;

module.exports = {
  DEFAULT_MILEAGE_TIERS,
  DEFAULT_DEADLINE_ALERT_DAYS,

  async getDeadlineAlertDays(tenantId = null) {
    const tid = _tid(tenantId);
    const [rows] = await db.query(`SELECT deadline_alert_days FROM expense_settings WHERE tenant_id = ? LIMIT 1`, [tid]);
    if (rows && rows[0]) return Number(rows[0].deadline_alert_days);
    return DEFAULT_DEADLINE_ALERT_DAYS;
  },

  async getMileageTiers(tenantId = null) {
    const tid = _tid(tenantId);
    const [rows] = await db.query(
      `SELECT min_km, max_km, tax_free_amount FROM expense_mileage_tiers WHERE tenant_id = ? ORDER BY sort_order ASC, min_km ASC`,
      [tid]
    );
    if (!rows || !rows.length) return DEFAULT_MILEAGE_TIERS;
    return rows.map(r => ({
      minKm: Number(r.min_km),
      maxKm: r.max_km == null ? null : Number(r.max_km),
      taxFreeAmount: Number(r.tax_free_amount)
    }));
  },

  async getSettings(tenantId = null) {
    const [deadlineAlertDays, mileageTiers] = await Promise.all([
      this.getDeadlineAlertDays(tenantId),
      this.getMileageTiers(tenantId)
    ]);
    return { deadlineAlertDays, mileageTiers };
  },

  async upsertDeadlineAlertDays(tenantId, days, updatedBy = null) {
    const tid = _tid(tenantId);
    const n = Math.max(0, parseInt(String(days), 10) || 0);
    await db.query(
      `INSERT INTO expense_settings (tenant_id, deadline_alert_days, updated_by)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE deadline_alert_days = VALUES(deadline_alert_days), updated_by = VALUES(updated_by)`,
      [tid, n, updatedBy || null]
    );
    return n;
  },

  async replaceMileageTiers(tenantId, tiers) {
    const tid = _tid(tenantId);
    const list = Array.isArray(tiers) ? tiers : [];
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query(`DELETE FROM expense_mileage_tiers WHERE tenant_id = ?`, [tid]);
      let order = 0;
      for (const t of list) {
        const minKm = Number(t.minKm);
        const maxKm = t.maxKm === null || t.maxKm === '' || t.maxKm === undefined ? null : Number(t.maxKm);
        const taxFreeAmount = Math.max(0, Number(t.taxFreeAmount) || 0);
        if (!Number.isFinite(minKm) || minKm < 0) continue;
        await conn.query(
          `INSERT INTO expense_mileage_tiers (tenant_id, min_km, max_km, tax_free_amount, sort_order) VALUES (?, ?, ?, ?, ?)`,
          [tid, minKm, maxKm, taxFreeAmount, order]
        );
        order += 1;
      }
      await conn.commit();
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
    return this.getMileageTiers(tenantId);
  }
};

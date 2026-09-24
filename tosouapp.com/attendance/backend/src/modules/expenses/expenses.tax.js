const db = require('../../core/database/mysql');
const salaryRepo = require('../salary/salary.repository');
const settingsRepo = require('./expenseSettings.repository');

function _tid(tenantId) {
  return tenantId != null ? parseInt(String(tenantId), 10) : null;
}

async function getCommuteAllowanceLimit(month, tenantId) {
  const year = parseInt(String(month || '').slice(0, 4), 10) || new Date().getFullYear();
  const config = await salaryRepo.getConfigByYear(year, tenantId);
  if (config && config.commute_allowance_tax_free_limit != null) {
    return Number(config.commute_allowance_tax_free_limit);
  }
  return 150000;
}

function findTier(tiers, km) {
  const distance = Number(km) || 0;
  for (const t of tiers) {
    const min = Number(t.minKm);
    const max = t.maxKm == null ? Infinity : Number(t.maxKm);
    if (distance >= min && distance < max) return t;
  }
  return tiers.length ? tiers[tiers.length - 1] : null;
}

// 電車・バスは月額上限（salary_config.commute_allowance_tax_free_limit）と比較し、
// マイカー等は片道距離ごとの非課税額テーブルと比較して、超過分を課税対象として合算する。
// 対象は「その月にアクティブな（却下されていない）申請」の合計 — 1件ずつではなく月単位で判定する。

// users.allowance_transport（給与の固定月額通勤手当）向け。expense_claims の申請単位ではなく
// 1つの月額だけを判定する点が computeTaxableForUserMonth と異なるが、同じ非課税基準
// （電車・バスの月額上限／マイカー等の距離別テーブル）を再利用して二重基準にならないようにする。
async function computeTransportAllowanceTaxable(amount, method, distanceKm, month, tenantId = null) {
  const amt = Number(amount) || 0;
  if (amt <= 0) return { taxableAmount: 0, nonTaxableAmount: 0, limit: 0 };
  if (String(method) === 'vehicle') {
    const tiers = await settingsRepo.getMileageTiers(tenantId);
    const tier = findTier(tiers, distanceKm);
    const limit = tier ? Number(tier.taxFreeAmount) : 0;
    const taxableAmount = Math.max(0, amt - limit);
    return { taxableAmount, nonTaxableAmount: amt - taxableAmount, limit };
  }
  const limit = await getCommuteAllowanceLimit(month, tenantId);
  const taxableAmount = Math.max(0, amt - limit);
  return { taxableAmount, nonTaxableAmount: amt - taxableAmount, limit };
}

module.exports = {
  getCommuteAllowanceLimit,
  findTier,
  computeTransportAllowanceTaxable,

  async computeTaxableForUserMonth(userId, month, tenantId = null) {
    const tid = _tid(tenantId);
    const tenantClause = tid != null ? ' AND tenant_id = ?' : '';
    const params = [userId, String(month).slice(0, 7)];
    if (tid != null) params.push(tid);
    const [rows] = await db.query(
      `SELECT type, category, amount, distance_km FROM expense_claims
       WHERE userId = ? AND DATE_FORMAT(date, '%Y-%m') = ?${tenantClause}
         AND status IN ('applied','soumu_checked','approved','paid')`,
      params
    );

    const [commuteLimit, mileageTiers] = await Promise.all([
      getCommuteAllowanceLimit(month, tenantId),
      settingsRepo.getMileageTiers(tenantId)
    ]);

    let trainBusTotal = 0;
    const mileageByDistance = new Map();

    for (const r of rows || []) {
      const type = String(r.type || '').toLowerCase();
      const category = String(r.category || '').toLowerCase();
      const amount = Number(r.amount || 0);
      const isCar = type === 'car' || category === 'private_car';
      if (isCar) {
        const km = r.distance_km == null ? 0 : Number(r.distance_km);
        mileageByDistance.set(km, (mileageByDistance.get(km) || 0) + amount);
      } else if (type === 'train' || type === 'bus') {
        trainBusTotal += amount;
      }
    }

    const trainBusTaxable = Math.max(0, trainBusTotal - commuteLimit);

    let mileageTotal = 0;
    let mileageTaxable = 0;
    for (const [km, total] of mileageByDistance) {
      mileageTotal += total;
      const tier = findTier(mileageTiers, km);
      const limit = tier ? Number(tier.taxFreeAmount) : 0;
      mileageTaxable += Math.max(0, total - limit);
    }

    return {
      month: String(month).slice(0, 7),
      commuteLimit,
      trainBusTotal,
      trainBusTaxable,
      mileageTotal,
      mileageTaxable,
      taxableAmount: trainBusTaxable + mileageTaxable
    };
  }
};

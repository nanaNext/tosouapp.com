'use strict';
// 36協定判定専用の「法定外残業」計算 (1日8時間 + 週40時間ルール)。
// salary.service.js の給与計算にも同じ数式が存在するが (dailyOverTotal/weeklyAdditional,
// 約224-249行目)、給与計算本体には手を入れず、monthly_summaries 集計専用の軽量な
// 再実装として切り出す — 同じ法律上のルールを使うが、実装は独立している。

function isoWeekStartStr(dateStr) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  const dow = d.getUTCDay();
  const delta = (dow + 6) % 7; // 月曜始まり
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - delta));
  return start.toISOString().slice(0, 10);
}

// days: [{ date: 'YYYY-MM-DD', workedMinutes: number }] — 1日ごとの実働分数（休憩控除済み）
// 戻り値: dailyOverTotal (1日8h超の合計), weeklyAdditional (週40h超のうち日次超過と重複しない分),
//         legalOverTotal = dailyOverTotal + weeklyAdditional （法定外残業の合計）
function computeLegalOvertime(days) {
  const weeks = {};
  let dailyOverTotal = 0;
  for (const day of (days || [])) {
    const worked = Number(day.workedMinutes) || 0;
    const dOver = Math.max(0, worked - 8 * 60);
    dailyOverTotal += dOver;
    const w = isoWeekStartStr(day.date);
    if (!weeks[w]) weeks[w] = { total: 0, dailyOver: 0 };
    weeks[w].total += worked;
    weeks[w].dailyOver += dOver;
  }
  let weeklyAdditional = 0;
  for (const k of Object.keys(weeks)) {
    const over = Math.max(0, weeks[k].total - 40 * 60);
    weeklyAdditional += Math.max(0, over - weeks[k].dailyOver);
  }
  return {
    dailyOverTotal,
    weeklyAdditional,
    legalOverTotal: dailyOverTotal + weeklyAdditional
  };
}

module.exports = { computeLegalOvertime, isoWeekStartStr };

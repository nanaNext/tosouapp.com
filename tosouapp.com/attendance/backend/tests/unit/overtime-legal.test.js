/**
 * 36協定判定用の法定外残業計算 (1日8時間 + 週40時間ルール) のテスト。
 * 既知の数値で検証する — 給与計算 (salary.service.js) とは別実装だが同じ数式。
 */
'use strict';

const { computeLegalOvertime, isoWeekStartStr } = require('../../src/modules/attendance/attendance.overtime-legal');

describe('isoWeekStartStr', () => {
  it('月曜日を週の開始日として返す', () => {
    // 2026-09-21 は月曜日
    expect(isoWeekStartStr('2026-09-21')).toBe('2026-09-21');
    // 2026-09-23 (水) は同じ週 -> 開始日は同じ月曜
    expect(isoWeekStartStr('2026-09-23')).toBe('2026-09-21');
    // 2026-09-20 (日) は前の週
    expect(isoWeekStartStr('2026-09-20')).toBe('2026-09-14');
  });
});

describe('computeLegalOvertime', () => {
  it('全日8時間ちょうど、週40時間ちょうどなら残業0', () => {
    const days = [
      { date: '2026-09-21', workedMinutes: 480 },
      { date: '2026-09-22', workedMinutes: 480 },
      { date: '2026-09-23', workedMinutes: 480 },
      { date: '2026-09-24', workedMinutes: 480 },
      { date: '2026-09-25', workedMinutes: 480 }
    ];
    const r = computeLegalOvertime(days);
    expect(r.dailyOverTotal).toBe(0);
    expect(r.weeklyAdditional).toBe(0);
    expect(r.legalOverTotal).toBe(0);
  });

  it('1日だけ10時間勤務 -> その日の2時間が日次残業、週合計は40h以内なので週残業は0', () => {
    const days = [
      { date: '2026-09-21', workedMinutes: 600 }, // 10h
      { date: '2026-09-22', workedMinutes: 480 },
      { date: '2026-09-23', workedMinutes: 480 },
      { date: '2026-09-24', workedMinutes: 480 },
      { date: '2026-09-25', workedMinutes: 360 } // 6h (週合計 42h)
    ];
    const r = computeLegalOvertime(days);
    // 日次超過: 10h日の2h = 120分
    expect(r.dailyOverTotal).toBe(120);
    // 週合計 = 600+480+480+480+360 = 2400分 = 40h -> 週超過0
    expect(r.weeklyAdditional).toBe(0);
    expect(r.legalOverTotal).toBe(120);
  });

  it('毎日ちょうど8時間だが6日出勤 -> 日次超過は0、週40h超の6h全部が週残業（日次超過と重複しないため）', () => {
    const days = [
      { date: '2026-09-21', workedMinutes: 480 },
      { date: '2026-09-22', workedMinutes: 480 },
      { date: '2026-09-23', workedMinutes: 480 },
      { date: '2026-09-24', workedMinutes: 480 },
      { date: '2026-09-25', workedMinutes: 480 },
      { date: '2026-09-26', workedMinutes: 480 } // 土曜も出勤 (6日 x 8h = 48h)
    ];
    const r = computeLegalOvertime(days);
    expect(r.dailyOverTotal).toBe(0);
    // 週合計48h -> 40h超過8h = 480分。日次超過との重複なし(0) -> 週残業480分
    expect(r.weeklyAdditional).toBe(480);
    expect(r.legalOverTotal).toBe(480);
  });

  it('複数週にまたがる場合、週ごとに個別集計する', () => {
    const days = [
      { date: '2026-09-21', workedMinutes: 600 }, // 週1 (9/21 月曜開始)
      { date: '2026-09-28', workedMinutes: 600 }  // 週2 (9/28 月曜開始)
    ];
    const r = computeLegalOvertime(days);
    // 各週は1日しか働いていないので週合計は40h未満 -> 週残業0、日次超過だけ2回分
    expect(r.dailyOverTotal).toBe(240);
    expect(r.weeklyAdditional).toBe(0);
    expect(r.legalOverTotal).toBe(240);
  });

  it('空配列なら全て0', () => {
    const r = computeLegalOvertime([]);
    expect(r).toEqual({ dailyOverTotal: 0, weeklyAdditional: 0, legalOverTotal: 0 });
  });
});

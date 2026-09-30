'use strict';

/**
 * 給与所得の源泉徴収税額（月額表）— 令和8年分
 *
 * 出典（国税庁）:
 *  - 甲欄: 「月額表の甲欄を適用する給与等に対する税額の電算機計算の特例について（令和８年分）」
 *    https://www.nta.go.jp/publication/pamph/gensen/zeigakuhyo2026/data/denshi_01.pdf
 *    ※ 財務省告示による特例計算。税額表の金額と数十円程度ずれることがあるが、差は年末調整で精算される（同資料）。
 *  - 乙欄: 「月額表の乙欄を適用する給与等に対する税額の電算機計算について（令和８年分）」
 *    https://www.nta.go.jp/publication/pamph/gensen/zeigakuhyo2026/data/denshi_02.pdf
 *    ※ 税額表（乙欄）と同じ金額になる計算式。
 *
 * 令和7年分以前の給与には使用できない（資料の注意書き）。年が変わって国税庁の表が改正されたら、ここを更新すること。
 */

const ceil = Math.ceil;
const floor = Math.floor;

// 第１表（甲・乙共通）給与所得控除の額。1円未満切り上げ
function kyuyoShotokuKojo(a) {
  if (a <= 158333) return 54167;
  if (a <= 299999) return ceil(a * 0.30 + 6667);
  if (a <= 549999) return ceil(a * 0.20 + 36667);
  if (a <= 708330) return ceil(a * 0.10 + 91667);
  return 162500;
}

// 甲 第３表 基礎控除の額
function kisoKojoKou(a) {
  if (a <= 2120833) return 48334;
  if (a <= 2162499) return 40000;
  if (a <= 2204166) return 26667;
  if (a <= 2245833) return 13334;
  return 0;
}

// 配偶者控除・扶養控除等（第２表）: 扶養親族等1人あたり
const PER_DEPENDENT = 31667;

// 甲 第４表（復興特別所得税込みの税率）
function taxKouFromB(b) {
  if (b <= 0) return 0;
  if (b <= 162500) return b * 0.05105;
  if (b <= 275000) return b * 0.10210 - 8296;
  if (b <= 579166) return b * 0.20420 - 36374;
  if (b <= 750000) return b * 0.23483 - 54113;
  if (b <= 1500000) return b * 0.33693 - 130688;
  if (b <= 3333333) return b * 0.40840 - 237893;
  return b * 0.45945 - 408061;
}

// 10円未満四捨五入
const round10 = (v) => Math.round(v / 10) * 10;

/**
 * 甲欄（電算機計算の特例）
 * @param {number} a その月の社会保険料等控除後の給与等の金額
 * @param {number} dependents 扶養親族等の数（源泉控除対象配偶者＋源泉控除対象親族。障害者等の加算後）
 */
function withholdingKou(a, dependents) {
  const A = Math.max(0, floor(Number(a) || 0));
  const n = Math.max(0, floor(Number(dependents) || 0));
  const B = A - kyuyoShotokuKojo(A) - PER_DEPENDENT * n - kisoKojoKou(A);
  if (B <= 0) return 0;
  return Math.max(0, round10(taxKouFromB(B)));
}

// 乙 第３表（税率は復興特別所得税を含まない。最後に ×1.021）
function taxOtsuRate(b) {
  if (b <= 0) return 0;
  if (b <= 162500) return b * 0.05;
  if (b <= 275000) return b * 0.10 - 8125;
  if (b <= 579166) return b * 0.20 - 35625;
  if (b <= 750000) return b * 0.23 - 53000;
  if (b <= 1500000) return b * 0.33 - 128000;
  return b * 0.40 - 233000;
}

// 50円未満切り捨て、50円以上100円未満は100円に切り上げ
const round100half = (v) => {
  const base = floor(v / 100) * 100;
  return (v - base) >= 50 ? base + 100 : base;
};

/**
 * 乙欄
 * @param {number} a その月の社会保険料等控除後の給与等の金額
 * @param {number} secondaryDependents 「従たる給与についての扶養控除等申告書」の扶養親族等の数（通常0）
 */
function withholdingOtsu(a, secondaryDependents = 0) {
  const A = Math.max(0, floor(Number(a) || 0));
  let tax;
  if (A < 105000) {
    tax = floor(A * 0.03063);
  } else if (A <= 740000) {
    // 1 計算基準額の算出
    let base;
    if (A === 740000) base = 740000;
    else {
      const step = A <= 220999 ? 2000 : 3000;
      const min = A <= 220999 ? 105000 : 221000;
      base = A - ((A - min) % step);
    }
    // 2 税額の算出
    const calc = (mult) => {
      const x = base * mult;
      return floor(Math.max(0, taxOtsuRate(x - kyuyoShotokuKojo(x) - 48334)));
    };
    const C = round100half(calc(2.5) - calc(1.5));
    tax = round100half(C * 1.021);
  } else if (A < 1710000) {
    tax = floor(259200 + (A - 740000) * 0.4084);
  } else {
    tax = floor(655400 + (A - 1710000) * 0.45945);
  }
  const n = Math.max(0, floor(Number(secondaryDependents) || 0));
  return Math.max(0, tax - 1610 * n);
}

/**
 * @param {number} a その月の社会保険料等控除後の給与等の金額
 * @param {{ category?: 'kou'|'otsu', dependents?: number }} opts
 */
function computeMonthlyWithholding(a, { category = 'kou', dependents = 0 } = {}) {
  return category === 'otsu' ? withholdingOtsu(a, 0) : withholdingKou(a, dependents);
}

module.exports = { computeMonthlyWithholding, withholdingKou, withholdingOtsu };

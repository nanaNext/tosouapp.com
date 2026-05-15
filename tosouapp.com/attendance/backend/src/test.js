const parseHmToMin = (hm) => {
    if (!hm && hm !== 0) return 0;
    if (typeof hm === 'number') return hm;
    const pts = String(hm).split(':');
    if (pts.length === 2) return parseInt(pts[0], 10) * 60 + parseInt(pts[1], 10);
    return Number(hm) || 0;
};
const timeHrs = (v) => {
    if (!v && v !== 0) return '';
    const min = parseHmToMin(v);
    if (min === 0 && v !== '0' && v !== 0 && v !== '0:00' && v !== '00:00') {
        return String(v); // If it failed to parse, return the original string
    }
    const val = Number(min / 60).toFixed(2);
    return val === '0.00' ? '' : val;
};
console.log('0:00 ->', `'${timeHrs('0:00')}'`);
console.log('0.00 ->', `'${timeHrs('0.00')}'`);
console.log('0 ->', `'${timeHrs(0)}'`);
console.log('35:00 ->', `'${timeHrs('35:00')}'`);

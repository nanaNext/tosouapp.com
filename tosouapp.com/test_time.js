const nowJST = new Date(Date.now() + 9 * 3600 * 1000);
const todayStr = nowJST.toISOString().slice(0, 10);
const y = nowJST.getUTCFullYear();
const m = nowJST.getUTCMonth();
const d = nowJST.getUTCDate();
const todayJstStartUTC = new Date(Date.UTC(y, m, d, 0, 0, 0) - 9 * 3600 * 1000).toISOString().slice(0, 19).replace('T', ' ');
const todayJstEndUTC = new Date(Date.UTC(y, m, d, 23, 59, 59) - 9 * 3600 * 1000).toISOString().slice(0, 19).replace('T', ' ');

console.log("todayStr:", todayStr);
console.log("todayJstStartUTC:", todayJstStartUTC);
console.log("todayJstEndUTC:", todayJstEndUTC);

import { fetchJSONAuth } from '../api/http.api.js';
// Nạp hàm fetchJSONAuth. Đây thường là hàm bổ trợ (helper) để gửi yêu cầu HTTP (như lấy dữ liệu từ server) có kèm theo xác thực (token/cookie).
import { listEmployees } from '../api/employees.api.js';
// Nạp hàm listEmployees. Hàm này chứa logic để lấy danh sách nhân viên từ phía backend.
import { wireAdminShell } from '../shell/admin-shell.js?v=navy-20260418-menuhotfix27';
// Nạp hàm wireAdminShell. Hàm này dùng để thiết lập hoặc "kết nối" khung giao diện quản trị (Admin Shell/Layout).

const $ = (sel, root = document) => root.querySelector(sel);
// Nó tạo ra một "phím tắt" để bạn tìm kiếm các thành phần (element) trên trang web nhanh hơn.
function wireTopbarMenus() {
  try {
    if (document.body.dataset.monthlySummaryMenus === '1') return;
    document.body.dataset.monthlySummaryMenus = '1';
    // Nó kiểm tra xem trên thẻ <body> đã có thuộc tính data-monthly-summary-menus="1" chưa. Nếu có rồi (nghĩa là hàm đã chạy trước đó), nó sẽ dừng lại ngay lập tức (return). Nếu chưa, nó sẽ gán giá trị đó vào để "đánh dấu"
    const menus = Array.from(document.querySelectorAll('.subbar .menu'));
    // Tìm tất cả các phần tử có class là .menu nằm bên trong .subbar và chuyển chúng thành một mảng (Array).
    const openClass = 'open';
    // 
    const closeAll = () => {
      // closeAll: Đây là một hàm tiện ích. Khi gọi nó, vòng lặp for...of sẽ chạy qua tất cả menu và xóa bỏ class open, giúp đóng mọi menu đang mở trên màn hình.
      for (const m of menus) m.classList.remove(openClass);
    };
    for (const m of menus) {
      const btn = m.querySelector('.menu-btn');
      // Kiểm tra nút (btn): Tìm nút bấm có class .menu-btn bên trong từng menu. Nếu không thấy hoặc nút này đã được gán sự kiện rồi (dataset.bound === '1'), nó sẽ bỏ qua.
      if (!btn || btn.dataset.bound === '1') continue;
      btn.dataset.bound = '1';
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        // Xử lý click khi bạn click vào nút e.preventDefault() & e.stopPropagation(): ngăn chặn các hành động
        // mặc định và không cho sự kiện " truyền" lên các phần tử cha.
        // logic đóng/ mở: Nó kiểm tra xem menu hiện tại có đang mở ko ( isOpen). Sau đó 
        // nó gọi closeAll() để đóng sạch các menu khác , và cuối cùng nếu menu vừa bấm lúc nãy ko đóng, nó sẽ thêm class open để mở ra.
        e.stopPropagation();
        const isOpen = m.classList.contains(openClass);
        closeAll();
        if (!isOpen) m.classList.add(openClass);
      });
    }
    document.addEventListener('click', (e) => {
      const t = e && e.target;
      if (t && t.closest && t.closest('.subbar .menu')) return;
      closeAll();
    });
    // Đoạn này lắng nghe mọi cú click trên toàn bộ trang web.
    // t.closest('.subbar .menu'): Nó kiểm tra xem điểm bạn vừa click có nằm bên trong một cái menu nào không.
    // Nếu bạn click ra ngoài vùng menu, hàm closeAll() sẽ được gọi để thu gọn mọi menu đang mở.

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeAll();
    });
    // Một tính năng thân thiện với người dùng:
    //  Nếu bạn đang mở menu mà muốn đóng nhanh, chỉ cần nhấn phím Escape (Esc).

  } catch (e) { /* silently ignored */ }
}
// Mục đích: Ngăn chặn trang web bị "treo" 
// hoặc hiện lỗi đỏ trong console nếu trình duyệt của người dùng quá cũ hoặc không hỗ trợ một số hàm như closest hay dataset. 
// Nếu có lỗi, nó sẽ im lặng bỏ qua.
function codeOf(u) {
  return String(u.employee_code || u.employeeCode || (u.id ? ('EMP' + String(u.id).padStart(3, '0')) : '')).trim();
}
// Hàm codeOf(u) này dùng để chuẩn hóa việc lấy mã nhân viên từ một đối tượng người dùng (u). Nó hoạt động theo nguyên tắc " ưu tiên"
// ưu tiên 1: u.employee_code kiểm tra xem có thuộc tính viết theo kiểu snake_case thường dùng trong db ko
// Ưu tiên 2: u.employeeCode nếu ko cso cái trên nó tìm theo kiểu namelcase thường dùng JS
// Ưu tiên 3 tạo mã từ ID: nếu cả 2 thuộc tính đều trống, nó sẽ kiểm tra xem có u.id ko
//  Nếu có id, nó sẽ tạo một chuỗi theo định dạng: EMP + id được bù thêm các số 0 ở đầu để đủ 3 chữ số
// Ví dụ: Nếu id = 5, kết quả sẽ là EMP005. Nếu id = 123, kết quả là EMP123
// Mặc định: Nếu tất cả đều không có, nó trả về một chuỗi rỗng ''
function nameOf(u) {
  return String(u.username || u.name || u.full_name || u.fullName || u.email || (u.id ? `社員${u.id}` : '')).trim();
}
// Hàm nameOf(u) này có logic tương tự như hàm codeOf bạn vừa xem, 
// nhưng mục tiêu của nó là xác định tên hiển thị của người dùng dựa trên một danh sách ưu tiên giảm dần
// 1. Luồng ưu tiên hiển thị (Priority Logic) u.username: Tên đăng nhập (thường là duy nhất).

//u.name: Tên ngắn gọn.

//u.full_name: Họ và tên (định dạng database snake_case).

//u.fullName: Họ và tên (định dạng JavaScript camelCase).

//u.email: Nếu không có tên, dùng địa chỉ email để định danh.
// Tạo tên mặc định (u.id): Nếu tất cả các trường trên đều trống,
//  nó sẽ lấy ID và gắn thêm chữ 社員 (Shain - Nhân viên) phía trước.Ví dụ: id: 123 $\rightarrow$ "社員123".
// Mặc định cuối cùng: Nếu ngay cả ID cũng không có, trả về chuỗi rỗng ''Có
function roleOf(u) {
  return String(u.role || '').toLowerCase();
}

function statusOf(u) {
  return String(u.employment_status || u.employmentStatus || 'active').toLowerCase();
}

function currentMonthJST() {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 7);
}

async function fetchEmployees() {
  const me = await fetchJSONAuth('/api/auth/me').catch(() => null);
  const role = String(me?.role || '').toLowerCase();
  let rows = [];
  if (role === 'admin') {
    rows = await listEmployees().catch(() => []);
    if (!Array.isArray(rows) || rows.length === 0) {
      const r = await fetchJSONAuth('/api/admin/users').catch(() => null);
      rows = Array.isArray(r) ? r : ((r && Array.isArray(r.rows)) ? r.rows : []);
    }
  } else {
    const r = await fetchJSONAuth('/api/manager/users').catch(() => null);
    rows = Array.isArray(r) ? r : ((r && Array.isArray(r.rows)) ? r.rows : []);
  }
  return (Array.isArray(rows) ? rows : [])
    .filter(u => statusOf(u) !== 'inactive' && statusOf(u) !== 'retired')
    .filter(u => role !== 'admin' ? roleOf(u) === 'employee' : (roleOf(u) === 'employee' || !!u.employee_code || !!u.employeeCode))
    .sort((a, b) => codeOf(a).localeCompare(codeOf(b)) || nameOf(a).localeCompare(nameOf(b)));
}

function hmToMin(s) {
  const t = String(s || '').trim();
  if (!t) return 0;
  const m = t.match(/^(\d+):(\d{2})$/);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const mm = parseInt(m[2], 10);
  if (!Number.isFinite(h) || !Number.isFinite(mm) || mm < 0 || mm >= 60) return null;
  return Math.max(0, (h * 60) + mm);
}

function minToHm(min) {
  const m = Math.max(0, Number(min || 0));
  const h = Math.floor(m / 60);
  const r = Math.floor(m % 60);
  return `${h}:${String(r).padStart(2, '0')}`;
}

function num(v) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

async function withTimeout(promise, ms, label) {
  const timeoutMs = Math.max(1000, Number(ms || 0));
  return await Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`${label || 'request'} timeout`)), timeoutMs))
  ]);
}

function fromDateTime(s) {
  const t = String(s || '').trim();
  if (!t) return '';
  const m = t.match(/[T\s](\d{2}:\d{2})/);
  if (m) return m[1];
  // Support plain "HH:MM[:SS]" payloads as well.
  const hm = t.match(/^(\d{2}:\d{2})(?::\d{2})?$/);
  return hm ? hm[1] : '';
}

function parseHm(s) {
  const t = String(s || '').trim();
  const m = t.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const mm = parseInt(m[2], 10);
  if (!Number.isFinite(h) || !Number.isFinite(mm)) return null;
  return (h * 60) + mm;
}

function diffMinutesAllowOvernight(a, b) {
  const am = parseHm(a);
  const bm = parseHm(b);
  if (am == null || bm == null) return null;
  return bm >= am ? (bm - am) : (bm + 1440 - am);
}

function isInhouseDay(d) {
  const wt = String(workTypeOf(d) || '').trim();
  if (wt === 'onsite') return true;
  const loc = String(d?.daily?.location || '').toLowerCase();
  return !!loc && (loc.includes('社内') || loc.includes('内勤') || loc.includes('inhouse'));
}

function hasAttend(d) {
  return (Array.isArray(d?.segments) ? d.segments : []).some(s => !!s?.checkIn);
}

function workTypeOf(d) {
  const dwt = String(d?.daily?.workType || '').trim();
  if (dwt) return dwt;
  const segs = Array.isArray(d?.segments) ? d.segments : [];
  for (const s of segs) {
    const wt = String(s?.workType || '').trim();
    if (wt) return wt;
  }
  return '';
}

function pickDisplaySeg(d) {
  const segs = Array.isArray(d?.segments) ? d.segments : [];
  const list0 = segs.length ? [...segs].sort((a, b) => String(b?.checkIn || '').localeCompare(String(a?.checkIn || ''))) : [null];
  return list0.find(s => s && s.checkIn && !s.checkOut) || list0[0] || null;
}

function computeRowDisplay(d) {
  const dateStr = String(d?.date || '');
  const dow = new Date(dateStr + 'T00:00:00').getDay();
  const offDay = Number(d?.is_off || 0) === 1 || dow === 0 || dow === 6;
  const daily = d?.daily || null;
  const shift = d?.shift || null;
  const seg = pickDisplaySeg(d);
  const kubunInitRaw = String(daily?.kubun || '').trim();
  const kubunOptions = offDay ? ['休日', '休日出勤', '代替出勤'] : ['出勤', '半休', '欠勤', '有給休暇', '無給休暇', '代替休日'];
  let kubunInit = kubunOptions.includes(kubunInitRaw) ? kubunInitRaw : '';
  const plannedKubun = offDay ? '休日' : '出勤';
  const workKubunSet = new Set(['出勤', '半休', '休日出勤', '代替出勤']);
  const hasActual = !!(seg?.id || seg?.checkIn || seg?.checkOut);
  if (offDay && !kubunInit && hasActual) kubunInit = '休日出勤';
  const effectiveKubun = kubunInit || plannedKubun;
  const isWorkDay = workKubunSet.has(effectiveKubun);
  const isPlanned = !kubunInit && !hasActual;
  const shiftStart = String(shift?.start_time || '08:00').trim();
  const shiftEnd = String(shift?.end_time || '17:00').trim();
  const shiftStartOk = /^\d{1,2}:\d{2}$/.test(shiftStart);
  const shiftEndOk = /^\d{1,2}:\d{2}$/.test(shiftEnd);
  const inHm = fromDateTime(seg?.checkIn);
  const outHm = fromDateTime(seg?.checkOut);
  const finalIn = isWorkDay ? (inHm || shiftStart) : '';
  const finalOut = isWorkDay ? (outHm || shiftEnd) : '';
  const autoIn = isWorkDay && !inHm && shiftStartOk;
  const autoOut = isWorkDay && !outHm && shiftEndOk;
  const brMin = (isWorkDay || hasActual) ? Number(daily?.breakMinutes ?? 60) : 0;
  const nbMin = (isWorkDay || hasActual) ? Number(daily?.nightBreakMinutes ?? 0) : 0;
  const totalBmin = (Number.isFinite(brMin) ? brMin : 60) + (Number.isFinite(nbMin) ? nbMin : 0);
  const rawMin = (finalIn && finalOut) ? diffMinutesAllowOvernight(finalIn, finalOut) : null;
  const workMin = (rawMin == null || rawMin <= 0) ? 0 : Math.max(0, rawMin - totalBmin);
  const whStr = (finalIn && finalOut) ? minToHm(workMin) : '';
  const isAutoWork = isWorkDay && (autoIn || autoOut) && !!whStr;
  const stM = parseHm(shiftStart);
  const etM = parseHm(shiftEnd);
  const outM = parseHm(finalOut);
  const overtimeMin = (() => {
    if (!finalIn || !finalOut) return 0;
    if (outM != null && stM != null && etM != null) {
      const overnight = etM < stM;
      const endAbs = overnight ? (etM + 24 * 60) : etM;
      const outAbs = overnight && outM < stM ? (outM + 24 * 60) : outM;
      return Math.max(0, outAbs - endAbs);
    }
    return Math.max(0, workMin - (8 * 60));
  })();
  return {
    kubunVal: kubunInit,
    isWorkDay,
    isPlanned,
    workType: workTypeOf(d),
    workMin,
    overtimeMin,
    workIsAuto: isAutoWork && isPlanned,
    overtimeIsAuto: overtimeMin > 0 && isAutoWork && isPlanned
  };
}

function computeSummary(detail, timesheet, mode) {
  const days = Array.isArray(detail?.days) ? detail.days : [];
  const scope = mode === 'sumIh' ? days.filter(isInhouseDay) : days;
  const off = scope.filter(d => Number(d?.is_off || 0) === 1).length;
  const working = scope.length ? (scope.length - off) : 0;
  const attendDays = scope.filter(hasAttend).length;
  const holidayWorkDays = scope.filter(d => Number(d?.is_off || 0) === 1 && hasAttend(d)).length;
  let absentDays = Math.max(0, working - (attendDays - holidayWorkDays));

  let totals = mode === 'sumAll' && Array.isArray(timesheet?.days)
    ? timesheet.days.reduce((acc, d) => {
      acc.regular += Number(d?.regularMinutes || 0);
      acc.overtime += Number(d?.overtimeMinutes || 0);
      acc.night += Number(d?.nightMinutes || 0);
      return acc;
    }, { regular: 0, overtime: 0, night: 0 })
    : { regular: 0, overtime: 0, night: 0 };

  if (mode === 'sumIh') {
    const t2 = { regular: 0, overtime: 0, night: 0 };
    for (const d of scope) {
      const segs = Array.isArray(d?.segments) ? d.segments : [];
      let raw = 0;
      for (const s of segs) {
        const inHm = fromDateTime(s?.checkIn);
        const outHm = fromDateTime(s?.checkOut);
        if (!inHm || !outHm) continue;
        const m = diffMinutesAllowOvernight(inHm, outHm);
        if (m != null && m > 0) raw += m;
      }
      if (raw <= 0) continue;
      const br = Number((d && d.daily && d.daily.breakMinutes != null) ? d.daily.breakMinutes : 60);
      const workMin = Math.max(0, raw - (Number.isFinite(br) ? br : 60));
      t2.regular += Math.min(8 * 60, workMin);
      t2.overtime += Math.max(0, workMin - (8 * 60));
    }
    totals = t2;
  }

  const counts = scope.reduce((acc, d) => {
    if (!hasAttend(d)) return acc;
    const wt = workTypeOf(d);
    if (wt === 'onsite') acc.onsite += 1;
    else if (wt === 'remote') acc.remote += 1;
    else if (wt === 'satellite') acc.satellite += 1;
    return acc;
  }, { onsite: 0, remote: 0, satellite: 0 });

  const leave = detail?.leaveSummary || {};
  const stored = mode === 'sumIh' ? (detail?.monthSummary?.inhouse || null) : (detail?.monthSummary?.all || null);
  let paidDays = Number(mode === 'sumIh' ? 0 : (leave?.paidDays || 0));
  let substituteDays = Number(mode === 'sumIh' ? 0 : (leave?.substituteDays || 0));
  let unpaidDays = Number(mode === 'sumIh' ? 0 : (leave?.unpaidDays || 0));
  let standbyDays = Number(mode === 'sumIh' ? 0 : (leave?.standbyDays || 0));
  let totalWorkMinutes = Math.max(0, Number(totals.regular || 0) + Number(totals.overtime || 0));
  let deductionMinutes = 0;
  let legalOvertimeMinutes = mode !== 'sumAll' || !Array.isArray(timesheet?.days)
    ? Number(totals.overtime || 0)
    : (() => {
      const isoWeekStart = (s) => {
        const d = new Date(String(s || '').slice(0, 10) + 'T00:00:00Z');
        const dow = d.getUTCDay();
        const delta = (dow + 6) % 7;
        const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - delta));
        return `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, '0')}-${String(start.getUTCDate()).padStart(2, '0')}`;
      };
      let dailyOverTotal = 0;
      let weeklyAdditional = 0;
      const weeks = {};
      for (const day of timesheet.days) {
        const worked = Number(day?.regularMinutes || 0) + Number(day?.overtimeMinutes || 0);
        const dOver = Math.max(0, worked - 480);
        dailyOverTotal += dOver;
        const w = isoWeekStart(day?.date);
        if (!weeks[w]) weeks[w] = { total: 0, dailyOver: 0 };
        weeks[w].total += worked;
        weeks[w].dailyOver += dOver;
      }
      for (const k in weeks) {
        const over = Math.max(0, (weeks[k].total || 0) - 2400);
        weeklyAdditional += Math.max(0, over - (weeks[k].dailyOver || 0));
      }
      return Math.max(0, dailyOverTotal + weeklyAdditional);
    })();

  let plannedDays = working;
  let attendDays2 = attendDays;
  let holidayWorkDays2 = holidayWorkDays;
  let absent2 = absentDays;
  let onsiteDays2 = counts.onsite;
  let remoteDays2 = counts.remote;
  let satelliteDays2 = counts.satellite;
  let usedFrontend = false;
  
  const isPartTime = String(detail?.user?.employment_type || '').toLowerCase() === 'part_time' || String(detail?.user?.shift_id || '').includes('baito');

  try {
    if (scope.length > 0) {
      usedFrontend = true;
      let frontendTotalWork = 0;
      let frontendOvertime = 0;
      let frontendAttendDays = 0;
      let frontendHolidayWorkDays = 0;
      let frontendOnsite = 0;
      let frontendRemote = 0;
      let frontendSatellite = 0;
      let explicitAbsent = 0;

      for (const d of scope) {
        const row = computeRowDisplay(d);
        if (row.workMin > 0 && !row.workIsAuto) frontendTotalWork += row.workMin;
        if (row.overtimeMin > 0 && !row.overtimeIsAuto) frontendOvertime += row.overtimeMin;
        if (row.kubunVal === '欠勤') explicitAbsent += 1;
        if (!row.kubunVal) continue;
        if (row.kubunVal === '休日出勤') frontendHolidayWorkDays += 1;
        else if (row.kubunVal === '出勤' || row.kubunVal === '半休' || row.kubunVal === '代替出勤') frontendAttendDays += 1;
        else continue;
        if (row.workType === 'onsite') frontendOnsite += 1;
        else if (row.workType === 'remote') frontendRemote += 1;
        else if (row.workType === 'satellite') frontendSatellite += 1;
      }

      totalWorkMinutes = frontendTotalWork;
      totals.overtime = frontendOvertime;
      legalOvertimeMinutes = frontendOvertime;
      attendDays2 = frontendAttendDays;
      holidayWorkDays2 = frontendHolidayWorkDays;
      absent2 = explicitAbsent > 0 ? explicitAbsent : 0;
      onsiteDays2 = frontendOnsite;
      remoteDays2 = frontendRemote;
      satelliteDays2 = frontendSatellite;
    }
  } catch (e) { /* silently ignored */ }

  if (stored && typeof stored === 'object') {
    if (plannedDays === 0) plannedDays = Number(stored.plannedDays == null ? plannedDays : stored.plannedDays) || 0;
    if (!usedFrontend) {
      attendDays2 = Number(stored.attendDays == null ? attendDays2 : stored.attendDays) || 0;
      holidayWorkDays2 = Number(stored.holidayWorkDays == null ? holidayWorkDays2 : stored.holidayWorkDays) || 0;
    }
    standbyDays = Number(stored.standbyDays == null ? standbyDays : stored.standbyDays) || 0;
    paidDays = Number(stored.paidDays == null ? paidDays : stored.paidDays) || 0;
    substituteDays = Number(stored.substituteDays == null ? substituteDays : stored.substituteDays) || 0;
    unpaidDays = Number(stored.unpaidDays == null ? unpaidDays : stored.unpaidDays) || 0;
    deductionMinutes = Number(stored.deductionMinutes == null ? deductionMinutes : stored.deductionMinutes) || 0;
    if (!usedFrontend) {
      absent2 = Number(stored.absentDays == null ? absent2 : stored.absentDays) || 0;
      if (mode === 'sumAll') {
        onsiteDays2 = Number(stored.onsiteDays == null ? onsiteDays2 : stored.onsiteDays) || 0;
        remoteDays2 = Number(stored.remoteDays == null ? remoteDays2 : stored.remoteDays) || 0;
        satelliteDays2 = Number(stored.satelliteDays == null ? satelliteDays2 : stored.satelliteDays) || 0;
      }
    }
  }

  if (isPartTime) {
    plannedDays = attendDays2 + absent2 + Number(paidDays || 0) + Number(unpaidDays || 0) + holidayWorkDays2;
  }

  const res = {
    plannedDays,
    attendDays: attendDays2,
    holidayWorkDays: holidayWorkDays2,
    standbyDays,
    totalWorkMinutes,
    nightMinutes: Number(totals.night || 0),
    overtimeMinutes: Number(totals.overtime || 0),
    legalOvertimeMinutes,
    paidDays,
    substituteDays,
    unpaidDays,
    absentDays: absent2
  };
  if (mode === 'sumAll') {
    return {
      ...res,
      deductionMinutes,
      onsiteDays: onsiteDays2,
      remoteDays: remoteDays2,
      satelliteDays: satelliteDays2
    };
  }
  return res;
}

function numText(s) {
  const t = String(s || '').replace(/日/g, '').trim();
  const n = Number(t);
  return Number.isFinite(n) ? n : 0;
}

function exactSummaryFromMonthly(detail, timesheet, mode) {
  try {
    const monthly = globalThis.AttendanceMonthly || {};
    const renderTable = monthly?.Render?.renderTable;
    const renderSummary = monthly?.SectionsRender?.renderSummary;
    if (typeof renderTable !== 'function' || typeof renderSummary !== 'function') return null;
    if (!document.body) return null;
    monthly.State = monthly.State || {};
    monthly.State.editableMonth = false;
    monthly.State.currentMonthStatus = String(detail?.monthStatus?.status || '').trim();

    const shell = document.createElement('div');
    shell.style.cssText = 'position:absolute;left:-99999px;top:0;width:1600px;height:1px;overflow:hidden;';
    shell.innerHTML = `
      <div id="summarySection">
        <button class="se-tab active" data-tab="${mode === 'sumAll' ? 'sumAll' : 'sumInhouse'}"></button>
      </div>
      <div id="monthTable"></div>
      <div id="summaryHost"></div>
    `;
    document.body.appendChild(shell);
    const tableHost = shell.querySelector('#monthTable');
    const summaryHost = shell.querySelector('#summaryHost');
    renderTable(tableHost, detail, { role: 'employee' });
    renderSummary(summaryHost, detail, timesheet);
    const cells = Array.from(summaryHost.querySelectorAll('tbody td')).map(td => String(td.textContent || '').trim());
    shell.remove();
    if (!cells.length) return null;
    if (mode === 'sumAll' && cells.length >= 19) {
      return {
        plannedDays: numText(cells[0]),
        attendDays: numText(cells[1]),
        holidayWorkDays: numText(cells[2]),
        standbyDays: numText(cells[3]),
        totalWorkMinutes: hmToMin(cells[4]) || 0,
        nightMinutes: hmToMin(cells[5]) || 0,
        overtimeMinutes: hmToMin(cells[6]) || 0,
        legalOvertimeMinutes: hmToMin(cells[7]) || 0,
        paidDays: parseFloat(String(cells[8]).replace(/日/g, '')) || 0,
        substituteDays: numText(cells[10]),
        unpaidDays: numText(cells[11]),
        absentDays: numText(cells[12]),
        deductionMinutes: hmToMin(cells[13]) || 0,
        workGoOutMinutes: hmToMin(cells[14]) || 0,
        privateGoOutMinutes: hmToMin(cells[15]) || 0,
        onsiteDays: numText(cells[16]),
        remoteDays: numText(cells[17]),
        satelliteDays: numText(cells[18])
      };
    }
    if (mode !== 'sumAll' && cells.length >= 12) {
      return {
        plannedDays: numText(cells[0]),
        attendDays: numText(cells[1]),
        holidayWorkDays: numText(cells[2]),
        standbyDays: numText(cells[3]),
        totalWorkMinutes: hmToMin(cells[4]) || 0,
        nightMinutes: hmToMin(cells[5]) || 0,
        overtimeMinutes: hmToMin(cells[6]) || 0,
        legalOvertimeMinutes: hmToMin(cells[7]) || 0,
        paidDays: parseFloat(String(cells[8]).replace(/日/g, '')) || 0,
        substituteDays: numText(cells[9]),
        unpaidDays: numText(cells[10]),
        absentDays: numText(cells[11])
      };
    }
    return null;
  } catch (e) {
    return null;
  }
}

async function ensureMonthlyLibsReady(timeoutMs = 2500) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const monthly = globalThis.AttendanceMonthly || {};
    if (typeof monthly?.Render?.renderTable === 'function' && typeof monthly?.SectionsRender?.renderSummary === 'function') {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  return false;
}

async function exactSummaryFromEmbed(uid, ym, mode) {
  try {
    const userId = String(uid || '').trim();
    const month = String(ym || '').trim();
    if (!/^\d+$/.test(userId) || !/^\d{4}-\d{2}$/.test(month)) return null;
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:absolute;left:-99999px;top:0;width:1600px;height:900px;opacity:0;pointer-events:none;';
    iframe.src = `/admin/embed/attendance/monthly?userId=${encodeURIComponent(userId)}&month=${encodeURIComponent(month)}&embed=1`;
    document.body.appendChild(iframe);
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('iframe timeout')), 12000);
      iframe.addEventListener('load', () => { clearTimeout(timer); resolve(); }, { once: true });
      iframe.addEventListener('error', () => { clearTimeout(timer); reject(new Error('iframe load error')); }, { once: true });
    });
    const doc = iframe.contentDocument;
    if (!doc) {
      iframe.remove();
      return null;
    }
    const waitForSummary = async () => {
      const start = Date.now();
      while (Date.now() - start < 12000) {
        const table = doc.querySelector('#monthSummaryTable table, #monthSummary table, #monthSummaryTable, #monthSummary');
        const cells = table ? Array.from(table.querySelectorAll('tbody td')) : [];
        if (cells.length >= 12) return true;
        await new Promise((r) => setTimeout(r, 100));
      }
      return false;
    };
    if (!(await waitForSummary())) {
      iframe.remove();
      return null;
    }
    if (mode !== 'sumAll') {
      const tab = doc.querySelector('#summarySection .se-tab[data-tab="sumInhouse"]');
      if (tab) {
        tab.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: iframe.contentWindow }));
        await new Promise((r) => setTimeout(r, 200));
      }
    }
    const table = doc.querySelector('#monthSummaryTable table, #monthSummary table, #monthSummaryTable, #monthSummary');
    const cells = table ? Array.from(table.querySelectorAll('tbody td')).map(td => String(td.textContent || '').trim()) : [];
    iframe.remove();
    if (mode === 'sumAll' && cells.length >= 19) {
      return {
        plannedDays: numText(cells[0]),
        attendDays: numText(cells[1]),
        holidayWorkDays: numText(cells[2]),
        standbyDays: numText(cells[3]),
        totalWorkMinutes: hmToMin(cells[4]) || 0,
        nightMinutes: hmToMin(cells[5]) || 0,
        overtimeMinutes: hmToMin(cells[6]) || 0,
        legalOvertimeMinutes: hmToMin(cells[7]) || 0,
        paidDays: parseFloat(String(cells[8]).replace(/日/g, '')) || 0,
        substituteDays: numText(cells[10]),
        unpaidDays: numText(cells[11]),
        absentDays: numText(cells[12]),
        deductionMinutes: hmToMin(cells[13]) || 0,
        workGoOutMinutes: hmToMin(cells[14]) || 0,
        privateGoOutMinutes: hmToMin(cells[15]) || 0,
        onsiteDays: numText(cells[16]),
        remoteDays: numText(cells[17]),
        satelliteDays: numText(cells[18])
      };
    }
    if (mode !== 'sumAll' && cells.length >= 12) {
      return {
        plannedDays: numText(cells[0]),
        attendDays: numText(cells[1]),
        holidayWorkDays: numText(cells[2]),
        standbyDays: numText(cells[3]),
        totalWorkMinutes: hmToMin(cells[4]) || 0,
        nightMinutes: hmToMin(cells[5]) || 0,
        overtimeMinutes: hmToMin(cells[6]) || 0,
        legalOvertimeMinutes: hmToMin(cells[7]) || 0,
        paidDays: parseFloat(String(cells[8]).replace(/日/g, '')) || 0,
        substituteDays: numText(cells[9]),
        unpaidDays: numText(cells[10]),
        absentDays: numText(cells[11])
      };
    }
    return null;
  } catch (e) {
    try { document.querySelectorAll('iframe').forEach((f) => { if ((f.src || '').includes('/admin/embed/attendance/monthly')) f.remove(); }); } catch (e) { /* silently ignored */ }
    return null;
  }
}

function renderSummarySection(title, prefix, fields) {
  const itemsHtml = fields.map(field => {
    const typeAttr = field.type ? ` type="${field.type}"` : '';
    const stepAttr = field.step != null ? ` step="${field.step}"` : '';
    const placeholderAttr = field.placeholder ? ` placeholder="${field.placeholder}"` : '';
    return `
      <div class="admin-ms-summary-item">
        <div class="label">${field.label}</div>
        <div class="value">
          <input id="${prefix}${field.id}" class="admin-ms-input"${typeAttr}${stepAttr}${placeholderAttr}>
        </div>
      </div>
    `;
  }).join('');

  return `
    <section class="admin-ms-section">
      <div class="admin-ms-section-head" style="margin-bottom: 8px;">
        <h3 style="margin:0; color:#0d2c5b; font-size:16px;">${title}</h3>
      </div>
      <div class="admin-ms-summary-grid">
        ${itemsHtml}
      </div>
    </section>
  `;
}

function renderScaffold(root) {
  const allFields = [
    { id: 'PlannedDays', label: '所定日数', type: 'number', step: '1' },
    { id: 'AttendDays', label: '出勤日数', type: 'number', step: '1' },
    { id: 'HolidayWorkDays', label: '代出休出', type: 'number', step: '1' },
    { id: 'StandbyDays', label: '待機日数', type: 'number', step: '1' },
    { id: 'TotalWork', label: '総労働時間', placeholder: '0:00' },
    { id: 'Night', label: '深夜時間', placeholder: '0:00' },
    { id: 'Overtime', label: '総残業時間', placeholder: '0:00' },
    { id: 'LegalOvertime', label: '法定外時間', placeholder: '0:00' },
    { id: 'PaidDays', label: '有休日数', type: 'number', step: '0.1' },
    { id: 'SubstituteDays', label: '代休日数', type: 'number', step: '1' },
    { id: 'UnpaidDays', label: '無給休暇', type: 'number', step: '1' },
    { id: 'AbsentDays', label: '欠勤日数', type: 'number', step: '1' },
    { id: 'Deduction', label: '控除時間', placeholder: '0:00' },
    { id: 'WorkGoOut', label: '業務外出', placeholder: '0:00' },
    { id: 'PrivateGoOut', label: '私用外出', placeholder: '0:00' },
    { id: 'OnsiteDays', label: '出社日数', type: 'number', step: '1' },
    { id: 'RemoteDays', label: '在宅日数', type: 'number', step: '1' },
    { id: 'SatelliteDays', label: '現場・出張', type: 'number', step: '1' }
  ];
  const inhouseFields = [
    { id: 'PlannedDays', label: '所定日数', type: 'number', step: '1' },
    { id: 'AttendDays', label: '出勤日数', type: 'number', step: '1' },
    { id: 'HolidayWorkDays', label: '代出休出', type: 'number', step: '1' },
    { id: 'StandbyDays', label: '待機日数', type: 'number', step: '1' },
    { id: 'TotalWork', label: '総労働時間', placeholder: '0:00' },
    { id: 'Night', label: '深夜時間', placeholder: '0:00' },
    { id: 'Overtime', label: '総残業時間', placeholder: '0:00' },
    { id: 'LegalOvertime', label: '法定外時間', placeholder: '0:00' },
    { id: 'PaidDays', label: '有休日数', type: 'number', step: '0.1' },
    { id: 'SubstituteDays', label: '代休日数', type: 'number', step: '1' },
    { id: 'UnpaidDays', label: '無給休暇', type: 'number', step: '1' },
    { id: 'AbsentDays', label: '欠勤日数', type: 'number', step: '1' }
  ];

  root.innerHTML = `
    <div class="admin-ms-shell">
      <section class="admin-ms-toolbar" style="padding: 8px 24px !important;">
        <div style="display: flex; align-items: center; gap: 16px; width: 100%; flex-wrap: nowrap; overflow-x: auto;">
          <div class="admin-ms-toolbar-field" style="display: flex; align-items: center; gap: 8px;">
            <span class="admin-ms-toolbar-label">社員</span>
            <select id="msEmpSelect" class="admin-ms-select" style="width: 180px;">
              <option value="">読み込み中…</option>
            </select>
          </div>
          <div class="admin-ms-toolbar-field" style="display: flex; align-items: center; gap: 8px;">
            <span class="admin-ms-toolbar-label">年月</span>
            <input id="sumMonth" type="month" class="admin-ms-input" style="width: 130px;">
          </div>
          <button type="button" class="admin-ms-btn admin-ms-btn-primary" id="btnSumLoad" style="height: 32px;">表示</button>
          <div id="sumStatus" style="font-size: 13px; font-weight: 600; margin-left: 8px;"></div>
        </div>
      </section>

      <div class="admin-ms-main-content">
        <div class="admin-ms-summary">
          <div class="admin-ms-summary-head">
            <h2>月次サマリ（管理者入力）</h2>
          </div>
          <div class="admin-ms-sections-split">
            ${renderSummarySection('全体', 'sumAll', allFields)}
            ${renderSummarySection('社内勤務', 'sumIh', inhouseFields)}
          </div>
        </div>

        <div class="admin-ms-summary">
          <div class="admin-ms-summary-head">
            <h2>シフト割当</h2>
          </div>
          <div class="admin-ms-sections">
            <div class="admin-ms-grid-shift">
              <label class="admin-ms-field">
                <span class="admin-ms-field-label">シフト</span>
                <select id="saShift" class="admin-ms-select"></select>
              </label>
              <label class="admin-ms-field">
                <span class="admin-ms-field-label">開始日</span>
                <input id="saStart" type="date" class="admin-ms-input">
              </label>
              <label class="admin-ms-field">
                <span class="admin-ms-field-label">終了日</span>
                <input id="saEnd" type="date" class="admin-ms-input">
              </label>
              <div style="display:flex; align-items:flex-end; gap:8px;">
                <button type="button" class="admin-ms-btn admin-ms-btn-primary" id="btnSaAdd">追加</button>
                <button type="button" class="admin-ms-btn" id="btnSaReload">再読込</button>
              </div>
            </div>
            <div id="saStatus" style="padding:0 16px; font-size:12px;"></div>
            <div id="saTable" class="admin-ms-table-wrap"></div>
          </div>
        </div>

        <div class="admin-ms-summary">
          <div class="admin-ms-summary-head">
            <h2>契約内容・業務内容</h2>
          </div>
          <div class="admin-ms-sections">
            <div class="admin-ms-grid-two">
              <label class="admin-ms-field"><span class="admin-ms-field-label">開始日</span><input id="wdStart" type="date" class="admin-ms-input"></label>
              <label class="admin-ms-field"><span class="admin-ms-field-label">終了日</span><input id="wdEnd" type="date" class="admin-ms-input"></label>
              <label class="admin-ms-field"><span class="admin-ms-field-label">企業名</span><input id="wdCompany" class="admin-ms-input" placeholder="企業名"></label>
              <label class="admin-ms-field"><span class="admin-ms-field-label">就業先住所</span><input id="wdAddr" class="admin-ms-input" placeholder="住所"></label>
              <label class="admin-ms-field"><span class="admin-ms-field-label">業務内容</span><input id="wdWork" class="admin-ms-input" placeholder="業務内容"></label>
              <label class="admin-ms-field"><span class="admin-ms-field-label">役職</span><input id="wdRole" class="admin-ms-input" placeholder="役職"></label>
              <label class="admin-ms-field"><span class="admin-ms-field-label">責任程度</span><input id="wdResp" class="admin-ms-input" placeholder="責任程度"></label>
              <div style="display:flex; align-items:flex-end; gap:8px;">
                <button type="button" class="admin-ms-btn admin-ms-btn-primary" id="btnWdAdd">保存</button>
                <button type="button" class="admin-ms-btn" id="btnWdReload">再読込</button>
              </div>
            </div>
            <div id="wdStatus" style="padding:0 16px; font-size:12px;"></div>
            <div id="wdTable" class="admin-ms-table-wrap"></div>
          </div>
        </div>
      </div>

      <div class="form-actions">
        <button type="button" id="btnSumSave" class="admin-ms-btn admin-ms-btn-primary" style="height: 40px; padding: 0 40px; font-size: 15px;">
          保存
        </button>
      </div>
    </div>
  `;
}

function ensureEditorLayoutStyle() {
  try {
    if (document.querySelector('#adminMsExtraLayoutStyle')) return;
    const st = document.createElement('style');
    st.id = 'adminMsExtraLayoutStyle';
    st.textContent = `
      .admin-ms-shell { padding: 0; max-width: none; margin: 0; box-sizing: border-box; background: #f1f5f9; min-height: 100%; display: flex; flex-direction: column; font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
      .admin-ms-toolbar { display: flex; align-items: center; padding: 12px 24px; background: #ffffff; border-bottom: 1px solid #e2e8f0; position: static; margin: 0; }
      .admin-ms-toolbar-field { display: flex; align-items: center; gap: 12px; }
      .admin-ms-toolbar-label { font-size: 13px; font-weight: 600; color: #475569; white-space: nowrap; }
      
      .admin-ms-input, .admin-ms-select { height: 32px; border: 1px solid #cbd5e1; border-radius: 4px; padding: 0 10px; font-size: 13px; background: #ffffff; color: #1e293b; transition: all 0.2s; }
      .admin-ms-input:focus, .admin-ms-select:focus { border-color: #3b82f6; outline: none; box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1); }
      
      .admin-ms-btn { height: 32px; padding: 0 14px; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 13px; font-weight: 600; color: #334155; cursor: pointer; transition: all 0.2s; display: inline-flex; align-items: center; justify-content: center; gap: 6px; }
      .admin-ms-btn:hover { background: #f8fafc; border-color: #94a3b8; }
      .admin-ms-btn-primary { background: #0f172a !important; color: #ffffff !important; border-color: #0f172a !important; }
      .admin-ms-btn-primary:hover { background: #1e293b !important; }

      .admin-ms-main-content { padding: 20px; flex: 1; display: flex; flex-direction: column; gap: 20px; }
      .admin-ms-summary { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 0; overflow: visible; }
      @media (max-width: 768px) {
        .admin-ms-summary { border: none !important; }
        .admin-ms-main-content { padding: 8px !important; }
      }
      .admin-ms-summary-head { padding: 12px 20px; border-bottom: 1px solid #f1f5f9; background: #f8fafc; display: flex; align-items: center; justify-content: space-between; }
      .admin-ms-summary-head h2 { font-size: 14px; font-weight: 700; color: #0f172a; margin: 0; }
      
      .admin-ms-sections { padding: 0; }
      .admin-ms-sections-split { display: flex; flex-direction: column; border-bottom: 1px solid #e2e8f0; }
      .admin-ms-sections-split > section:first-child { border-bottom: 1px solid #e2e8f0; }
      .admin-ms-sections-split > section { }
      
      .admin-ms-section-head { padding: 8px 16px; background: #f1f5f9; border-bottom: 1px solid #e2e8f0; }
      .admin-ms-section-head h3 { font-size: 12px; font-weight: 700; color: #475569; margin: 0; text-transform: uppercase; letter-spacing: 0.05em; }
      
      .admin-ms-summary-grid { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; }
      @media (max-width: 768px) {
        .admin-ms-summary-grid { grid-template-columns: 1fr 1fr !important; }
        .admin-ms-summary-item { flex-direction: row !important; }
        .admin-ms-summary-item .label { flex: 0 0 90px !important; font-size: 11px !important; }
        .admin-ms-summary-item .value { flex: 1 !important; }
        .admin-ms-summary-item .value input { width: 100% !important; font-size: 13px !important; }
      }
      .admin-ms-summary-item { display: flex; align-items: stretch; border-bottom: 1px solid #f1f5f9; border-right: 1px solid #f1f5f9; }
      .admin-ms-summary-item .label { flex: 0 0 110px; background: #f8fafc; font-weight: 500; font-size: 12px; color: #64748b; padding: 8px 12px; border-right: 1px solid #f1f5f9; display: flex; align-items: center; }
      .admin-ms-summary-item .value { flex: 1; padding: 0; display: flex; align-items: center; }
      .admin-ms-summary-item .value input { width: 100%; border: none; outline: none; background: transparent; padding: 8px 12px; font-size: 13px; font-family: "JetBrains Mono", "Roboto Mono", monospace; color: #0f172a; text-align: right; }
      .admin-ms-summary-item .value input:focus { background: #f0f9ff; }
      
      .admin-ms-grid-shift, .admin-ms-grid-two { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; padding: 16px; }
      .admin-ms-field { display: flex; flex-direction: column; gap: 6px; }
      .admin-ms-field-label { font-size: 12px; font-weight: 600; color: #64748b; }
      
      .admin-ms-table-wrap { border-top: 1px solid #e2e8f0; overflow-x: auto; }
      .excel-table { width: 100%; border-collapse: collapse; background: #ffffff; }
      .excel-table th { background: #f8fafc; padding: 10px 16px; font-size: 11px; font-weight: 700; color: #475569; text-align: left; border-bottom: 1px solid #e2e8f0; text-transform: uppercase; letter-spacing: 0.05em; }
      .excel-table td { padding: 10px 16px; font-size: 13px; color: #1e293b; border-bottom: 1px solid #f1f5f9; }
      .excel-table tr:hover td { background: #f8fafc; }
      
      .admin-ms-op { display: flex; gap: 8px; }
      .admin-ms-op .admin-ms-btn { height: 28px; padding: 0 10px; font-size: 12px; }

      .form-actions { position: static; background: #ffffff; padding: 12px 24px; display: flex; justify-content: flex-end; border-top: 1px solid #e2e8f0; }
    `;
    document.head.appendChild(st);
  } catch (e) { console.error(e); }
}

function setSummaryValues(root, prefix, obj) {
  const x = obj && typeof obj === 'object' ? obj : {};
  const set = (id, val) => { const el = $(id, root); if (el) el.value = val; };
  set(`#${prefix}PlannedDays`, String(x.plannedDays == null ? '' : x.plannedDays));
  set(`#${prefix}AttendDays`, String(x.attendDays == null ? '' : x.attendDays));
  set(`#${prefix}HolidayWorkDays`, String(x.holidayWorkDays == null ? '' : x.holidayWorkDays));
  set(`#${prefix}StandbyDays`, String(x.standbyDays == null ? '' : x.standbyDays));
  set(`#${prefix}TotalWork`, minToHm(x.totalWorkMinutes == null ? 0 : x.totalWorkMinutes));
  set(`#${prefix}Night`, minToHm(x.nightMinutes == null ? 0 : x.nightMinutes));
  set(`#${prefix}Overtime`, minToHm(x.overtimeMinutes == null ? 0 : x.overtimeMinutes));
  set(`#${prefix}LegalOvertime`, minToHm(x.legalOvertimeMinutes == null ? 0 : x.legalOvertimeMinutes));
  set(`#${prefix}PaidDays`, String(x.paidDays == null ? '' : x.paidDays));
  set(`#${prefix}SubstituteDays`, String(x.substituteDays == null ? '' : x.substituteDays));
  set(`#${prefix}UnpaidDays`, String(x.unpaidDays == null ? '' : x.unpaidDays));
  set(`#${prefix}AbsentDays`, String(x.absentDays == null ? '' : x.absentDays));
  if (prefix === 'sumAll') {
    set('#sumAllDeduction', minToHm(x.deductionMinutes == null ? 0 : x.deductionMinutes));
    set('#sumAllWorkGoOut', minToHm(x.workGoOutMinutes == null ? 0 : x.workGoOutMinutes));
    set('#sumAllPrivateGoOut', minToHm(x.privateGoOutMinutes == null ? 0 : x.privateGoOutMinutes));
    set('#sumAllOnsiteDays', String(x.onsiteDays == null ? '' : x.onsiteDays));
    set('#sumAllRemoteDays', String(x.remoteDays == null ? '' : x.remoteDays));
    set('#sumAllSatelliteDays', String(x.satelliteDays == null ? '' : x.satelliteDays));
  }
}

function getSummaryValues(root, prefix) {
  const val = (id) => $(id, root)?.value || '';
  const totalWorkMinutes = hmToMin(val(`#${prefix}TotalWork`));
  const nightMinutes = hmToMin(val(`#${prefix}Night`));
  const overtimeMinutes = hmToMin(val(`#${prefix}Overtime`));
  const legalOvertimeMinutes = hmToMin(val(`#${prefix}LegalOvertime`));
  if (totalWorkMinutes == null || nightMinutes == null || overtimeMinutes == null || legalOvertimeMinutes == null) return null;
  const base = {
    plannedDays: num(val(`#${prefix}PlannedDays`)),
    attendDays: num(val(`#${prefix}AttendDays`)),
    holidayWorkDays: num(val(`#${prefix}HolidayWorkDays`)),
    standbyDays: num(val(`#${prefix}StandbyDays`)),
    totalWorkMinutes,
    nightMinutes,
    overtimeMinutes,
    legalOvertimeMinutes,
    paidDays: num(val(`#${prefix}PaidDays`)),
    substituteDays: num(val(`#${prefix}SubstituteDays`)),
    unpaidDays: num(val(`#${prefix}UnpaidDays`)),
    absentDays: num(val(`#${prefix}AbsentDays`))
  };
  if (prefix === 'sumAll') {
    const deductionMinutes = hmToMin(val('#sumAllDeduction'));
    if (deductionMinutes == null) return null;
    return {
      ...base,
      deductionMinutes,
      workGoOutMinutes: hmToMin(val('#sumAllWorkGoOut')),
      privateGoOutMinutes: hmToMin(val('#sumAllPrivateGoOut')),
      onsiteDays: num(val('#sumAllOnsiteDays')),
      remoteDays: num(val('#sumAllRemoteDays')),
      satelliteDays: num(val('#sumAllSatelliteDays'))
    };
  }
  return base;
}

export async function mount(opt) {
  const root = (opt && opt.content) || document.querySelector('#adminContent');
  if (!root) return;
  // try { wireAdminShell({ logoutRedirect: '/ui/login' }); } catch (e) { /* silently ignored */ }
  // try { wireTopbarMenus(); } catch (e) { /* silently ignored */ }
  try { delete root.dataset.monthlySummaryMounted; } catch (e) { /* silently ignored */ }
  try {
    const status = document.querySelector('#status');
    if (status) {
      status.textContent = '';
      status.style.display = 'none';
    }
  } catch (e) { /* silently ignored */ }
  ensureEditorLayoutStyle();
  renderScaffold(root);

  const empSelect = $('#msEmpSelect', root);
  const monthEl = $('#sumMonth', root);
  const statusEl = $('#sumStatus', root);
  const setStatus = (msg) => { 
        if (statusEl) {
          statusEl.textContent = msg || ''; 
          statusEl.style.display = msg ? 'block' : 'none';
          if (msg && (msg.includes('失敗') || msg.includes('エラー') || msg.includes('してください'))) {
            statusEl.style.color = '#f87171';
          } else {
            statusEl.style.color = '#60a5fa';
          }
        }
      };
  const wdStatusEl = $('#wdStatus', root);
  const setWdStatus = (msg) => { if (wdStatusEl) wdStatusEl.textContent = msg || ''; };
  const saStatusEl = $('#saStatus', root);
  const setSaStatus = (msg) => { if (saStatusEl) saStatusEl.textContent = msg || ''; };
  if (monthEl && !monthEl.value) monthEl.value = currentMonthJST();

  const users = await fetchEmployees().catch(() => []);
  const qUserId = new URL(window.location.href).searchParams.get('userId') || '';
  if (empSelect) {
    if (!users.length) {
      empSelect.innerHTML = `<option value="">社員が見つかりません</option>`;
      empSelect.disabled = true;
    } else {
      empSelect.disabled = false;
      empSelect.innerHTML = users.map((u) => {
        const selected = String(u.id) === String(qUserId || users[0]?.id || '') ? ' selected' : '';
        return `<option value="${u.id}"${selected}>${nameOf(u)}（${codeOf(u)}）</option>`;
      }).join('');
    }
  }

  const load = async () => {
    const ym = String(monthEl?.value || '').trim();
    const uid = String(empSelect?.value || '').trim();
    if (!/^\d{4}-\d{2}$/.test(ym) || !uid) return;
    const y = parseInt(ym.slice(0, 4), 10);
    const m = parseInt(ym.slice(5, 7), 10);
    const saStart = $('#saStart', root);
    if (saStart && !saStart.value) saStart.value = `${ym}-01`;
    setStatus('読込中...');
    let hasAnyData = false;
    let usedStored = false;
    let warnMsg = '';
    try {
      // Always try stored monthly summary first so the form is never empty on slow detail APIs.
      const stored = await withTimeout(
        fetchJSONAuth(`/api/attendance/month/summary?year=${encodeURIComponent(y)}&month=${encodeURIComponent(m)}&userId=${encodeURIComponent(uid)}`),
        8000,
        'month-summary'
      ).catch(() => null);
      if (stored && (stored.all || stored.inhouse)) {
        if (stored.all) setSummaryValues(root, 'sumAll', stored.all);
        if (stored.inhouse) setSummaryValues(root, 'sumIh', stored.inhouse);
        hasAnyData = true;
        usedStored = true;
      }

      const bust = `&_=${Date.now()}`;
      const detailRes = await Promise.allSettled([
        withTimeout(fetchJSONAuth(`/api/attendance/month/detail?year=${encodeURIComponent(y)}&month=${encodeURIComponent(m)}&userId=${encodeURIComponent(uid)}${bust}`), 12000, 'month-detail'),
        withTimeout(fetchJSONAuth(`/api/attendance/month?year=${encodeURIComponent(y)}&month=${encodeURIComponent(m)}&userId=${encodeURIComponent(uid)}${bust}`).catch(() => null), 12000, 'month-timesheet')
      ]);
      const detail = detailRes[0].status === 'fulfilled' ? detailRes[0].value : null;
      const timesheet = detailRes[1].status === 'fulfilled' ? detailRes[1].value : null;
      if (detail && typeof detail === 'object') {
        // Preferred source: recompute from detailed monthly data.
        setSummaryValues(root, 'sumAll', computeSummary(detail, timesheet, 'sumAll'));
        setSummaryValues(root, 'sumIh', computeSummary(detail, timesheet, 'sumIh'));
        hasAnyData = true;
      } else if (detailRes[0].status === 'rejected') {
        warnMsg = String(detailRes[0].reason?.message || 'detail load failed');
      }
    } catch (e) {
      warnMsg = String(e?.message || '読込失敗');
    }

    await loadSa().catch(() => { });
    await loadWd().catch(() => { });
    if (hasAnyData) {
      setStatus(usedStored && warnMsg ? '読込完了（保存データ表示）' : '読込完了');
    } else {
      setStatus(`読込失敗${warnMsg ? `: ${warnMsg}` : ''}`);
    }
    try {
      const u = new URL(window.location.href);
      u.searchParams.set('userId', uid);
      u.searchParams.set('month', ym);
      history.replaceState(null, '', u.pathname + u.search + u.hash);
    } catch (e) { /* silently ignored */ }
  };

  const save = async () => {
        const ym = String(monthEl?.value || '').trim();
        const uid = String(empSelect?.value || '').trim();
        if (!/^\d{4}-\d{2}$/.test(ym) || !uid) return;
        const all = getSummaryValues(root, 'sumAll');
        const inhouse = getSummaryValues(root, 'sumIh');
        if (!all || !inhouse) {
          setStatus('時間はH:MMで入力してください');
          return;
        }
        const y = parseInt(ym.slice(0, 4), 10);
        const m = parseInt(ym.slice(5, 7), 10);
        setStatus('');
        const btn = $('#btnSumSave', root);
        if (btn) {
          btn.disabled = true;
          btn.innerHTML = `<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg> <span>保存中...</span>`;
        }
        
        try {
          await fetchJSONAuth(`/api/attendance/month/summary?year=${encodeURIComponent(y)}&month=${encodeURIComponent(m)}&userId=${encodeURIComponent(uid)}`, {
            method: 'PUT',
            body: JSON.stringify({ year: y, month: m, userId: uid, all, inhouse })
          });
          setStatus('');
          if (btn) {
            btn.style.background = 'transparent';
            btn.style.borderColor = 'transparent';
            btn.style.color = '#10b981';
            btn.innerHTML = `<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg> <span>保存成功</span>`;
            setTimeout(() => {
              btn.style.background = 'transparent';
              btn.style.borderColor = 'transparent';
              btn.style.color = '#2b6cb0';
              btn.innerHTML = `<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path></svg> <span>保存</span>`;
              btn.disabled = false;
            }, 2000);
          }
        } catch (e) {
          setStatus(String(e?.message || '保存失敗'));
          if (btn) {
            btn.disabled = false;
            btn.innerHTML = `<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path></svg> <span>保存</span>`;
          }
          throw e;
        }
      };

  const val = (id) => String(($(id, root)?.value ?? '')).trim();
  const normDate = (s) => {
    const t = String(s || '').trim();
    if (!t) return '';
    const m = t.match(/^(\d{4})[\/-](\d{2})[\/-](\d{2})/);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
    return t;
  };
  const isISODate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || '').slice(0, 10));
  const clearWdForm = () => {
    ['#wdStart', '#wdEnd', '#wdCompany', '#wdAddr', '#wdWork', '#wdRole', '#wdResp'].forEach((id) => {
      const el = $(id, root);
      if (el) el.value = '';
    });
    const btn = $('#btnWdAdd', root);
    if (btn) {
      btn.textContent = '追加';
      delete btn.dataset.editing;
    }
  };
  const renderWd = (items) => {
    const host = $('#wdTable', root);
    if (!host) return;
    const rows = Array.isArray(items) ? items : [];
    host.innerHTML = `
      <table class="excel-table" style="margin:0;">
        <thead><tr>
          <th>企業名</th><th>適用終了日</th><th>就業先住所</th><th>業務内容</th><th>役職</th><th>責任の程度</th><th>操作</th>
        </tr></thead>
        <tbody>
          ${rows.length ? rows.map((r) => `
            <tr>
              <td>${r.companyName || ''}</td>
              <td>${r.endDate || '—'}</td>
              <td>${r.workPlaceAddress || ''}</td>
              <td>${r.workContent || ''}</td>
              <td>${r.roleTitle || ''}</td>
              <td>${r.responsibilityLevel || ''}</td>
              <td><div class="admin-ms-op">
                <button type="button" class="admin-ms-btn" data-wd-edit="${r.id}">編集</button>
                <button type="button" class="admin-ms-btn" data-wd-del="${r.id}">削除</button>
              </div></td>
            </tr>
          `).join('') : `<tr><td colspan="7" style="text-align:center;color:#64748b;font-weight:800;">業務内容が未設定です（管理者が登録してください）</td></tr>`}
        </tbody>
      </table>
    `;
    host.querySelectorAll('button[data-wd-del]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const uid = String(empSelect?.value || '').trim();
        const id = btn.getAttribute('data-wd-del');
        if (!uid || !id) return;
        if (!confirm('削除します。よろしいですか？')) return;
        setWdStatus('削除中...');
        try {
          await fetchJSONAuth(`/api/attendance/work-details/${encodeURIComponent(String(id))}`, {
            method: 'DELETE',
            body: JSON.stringify({ userId: uid })
          });
          await loadWd();
          setWdStatus('削除しました');
        } catch (e) {
          setWdStatus(String(e?.message || '削除失敗'));
        }
      });
    });
    host.querySelectorAll('button[data-wd-edit]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-wd-edit');
        const cur = rows.find((x) => String(x.id) === String(id));
        if (!cur) return;
        const put = (idSel, v) => { const el = $(idSel, root); if (el) el.value = v || ''; };
        put('#wdStart', cur.startDate);
        put('#wdEnd', cur.endDate);
        put('#wdCompany', cur.companyName);
        put('#wdAddr', cur.workPlaceAddress);
        put('#wdWork', cur.workContent);
        put('#wdRole', cur.roleTitle);
        put('#wdResp', cur.responsibilityLevel);
        const addBtn = $('#btnWdAdd', root);
        if (addBtn) {
          addBtn.textContent = '更新';
          addBtn.dataset.editing = String(id);
        }
      });
    });
  };
  const loadWd = async () => {
    const uid = String(empSelect?.value || '').trim();
    const ym = String(monthEl?.value || '').trim();
    if (!uid) return;
    let from = '1900-01-01';
    let to = '2999-12-31';
    if (/^\d{4}-\d{2}$/.test(ym)) {
      const y = parseInt(ym.slice(0, 4), 10);
      const m = parseInt(ym.slice(5, 7), 10);
      const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
      from = `${ym}-01`;
      to = `${ym}-${String(last).padStart(2, '0')}`;
    }
    setWdStatus('読込中...');
    try {
      const r = await fetchJSONAuth(`/api/attendance/work-details?userId=${encodeURIComponent(uid)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
      renderWd((r && Array.isArray(r.items)) ? r.items : []);
      setWdStatus('');
    } catch (e) {
      renderWd([]);
      setWdStatus(String(e?.message || '読込失敗'));
    }
  };

  const fmtHm = (min) => {
    const m = Math.max(0, Number(min || 0));
    const h = Math.floor(m / 60);
    const r = Math.floor(m % 60);
    return `${h}:${String(r).padStart(2, '0')}`;
  };
  const loadShiftDefs = async () => {
    const saShift = $('#saShift', root);
    if (!saShift) return;
    try {
      const defs = await fetchJSONAuth('/api/attendance/shifts/definitions');
      const rows = Array.isArray(defs) ? defs : [];
      saShift.innerHTML = `<option value="">シフト</option>${rows.map((d) => `<option value="${d.id}">${d.name} ${d.start_time}-${d.end_time}</option>`).join('')}`;
    } catch (e) {
      saShift.innerHTML = '<option value="">シフト</option>';
    }
  };
  const renderSa = (items) => {
    const host = $('#saTable', root);
    if (!host) return;
    const rows = Array.isArray(items) ? items : [];
    host.innerHTML = `
      <table class="excel-table" style="margin:0;">
        <thead><tr>
          <th>No</th><th>シフト</th><th>開始時刻</th><th>終了時刻</th><th>休憩時間</th><th>所定労働時間</th><th>適用開始日</th><th>適用終了日</th><th>操作</th>
        </tr></thead>
        <tbody>
          ${rows.length ? rows.map((r, i) => {
      const s = r?.shift || null;
      const name = s ? (s.name || '') : '';
      const st = s ? (s.start_time || '—') : '—';
      const et = s ? (s.end_time || '—') : '—';
      const br = s ? fmtHm(s.break_minutes || 0) : '—';
      const std = s ? fmtHm(s.standard_minutes || 0) : '—';
      const sd = r?.start_date || '—';
      const ed = r?.end_date || '—';
      return `
              <tr>
                <td>${i + 1}</td>
                <td>${name}</td>
                <td>${st}</td>
                <td>${et}</td>
                <td>${br}</td>
                <td>${std}</td>
                <td>${sd}</td>
                <td>${ed}</td>
                <td><div class="admin-ms-op"><button type="button" class="admin-ms-btn" data-sa-del="${r.id}">削除</button></div></td>
              </tr>
            `;
    }).join('') : `<tr><td colspan="9" style="text-align:center;color:#64748b;font-weight:800;">シフトが未設定です（管理者がシフトを割り当てしてください）</td></tr>`}
        </tbody>
      </table>
    `;
    host.querySelectorAll('button[data-sa-del]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const uid = String(empSelect?.value || '').trim();
        const id = btn.getAttribute('data-sa-del');
        if (!uid || !id) return;
        if (!confirm('削除します。よろしいですか？')) return;
        setSaStatus('削除中...');
        try {
          await fetchJSONAuth(`/api/attendance/shifts/assignments/${encodeURIComponent(String(id))}?userId=${encodeURIComponent(uid)}`, { method: 'DELETE' });
          await loadSa();
          setSaStatus('削除しました');
        } catch (e) {
          setSaStatus(String(e?.message || '削除失敗'));
        }
      });
    });
  };
  const loadSa = async () => {
    const uid = String(empSelect?.value || '').trim();
    if (!uid) return;
    setSaStatus('読込中...');
    try {
      const r = await fetchJSONAuth(`/api/attendance/shifts/assignments?userId=${encodeURIComponent(uid)}&from=1900-01-01&to=2999-12-31`);
      renderSa((r && Array.isArray(r.items)) ? r.items : []);
      setSaStatus('');
    } catch (e) {
      renderSa([]);
      setSaStatus(String(e?.message || '読込失敗'));
    }
  };

  $('#btnSaReload', root)?.addEventListener('click', () => { loadSa().catch(e => setSaStatus(String(e?.message || '読込失敗'))); });
  $('#btnSaAdd', root)?.addEventListener('click', async () => {
    const uid = String(empSelect?.value || '').trim();
    const shiftId = String($('#saShift', root)?.value || '').trim();
    const startDate = String($('#saStart', root)?.value || '').trim();
    const endDate = String($('#saEnd', root)?.value || '').trim();
    if (!uid || !shiftId || !startDate) { setSaStatus('シフト/適用開始日を入力してください'); return; }
    setSaStatus('保存中...');
    try {
      await fetchJSONAuth('/api/attendance/shifts/assign', {
        method: 'POST',
        body: JSON.stringify({ userId: uid, shiftId, startDate, endDate: endDate || null })
      });
      await loadSa();
      setSaStatus('保存しました');
    } catch (e) {
      setSaStatus(String(e?.message || '保存失敗'));
    }
  });
  $('#btnWdReload', root)?.addEventListener('click', () => { loadWd().catch(e => setWdStatus(String(e?.message || '読込失敗'))); });
  $('#btnWdAdd', root)?.addEventListener('click', async () => {
    const uid = String(empSelect?.value || '').trim();
    if (!uid) return;
    const btn = $('#btnWdAdd', root);
    const editing = String(btn?.dataset?.editing || '').trim();
    const payload = {
      userId: uid,
      startDate: normDate(val('#wdStart')),
      endDate: normDate(val('#wdEnd')) || null,
      companyName: val('#wdCompany'),
      workPlaceAddress: val('#wdAddr'),
      workContent: val('#wdWork'),
      roleTitle: val('#wdRole'),
      responsibilityLevel: val('#wdResp')
    };
    if (!payload.startDate) { setWdStatus('適用開始日を入力してください'); return; }
    if (!isISODate(payload.startDate) || (payload.endDate && !isISODate(payload.endDate))) { setWdStatus('日付はYYYY-MM-DD形式で入力してください'); return; }
    setWdStatus('保存中...');
    try {
      if (editing) {
        await fetchJSONAuth(`/api/attendance/work-details/${encodeURIComponent(editing)}`, { method: 'PUT', body: JSON.stringify(payload) });
      } else {
        await fetchJSONAuth('/api/attendance/work-details', { method: 'POST', body: JSON.stringify(payload) });
      }
      clearWdForm();
      await loadWd();
      setWdStatus('保存しました');
    } catch (e) {
      setWdStatus(String(e?.message || '保存失敗'));
    }
  });

  $('#btnSumLoad', root)?.addEventListener('click', () => { load().catch(e => setStatus(String(e?.message || '読込失敗'))); });
  $('#btnSumSave', root)?.addEventListener('click', () => { save().catch(e => setStatus(String(e?.message || '保存失敗'))); });
  empSelect?.addEventListener('change', () => { load().catch(e => setStatus(String(e?.message || '読込失敗'))); });
  monthEl?.addEventListener('change', () => {
    // Automatically update URL parameter so refresh/bookmarking works
    const url = new URL(window.location.href);
    url.searchParams.set('month', monthEl.value);
    window.history.pushState({}, '', url);
    load().catch(e => setStatus(String(e?.message || '読込失敗')));
  });
  await loadShiftDefs().catch(() => { });
  await load().catch((e) => setStatus(String(e?.message || '読込失敗')));
}

document.addEventListener('DOMContentLoaded', async () => {
  await mount();
});

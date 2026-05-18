const db = require('../core/database/mysql');
const emailService = require('../core/notifications/email.service');

let cronInstance = null;
let cronLoadError = null;

function getCron() {
  if (cronInstance) return cronInstance;
  if (cronLoadError) return null;
  try {
    cronInstance = require('node-cron');
    return cronInstance;
  } catch (err) {
    cronLoadError = err;
    return null;
  }
}

// Store sent reminders in memory to avoid duplicate emails.
// In production, consider Redis or a database table to persist this across restarts.
// Key format: `${userId}_${dateStr}_${shiftType}_${reminderType}`
// e.g. "15_2026-05-14_start_30m"

const sentReminders = new Set();

/**
 * Parses "HH:mm" to minutes since midnight
 */
function parseHmToMin(hm) {
  if (!hm || typeof hm !== 'string') return null;
  const parts = hm.split(':');
  if (parts.length !== 2) return null;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

/**
 * Checks if a shift time is within the reminder window.
 * @param {number} currentMin - Current time in minutes since midnight.
 * @param {number} targetMin - Shift start or end time in minutes since midnight.
 * @param {number} offset - 30, 15, or 5 minutes.
 * @returns {boolean} True if the current time matches the exact reminder minute.
 */
async function processReminders() {
  try {
    if (!emailService.canSendMail()) {
      // Email service not configured, skip
      return;
    }

    const nowJST = new Date(Date.now() + 9 * 3600 * 1000);
    const todayStr = nowJST.toISOString().slice(0, 10);
    const currentMin = nowJST.getUTCHours() * 60 + nowJST.getUTCMinutes(); // Hours and minutes in JST

    const y = nowJST.getUTCFullYear();
    const m = String(nowJST.getUTCMonth() + 1).padStart(2, '0');
    const d = String(nowJST.getUTCDate()).padStart(2, '0');
    const todayJstStart = `${y}-${m}-${d} 00:00:00`;
    const todayJstEnd = `${y}-${m}-${d} 23:59:59`;

    // 1. Fetch all active users (employees and managers) with their emails and department info
    const [users] = await db.query(`
      SELECT u.id, u.email, u.username, d.name as departmentName 
      FROM users u 
      LEFT JOIN departments d ON u.departmentId = d.id 
      WHERE u.employment_status = 'active' AND u.role IN ('employee', 'manager')
    `);
    if (!users || users.length === 0) return;

    // 2. Fetch today's shift assignments
    const [assignments] = await db.query(`
      SELECT 
        a.userId, 
        s.name, 
        s.start_time, 
        s.end_time 
      FROM user_shift_assignments a
      JOIN shift_definitions s ON a.shiftId = s.id
      WHERE a.start_date <= ? AND (a.end_date IS NULL OR a.end_date >= ?)
    `, [todayStr, todayStr]);

    const assignMap = new Map();
    for (const a of assignments) {
      assignMap.set(a.userId, a);
    }

    // Check plan overrides
    const [plans] = await db.query(`
      SELECT 
        userId, 
        shiftId 
      FROM attendance_plan 
      WHERE date = ?
    `, [todayStr]);

    const planMap = new Map(plans.map(p => [p.userId, p.shiftId]));

    const [allShifts] = await db.query(`SELECT id, name, start_time, end_time FROM shift_definitions`);
    const shiftMap = new Map(allShifts.map(s => [s.id, s]));

    // Check holidays and Sundays
    let isRedDay = false;
    let calendarExplanation = null;
    try {
      const calendarRepo = require('../modules/calendar/calendar.repository');
      calendarExplanation = await calendarRepo.explainDate(todayStr);
      isRedDay = !!calendarExplanation?.is_off;
    } catch (e) {
      console.error('[ShiftReminder] Error checking calendar:', e);
    }
    const isSunday = new Date(todayStr).getUTCDay() === 0;

    // Check explicit daily kubun
    const [dailies] = await db.query(`SELECT userId, kubun FROM attendance_daily WHERE date = ?`, [todayStr]);
    const dailyMap = new Map(dailies.map(d => [d.userId, String(d.kubun || '').trim()]));

    // 3. For each active user, check if we need to send a reminder
    for (const user of users) {
      const userId = user.id;
      if (!user.email) continue;

      const isKoujiUser = String(user.departmentName || '').includes('工事部');
      
      // Determine if today is considered an off day for this specific user
      let isUserOffDay = false;
      
      if (!isKoujiUser) {
        // Normal user: off on Sundays and Red Days
        isUserOffDay = isSunday || isRedDay;
      } else {
        // Kouji User: specific policy logic
        const hasSundayReason = calendarExplanation?.reasons?.some(x => x.is_off && x.type === 'sunday');
        const hasLastSaturdayReason = calendarExplanation?.reasons?.some(x => x.is_off && x.type === 'saturday_last');
        const hasHolidayReason = calendarExplanation?.reasons?.some(x => x.is_off && ['fixed', 'jp_auto', 'jp_substitute', 'jp_bridge'].includes(x.type));
        
        isUserOffDay = hasSundayReason || hasLastSaturdayReason || hasHolidayReason;
      }
      
      const userKubun = dailyMap.get(userId) || '';
      const isExplicitOff = ['休日', '有給休暇', '欠勤', '無給休暇', '代替休日'].includes(userKubun);
      const isExplicitWork = ['出勤', '休日出勤', '代替出勤', '半休'].includes(userKubun);
      
      if (isExplicitOff) continue;
      if (isUserOffDay && !isExplicitWork) continue;

      let shiftStartHm = '08:00';
      let shiftEndHm = '17:00';
      let shiftName = '基本シフト (08:00-17:00)';

      const assign = assignMap.get(userId);
      if (assign) {
        shiftStartHm = assign.start_time;
        shiftEndHm = assign.end_time;
        shiftName = assign.name;
      }

      // If user has a specific plan for today, fetch that shift definition instead
      const planShiftId = planMap.get(userId);
      if (planShiftId) {
        const pShift = shiftMap.get(planShiftId);
        if (pShift) {
           shiftStartHm = pShift.start_time;
           shiftEndHm = pShift.end_time;
           shiftName = pShift.name;
        }
      }

      const startMin = parseHmToMin(shiftStartHm);
      const endMin = parseHmToMin(shiftEndHm);

      // Helper function to check attendance
      const hasClockedIn = async () => {
        const [att] = await db.query(`SELECT id FROM attendance WHERE userId = ? AND checkIn >= ? AND checkIn <= ? LIMIT 1`, [userId, todayJstStart, todayJstEnd]);
        return att.length > 0;
      };

      const hasClockedOut = async () => {
        const [att] = await db.query(`SELECT id FROM attendance WHERE userId = ? AND checkOut >= ? AND checkOut <= ? LIMIT 1`, [userId, todayJstStart, todayJstEnd]);
        return att.length > 0;
      };

      // Check Shift Start Reminders (Before shift and exact/late)
      const startOffsets = [30, 15, 0]; // Nhắc trước 30p, 15p và đúng giờ
      for (const offset of startOffsets) {
        if (startMin - currentMin === offset) {
          const cacheKey = `${userId}_${todayStr}_start_${offset}m`;
          if (!sentReminders.has(cacheKey)) {
            const clockedIn = await hasClockedIn();
            if (!clockedIn) {
              await sendReminderEmail(user, shiftName, shiftStartHm, offset, 'start');
            }
            sentReminders.add(cacheKey);
          }
        }
      }

      // Check Shift End Reminders (After shift)
      const endOffsets = [0, 15, 30]; // Nhắc đúng giờ về, sau 15p và sau 30p
      for (const offset of endOffsets) {
        if (currentMin - endMin === offset) {
          const cacheKey = `${userId}_${todayStr}_end_${offset}m`;
          if (!sentReminders.has(cacheKey)) {
            const clockedOut = await hasClockedOut();
            if (!clockedOut) {
              await sendReminderEmail(user, shiftName, shiftEndHm, offset, 'end');
            }
            sentReminders.add(cacheKey);
          }
        }
      }
    }

    // Clean up memory cache for previous days to prevent memory leak
    // Ở đây là để tránh memory leak do sentReminders có nhiều key ko cần thiết để gửi email 
    
    const yesterdayStr = new Date(Date.now() + 9 * 3600 * 1000 - 86400000).toISOString().slice(0, 10);
    for (const key of sentReminders) {
      if (key.includes(yesterdayStr) && !key.startsWith('monthly_missing_')) {
        sentReminders.delete(key);
      }
    }

  } catch (err) {
    console.error('[ShiftReminder] Error processing reminders:', err);
  }
}
// Cái này checkin daily missing attendance
async function checkDailyMissingAttendance() {
  try {
    const nowJST = new Date(Date.now() + 9 * 3600 * 1000);
    const todayStr = nowJST.toISOString().slice(0, 10);
    const y = nowJST.getUTCFullYear();
    const m = String(nowJST.getUTCMonth() + 1).padStart(2, '0');
    const d = String(nowJST.getUTCDate()).padStart(2, '0');
    const todayJstStart = `${y}-${m}-${d} 00:00:00`;
    const todayJstEnd = `${y}-${m}-${d} 23:59:59`;

    // 1. Fetch all active users
    const [users] = await db.query(`
      SELECT u.id, u.email, u.username, d.name as departmentName 
      FROM users u 
      LEFT JOIN departments d ON u.departmentId = d.id 
      WHERE u.employment_status = 'active' AND u.role IN ('employee', 'manager')
    `);
    if (!users || users.length === 0) return;

    // 2. Check assignments
    const [assignments] = await db.query(`
      SELECT a.userId, s.name, s.start_time, s.end_time
      FROM user_shift_assignments a
      JOIN shift_definitions s ON a.shiftId = s.id
      WHERE a.start_date <= ? AND (a.end_date IS NULL OR a.end_date >= ?)
    `, [todayStr, todayStr]);
    const assignMap = new Map();
    for (const a of assignments) {
      assignMap.set(a.userId, a);
    }

    // Check holidays and Sundays
    let isRedDay = false;
    let calendarExplanation = null;
    try {
      const calendarRepo = require('../modules/calendar/calendar.repository');
      calendarExplanation = await calendarRepo.explainDate(todayStr);
      isRedDay = !!calendarExplanation?.is_off;
    } catch (e) {
      console.error('[ShiftReminder] Error checking calendar:', e);
    }
    const isSunday = new Date(todayStr).getUTCDay() === 0;

    // Check explicit daily kubun
    const [dailies] = await db.query(`SELECT userId, kubun FROM attendance_daily WHERE date = ?`, [todayStr]);
    const dailyMap = new Map(dailies.map(d => [d.userId, String(d.kubun || '').trim()]));

    for (const user of users) {
      if (!user.email) continue;
      const userId = user.id;

      const isKoujiUser = String(user.departmentName || '').includes('工事部');
      
      let isUserOffDay = false;
      if (!isKoujiUser) {
        isUserOffDay = isSunday || isRedDay;
      } else {
        const hasSundayReason = calendarExplanation?.reasons?.some(x => x.is_off && x.type === 'sunday');
        const hasLastSaturdayReason = calendarExplanation?.reasons?.some(x => x.is_off && x.type === 'saturday_last');
        const hasHolidayReason = calendarExplanation?.reasons?.some(x => x.is_off && ['fixed', 'jp_auto', 'jp_substitute', 'jp_bridge'].includes(x.type));
        isUserOffDay = hasSundayReason || hasLastSaturdayReason || hasHolidayReason;
      }

      const userKubun = dailyMap.get(userId) || '';
      const isExplicitOff = ['休日', '有給休暇', '欠勤', '無給休暇', '代替休日'].includes(userKubun);
      const isExplicitWork = ['出勤', '休日出勤', '代替出勤', '半休'].includes(userKubun);
      
      if (isExplicitOff) continue;
      if (isUserOffDay && !isExplicitWork) continue;

      const cacheKey = `daily_missing_${userId}_${todayStr}`;
      if (sentReminders.has(cacheKey)) continue;

      const [att] = await db.query(`SELECT id, checkIn, checkOut FROM attendance WHERE userId = ? AND (checkIn >= ? AND checkIn <= ? OR checkOut >= ? AND checkOut <= ?) LIMIT 1`, [userId, todayJstStart, todayJstEnd, todayJstStart, todayJstEnd]);
      
      if (att.length === 0) {
        // Chưa check-in
        await sendMissingEmail(user, 'daily_in', todayStr);
        sentReminders.add(cacheKey);
      } else if (!att[0].checkOut) {
        // Đã check-in nhưng chưa check-out
        await sendMissingEmail(user, 'daily_out', todayStr);
        sentReminders.add(cacheKey);
      } else {
        // Đã check-in và check-out đầy đủ, đánh dấu để không nhắc nữa
        sentReminders.add(cacheKey);
      }
    }
  } catch (err) {
    console.error('[ShiftReminder] Error daily missing:', err);
  }
}
// Mục đích sử dụng của cái này là check monthly missing attendance

async function checkMonthlyMissingAttendance() {
  try {
    const nowJST = new Date(Date.now() + 9 * 3600 * 1000);
    const y = nowJST.getUTCFullYear();
    const m = nowJST.getUTCMonth();
    const monthStr = nowJST.toISOString().slice(0, 7);
    const todayStr = nowJST.toISOString().slice(0, 10);
    
    const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    const monthStartStr = `${y}-${String(m+1).padStart(2, '0')}-01`;
    const monthEndStr = `${y}-${String(m+1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const monthStartJST = `${monthStartStr} 00:00:00`;
    const monthEndJST = `${monthEndStr} 23:59:59`;

    // 1. Fetch all active users
    const [users] = await db.query(`
      SELECT u.id, u.email, u.username, d.name as departmentName 
      FROM users u 
      LEFT JOIN departments d ON u.departmentId = d.id 
      WHERE u.employment_status = 'active' AND u.role IN ('employee', 'manager')
    `);
    if (!users || users.length === 0) return;

    // 2. Check assignments
    const [assignments] = await db.query(`
      SELECT a.userId, s.name, s.start_time, s.end_time
      FROM user_shift_assignments a
      JOIN shift_definitions s ON a.shiftId = s.id
      WHERE a.start_date <= ? AND (a.end_date IS NULL OR a.end_date >= ?)
    `, [monthEndStr, monthStartStr]);
    const assignMap = new Map();
    for (const a of assignments) {
      assignMap.set(a.userId, a);
    }

    // Lấy thông tin calendar để check ngày nghỉ của cả tháng
    const calendarRepo = require('../modules/calendar/calendar.repository');
    const cal = await calendarRepo.computeYear(y).catch(() => null);
    
    // Tách riêng các loại ngày nghỉ để phân tích logic cho 工事部
    const allDetail = cal?.detail || [];
    const redDays = new Set(allDetail.filter(it => it.is_off).map(it => String(it.date).slice(0, 10)));
    const offDays = new Set((cal?.off_days || []).map(d => String(d).slice(0, 10)));
    
    // Lấy trước dữ liệu giải thích từng ngày để tái sử dụng
    const explanations = new Map();
    const daysInMonth = [];
    for (let day = 1; day <= lastDay; day++) {
      const ds = `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      daysInMonth.push(ds);
      explanations.set(ds, allDetail.filter(it => String(it.date).slice(0, 10) === ds));
    }

    // Lấy dữ liệu attendance_daily của toàn bộ tháng
    const [dailies] = await db.query(`SELECT userId, date, kubun FROM attendance_daily WHERE date >= ? AND date <= ?`, [monthStartStr, monthEndStr]);
    const dailyMap = new Map(); // key: userId_date
    for (const d of dailies) {
      dailyMap.set(`${d.userId}_${String(d.date).slice(0, 10)}`, String(d.kubun || '').trim());
    }

    // Lấy dữ liệu attendance của toàn bộ tháng
    const [attRows] = await db.query(`SELECT userId, DATE(checkIn) as inDate, DATE(checkOut) as outDate FROM attendance WHERE checkIn >= ? AND checkIn <= ?`, [monthStartJST, monthEndJST]);
    const attMap = new Map(); // key: userId_date
    for (const r of attRows) {
      if (r.inDate) attMap.set(`${r.userId}_${String(r.inDate).slice(0, 10)}`, true);
    }

    for (const user of users) {
      if (!user.email) continue;
      const userId = user.id;
      const isKoujiUser = String(user.departmentName || '').includes('工事部');

      const cacheKey = `monthly_missing_${userId}_${monthStr}`;
      if (sentReminders.has(cacheKey)) continue;

      let isMissingAnyDay = false;

      // Kiểm tra từng ngày trong tháng cho user này
      for (const ds of daysInMonth) {
        // Bỏ qua ngày trong tương lai
        if (ds > todayStr) continue;

        const isSunday = new Date(ds).getUTCDay() === 0;
        let isUserOffDay = false;

        if (!isKoujiUser) {
          isUserOffDay = isSunday || redDays.has(ds) || offDays.has(ds);
        } else {
          const detail = explanations.get(ds) || [];
          const hasSundayReason = detail.some(x => x.is_off && x.type === 'sunday');
          const hasLastSaturdayReason = detail.some(x => x.is_off && x.type === 'saturday_last');
          const hasHolidayReason = detail.some(x => x.is_off && ['fixed', 'jp_auto', 'jp_substitute', 'jp_bridge'].includes(x.type));
          isUserOffDay = hasSundayReason || hasLastSaturdayReason || hasHolidayReason;
        }

        const userKubun = dailyMap.get(`${userId}_${ds}`) || '';
        const isExplicitOff = ['休日', '有給休暇', '欠勤', '無給休暇', '代替休日'].includes(userKubun);
        const isExplicitWork = ['出勤', '休日出勤', '代替出勤', '半休'].includes(userKubun);

        if (isExplicitOff) continue;
        if (isUserOffDay && !isExplicitWork) continue;

        // Nếu ngày này là ngày phải làm việc, kiểm tra xem đã chấm công chưa
        if (!attMap.has(`${userId}_${ds}`)) {
          isMissingAnyDay = true;
          break; // Chỉ cần thiếu 1 ngày là đủ điều kiện để gửi thông báo tháng
        }
      }

      // Nếu có ít nhất 1 ngày làm việc bị thiếu chấm công, thì gửi thông báo
      if (isMissingAnyDay) {
        await sendMissingEmail(user, 'monthly', monthStr);
        sentReminders.add(cacheKey);
      }
    }
  } catch (err) {
    console.error('[ShiftReminder] Error monthly missing:', err);
  }
}

async function sendMissingEmail(user, type, dateStr) {
  const appUrl = process.env.APP_URL || 'https://tosouapp.com/';
  const senderFrom = process.env.MAIL_FROM || '"飯塚塗研株式会社" <iizuka_token@tosouapp.com>';
  
  let subject, text, html;

  if (type === 'daily_in') {
    subject = `[飯塚塗研株式会社] 勤怠未入力のお知らせ（出勤）`;
    text = `
${user.username} さん

本日（${dateStr}）の出勤打刻が確認できませんでした。
勤務したにもかかわらず打刻を忘れた場合は、システムの報告申請から至急報告してください。
もし本日がお休みの場合は、このメールは破棄していただいて構いません。

▼ 打刻・申請はこちらから（アプリURL）
${appUrl}

このメッセージはシステムにより自動的に送られています。このまま返信されても届きません。
お問い合わせに関してはシステム公式LINEまでお願いいたします。
公式LINE： https://lin.ee/zBKnhkd
    `.trim();

    html = `
      <p>${user.username} さん</p>
      <br/>
      <p>本日（<strong>${dateStr}</strong>）の出勤打刻が確認できませんでした。</p>
      <p>勤務したにもかかわらず打刻を忘れた場合は、システムの報告申請から至急報告してください。<br/>
      もし本日がお休みの場合は、このメールは破棄していただいて構いません。</p>
      <br/>
      <p>▼ 打刻・申請はこちらから（アプリURL）<br/>
      <a href="${appUrl}">${appUrl}</a></p>
      <br/>
      <hr/>
      <p style="font-size: 12px; color: #666;">このメッセージはシステムにより自動的に送られています。このまま返信されても届きません。<br/>
      お問い合わせに関してはシステム公式LINEまでお願いいたします。<br/><strong>公式LINE：</strong> <a href="https://lin.ee/zBKnhkd">https://lin.ee/zBKnhkd</a></p>
    `;
  } else if (type === 'daily_out') {
    subject = `[飯塚塗研株式会社] 勤怠未入力のお知らせ（退勤）`;
    text = `
${user.username} さん

本日（${dateStr}）の退勤打刻が確認できませんでした。
退勤の打刻を忘れた場合は、システムの報告申請から至急報告してください。

▼ 打刻・申請はこちらから（アプリURL）
${appUrl}

このメッセージはシステムにより自動的に送られています。このまま返信されても届きません。
お問い合わせに関してはシステム公式LINEまでお願いいたします。
公式LINE： https://lin.ee/zBKnhkd
    `.trim();

    html = `
      <p>${user.username} さん</p>
      <br/>
      <p>本日（<strong>${dateStr}</strong>）の退勤打刻が確認できませんでした。</p>
      <p>退勤の打刻を忘れた場合は、システムの報告申請から至急報告してください。</p>
      <br/>
      <p>▼ 打刻・申請はこちらから（アプリURL）<br/>
      <a href="${appUrl}">${appUrl}</a></p>
      <br/>
      <hr/>
      <p style="font-size: 12px; color: #666;">このメッセージはシステムにより自動的に送られています。このまま返信されても届きません。<br/>
      お問い合わせに関してはシステム公式LINEまでお願いいたします。<br/><strong>公式LINE：</strong> <a href="https://lin.ee/zBKnhkd">https://lin.ee/zBKnhkd</a></p>
    `;
  } else if (type === 'monthly') {
    subject = `[飯塚塗研株式会社] 今月の勤怠未入力に関する重要なお知らせ`;
    text = `
${user.username} さん

今月（${dateStr}）の勤怠データに未入力の勤務日が含まれていることが確認されました。
勤怠データが未入力のままですと、給与計算等に影響が出る可能性があります。
至急、システムより打刻の状況や申請漏れがないか確認してください。

▼ 打刻・申請はこちらから（アプリURL）
${appUrl}

このメッセージはシステムにより自動的に送られています。このまま返信されても届きません。
お問い合わせに関してはシステム公式LINEまでお願いいたします。
公式LINE： https://lin.ee/zBKnhkd
    `.trim();

    html = `
      <p>${user.username} さん</p>
      <br/>
      <p>今月（<strong>${dateStr}</strong>）の勤怠データに未入力の勤務日が含まれていることが確認されました。</p>
      <p>勤怠データが未入力のままですと、給与計算等に影響が出る可能性があります。<br/>
      至急、システムより打刻の状況や申請漏れがないか確認してください。</p>
      <br/>
      <p>▼ 打刻・申請はこちらから（アプリURL）<br/>
      <a href="${appUrl}">${appUrl}</a></p>
      <br/>
      <hr/>
      <p style="font-size: 12px; color: #666;">このメッセージはシステムにより自動的に送られています。このまま返信されても届きません。<br/>
      お問い合わせに関してはシステム公式LINEまでお願いいたします。
公式LINE： https://lin.ee/zBKnhkd</p>
    `;
  }

  try {
    console.log(`[ShiftReminder] Sending ${type} missing alert to ${user.email}`);
    if (typeof emailService.sendViaResend === 'function') {
       await emailService.sendViaResend({
         from: senderFrom,
         to: user.email,
         subject,
         html,
         text
       });
    }
  } catch (err) {
    console.error(`[ShiftReminder] Failed to send ${type} missing email to ${user.email}:`, err);
  }
}

async function sendReminderEmail(user, shiftName, timeHm, offsetMin, type) {
  const isStart = type === 'start';
  const appUrl = process.env.APP_URL || 'https://tosouapp.com/'; // URL app chấm công
  const senderFrom = process.env.MAIL_FROM || '"飯塚塗研株式会社" <iizuka_token@tosouapp.com>';
  
  let subject, text, html;

  if (isStart) {
    subject = `[飯塚塗研株式会社] 勤怠確認`;
    
    let timeText;
    if (offsetMin > 0) {
      timeText = `出勤予定時間の${offsetMin}分前になりました`;
    } else if (offsetMin === 0) {
      timeText = `出勤予定時間になりました`;
    } else {
      timeText = `出勤予定時間から${Math.abs(offsetMin)}分経過しました`;
    }

    text = `
${user.username} さん

${timeText}。遅延などで勤務開始が遅れる場合は、システムの報告申請から報告してください。

▼ 打刻はこちらから（アプリURL）
${appUrl}

このメッセージはシステムにより自動的に送られています。このまま返信されても届きません。
お問い合わせに関してはシステム公式LINEまでお願いいたします。
公式LINE： https://lin.ee/zBKnhkd
    `.trim();

    html = `
      <p>${user.username} さん</p>
      <br/>
      <p><strong>${timeText}</strong>。遅延などで勤務開始が遅れる場合は、システムの報告申請から報告してください。</p>
      <br/>
      <p>▼ 打刻はこちらから（アプリURL）<br/>
      <a href="${appUrl}">${appUrl}</a></p>
      <br/>
      <hr/>
      <p style="font-size: 12px; color: #666;">このメッセージはシステムにより自動的に送られています。このまま返信されても届きません。<br/>
      お問い合わせに関してはシステム公式LINEまでお願いいたします。
公式LINE： https://lin.ee/zBKnhkd</p>
    `;
  } else {
    const timeText = offsetMin === 0 ? 'になりました' : `から ${offsetMin} 分経過しました`;
    subject = `[飯塚塗研株式会社] 勤怠確認`;
    text = `
${user.username} さん

退勤予定時間${timeText}。退勤の打刻を忘れないようにお願いいたします。

▼ 打刻はこちらから（アプリURL）
${appUrl}

このメッセージはシステムにより自動的に送られています。このまま返信されても届きません。
お問い合わせに関してはシステム公式LINEまでお願いいたします。
公式LINE： https://lin.ee/zBKnhkd
    `.trim();

    html = `
      <p>${user.username} さん</p>
      <br/>
      <p>退勤予定時間<strong>${timeText}</strong>。退勤の打刻を忘れないようにお願いいたします。</p>
      <br/>
      <p>▼ 打刻はこちらから（アプリURL）<br/>
      <a href="${appUrl}">${appUrl}</a></p>
      <br/>
      <hr/>
      <p style="font-size: 12px; color: #666;">このメッセージはシステムにより自動的に送られています。このまま返信されても届きません。<br/>
      お問い合わせに関してはシステム公式LINEまでお願いいたします。
公式LINE： https://lin.ee/zBKnhkd</p>
    `;
  }

  try {
    console.log(`[ShiftReminder] Sending ${offsetMin}m ${type} reminder to ${user.email} (${timeHm})`);
    
    if (typeof emailService.sendViaResend === 'function') {
       await emailService.sendViaResend({
         from: senderFrom,
         to: user.email,
         subject,
         html,
         text
       });
    }
  } catch (err) {
    console.error(`[ShiftReminder] Failed to send email to ${user.email}:`, err);
  }
}

function init() {
  const cron = getCron();
  if (!cron || typeof cron.schedule !== 'function') {
    const detail = cronLoadError && cronLoadError.message ? `: ${cronLoadError.message}` : '';
    console.warn(`[ShiftReminder] Scheduler disabled because node-cron is unavailable${detail}`);
    return false;
  }

  // Run every minute at the 0th second
  cron.schedule('* * * * *', () => {
    processReminders();
  });

  // Daily missing check: run at 23:00 JST every day
  cron.schedule('0 23 * * *', () => {
    checkDailyMissingAttendance();
  }, { timezone: 'Asia/Tokyo' });

  // Monthly missing check: run at 12:00 JST on the 25th of every month
  cron.schedule('0 12 25 * *', () => {
    checkMonthlyMissingAttendance();
  }, { timezone: 'Asia/Tokyo' });

  console.log('[ShiftReminder] Cron job initialized (runs every minute). Daily at 23:00 JST, Monthly on 25th 12:00 JST.');
  return true;
}

module.exports = {
  init,
  processReminders,
  checkDailyMissingAttendance,
  checkMonthlyMissingAttendance
};

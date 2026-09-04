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

// Má»¥c Ä‘Ã­ch sá»­ dá»¥ng cá»§a cÃ¡i nÃ y lÃ  check monthly missing attendance

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

    // 1. Fetch all active users (only employees)
    const [users] = await db.query(`
      SELECT u.id, u.email, u.username, u.employment_type, d.name as departmentName 
      FROM users u 
      LEFT JOIN departments d ON u.departmentId = d.id 
      WHERE u.employment_status = 'active' AND u.role = 'employee'
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

    // Láº¥y thÃ´ng tin calendar Ä‘á»ƒ check ngÃ y nghá»‰ cá»§a cáº£ thÃ¡ng
    const calendarRepo = require('../modules/calendar/calendar.repository');
    const cal = await calendarRepo.computeYear(y).catch(() => null);
    
    // TÃ¡ch riÃªng cÃ¡c loáº¡i ngÃ y nghá»‰ Ä‘á»ƒ phÃ¢n tÃ­ch logic cho å·¥äº‹éƒ¨
    const allDetail = cal?.detail || [];
    const redDays = new Set(allDetail.filter(it => it.is_off).map(it => String(it.date).slice(0, 10)));
    const offDays = new Set((cal?.off_days || []).map(d => String(d).slice(0, 10)));
    
    // Láº¥y trÆ°á»›c dá»¯ liá»‡u giáº£i thÃ­ch tá»«ng ngÃ y Ä‘á»ƒ tÃ¡i sá»­ dá»¥ng
    const explanations = new Map();
    const daysInMonth = [];
    for (let day = 1; day <= lastDay; day++) {
      const ds = `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      daysInMonth.push(ds);
      explanations.set(ds, allDetail.filter(it => String(it.date).slice(0, 10) === ds));
    }

    // Láº¥y dá»¯ liá»‡u attendance_daily cá»§a toÃ n bá»™ thÃ¡ng
    const [dailies] = await db.query(`SELECT userId, date, kubun FROM attendance_daily WHERE date >= ? AND date <= ?`, [monthStartStr, monthEndStr]);
    const dailyMap = new Map(); // key: userId_date
    for (const d of dailies) {
      dailyMap.set(`${d.userId}_${String(d.date).slice(0, 10)}`, String(d.kubun || '').trim());
    }

    // Láº¥y dá»¯ liá»‡u attendance cá»§a toÃ n bá»™ thÃ¡ng
    const [attRows] = await db.query(`SELECT userId, DATE(checkIn) as inDate, DATE(checkOut) as outDate FROM attendance WHERE checkIn >= ? AND checkIn <= ?`, [monthStartJST, monthEndJST]);
    const attMap = new Map(); // key: userId_date
    for (const r of attRows) {
      if (r.inDate) attMap.set(`${r.userId}_${String(r.inDate).slice(0, 10)}`, true);
    }

    for (const user of users) {
      if (!user.email) continue;
      const userId = user.id;
      
      // Bá» qua nhÃ¢n viÃªn part-time (baito) vÃ¬ há» cÃ³ lá»‹ch lÃ m viá»‡c khÃ´ng cá»‘ Ä‘á»‹nh
      if (user.employment_type === 'part_time') continue;
      
      // Kiá»ƒm tra xem cÃ³ pháº£i lÃ  nhÃ¢n viÃªn bá»™ pháº­n CÃ´ng trÃ¬nh (Koujibu) hay khÃ´ng
      const isPartTime = user.employment_type === 'part_time';
      const isKoujiUser = !isPartTime && String(user.departmentName || '').includes('å·¥äº‹éƒ¨');

      const cacheKey = `monthly_missing_${userId}_${monthStr}`;
      if (sentReminders.has(cacheKey)) continue;

      let isMissingAnyDay = false;

      // Kiá»ƒm tra tá»«ng ngÃ y trong thÃ¡ng cho user nÃ y
      for (const ds of daysInMonth) {
        // Bá» qua ngÃ y trong tÆ°Æ¡ng lai
        if (ds > todayStr) continue;

        const isSunday = new Date(ds).getUTCDay() === 0;
        let isUserOffDay = false;

        if (!isKoujiUser) {
          // NhÃ¢n viÃªn thÆ°á»ng: Nghá»‰ chá»§ nháº­t, ngÃ y lá»… (redDays) hoáº·c ngÃ y nghá»‰ cÃ´ng ty (offDays)
          isUserOffDay = isSunday || redDays.has(ds) || offDays.has(ds);
        } else {
          // NhÃ¢n viÃªn bá»™ pháº­n CÃ´ng trÃ¬nh (Koujibu): CÃ³ quy táº¯c ngÃ y nghá»‰ riÃªng (Nghá»‰ thá»© 7 tuáº§n 4)
          const detail = explanations.get(ds) || [];
          const hasSundayReason = detail.some(x => x.is_off && x.type === 'sunday');
          const hasLastSaturdayReason = detail.some(x => x.is_off && x.type === 'saturday_4th');
          const hasHolidayReason = detail.some(x => x.is_off && ['fixed', 'jp_auto', 'jp_substitute', 'jp_bridge'].includes(x.type));
          isUserOffDay = hasSundayReason || hasLastSaturdayReason || hasHolidayReason;
        }

        const userKubun = dailyMap.get(`${userId}_${ds}`) || '';
        const isExplicitOff = ['ä¼‘æ—¥', 'æœ‰çµ¦ä¼‘æš‡', 'æ¬ å‹¤', 'ç„¡çµ¦ä¼‘æš‡', 'ä»£æ›¿ä¼‘æ—¥'].includes(userKubun);
        const isExplicitWork = ['å‡ºå‹¤', 'ä¼‘æ—¥å‡ºå‹¤', 'ä»£æ›¿å‡ºå‹¤', 'åŠä¼‘'].includes(userKubun);

        if (isExplicitOff) continue;
        if (isUserOffDay && !isExplicitWork) continue;

        // Náº¿u ngÃ y nÃ y lÃ  ngÃ y pháº£i lÃ m viá»‡c, kiá»ƒm tra xem Ä‘Ã£ cháº¥m cÃ´ng chÆ°a
        if (!attMap.has(`${userId}_${ds}`)) {
          isMissingAnyDay = true;
          break; // Chá»‰ cáº§n thiáº¿u 1 ngÃ y lÃ  Ä‘á»§ Ä‘iá»u kiá»‡n Ä‘á»ƒ gá»­i thÃ´ng bÃ¡o thÃ¡ng
        }
      }

      // Náº¿u cÃ³ Ã­t nháº¥t 1 ngÃ y lÃ m viá»‡c bá»‹ thiáº¿u cháº¥m cÃ´ng, thÃ¬ gá»­i thÃ´ng bÃ¡o
      if (isMissingAnyDay) {
        await sendMissingEmail(user, 'monthly', monthStr);
        sentReminders.add(cacheKey);
      } else {
        // Äáº¿m tá»•ng sá»‘ ngÃ y Ä‘Ã£ Ä‘i lÃ m trong thÃ¡ng
        let totalWorkedDays = 0;
        for (const ds of daysInMonth) {
          if (attMap.has(`${userId}_${ds}`)) {
            totalWorkedDays++;
          }
        }
        await sendMonthlyCompleteEmail(user, monthStr, totalWorkedDays);
        sentReminders.add(cacheKey);
      }
    }
  } catch (err) {
    console.error('[ShiftReminder] Error monthly missing:', err);
  }
}

async function sendMissingEmail(user, type, dateStr) {
  const appUrl = process.env.APP_URL || 'https://tosouapp.com/';
  const senderFrom = process.env.MAIL_FROM || '"é£¯å¡šã‚°ãƒ«ãƒ¼ãƒ—ãƒ»ã‚¨ãƒ³ã‚¸ãƒ‹ã‚¢ãƒªãƒ³ã‚°" <iizuka_token@tosouapp.com>';
  
  let subject, text, html;

  if (type === 'monthly') {
    subject = `[é£¯å¡šã‚°ãƒ«ãƒ¼ãƒ—ãƒ»ã‚¨ãƒ³ã‚¸ãƒ‹ã‚¢ãƒªãƒ³ã‚°] ä»Šæœˆã®å‹¤æ€ æœªå…¥åŠ›ã«é–¢ã™ã‚‹é‡è¦ãªãŠçŸ¥ã‚‰ã›`;
    text = `
${user.username} ã•ã‚“

ä»Šæœˆï¼ˆ${dateStr}ï¼‰ã®å‹¤æ€ ãƒ‡ãƒ¼ã‚¿ã«æœªå…¥åŠ›ã®å‹¤å‹™æ—¥ãŒå«ã¾ã‚Œã¦ã„ã‚‹ã“ã¨ãŒç¢ºèªã•ã‚Œã¾ã—ãŸã€‚
å‹¤æ€ ãƒ‡ãƒ¼ã‚¿ãŒæœªå…¥åŠ›ã®ã¾ã¾ã§ã™ã¨ã€çµ¦ä¸Žè¨ˆç®—ç­‰ã«å½±éŸ¿ãŒå‡ºã‚‹å¯èƒ½æ€§ãŒã‚ã‚Šã¾ã™ã€‚
è‡³æ€¥ã€ã‚·ã‚¹ãƒ†ãƒ ã‚ˆã‚Šæ‰“åˆ»ã®çŠ¶æ³ã‚„ç”³è«‹æ¼ã‚ŒãŒãªã„ã‹ç¢ºèªã—ã¦ãã ã•ã„ã€‚

â–¼ æ‰“åˆ»ãƒ»ç”³è«‹ã¯ã“ã¡ã‚‰ã‹ã‚‰ï¼ˆã‚¢ãƒ—ãƒªURLï¼‰
${appUrl}

ã“ã®ãƒ¡ãƒƒã‚»ãƒ¼ã‚¸ã¯ã‚·ã‚¹ãƒ†ãƒ ã«ã‚ˆã‚Šè‡ªå‹•çš„ã«é€ã‚‰ã‚Œã¦ã„ã¾ã™ã€‚ã“ã®ã¾ã¾è¿”ä¿¡ã•ã‚Œã¦ã‚‚å±Šãã¾ã›ã‚“ã€‚
ãŠå•ã„åˆã‚ã›ã«é–¢ã—ã¦ã¯ã‚·ã‚¹ãƒ†ãƒ å…¬å¼LINEã¾ã§ãŠé¡˜ã„ã„ãŸã—ã¾ã™ã€‚
å…¬å¼LINEï¼š https://lin.ee/zBKnhkd
    `.trim();

    html = `
      <p>${user.username} ã•ã‚“</p>
      <br/>
      <p>ä»Šæœˆï¼ˆ<strong>${dateStr}</strong>ï¼‰ã®å‹¤æ€ ãƒ‡ãƒ¼ã‚¿ã«æœªå…¥åŠ›ã®å‹¤å‹™æ—¥ãŒå«ã¾ã‚Œã¦ã„ã‚‹ã“ã¨ãŒç¢ºèªã•ã‚Œã¾ã—ãŸã€‚</p>
      <p>å‹¤æ€ ãƒ‡ãƒ¼ã‚¿ãŒæœªå…¥åŠ›ã®ã¾ã¾ã§ã™ã¨ã€çµ¦ä¸Žè¨ˆç®—ç­‰ã«å½±éŸ¿ãŒå‡ºã‚‹å¯èƒ½æ€§ãŒã‚ã‚Šã¾ã™ã€‚<br/>
      è‡³æ€¥ã€ã‚·ã‚¹ãƒ†ãƒ ã‚ˆã‚Šæ‰“åˆ»ã®çŠ¶æ³ã‚„ç”³è«‹æ¼ã‚ŒãŒãªã„ã‹ç¢ºèªã—ã¦ãã ã•ã„ã€‚</p>
      <br/>
      <p>â–¼ æ‰“åˆ»ãƒ»ç”³è«‹ã¯ã“ã¡ã‚‰ã‹ã‚‰ï¼ˆã‚¢ãƒ—ãƒªURLï¼‰<br/>
      <a href="${appUrl}">${appUrl}</a></p>
      <br/>
      <hr/>
      <p style="font-size: 12px; color: #666;">ã“ã®ãƒ¡ãƒƒã‚»ãƒ¼ã‚¸ã¯ã‚·ã‚¹ãƒ†ãƒ ã«ã‚ˆã‚Šè‡ªå‹•çš„ã«é€ã‚‰ã‚Œã¦ã„ã¾ã™ã€‚ã“ã®ã¾ã¾è¿”ä¿¡ã•ã‚Œã¦ã‚‚å±Šãã¾ã›ã‚“ã€‚<br/>
      ãŠå•ã„åˆã‚ã›ã«é–¢ã—ã¦ã¯ã‚·ã‚¹ãƒ†ãƒ å…¬å¼LINEã¾ã§ãŠé¡˜ã„ã„ãŸã—ã¾ã™ã€‚
å…¬å¼LINEï¼š https://lin.ee/zBKnhkd</p>
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

async function sendMonthlyCompleteEmail(user, monthStr, totalWorkedDays) {
  const appUrl = process.env.APP_URL || 'https://tosouapp.com/';
  const senderFrom = process.env.MAIL_FROM || '"é£¯å¡šã‚°ãƒ«ãƒ¼ãƒ—ãƒ»ã‚¨ãƒ³ã‚¸ãƒ‹ã‚¢ãƒªãƒ³ã‚°" <iizuka_token@tosouapp.com>';
  
  const subject = `[é£¯å¡šã‚°ãƒ«ãƒ¼ãƒ—ãƒ»ã‚¨ãƒ³ã‚¸ãƒ‹ã‚¢ãƒªãƒ³ã‚°] ä»Šæœˆã®å‹¤æ€ ãƒ‡ãƒ¼ã‚¿ç¢ºèªå®Œäº†ã®ãŠçŸ¥ã‚‰ã›`;
  const text = `
${user.username} ã•ã‚“

ä»Šæœˆï¼ˆ${monthStr}ï¼‰ã®å‹¤æ€ ãƒ‡ãƒ¼ã‚¿ã¯ã™ã¹ã¦æ­£å¸¸ã«å…¥åŠ›ã•ã‚Œã¦ã„ã‚‹ã“ã¨ãŒç¢ºèªã•ã‚Œã¾ã—ãŸã€‚
ä»Šæœˆã®åˆè¨ˆå‡ºå‹¤æ—¥æ•°ã¯ ${totalWorkedDays} æ—¥ã§ã™ã€‚

è©³ç´°ã‚„æœ‰çµ¦ç­‰ã®çŠ¶æ³ã«ã¤ã„ã¦ç¢ºèªãƒ»ä¿®æ­£ãŒå¿…è¦ãªå ´åˆã¯ã€ã‚·ã‚¹ãƒ†ãƒ ã®æœˆæ¬¡å‹¤æ€ è¡¨ã‚’ã”ç¢ºèªã„ãŸã ãã‹ã€ç®¡ç†è€…ã¾ã§ã”é€£çµ¡ãã ã•ã„ã€‚

â–¼ æœˆæ¬¡å‹¤æ€ è¡¨ã¯ã“ã¡ã‚‰ã‹ã‚‰ï¼ˆã‚¢ãƒ—ãƒªURLï¼‰
${appUrl}

ã“ã®ãƒ¡ãƒƒã‚»ãƒ¼ã‚¸ã¯ã‚·ã‚¹ãƒ†ãƒ ã«ã‚ˆã‚Šè‡ªå‹•çš„ã«é€ã‚‰ã‚Œã¦ã„ã¾ã™ã€‚ã“ã®ã¾ã¾è¿”ä¿¡ã•ã‚Œã¦ã‚‚å±Šãã¾ã›ã‚“ã€‚
ãŠå•ã„åˆã‚ã›ã«é–¢ã—ã¦ã¯ã‚·ã‚¹ãƒ†ãƒ å…¬å¼LINEã¾ã§ãŠé¡˜ã„ã„ãŸã—ã¾ã™ã€‚
å…¬å¼LINEï¼š https://lin.ee/zBKnhkd
  `.trim();

  const html = `
    <p>${user.username} ã•ã‚“</p>
    <br/>
    <p>ä»Šæœˆï¼ˆ<strong>${monthStr}</strong>ï¼‰ã®å‹¤æ€ ãƒ‡ãƒ¼ã‚¿ã¯ã™ã¹ã¦æ­£å¸¸ã«å…¥åŠ›ã•ã‚Œã¦ã„ã‚‹ã“ã¨ãŒç¢ºèªã•ã‚Œã¾ã—ãŸã€‚</p>
    <p>ä»Šæœˆã®åˆè¨ˆå‡ºå‹¤æ—¥æ•°ã¯ <strong>${totalWorkedDays} æ—¥</strong>ã§ã™ã€‚</p>
    <p>è©³ç´°ã‚„æœ‰çµ¦ç­‰ã®çŠ¶æ³ã«ã¤ã„ã¦ç¢ºèªãƒ»ä¿®æ­£ãŒå¿…è¦ãªå ´åˆã¯ã€ã‚·ã‚¹ãƒ†ãƒ ã®æœˆæ¬¡å‹¤æ€ è¡¨ã‚’ã”ç¢ºèªã„ãŸã ãã‹ã€ç®¡ç†è€…ã¾ã§ã”é€£çµ¡ãã ã•ã„ã€‚</p>
    <br/>
    <p>â–¼ æœˆæ¬¡å‹¤æ€ è¡¨ã¯ã“ã¡ã‚‰ã‹ã‚‰ï¼ˆã‚¢ãƒ—ãƒªURLï¼‰<br/>
    <a href="${appUrl}">${appUrl}</a></p>
    <br/>
    <hr/>
    <p style="font-size: 12px; color: #666;">ã“ã®ãƒ¡ãƒƒã‚»ãƒ¼ã‚¸ã¯ã‚·ã‚¹ãƒ†ãƒ ã«ã‚ˆã‚Šè‡ªå‹•çš„ã«é€ã‚‰ã‚Œã¦ã„ã¾ã™ã€‚ã“ã®ã¾ã¾è¿”ä¿¡ã•ã‚Œã¦ã‚‚å±Šãã¾ã›ã‚“ã€‚<br/>
    ãŠå•ã„åˆã‚ã›ã«é–¢ã—ã¦ã¯ã‚·ã‚¹ãƒ†ãƒ å…¬å¼LINEã¾ã§ãŠé¡˜ã„ã„ãŸã—ã¾ã™ã€‚<br/><strong>å…¬å¼LINEï¼š</strong> <a href="https://lin.ee/zBKnhkd">https://lin.ee/zBKnhkd</a></p>
  `;

  try {
    console.log(`[ShiftReminder] Sending monthly complete alert to ${user.email}`);
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
    console.error(`[ShiftReminder] Failed to send monthly complete email to ${user.email}:`, err);
  }
}

async function sendDailySummaryEmail(user, dateStr, checkIn, checkOut, totalHours) {
  const appUrl = process.env.APP_URL || 'https://tosouapp.com/';
  const senderFrom = process.env.MAIL_FROM || '"é£¯å¡šã‚°ãƒ«ãƒ¼ãƒ—ãƒ»ã‚¨ãƒ³ã‚¸ãƒ‹ã‚¢ãƒªãƒ³ã‚°" <iizuka_token@tosouapp.com>';
  
  const inStr = String(checkIn || '').slice(11, 16);
  const outStr = String(checkOut || '').slice(11, 16);
  
  const subject = `[é£¯å¡šã‚°ãƒ«ãƒ¼ãƒ—ãƒ»ã‚¨ãƒ³ã‚¸ãƒ‹ã‚¢ãƒªãƒ³ã‚°] æœ¬æ—¥ã®å‹¤å‹™ãŠç–²ã‚Œæ§˜ã§ã—ãŸ`;
  const text = `
${user.username} ã•ã‚“

æœ¬æ—¥ã®å‹¤å‹™ãŠç–²ã‚Œæ§˜ã§ã—ãŸã€‚ä»¥ä¸‹ã®é€šã‚Šé€€å‹¤ã®æ‰“åˆ»ã‚’å—ã‘ä»˜ã‘ã¾ã—ãŸã€‚

ãƒ»æ—¥ä»˜: ${dateStr}
ãƒ»å‡ºå‹¤æ™‚é–“: ${inStr}
ãƒ»é€€å‹¤æ™‚é–“: ${outStr}
ãƒ»ç·å‹¤å‹™æ™‚é–“: ${totalHours}

æ‰“åˆ»æ™‚é–“ã«èª¤ã‚ŠãŒã‚ã‚‹å ´åˆã¯ã€ã‚·ã‚¹ãƒ†ãƒ ã®å‹¤æ€ è¡¨ã‹ã‚‰ä¿®æ­£ç”³è«‹ã‚’è¡Œã£ã¦ãã ã•ã„ã€‚

â–¼ å‹¤æ€ è¡¨ã¯ã“ã¡ã‚‰ã‹ã‚‰ï¼ˆã‚¢ãƒ—ãƒªURLï¼‰
${appUrl}

ã“ã®ãƒ¡ãƒƒã‚»ãƒ¼ã‚¸ã¯ã‚·ã‚¹ãƒ†ãƒ ã«ã‚ˆã‚Šè‡ªå‹•çš„ã«é€ã‚‰ã‚Œã¦ã„ã¾ã™ã€‚ã“ã®ã¾ã¾è¿”ä¿¡ã•ã‚Œã¦ã‚‚å±Šãã¾ã›ã‚“ã€‚
ãŠå•ã„åˆã‚ã›ã«é–¢ã—ã¦ã¯ã‚·ã‚¹ãƒ†ãƒ å…¬å¼LINEã¾ã§ãŠé¡˜ã„ã„ãŸã—ã¾ã™ã€‚
å…¬å¼LINEï¼š https://lin.ee/zBKnhkd
  `.trim();

  const html = `
    <p>${user.username} ã•ã‚“</p>
    <br/>
    <p>æœ¬æ—¥ã®å‹¤å‹™ãŠç–²ã‚Œæ§˜ã§ã—ãŸã€‚ä»¥ä¸‹ã®é€šã‚Šé€€å‹¤ã®æ‰“åˆ»ã‚’å—ã‘ä»˜ã‘ã¾ã—ãŸã€‚</p>
    <ul>
      <li><strong>æ—¥ä»˜:</strong> ${dateStr}</li>
      <li><strong>å‡ºå‹¤æ™‚é–“:</strong> ${inStr}</li>
      <li><strong>é€€å‹¤æ™‚é–“:</strong> ${outStr}</li>
      <li><strong>ç·å‹¤å‹™æ™‚é–“:</strong> ${totalHours}</li>
    </ul>
    <p>æ‰“åˆ»æ™‚é–“ã«èª¤ã‚ŠãŒã‚ã‚‹å ´åˆã¯ã€ã‚·ã‚¹ãƒ†ãƒ ã®å‹¤æ€ è¡¨ã‹ã‚‰ä¿®æ­£ç”³è«‹ã‚’è¡Œã£ã¦ãã ã•ã„ã€‚</p>
    <br/>
    <p>â–¼ å‹¤æ€ è¡¨ã¯ã“ã¡ã‚‰ã‹ã‚‰ï¼ˆã‚¢ãƒ—ãƒªURLï¼‰<br/>
    <a href="${appUrl}">${appUrl}</a></p>
    <br/>
    <hr/>
    <p style="font-size: 12px; color: #666;">ã“ã®ãƒ¡ãƒƒã‚»ãƒ¼ã‚¸ã¯ã‚·ã‚¹ãƒ†ãƒ ã«ã‚ˆã‚Šè‡ªå‹•çš„ã«é€ã‚‰ã‚Œã¦ã„ã¾ã™ã€‚ã“ã®ã¾ã¾è¿”ä¿¡ã•ã‚Œã¦ã‚‚å±Šãã¾ã›ã‚“ã€‚<br/>
    ãŠå•ã„åˆã‚ã›ã«é–¢ã—ã¦ã¯ã‚·ã‚¹ãƒ†ãƒ å…¬å¼LINEã¾ã§ãŠé¡˜ã„ã„ãŸã—ã¾ã™ã€‚<br/><strong>å…¬å¼LINEï¼š</strong> <a href="https://lin.ee/zBKnhkd">https://lin.ee/zBKnhkd</a></p>
  `;

  try {
    console.log(`[ShiftReminder] Sending daily summary alert to ${user.email}`);
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
    console.error(`[ShiftReminder] Failed to send daily summary email to ${user.email}:`, err);
  }
}

function init() {
  const cron = getCron();
  if (!cron || typeof cron.schedule !== 'function') {
    const detail = cronLoadError && cronLoadError.message ? `: ${cronLoadError.message}` : '';
    console.warn(`[ShiftReminder] Scheduler disabled because node-cron is unavailable${detail}`);
    return false;
  }

  // Monthly missing check: run at 23:30 JST on the last day of every month
  cron.schedule('30 23 28-31 * *', () => {
    const nowJST = new Date(Date.now() + 9 * 3600 * 1000);
    const tomorrowJST = new Date(nowJST.getTime() + 24 * 3600 * 1000);
    // If tomorrow is the 1st, then today is the last day of the month
    if (tomorrowJST.getUTCDate() === 1) {
      checkMonthlyMissingAttendance();
    }
  }, { timezone: 'Asia/Tokyo' });

  console.log('[ShiftReminder] Cron job initialized. Monthly total-days check on last day 23:30 JST.');
  return true;
}

module.exports = {
  init,
  checkMonthlyMissingAttendance,
  sendDailySummaryEmail
};

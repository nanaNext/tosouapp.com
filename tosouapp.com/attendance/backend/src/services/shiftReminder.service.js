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
    const m = nowJST.getUTCMonth();
    const d = nowJST.getUTCDate();
    const todayJstStartUTC = new Date(Date.UTC(y, m, d, 0, 0, 0) - 9 * 3600 * 1000).toISOString().slice(0, 19).replace('T', ' ');
    const todayJstEndUTC = new Date(Date.UTC(y, m, d, 23, 59, 59) - 9 * 3600 * 1000).toISOString().slice(0, 19).replace('T', ' ');

    // 1. Fetch all active users with their emails
    const [users] = await db.query(`SELECT id, email, username FROM users WHERE employment_status = 'active'`);
    if (!users || users.length === 0) return;

    const userMap = new Map(users.map(u => [u.id, u]));

    // 2. Fetch today's shift assignments (user_shift_assignments + shift_definitions)
    // We only fetch for today.
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

    // Check plan overrides
    const [plans] = await db.query(`
      SELECT 
        userId, 
        shiftId 
      FROM attendance_plan 
      WHERE date = ?
    `, [todayStr]);

    const planMap = new Map(plans.map(p => [p.userId, p.shiftId]));

    // 3. For each assignment, check if we need to send a reminder
    for (const assign of assignments) {
      const userId = assign.userId;
      const user = userMap.get(userId);
      if (!user || !user.email) continue;

      let shiftStartHm = assign.start_time;
      let shiftEndHm = assign.end_time;
      let shiftName = assign.name;

      // If user has a specific plan for today, fetch that shift definition instead
      const planShiftId = planMap.get(userId);
      if (planShiftId) {
        const [planShiftDefs] = await db.query(`SELECT name, start_time, end_time FROM shift_definitions WHERE id = ?`, [planShiftId]);
        if (planShiftDefs && planShiftDefs.length > 0) {
           shiftStartHm = planShiftDefs[0].start_time;
           shiftEndHm = planShiftDefs[0].end_time;
           shiftName = planShiftDefs[0].name;
        }
      }

      const startMin = parseHmToMin(shiftStartHm);
      const endMin = parseHmToMin(shiftEndHm);

      // Helper function to check attendance
      const hasClockedIn = async () => {
        const [att] = await db.query(`SELECT id FROM attendance WHERE userId = ? AND checkIn >= ? AND checkIn <= ? LIMIT 1`, [userId, todayJstStartUTC, todayJstEndUTC]);
        return att.length > 0;
      };

      const hasClockedOut = async () => {
        const [att] = await db.query(`SELECT id FROM attendance WHERE userId = ? AND checkOut >= ? AND checkOut <= ? LIMIT 1`, [userId, todayJstStartUTC, todayJstEndUTC]);
        return att.length > 0;
      };

      // Check Shift Start Reminders (Before shift and exact/late)
      const startOffsets = [30, 15, 5, 0, -15];
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
      const endOffsets = [0, 15, 30]; // 0 means exactly at end time, 15 means 15 mins after
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

async function checkDailyMissingAttendance() {
  try {
    const nowJST = new Date(Date.now() + 9 * 3600 * 1000);
    const todayStr = nowJST.toISOString().slice(0, 10);
    const y = nowJST.getUTCFullYear();
    const m = nowJST.getUTCMonth();
    const d = nowJST.getUTCDate();
    const todayJstStartUTC = new Date(Date.UTC(y, m, d, 0, 0, 0) - 9 * 3600 * 1000).toISOString().slice(0, 19).replace('T', ' ');
    const todayJstEndUTC = new Date(Date.UTC(y, m, d, 23, 59, 59) - 9 * 3600 * 1000).toISOString().slice(0, 19).replace('T', ' ');

    const [assignments] = await db.query(`
      SELECT DISTINCT a.userId, u.email, u.username
      FROM user_shift_assignments a
      JOIN users u ON a.userId = u.id
      WHERE u.employment_status = 'active'
        AND a.start_date <= ? AND (a.end_date IS NULL OR a.end_date >= ?)
    `, [todayStr, todayStr]);

    for (const assign of assignments) {
      const cacheKey = `daily_missing_${assign.userId}_${todayStr}`;
      if (sentReminders.has(cacheKey)) continue;

      const [att] = await db.query(`SELECT id FROM attendance WHERE userId = ? AND checkIn >= ? AND checkIn <= ? LIMIT 1`, [assign.userId, todayJstStartUTC, todayJstEndUTC]);
      if (att.length === 0) {
        await sendMissingEmail(assign, 'daily', todayStr);
        sentReminders.add(cacheKey);
      }
    }
  } catch (err) {
    console.error('[ShiftReminder] Error daily missing:', err);
  }
}

async function checkMonthlyMissingAttendance() {
  try {
    const nowJST = new Date(Date.now() + 9 * 3600 * 1000);
    const y = nowJST.getUTCFullYear();
    const m = nowJST.getUTCMonth();
    const monthStr = nowJST.toISOString().slice(0, 7);
    
    const monthStartUTC = new Date(Date.UTC(y, m, 1, 0, 0, 0) - 9 * 3600 * 1000).toISOString().slice(0, 19).replace('T', ' ');
    const monthEndUTC = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59) - 9 * 3600 * 1000).toISOString().slice(0, 19).replace('T', ' ');

    const monthStartStr = `${y}-${String(m+1).padStart(2, '0')}-01`;
    const monthEndStr = `${y}-${String(m+1).padStart(2, '0')}-31`;

    const [assignments] = await db.query(`
      SELECT DISTINCT a.userId, u.email, u.username
      FROM user_shift_assignments a
      JOIN users u ON a.userId = u.id
      WHERE u.employment_status = 'active'
        AND a.start_date <= ? AND (a.end_date IS NULL OR a.end_date >= ?)
    `, [monthEndStr, monthStartStr]);

    for (const assign of assignments) {
      const cacheKey = `monthly_missing_${assign.userId}_${monthStr}`;
      if (sentReminders.has(cacheKey)) continue;

      const [att] = await db.query(`SELECT id FROM attendance WHERE userId = ? AND checkIn >= ? AND checkIn <= ? LIMIT 1`, [assign.userId, monthStartUTC, monthEndUTC]);
      if (att.length === 0) {
        await sendMissingEmail(assign, 'monthly', monthStr);
        sentReminders.add(cacheKey);
      }
    }
  } catch (err) {
    console.error('[ShiftReminder] Error monthly missing:', err);
  }
}

async function sendMissingEmail(user, type, dateStr) {
  const appUrl = process.env.APP_URL || 'https://tosouapp.com/';
  const senderFrom = '"飯塚塗研株式会社" <' + (process.env.MAIL_FROM || 'iizuka_token@tosouapp.com') + '>';
  
  let subject, text, html;

  if (type === 'daily') {
    subject = `[飯塚塗研株式会社] 勤怠未入力のお知らせ`;
    text = `
${user.username} さん

本日（${dateStr}）の出勤打刻が確認できませんでした。
勤務したにもかかわらず打刻を忘れた場合は、システムの報告申請から至急報告してください。
もし本日がお休みの場合は、このメールは破棄していただいて構いません。

▼ 打刻・申請はこちらから（アプリURL）
${appUrl}

このメッセージはシステムにより自動的に送られています。このまま返信されても届きません。
問い合わせにかんしてはシステム公式までお問い合わせください。
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
      問い合わせにかんしてはシステム公式までお問い合わせください。</p>
    `;
  } else if (type === 'monthly') {
    subject = `[飯塚塗研株式会社] 今月の勤怠未入力に関する重要なお知らせ`;
    text = `
${user.username} さん

今月（${dateStr}）の出勤打刻が1日も確認できませんでした。
勤怠データが未入力のままですと、給与計算等に影響が出る可能性があります。
至急、システムより打刻の状況や申請漏れがないか確認してください。

▼ 打刻・申請はこちらから（アプリURL）
${appUrl}

このメッセージはシステムにより自動的に送られています。このまま返信されても届きません。
問い合わせにかんしてはシステム公式までお問い合わせください。
    `.trim();

    html = `
      <p>${user.username} さん</p>
      <br/>
      <p>今月（<strong>${dateStr}</strong>）の出勤打刻が1日も確認できませんでした。</p>
      <p>勤怠データが未入力のままですと、給与計算等に影響が出る可能性があります。<br/>
      至急、システムより打刻の状況や申請漏れがないか確認してください。</p>
      <br/>
      <p>▼ 打刻・申請はこちらから（アプリURL）<br/>
      <a href="${appUrl}">${appUrl}</a></p>
      <br/>
      <hr/>
      <p style="font-size: 12px; color: #666;">このメッセージはシステムにより自動的に送られています。このまま返信されても届きません。<br/>
      問い合わせにかんしてはシステム公式までお問い合わせください。</p>
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
  const senderFrom = '"飯塚塗研株式会社" <' + (process.env.MAIL_FROM || 'iizuka_token@tosouapp.com') + '>';
  
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
問い合わせにかんしてはシステム公式までお問い合わせください。
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
      問い合わせにかんしてはシステム公式までお問い合わせください。</p>
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
問い合わせにかんしてはシステム公式までお問い合わせください。
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
      問い合わせにかんしてはシステム公式までお問い合わせください。</p>
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
  init
};

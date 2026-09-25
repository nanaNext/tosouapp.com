const db = require('../core/database/mysql');
const emailService = require('../core/notifications/email.service');
const branding = require('./reminderBranding');

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

// Cuối tháng: email cho nhân viên còn ngày làm việc chưa chấm công trong tháng.
// Chạy chung cho mọi công ty — ngày nghỉ lấy theo lịch của đúng công ty + bộ phận
// (getDepartmentOffDaySet, cùng nguồn với màn hình chấm công tháng), email ký tên
// theo công ty của người nhận.
async function checkMonthlyMissingAttendance() {
  try {
    if (!emailService.canSendMail()) {
      console.log('[ShiftReminder] Email service not configured. Skipping monthly missing check.');
      return;
    }
    const nowJST = new Date(Date.now() + 9 * 3600 * 1000);
    const y = nowJST.getUTCFullYear();
    const m = nowJST.getUTCMonth();
    const monthStr = nowJST.toISOString().slice(0, 7);
    const todayStr = nowJST.toISOString().slice(0, 10);

    const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    const monthStartStr = `${y}-${String(m + 1).padStart(2, '0')}-01`;
    const monthEndStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    // Chỉ nhân viên (không gồm admin/manager) của công ty đang hoạt động
    const [users] = await db.query(`
      SELECT u.id, u.email, u.username, u.employment_type, u.tenant_id, u.departmentId, u.hire_date
      FROM users u
      ${branding.ACTIVE_TENANT_JOIN}
      WHERE u.employment_status = 'active' AND u.role = 'employee' AND ${branding.ACTIVE_TENANT_WHERE}
    `);
    if (!users || users.length === 0) return;

    const tenantNames = await branding.loadTenantNames(db);
    const { getDepartmentOffDaySet } = require('../modules/attendance/attendance.utils');
    const offCache = new Map();
    async function offDaysFor(user) {
      const key = `${user.tenant_id || 0}_${user.departmentId || 0}`;
      if (!offCache.has(key)) {
        offCache.set(key, await getDepartmentOffDaySet(y, { departmentId: user.departmentId || null, tenantId: user.tenant_id || 0 }).catch(() => new Set()));
      }
      return offCache.get(key);
    }

    const daysInMonth = [];
    for (let day = 1; day <= lastDay; day++) {
      daysInMonth.push(`${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
    }

    // 区分 (kubun) của từng ngày
    const [dailies] = await db.query(`SELECT userId, date, kubun FROM attendance_daily WHERE date >= ? AND date <= ?`, [monthStartStr, monthEndStr]);
    const dailyMap = new Map(); // key: userId_date
    for (const d of dailies) {
      dailyMap.set(`${d.userId}_${String(d.date).slice(0, 10)}`, String(d.kubun || '').trim());
    }

    // Ngày có chấm công (vào hoặc ra)
    const [attRows] = await db.query(
      `SELECT userId, DATE(COALESCE(checkIn, checkOut)) AS d FROM attendance
       WHERE COALESCE(checkIn, checkOut) >= ? AND COALESCE(checkIn, checkOut) <= ?`,
      [`${monthStartStr} 00:00:00`, `${monthEndStr} 23:59:59`]
    );
    const attMap = new Set();
    for (const r of attRows) {
      if (r.d) attMap.add(`${r.userId}_${String(r.d instanceof Date ? r.d.toISOString() : r.d).slice(0, 10)}`);
    }

    for (const user of users) {
      if (!user.email) continue;
      // Part-time không có lịch cố định → không nhắc
      if (user.employment_type === 'part_time') continue;

      const cacheKey = `monthly_missing_${user.id}_${monthStr}`;
      if (sentReminders.has(cacheKey)) continue;

      const offDays = await offDaysFor(user);
      const hireStr = user.hire_date ? String(user.hire_date instanceof Date ? user.hire_date.toISOString() : user.hire_date).slice(0, 10) : '';

      let isMissingAnyDay = false;
      for (const ds of daysInMonth) {
        if (ds > todayStr) continue;              // ngày chưa tới
        if (hireStr && ds < hireStr) continue;    // trước ngày vào làm

        const userKubun = dailyMap.get(`${user.id}_${ds}`) || '';
        const isExplicitOff = ['休日', '有給休暇', '欠勤', '無給休暇', '代替休日'].includes(userKubun);
        const isExplicitWork = ['出勤', '休日出勤', '代替出勤', '半休'].includes(userKubun);
        if (isExplicitOff) continue;
        if (offDays.has(ds) && !isExplicitWork) continue;

        if (!attMap.has(`${user.id}_${ds}`)) {
          isMissingAnyDay = true;
          break; // thiếu 1 ngày là đủ để nhắc
        }
      }

      if (isMissingAnyDay) {
        await sendMissingEmail(user, 'monthly', monthStr, {
          company: branding.companyName(tenantNames, user.tenant_id, '飯塚グループ・エンジニアリング'),
          contact: branding.contactBlock(user.tenant_id),
        });
        sentReminders.add(cacheKey);
      }
    }
  } catch (err) {
    console.error('[ShiftReminder] Error monthly missing:', err);
  }
}

async function sendMissingEmail(user, type, dateStr, { company, contact } = {}) {
  const appUrl = process.env.APP_URL || 'https://tosouapp.com/';
  company = company || process.env.COMPANY_NAME || '飯塚グループ・エンジニアリング';
  contact = contact || branding.contactBlock(user.tenant_id);
  const senderFrom = emailService.senderWithName(company) || `"${company}" <iizuka_token@tosouapp.com>`;
  
  let subject, text, html;

  if (type === 'monthly') {
    subject = `[${company}] 今月の勤怠未入力に関する重要なお知らせ`;
    text = `
${user.username} さん

今月（${dateStr}）の勤怠データに未入力の勤務日が含まれていることが確認されました。
勤怠データが未入力のままですと、給与計算等に影響が出る可能性があります。
至急、システムより打刻の状況や申請漏れがないか確認してください。

▼ 打刻・申請はこちらから（アプリURL）
${appUrl}

このメッセージはシステムにより自動的に送られています。このまま返信されても届きません。
${contact.text}
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
      ${contact.html}</p>
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
  return;
  const appUrl = process.env.APP_URL || 'https://tosouapp.com/';
  const senderFrom = process.env.MAIL_FROM || '"飯塚グループ・エンジニアリング" <iizuka_token@tosouapp.com>';
  
  const subject = `[飯塚グループ・エンジニアリング] 今月の勤怠データ確認完了のお知らせ`;
  const text = `
${user.username} さん

今月（${monthStr}）の勤怠データはすべて正常に入力されていることが確認されました。
今月の合計出勤日数は ${totalWorkedDays} 日です。

詳細や有給等の状況について確認・修正が必要な場合は、システムの月次勤怠表をご確認いただくか、管理者までご連絡ください。

▼ 月次勤怠表はこちらから（アプリURL）
${appUrl}

このメッセージはシステムにより自動的に送られています。このまま返信されても届きません。
お問い合わせに関してはシステム公式LINEまでお願いいたします。
公式LINE： https://lin.ee/zBKnhkd
  `.trim();

  const html = `
    <p>${user.username} さん</p>
    <br/>
    <p>今月（<strong>${monthStr}</strong>）の勤怠データはすべて正常に入力されていることが確認されました。</p>
    <p>今月の合計出勤日数は <strong>${totalWorkedDays} 日</strong>です。</p>
    <p>詳細や有給等の状況について確認・修正が必要な場合は、システムの月次勤怠表をご確認いただくか、管理者までご連絡ください。</p>
    <br/>
    <p>▼ 月次勤怠表はこちらから（アプリURL）<br/>
    <a href="${appUrl}">${appUrl}</a></p>
    <br/>
    <hr/>
    <p style="font-size: 12px; color: #666;">このメッセージはシステムにより自動的に送られています。このまま返信されても届きません。<br/>
    お問い合わせに関してはシステム公式LINEまでお願いいたします。<br/><strong>公式LINE：</strong> <a href="https://lin.ee/zBKnhkd">https://lin.ee/zBKnhkd</a></p>
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
  const senderFrom = process.env.MAIL_FROM || '"飯塚グループ・エンジニアリング" <iizuka_token@tosouapp.com>';
  
  const inStr = String(checkIn || '').slice(11, 16);
  const outStr = String(checkOut || '').slice(11, 16);
  
  const subject = `[飯塚グループ・エンジニアリング] 本日の勤務お疲れ様でした`;
  const text = `
${user.username} さん

本日の勤務お疲れ様でした。以下の通り退勤の打刻を受け付けました。

・日付: ${dateStr}
・出勤時間: ${inStr}
・退勤時間: ${outStr}
・総勤務時間: ${totalHours}

打刻時間に誤りがある場合は、システムの勤怠表から修正申請を行ってください。

▼ 勤怠表はこちらから（アプリURL）
${appUrl}

このメッセージはシステムにより自動的に送られています。このまま返信されても届きません。
お問い合わせに関してはシステム公式LINEまでお願いいたします。
公式LINE： https://lin.ee/zBKnhkd
  `.trim();

  const html = `
    <p>${user.username} さん</p>
    <br/>
    <p>本日の勤務お疲れ様でした。以下の通り退勤の打刻を受け付けました。</p>
    <ul>
      <li><strong>日付:</strong> ${dateStr}</li>
      <li><strong>出勤時間:</strong> ${inStr}</li>
      <li><strong>退勤時間:</strong> ${outStr}</li>
      <li><strong>総勤務時間:</strong> ${totalHours}</li>
    </ul>
    <p>打刻時間に誤りがある場合は、システムの勤怠表から修正申請を行ってください。</p>
    <br/>
    <p>▼ 勤怠表はこちらから（アプリURL）<br/>
    <a href="${appUrl}">${appUrl}</a></p>
    <br/>
    <hr/>
    <p style="font-size: 12px; color: #666;">このメッセージはシステムにより自動的に送られています。このまま返信されても届きません。<br/>
    お問い合わせに関してはシステム公式LINEまでお願いいたします。<br/><strong>公式LINE：</strong> <a href="https://lin.ee/zBKnhkd">https://lin.ee/zBKnhkd</a></p>
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

  console.log('[ShiftReminder] Cron job initialized. Monthly missing-attendance check on last day 23:30 JST.');
  return true;
}

module.exports = {
  init,
  checkMonthlyMissingAttendance,
  sendDailySummaryEmail
};

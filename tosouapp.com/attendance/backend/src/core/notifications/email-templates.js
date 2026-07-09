/**
 * Unified Email Templates
 * Professional HTML email templates for all system notifications.
 * 
 * Usage:
 *   const { renderEmail } = require('./email-templates');
 *   const { html, text } = renderEmail('shift-reminder', { username: '田中', month: '2026-08' });
 */

const companyName = process.env.COMPANY_NAME || '飯塚塗研株式会社';
const appUrl = process.env.APP_URL || 'https://tosouapp.com/';
const lineUrl = 'https://lin.ee/zBKnhkd';

// --- BASE LAYOUT ---
function baseLayout({ title, body, footer }) {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:'Hiragino Kaku Gothic ProN','Meiryo','Noto Sans JP',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:600px;background:#ffffff;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.06);overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="background:#0b2c66;padding:20px 24px;text-align:center;">
              <span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:0.5px;">${companyName}</span>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px 24px;color:#1e293b;font-size:15px;line-height:1.7;">
              ${body}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 24px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b;text-align:center;line-height:1.6;">
              ${footer || defaultFooter()}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function defaultFooter() {
  return `
    <p style="margin:0 0 8px;">このメールはシステムにより自動送信されています。</p>
    <p style="margin:0 0 8px;">ご不明な点は公式LINEまでお問い合わせください。</p>
    <p style="margin:0;"><a href="${lineUrl}" style="color:#2563eb;text-decoration:none;">公式LINE: ${lineUrl}</a></p>
  `;
}

function button(text, url, color = '#2563eb') {
  return `
    <table cellpadding="0" cellspacing="0" style="margin:24px 0;">
      <tr>
        <td style="background:${color};border-radius:8px;padding:12px 24px;">
          <a href="${url}" style="color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;display:inline-block;">${text}</a>
        </td>
      </tr>
    </table>
  `;
}

// --- TEMPLATES ---

const templates = {

  'shift-reminder-seishain': ({ username, targetMonth }) => {
    const title = `【重要】来月（${targetMonth}）のシフト提出のお願い`;
    const body = `
      <p style="margin:0 0 16px;font-size:16px;font-weight:600;">${username} 様</p>
      <p>お疲れ様です。<br>来月（<strong>${targetMonth}</strong>）のシフト提出に関するお知らせです。</p>
      <p>正社員の皆様は基本的にカレンダー通りの出勤となりますが、<strong>有給休暇の取得やその他のお休み</strong>を希望される場合は、システムより申請をお願いいたします。</p>
      <p style="background:#fef2f2;border-left:4px solid #ef4444;padding:12px 16px;border-radius:0 8px 8px 0;color:#991b1b;font-weight:500;">
        ※申請がない場合は、規定の出勤日として処理されます。
      </p>
      ${button('シフト（休暇）申請はこちら', `${appUrl}ui/shifts`)}
      <p style="font-size:13px;color:#475569;"><strong>■ 提出手順：</strong><br>
        1. 上記ボタンからシフト登録画面へ<br>
        2. 休みの日を「休」または「有給」に設定<br>
        3. 画面上部の「シフト提出」ボタンを押す</p>
      ${button('操作マニュアル', `${appUrl}ui/manual`, '#475569')}
    `;
    const text = `${username} 様\n\n来月（${targetMonth}）のシフト提出をお願いします。\n\nシフト申請: ${appUrl}ui/shifts\n\n${companyName}`;
    return { title, html: baseLayout({ title, body }), text };
  },

  'shift-reminder-part': ({ username, targetMonth }) => {
    const title = `【重要】来月（${targetMonth}）のシフト提出のお願い`;
    const body = `
      <p style="margin:0 0 16px;font-size:16px;font-weight:600;">${username} 様</p>
      <p>お疲れ様です。<br>来月（<strong>${targetMonth}</strong>）のシフト提出のお願いです。</p>
      <p>出勤可能な日・時間帯をシステムよりご提出ください。</p>
      <p style="background:#fef2f2;border-left:4px solid #ef4444;padding:12px 16px;border-radius:0 8px 8px 0;color:#991b1b;font-weight:500;">
        未提出の場合はシフトを組むことができません。お早めにご対応をお願いいたします。
      </p>
      ${button('シフト提出はこちら', `${appUrl}ui/shifts`)}
      <p style="font-size:13px;color:#475569;"><strong>■ 提出手順：</strong><br>
        1. 上記ボタンからシフト登録画面へ<br>
        2. 出勤日を「出勤」、休みを「休日」に設定<br>
        3. 画面上部の「シフト提出」ボタンを押す</p>
    `;
    const text = `${username} 様\n\n来月（${targetMonth}）のシフト提出をお願いします。\n未提出の場合シフトを組めません。\n\nシフト申請: ${appUrl}ui/shifts\n\n${companyName}`;
    return { title, html: baseLayout({ title, body }), text };
  },

  'password-reset': ({ username, resetUrl, expiresMinutes }) => {
    const title = 'パスワード再設定';
    const body = `
      <p style="margin:0 0 16px;font-size:16px;font-weight:600;">${username || ''} 様</p>
      <p>パスワード再設定のリクエストを受け付けました。</p>
      <p>以下のボタンからパスワードを再設定してください。<br>
        <span style="color:#64748b;font-size:13px;">（有効期限: ${expiresMinutes}分）</span></p>
      ${button('パスワードを再設定する', resetUrl)}
      <p style="font-size:12px;color:#64748b;word-break:break-all;">ボタンが機能しない場合: ${resetUrl}</p>
      <p style="font-size:13px;color:#475569;">このリクエストに心当たりがない場合は、このメールを無視してください。</p>
    `;
    const text = `パスワード再設定\n\n以下のリンクから再設定してください（有効期限: ${expiresMinutes}分）:\n${resetUrl}\n\n${companyName}`;
    return { title, html: baseLayout({ title, body }), text };
  },

  'welcome': ({ username, email, tempPassword }) => {
    const title = 'アカウント作成のお知らせ';
    const body = `
      <p style="margin:0 0 16px;font-size:16px;font-weight:600;">${username} 様</p>
      <p>勤怠管理システムのアカウントが作成されました。</p>
      <table style="width:100%;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;margin:16px 0;">
        <tr><td style="padding:12px 16px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#64748b;">メールアドレス</td><td style="padding:12px 16px;border-bottom:1px solid #e2e8f0;font-weight:600;">${email}</td></tr>
        ${tempPassword ? `<tr><td style="padding:12px 16px;font-size:13px;color:#64748b;">仮パスワード</td><td style="padding:12px 16px;font-weight:600;font-family:monospace;">${tempPassword}</td></tr>` : ''}
      </table>
      <p style="color:#dc2626;font-weight:500;">初回ログイン後、必ずパスワードを変更してください。</p>
      ${button('ログインはこちら', `${appUrl}ui/login`)}
    `;
    const text = `${username} 様\n\nアカウントが作成されました。\nメール: ${email}\n${tempPassword ? `仮パスワード: ${tempPassword}\n` : ''}\nログイン: ${appUrl}ui/login\n\n${companyName}`;
    return { title, html: baseLayout({ title, body }), text };
  },

  'leave-approved': ({ username, leaveType, startDate, endDate }) => {
    const title = '休暇申請が承認されました';
    const body = `
      <p style="margin:0 0 16px;font-size:16px;font-weight:600;">${username} 様</p>
      <p>休暇申請が<span style="color:#166534;font-weight:700;">承認</span>されました。</p>
      <table style="width:100%;background:#f0fdf4;border-radius:8px;border:1px solid #bbf7d0;margin:16px 0;">
        <tr><td style="padding:12px 16px;border-bottom:1px solid #bbf7d0;font-size:13px;color:#475569;">種別</td><td style="padding:12px 16px;border-bottom:1px solid #bbf7d0;font-weight:600;">${leaveType}</td></tr>
        <tr><td style="padding:12px 16px;font-size:13px;color:#475569;">期間</td><td style="padding:12px 16px;font-weight:600;">${startDate} ～ ${endDate}</td></tr>
      </table>
    `;
    const text = `${username} 様\n\n休暇申請が承認されました。\n種別: ${leaveType}\n期間: ${startDate} ～ ${endDate}\n\n${companyName}`;
    return { title, html: baseLayout({ title, body }), text };
  },

  'leave-rejected': ({ username, leaveType, startDate, endDate, reason }) => {
    const title = '休暇申請が差戻しされました';
    const body = `
      <p style="margin:0 0 16px;font-size:16px;font-weight:600;">${username} 様</p>
      <p>休暇申請が<span style="color:#991b1b;font-weight:700;">差戻し</span>されました。</p>
      <table style="width:100%;background:#fef2f2;border-radius:8px;border:1px solid #fecaca;margin:16px 0;">
        <tr><td style="padding:12px 16px;border-bottom:1px solid #fecaca;font-size:13px;color:#475569;">種別</td><td style="padding:12px 16px;border-bottom:1px solid #fecaca;font-weight:600;">${leaveType}</td></tr>
        <tr><td style="padding:12px 16px;border-bottom:1px solid #fecaca;font-size:13px;color:#475569;">期間</td><td style="padding:12px 16px;border-bottom:1px solid #fecaca;font-weight:600;">${startDate} ～ ${endDate}</td></tr>
        ${reason ? `<tr><td style="padding:12px 16px;font-size:13px;color:#475569;">理由</td><td style="padding:12px 16px;">${reason}</td></tr>` : ''}
      </table>
      <p>内容を確認の上、再度申請してください。</p>
    `;
    const text = `${username} 様\n\n休暇申請が差戻しされました。\n種別: ${leaveType}\n期間: ${startDate} ～ ${endDate}\n${reason ? `理由: ${reason}\n` : ''}\n${companyName}`;
    return { title, html: baseLayout({ title, body }), text };
  },
};

/**
 * Render email template
 * @param {string} templateName
 * @param {object} data
 * @returns {{ title: string, html: string, text: string }}
 */
function renderEmail(templateName, data = {}) {
  const fn = templates[templateName];
  if (!fn) throw new Error(`Email template not found: ${templateName}`);
  return fn(data);
}

module.exports = { renderEmail, templates, baseLayout, button };

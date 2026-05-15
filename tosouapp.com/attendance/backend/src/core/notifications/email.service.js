const nodemailer = require('nodemailer');
const { mailProvider, mailApiKey, mailFrom, smtpHost, smtpPort, smtpUser, smtpPass, companyName, companySupportEmail } = require('../../config/env');

function canSendMail() {
  const provider = String(mailProvider || '').toLowerCase();
  if (provider === 'resend') return !!mailApiKey && !!mailFrom;
  if (provider === 'smtp') return !!smtpHost && !!smtpUser && !!smtpPass && !!mailFrom;
  return false;
}

let smtpTransporter = null;
if (String(mailProvider || '').toLowerCase() === 'smtp') {
  smtpTransporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465, // true for 465, false for other ports
    auth: {
      user: smtpUser,
      pass: smtpPass
    },
    tls: {
      // Do not fail on invalid/self-signed certs
      rejectUnauthorized: false
    }
  });
}

async function sendViaResend({ to, subject, html, text, from }) {
  const provider = String(mailProvider || '').toLowerCase();
  const sender = from || mailFrom;
  
  if (provider === 'smtp') {
    if (!smtpTransporter) throw new Error('SMTP transporter not initialized');
    await smtpTransporter.sendMail({
      from: sender,
      to,
      subject,
      text,
      html
    });
    return;
  }
  
  if (provider === 'resend') {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mailApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: sender,
        to: [to],
        subject,
        html,
        text
      })
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`mail_send_failed_${res.status}${body ? `: ${body}` : ''}`);
    }
    return;
  }
  
  throw new Error('No valid mail provider configured');
}

function renderResetPasswordTemplate({ resetUrl, expiresMinutes }) {
  const safeUrl = String(resetUrl || '').trim();
  const safeCompany = String(companyName || 'Company').trim();
  const safeSupport = String(companySupportEmail || '').trim();
  const supportLine = safeSupport ? `\nSupport: ${safeSupport}` : '';
  const text = [
    `${safeCompany} password reset request`,
    '',
    'We received a request to reset your password.',
    `Reset link (valid for ${expiresMinutes} minutes):`,
    safeUrl,
    '',
    'If you did not request this, you can ignore this email.',
    supportLine
  ].join('\n');
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #1f2937;">
      <h2 style="margin: 0 0 12px;">${safeCompany} Password Reset</h2>
      <p>We received a request to reset your password.</p>
      <p>
        <a href="${safeUrl}" style="display:inline-block;padding:10px 16px;background:#1d4ed8;color:#fff;text-decoration:none;border-radius:6px;">
          Reset Password
        </a>
      </p>
      <p style="word-break: break-all;">If the button does not work, open this link:<br>${safeUrl}</p>
      <p>This link expires in ${expiresMinutes} minutes.</p>
      <p>If you did not request this, you can ignore this email.</p>
      ${safeSupport ? `<p>Support: ${safeSupport}</p>` : ''}
    </div>
  `;
  return { text, html };
}

async function sendPasswordResetEmail({ to, resetUrl, expiresMinutes }) {
  if (!canSendMail()) return false;
  const { text, html } = renderResetPasswordTemplate({ resetUrl, expiresMinutes });
  const subject = `[${companyName || 'Company'}] Password Reset`;
  await sendViaResend({ to, subject, html, text });
  return true;
}

module.exports = {
  canSendMail,
  sendPasswordResetEmail,
  sendViaResend
};

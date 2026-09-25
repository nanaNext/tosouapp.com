'use strict';
/**
 * Tên công ty + phần liên hệ cho email nhắc (nộp lịch ca / quên chấm công).
 * Cron chạy chung cho mọi công ty nên phải chọn theo công ty của từng người nhận.
 */

// tenant 1 = 飯塚塗研 (công ty đầu tiên). Chỉ công ty này có kênh LINE chính thức.
const IIZUKA_TENANT_ID = 1;
const IIZUKA_LINE_URL = 'https://lin.ee/zBKnhkd';

async function loadTenantNames(db) {
  const names = new Map();
  try {
    const [rows] = await db.query('SELECT id, name FROM tenants');
    for (const t of rows) names.set(Number(t.id), t.name);
  } catch (e) { /* bảng tenants chưa có → dùng tên mặc định */ }
  return names;
}

function companyName(tenantNames, tenantId, fallback = '飯塚塗研株式会社') {
  return tenantNames.get(Number(tenantId)) || process.env.COMPANY_NAME || fallback;
}

// Chỉ gửi cho nhân viên của công ty đang hoạt động (không gửi cho công ty bị tạm dừng).
const ACTIVE_TENANT_JOIN = `LEFT JOIN tenants t ON t.id = u.tenant_id`;
const ACTIVE_TENANT_WHERE = `(t.id IS NULL OR t.status = 'active')`;

/** @returns {{ text: string, html: string }} */
function contactBlock(tenantId) {
  if (Number(tenantId) === IIZUKA_TENANT_ID) {
    return {
      text: `ご不明な点がございましたら、公式LINEまでお問い合わせください。\n公式LINE： ${IIZUKA_LINE_URL}`,
      html: `ご不明な点がございましたら、公式LINEまでお問い合わせください。<br/>\n<strong>公式LINE：</strong> <a href="${IIZUKA_LINE_URL}">${IIZUKA_LINE_URL}</a>`,
    };
  }
  return {
    text: 'ご不明な点がございましたら、管理者までお問い合わせください。',
    html: 'ご不明な点がございましたら、管理者までお問い合わせください。',
  };
}

module.exports = { IIZUKA_TENANT_ID, loadTenantNames, companyName, contactBlock, ACTIVE_TENANT_JOIN, ACTIVE_TENANT_WHERE };

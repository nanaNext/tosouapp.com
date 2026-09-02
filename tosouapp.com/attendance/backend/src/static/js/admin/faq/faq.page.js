// Trang quản lý FAQ cho admin
import { FaqAdminComponent } from '../faq-admin-component.js?v=navy-20260427-faqfix1';

export async function mount(options = {}) {
  const host = (options && options.content) || document.querySelector('#adminContent');
  if (!host) {
    console.error('❌ Admin content host not found');
    return;
  }

  // Tạo container chính
  host.className = '';
  host.innerHTML = `
    <div style="padding: 20px;">
      <div id="faqAdminContainer"></div>
    </div>
  `;

  // Khởi tạo component
  const component = new FaqAdminComponent('faqAdminContainer');
  await component.init();

  // Hàm dọn dẹp
  return async () => {};
}

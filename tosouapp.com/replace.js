const fs = require('fs');
let code = fs.readFileSync('attendance/backend/src/static/js/pages/adjust.page.js', 'utf8');

const oldCss =             /* SAP Fiori Drawer (Side Panel) Styles */
            .sap-drawer-overlay {
              position: fixed;
              top: var(--topbar-height, 60px); /* Bám sát dưới thanh tiêu đề */
              left: 0;
              width: 100vw;
              height: calc(100vh - var(--topbar-height, 60px));
              background: rgba(15, 23, 42, 0.4);
              z-index: 900;
              opacity: 0;
              pointer-events: none;
              transition: opacity 0.3s ease;
            }
            @media (min-width: 1025px) {
              .sap-drawer-overlay {
                top: calc(var(--topbar-height, 60px) + 44px);
                height: calc(100vh - var(--topbar-height, 60px) - 44px);
              }
            }
            .sap-drawer-overlay.active {
              opacity: 1;
              pointer-events: auto;
            }
            .sap-drawer {
              position: fixed;
              top: var(--topbar-height, 60px); /* Bám sát dưới thanh tiêu đề */
              right: -800px;
              width: 100%;
              max-width: 800px;
              height: calc(100vh - var(--topbar-height, 60px));
              background: #fff;
              box-shadow: -4px 0 15px rgba(0,0,0,0.1);
              z-index: 901;
              transition: right 0.3s ease;
              display: flex;
              flex-direction: column;
            }
            @media (min-width: 1025px) {
              .sap-drawer {
                top: calc(var(--topbar-height, 60px) + 44px); /* Trên PC: Bám sát dưới thanh tiêu đề + thanh menu phụ (44px) */
                height: calc(100vh - var(--topbar-height, 60px) - 44px);
              }
            }
            .sap-drawer.active {
              right: 0;
            }
            .sap-drawer-header {
              padding: 8px 12px;
              border-bottom: 1px solid #e2e8f0;
              display: flex;
              justify-content: space-between;
              align-items: center;
              background: #f8fafc;
              min-height: 40px;
              box-sizing: border-box;
            }
            .sap-drawer-title {
              font-size: 13px;
              font-weight: 700;
              color: #0f172a;
              margin: 0;
              display: flex;
              align-items: center;
              gap: 6px;
            }
            .sap-drawer-close {
              background: transparent;
              border: none;
              font-size: 20px;
              color: #64748b;
              cursor: pointer;
              padding: 4px;
              border-radius: 4px;
              display: flex;
              align-items: center;
              justify-content: center;
              transition: color 0.2s;
              line-height: 1;
            }
            .sap-drawer-close:hover { background: #e2e8f0; color: #0f172a; }
            .sap-drawer-body {
              flex: 1;
              overflow-y: auto;
              padding: 12px; /* Giảm padding trên mobile */
            }
            @media (min-width: 768px) {
              .sap-drawer-body {
                padding: 20px;
              }
            };

const newCss =             /* Bảng Lịch sử chuyển thành dạng Block trên trang */
            .sap-history-block {
              background: #fff;
              border: 1px solid #cbd5e1;
              border-radius: 4px;
              box-shadow: 0 1px 2px rgba(0,0,0,0.05);
              max-width: 900px;
              margin: 0 0 16px 0;
            }
            .sap-history-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 12px 16px;
              border-bottom: 1px solid #e2e8f0;
              background: #f8fafc;
            }
            .sap-history-title {
              margin: 0;
              font-size: 15px;
              font-weight: 700;
              color: #0f172a;
              display: flex;
              align-items: center;
              gap: 8px;
            }
            .sap-history-body {
              padding: 16px;
              display: flex;
              flex-direction: column;
            };

code = code.replace(oldCss, newCss);

const oldHtml = \<div id="sapDrawerOverlay" class="sap-drawer-overlay"></div>
          <div id="sapDrawer" class="sap-drawer">
            <div class="sap-drawer-header">
              <h3 class="sap-drawer-title">
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                申請履歴
              </h3>
              <button id="btnDrawerClose" class="sap-drawer-close" title="閉じる">
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            <div class="sap-drawer-body">\;

const newHtml = \<div id="sapHistoryBlock" class="sap-history-block" style="display: none;">
            <div class="sap-history-header">
              <h3 class="sap-history-title">
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                申請履歴
              </h3>
            </div>
            <div class="sap-history-body">\;

code = code.replace(oldHtml, newHtml);

fs.writeFileSync('attendance/backend/src/static/js/pages/adjust.page.js', code);
console.log('Replaced');

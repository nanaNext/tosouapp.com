export async function mount({ content, initialPath, profile }) {
  const layout = document.createElement('div');
  layout.className = 'att-hub-layout';
  
  // Check if standalone
  const isStandalone = new URLSearchParams(window.location.search).get('standalone') === '1';
  
  if (isStandalone) {
    // Hide topbar and subbar natively if possible
    try {
      const topbar = document.querySelector('.topbar');
      const subbar = document.querySelector('.subbar');
      if (topbar) topbar.style.display = 'none';
      if (subbar) subbar.style.display = 'none';
      
      const adminChrome = document.querySelector('#adminChrome');
      if (adminChrome) adminChrome.style.display = 'none';

      document.body.style.paddingTop = '0';
      const rootHtml = document.documentElement;
      rootHtml.style.setProperty('--topbar-height', '0px');
      rootHtml.style.setProperty('--subbar-height', '0px');
    } catch(e) {}
  }

  layout.style.cssText = `
    display: flex;
    min-height: ${isStandalone ? '100vh' : 'calc(100vh - var(--topbar-height) - var(--subbar-height))'};
    background: #FFFFFF;
    margin: 0;
    padding: 0;
    position: relative;
  `;
  
  const sidebar = document.createElement('div');
  sidebar.className = 'att-hub-sidebar';
  sidebar.style.cssText = `
    width: 220px;
    background: #F9FAFB;
    border-right: 1px solid #E5E7EB !important;
    padding: 12px 0;
    flex-shrink: 0;
    position: sticky;
    top: 0;
    height: ${isStandalone ? '100vh' : 'calc(100vh - var(--topbar-height) - var(--subbar-height))'};
    overflow-y: auto;
    box-sizing: border-box;
    margin-top: -1px;
    z-index: 100;
    transition: transform 0.3s ease;
  `;
  
  const overlay = document.createElement('div');
  overlay.className = 'att-hub-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.5);
    z-index: 99;
    display: none;
    opacity: 0;
    transition: opacity 0.3s ease;
  `;
  overlay.onclick = () => {
    sidebar.classList.remove('open');
    overlay.classList.remove('open');
    mainContentWrapper.classList.remove('shifted');
  };

  const mainContentWrapper = document.createElement('div');
  mainContentWrapper.className = 'att-hub-main-wrapper';
  mainContentWrapper.style.cssText = `
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
    transition: transform 0.3s ease;
  `;

  const mobileHeader = document.createElement('div');
  mobileHeader.className = 'att-hub-mobile-header';
  mobileHeader.style.cssText = `
    display: none;
    align-items: center;
    justify-content: space-between;
    padding: 8px 16px;
    background: #F9FAFB;
    border-bottom: 1px solid #E5E7EB;
    position: relative;
    height: 50px;
    box-sizing: border-box;
  `;
  mobileHeader.innerHTML = `
    <div style="display:flex; align-items:center; gap: 12px;">
      <button class="att-hub-menu-btn" style="background:none;border:none;padding:4px;cursor:pointer;color:#4B5563;display:flex;align-items:center;justify-content:center;border-radius:4px;margin-left:-4px;">
        <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16"></path></svg>
      </button>
      <span style="font-weight:600;color:#111827;font-size:16px;" id="attHubMobileTitle">勤怠メニュー</span>
    </div>
    <div id="attHubMobileActions" style="display:flex; align-items:center; justify-content:flex-end;"></div>
  `;
  mobileHeader.querySelector('.att-hub-menu-btn').onclick = () => {
    sidebar.classList.add('open');
    overlay.classList.add('open');
    mainContentWrapper.classList.add('shifted');
  };
  
  const mainContent = document.createElement('div');
  mainContent.id = 'attendanceHubContent';
  mainContent.style.cssText = `
    flex: 1;
    background: #FFFFFF;
    position: relative;
    overflow-x: hidden;
    padding: 0;
    margin: 0;
    min-width: 0;
    ${isStandalone ? 'min-height: 100vh;' : ''}
  `;

  
  let menuItems = [
    { id: 'att-records', label: '勤怠記録', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01', href: '/admin/attendance' },
    { id: 'att-monthly', label: '月次勤怠入力(管理者)', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', href: '/admin/attendance/monthly', blank: true },
    { id: 'att-go-out', label: '外出管理', icon: 'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1', href: '/admin/attendance/go-out' },
    { id: 'att-work-reports', label: '作業報告', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', href: '/admin/work-reports' },
    { id: 'att-shifts', label: 'シフト管理', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', href: '/admin/attendance/shifts' },
    { id: 'att-shifts-approvals', label: 'シフト承認', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', href: '/admin/attendance/shifts-approvals' },
    { id: 'att-holidays', label: '休日設定', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', href: '/admin/attendance/holidays' },
    { id: 'att-adjust', label: '調整申請一覧', icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z', href: '/admin/attendance/adjust-requests' }
  ];

  if (profile && profile.role === 'employee') {
    menuItems = [
      { id: 'att-records', label: '勤怠記録', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01', href: '/ui/attendance-records' },
    ];
  }
  
  const currentPath = initialPath || window.location.pathname;
  
  // Append ?standalone=1 to hrefs if we are in standalone mode
  const qs = isStandalone ? '?standalone=1' : '';

  const menuHtml = menuItems.map(item => {
    // If it already has a query string, we'd need to append with &, but let's assume simple paths for now.
    const finalHref = item.href + qs;
    return `
    <a href="${finalHref}" ${item.blank ? 'target="_blank" rel="noopener noreferrer"' : ''} class="att-sidebar-item ${currentPath === item.href ? 'active' : ''}" style="
      display: flex;
      align-items: center;
      padding: 8px 12px;
      margin: 2px 8px;
      border-radius: 6px;
      color: ${currentPath === item.href ? '#7928CA' : '#4B5563'};
      background: ${currentPath === item.href ? '#F4EEFF' : 'transparent'};
      text-decoration: none;
      font-size: 13px;
      font-weight: ${currentPath === item.href ? '600' : '500'};
      transition: all 0.2s;
      font-family: Inter, 'Noto Sans JP', sans-serif;
    ">
      <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="margin-right: 12px; opacity: ${currentPath === item.href ? '1' : '0.7'};">
        <path stroke-linecap="round" stroke-linejoin="round" d="${item.icon}"></path>
      </svg>
      ${item.label}
    </a>
    `;
  }).join('');

  sidebar.innerHTML = `
    <div style="flex: 1;">
      ${menuHtml}
    </div>
    <div style="padding: 8px; border-top: 1px solid #E5E7EB; margin-top: auto;">
      <a href="/ui/logout" class="att-sidebar-item" style="
        display: flex;
        align-items: center;
        padding: 8px 12px;
        border-radius: 6px;
        color: #DC2626;
        background: transparent;
        text-decoration: none;
        font-size: 13px;
        font-weight: 500;
        transition: all 0.2s;
        font-family: Inter, 'Noto Sans JP', sans-serif;
      ">
        <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="margin-right: 12px; opacity: 0.8;">
          <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
        </svg>
        ログアウト
      </a>
    </div>
  `;

  // Hover effects
  sidebar.querySelectorAll('.att-sidebar-item:not(.active)').forEach(el => {
    el.addEventListener('mouseenter', () => { el.style.background = '#F3F4F6'; el.style.color = '#111827'; });
    el.addEventListener('mouseleave', () => { el.style.background = 'transparent'; el.style.color = '#4B5563'; });
  });

  const styleEl = document.createElement('style');
  styleEl.textContent = `
    /* Global table styles for all tables inside Attendance Hub */
    #attendanceHubContent table {
      border-collapse: collapse !important;
      width: 100% !important;
    }
    #attendanceHubContent table th {
      background-color: #e6f2ff !important;
      color: #0f172a !important;
      font-weight: 600 !important;
      border: 1px solid #cbd5e1 !important;
      padding: 6px 8px !important;
      font-size: 13px !important;
      text-align: center !important;
      white-space: nowrap;
    }
    #attendanceHubContent table td {
      border: 1px solid #cbd5e1 !important;
      padding: 6px 8px !important;
      font-size: 13px !important;
    }
    /* Specific styles for monthly grid look */
    #attendanceHubContent table td.wr-dow-sun,
    #attendanceHubContent table td[style*="color:#ef4444"],
    #attendanceHubContent table td[style*="color:#dc2626"] {
      background-color: #fff1f1 !important;
      color: #dc2626 !important;
    }
    #attendanceHubContent table td:has(> span.dash-pill) {
      padding: 4px 8px !important;
    }
    /* Override specific background logic */
    #attendanceHubContent table td[style*="background"] {
      /* Keep the background if it's explicitly set on td, unless it's overriden by hover */
    }
    #attendanceHubContent table td:contains("出") {
      /* This pseudo-class is not standard CSS, so we'll rely on the existing inline styles or specific classes if any, but we can do a general hover */
    }
    /* Keep pills styled correctly if used */
    #attendanceHubContent .dash-pill {
      font-weight: 500;
      border-radius: 4px;
      display: inline-block;
      padding: 2px 6px;
    }
    #attendanceHubContent table tbody tr:hover td {
      background-color: #f8fafc !important;
    }
    /* Remove any border-radius from tables */
    #attendanceHubContent table, 
    #attendanceHubContent .table-container,
    #attendanceHubContent div[style*="border-radius:8px"] {
      border-radius: 0 !important;
      box-shadow: none !important;
      border-top: none !important;
      border-left: none !important;
      border-right: none !important;
    }
    
    /* Mobile responsive styles */
    @media (max-width: 768px) {
      .att-hub-layout {
        height: calc(100dvh - 46px) !important;
        overflow: hidden !important;
      }
      .att-hub-main-wrapper {
        height: 100% !important;
        display: flex !important;
        flex-direction: column !important;
        min-height: 0 !important;
      }
      #attendanceHubContent {
        flex: 1 1 0% !important;
        min-height: 0 !important;
        display: flex !important;
        flex-direction: column !important;
        padding: 0 !important;
      }
      .att-hub-mobile-header {
        display: flex !important;
      }
      /* Hide the inner title (h2) on mobile since we have it in the header */
      #attendanceHubContent h2 {
        display: none !important;
      }
      /* Hide the page title in the mobile header when actions are present */
      .att-hub-mobile-header.has-actions #attHubMobileTitle {
        display: none !important;
      }
      .att-hub-sidebar {
        position: fixed !important;
        left: 0;
        top: 0;
        bottom: 0;
        height: 100vh !important;
        transform: translateX(-100%);
        z-index: 1001 !important;
        box-shadow: 2px 0 8px rgba(0,0,0,0.1);
        padding-top: 16px !important;
      }
      .att-hub-sidebar.open {
        transform: translateX(0);
      }
      .att-hub-main-wrapper {
        width: 100%;
      }
      .att-hub-main-wrapper.shifted {
        transform: translateX(220px);
      }
      .att-hub-overlay {
        display: block !important;
        pointer-events: none;
      }
      .att-hub-overlay.open {
        opacity: 1 !important;
        pointer-events: auto;
        z-index: 1000 !important;
      }
      #attendanceHubContent {
        padding: 0 !important;
      }
      /* Ensure the inner layout for work reports fits nicely on mobile */
      .wr-toolbar {
        flex-direction: column;
        align-items: stretch !important;
      }
      .wr-input {
        width: 100%;
      }
      .wr-btn-dl {
        width: 100%;
      }
    }
  `;
  document.head.appendChild(styleEl);

  layout.appendChild(overlay);
  layout.appendChild(sidebar);
  mainContentWrapper.appendChild(mobileHeader);
  mainContentWrapper.appendChild(mainContent);
  layout.appendChild(mainContentWrapper);
  content.appendChild(layout);

  // Clear actions slot when navigating
  const attHubMobileActions = document.getElementById('attHubMobileActions');
  if (attHubMobileActions) {
    attHubMobileActions.innerHTML = '';
  }

  // Update title based on current path
  const currentItem = menuItems.find(i => currentPath === i.href);
  if (currentItem) {
    const titleEl = document.getElementById('attHubMobileTitle');
    if (titleEl) titleEl.textContent = currentItem.label;
  }

  // Function to set up a MutationObserver to watch for actions being added/removed
  const setupMobileActionsObserver = () => {
    const actionsContainer = document.getElementById('attHubMobileActions');
    const mobileHeader = document.querySelector('.att-hub-mobile-header');
    
    if (actionsContainer && mobileHeader) {
      const checkActions = () => {
        if (actionsContainer.children.length > 0) {
          mobileHeader.classList.add('has-actions');
        } else {
          mobileHeader.classList.remove('has-actions');
        }
      };
      
      // Check initial state
      checkActions();
      
      // Watch for changes
      const observer = new MutationObserver(checkActions);
      observer.observe(actionsContainer, { childList: true });
    }
  };

  // Setup routing hook so we can update the title when navigating
  const originalPushState = history.pushState;
  history.pushState = function() {
    originalPushState.apply(this, arguments);
    setTimeout(() => {
      const activeItem = menuItems.find(it => window.location.pathname.startsWith(it.href));
      if (activeItem) {
        document.getElementById('attHubMobileTitle').textContent = activeItem.label;
      }
      setupMobileActionsObserver();
    }, 50);
  };
  
  // Call it initially after DOM is ready
  setTimeout(setupMobileActionsObserver, 100);

  return mainContent;
}
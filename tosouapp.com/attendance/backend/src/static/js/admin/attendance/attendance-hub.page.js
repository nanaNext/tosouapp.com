export async function mount({ content, initialPath, profile }) {
  let currentPath = initialPath || window.location.pathname;
  if (currentPath === '/admin' || currentPath === '/admin/') {
    currentPath = '/admin/dashboard';
  }

  let menuItems = [
    { id: 'global-attendance', label: '勤怠管理', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', href: '/admin/attendance', hasSubmenu: true },
    { id: 'att-records', label: '勤怠記録', href: '/admin/attendance', parent: 'global-attendance' },
    { id: 'att-monthly', label: '月次勤怠入力(管理者)', href: '/admin/attendance/monthly', parent: 'global-attendance' },
    { id: 'att-go-out', label: '外出管理', href: '/admin/attendance/go-out', parent: 'global-attendance' },
    { id: 'att-work-reports', label: '作業報告', href: '/admin/work-reports', parent: 'global-attendance' },
    { id: 'att-shifts', label: 'シフト管理', href: '/admin/attendance/shifts', parent: 'global-attendance' },
    { id: 'att-shifts-approvals', label: 'シフト承認', href: '/admin/attendance/shifts-approvals', parent: 'global-attendance' },
    { id: 'att-holidays', label: '休日設定', href: '/admin/attendance/holidays', parent: 'global-attendance' },
    { id: 'att-adjust', label: '調整申請一覧', href: '/admin/attendance/adjust-requests', parent: 'global-attendance' },
    { id: 'global-emp', label: '社員管理', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z', href: '/admin/employees', hasSubmenu: true },
    { id: 'emp-list', label: '社員一覧', href: '/admin/employees', parent: 'global-emp' },
    { id: 'emp-add', label: '社員追加', href: '/admin/employees/add', parent: 'global-emp' },
    { id: 'emp-monthly', label: '月次集計', href: '/admin/employees/monthly-summary', parent: 'global-emp' },
    { id: 'global-leave', label: '休暇管理', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', href: '/admin/leave', hasSubmenu: true },
    { id: 'leave-requests', label: '休暇申請承認', href: '/admin/leave/requests', parent: 'global-leave' },
    { id: 'leave-grants', label: '有給付与', href: '/admin/leave/grants', parent: 'global-leave' },
    { id: 'leave-balance', label: '有給残日数一覧', href: '/admin/leave/balance', parent: 'global-leave' },
    { id: 'global-payroll', label: '給与管理', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z', href: '/admin/payroll' },
    { id: 'global-expense', label: '交通費', icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6', href: '/admin/expenses?standalone=1', newTab: true },
    { id: 'global-org', label: '組織', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4', href: '/admin/departments' },
    { id: 'global-branches', label: '支店管理', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6', href: '/admin/branches' },
    { id: 'global-system', label: 'システム', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z', href: '/admin/system', hasSubmenu: true },
    { id: 'sys-notices', label: 'お知らせ', href: '/admin/notices', parent: 'global-system' },
    { id: 'sys-settings', label: '設定', href: '/admin/system/settings', parent: 'global-system' },
    { id: 'sys-audit', label: '監査ログ', href: '/admin/system/audit-logs', parent: 'global-system' },
    { id: 'global-faq', label: 'FAQ管理', icon: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z', href: '/admin/faq' }
  ];

  if (profile && profile.role === 'employee') {
    menuItems = [
      { id: 'att-records', label: '勤怠記録', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01', href: '/ui/attendance-records' },
    ];
  }

  const isStandalone = new URLSearchParams(window.location.search).get('standalone') === '1';
  const qs = isStandalone ? '?standalone=1' : '';

  // Generate Menu HTML using standard admin.css <details> and <summary> format
  const generateMenuHtml = () => {
    return menuItems.filter(m => !m.parent).map(item => {
      if (item.isSeparator) return '<hr style="border:0; border-top:1px solid rgba(255,255,255,0.1); margin: 8px 12px;">';
      
      const subItems = menuItems.filter(m => m.parent === item.id);
      const isActive = currentPath === item.href || subItems.some(sub => currentPath === sub.href);
      
      if (subItems.length > 0) {
        // Multi-level menu
        const subHtml = subItems.map(sub => {
          const isSubActive = currentPath === sub.href;
          return `<a href="${sub.href}${qs}" class="${isSubActive ? 'active' : ''}">${sub.label}</a>`;
        }).join('');
        
        return `
          <details ${isActive ? 'open class="active-section"' : ''}>
            <summary class="${isActive ? 'selected' : ''}">
              <span style="display:flex; align-items:center; gap:8px;">
                <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="${item.icon}"></path></svg>
                ${item.label}
              </span>
              <span class="chev"></span>
            </summary>
            ${subHtml}
          </details>
        `;
      } else {
        // Single-level menu
        const targetAttr = item.newTab ? ' target="_blank" rel="noopener noreferrer"' : '';
        return `
          <a href="${item.href}${qs}" class="standalone-link ${isActive ? 'selected active' : ''}"${targetAttr} style="display:flex; align-items:center; gap:8px; padding: 10px 12px; margin: 4px 10px; border-radius: 8px; text-decoration: none;">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="${item.icon}"></path></svg>
            ${item.label}
          </a>
        `;
      }
    }).join('');
  };

  const menuHtml = generateMenuHtml();

  // Inject into Global Sidebar
  const sidebarNav = document.querySelector('.sidebar .sidebar-nav');
  if (sidebarNav) {
    sidebarNav.innerHTML = menuHtml;
  }

  // Inject into Mobile Drawer
  const drawerNavMount = document.querySelector('#drawerNavMount');
  if (drawerNavMount) {
    drawerNavMount.innerHTML = `<nav class="drawer-nav">${menuHtml}</nav>`;
    drawerNavMount.dataset.filled = '1';
  }

  // We are completely removing the .att-hub-layout wrapper to use the standard global layout
  const existingLayout = content.querySelector('.att-hub-layout');
  if (existingLayout) {
    // If it was already mounted, just replace content with inner hub content
    const hubContent = existingLayout.querySelector('#attendanceHubContent');
    if (hubContent) {
      content.innerHTML = '';
      while (hubContent.firstChild) {
        content.appendChild(hubContent.firstChild);
      }
    } else {
      content.innerHTML = '';
    }
  } else {
    // If it's a fresh mount, the content is already just #adminContent
    // Clear it just in case
    content.innerHTML = '';
  }

  return content;
}

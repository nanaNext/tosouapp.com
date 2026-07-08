import { listUsers } from '../../api/users.api.js';

const normalizePath = (p) => {
  const s = String(p || '');
  return s.length > 1 ? s.replace(/\/+$/, '') : s;
};

export async function mount(options = {}) {
  const content = options.content || document.querySelector('#adminContent');
  if (!content) return;
  content.className = 'card';
  const p = normalizePath(window.location.pathname);
  const mod = await import('../legacy/legacy-leave.page.js?v=9');

  if (content.querySelector('.leave-page-layout')) {
    // Already mounted! Just switch tab.
    let target = 'tab-approvals';
    if (p.includes('grants')) target = 'tab-grant';
    else if (p.includes('balance')) target = 'tab-balances';
    
    const tabBtn = content.querySelector(`.leave-tab[data-target="${target}"]`);
    if (tabBtn) tabBtn.click();
    
    return () => {
      if (!window.location.pathname.startsWith('/admin/leave')) {
        try { content.innerHTML = ''; } catch (e) {}
      }
    };
  }

  const mountApprovals = async (host = content, opts = {}) => {
    return mod.mountApprovals({
      host,
      content,
      opts,
      mountApprovalsFn: mountApprovals,
    });
  };

  const mountLeaveGrant = async (host = content, opts = {}) => {
    return mod.mountLeaveGrant({
      host,
      content,
      opts,
      listUsers,
      mountApprovalsFn: mountApprovals,
      mountLeaveBalanceFn: mountLeaveBalance,
    });
  };

  const mountLeaveBalance = async (host = content, opts = {}) => {
    return mod.mountLeaveBalance({
      host,
      content,
      opts,
      mountLeaveGrantFn: mountLeaveGrant,
      mountApprovalsFn: mountApprovals,
    });
  };
  const mountLeaveUnified = async (host = content) => {
    return mod.mountLeaveUnified({
      content: host,
      mountApprovalsFn: mountApprovals,
      mountLeaveGrantFn: mountLeaveGrant,
      mountLeaveBalanceFn: mountLeaveBalance,
    });
  };

  void p;
  await mountLeaveUnified(content);
  return () => {
    if (!window.location.pathname.startsWith('/admin/leave')) {
      try { content.innerHTML = ''; } catch (e) {}
    }
  };
}

(function () {
  const roleOf = (v) => {
    const r = String(v || '').trim().toLowerCase();
    if (r === 'admin' || r === 'manager' || r === 'employee') return r;
    if (r === '管理者' || r === 'administrator' || r === 'quanly' || r === 'quản lý') return 'admin';
    if (r === 'マネージャー' || r === 'supervisor' || r === 'lead') return 'manager';
    if (r === '従業員' || r === 'nhanvien' || r === 'nhân viên' || r === 'staff') return 'employee';
    return r;
  };
  const reveal = () => { try { document.documentElement.classList.remove('portal-preboot'); } catch (e) { /* bỏ qua lỗi */ } };
  try { document.documentElement.classList.add('portal-preboot'); } catch (e) { /* bỏ qua lỗi */ }
  const routeAdmin = () => { try { window.location.replace('/admin/dashboard'); } catch (e) { window.location.href = '/admin/dashboard'; } };
  try {
    const raw = sessionStorage.getItem('user') || localStorage.getItem('user') || '';
    const cachedRole = roleOf((raw ? JSON.parse(raw) : {})?.role || '');
    if (cachedRole === 'admin' || cachedRole === 'manager') {
      routeAdmin();
      return;
    }
  } catch (e) { /* bỏ qua lỗi */ }
  reveal();
})();

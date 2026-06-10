import { listUsers } from '../../api/users.api.js';
import {
  getTimesheet,
  getAttendanceDay,
  updateAttendanceSegment,
  buildTimesheetExportURL
} from '../../api/attendance.api.js';

const normalizePath = (p) => {
  const s = String(p || '');
  return s.length > 1 ? s.replace(/\/+$/, '') : s;
};

export async function mount() {
  const content = document.querySelector('#adminContent');
  if (!content) return;
  const p = normalizePath(window.location.pathname);
  if (p === '/admin/attendance/holidays') {
    const mod = await import('../legacy/legacy-calendar.page.js');
    await mod.mountCalendar({ content });
    return () => { try { content.innerHTML = ''; } catch (e) { /* silently ignored */ } };
  }
  if (p === '/admin/attendance/shifts' || p === '/admin/attendance/shift-assignment') {
    const mod = await import('../legacy/legacy-shifts.page.js');
    await mod.mountShifts({ content });
    return () => { try { content.innerHTML = ''; } catch (e) { /* silently ignored */ } };
  }
  if (p === '/admin/attendance/go-out') {
    const mod = await import('./admin-go-out.page.js');
    await mod.mountGoOut({ content });
    return () => { try { content.innerHTML = ''; } catch (e) { /* silently ignored */ } };
  }
  // Default: attendance records
  const mod = await import('../legacy/legacy-attendance.page.js');
  const cleanup = await mod.mountAttendance({
    content,
    listUsers,
    getTimesheet,
    getAttendanceDay,
    updateAttendanceSegment,
    buildTimesheetExportURL
  });
  return () => {
    try { if (typeof cleanup === 'function') cleanup(); } catch (e) { /* silently ignored */ }
    try { content.innerHTML = ''; } catch (e) { /* silently ignored */ }
  };
}

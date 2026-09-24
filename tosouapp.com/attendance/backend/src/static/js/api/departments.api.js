import { fetchJSONAuth } from './http.api.js';

const BASE = '/api/admin/departments';

export function listDepartments({ includeInactive = false } = {}) {
  const qs = includeInactive ? '?includeInactive=1' : '';
  return fetchJSONAuth(`${BASE}${qs}`);
}

export function createDepartment({ name, code, corporationId }) {
  return fetchJSONAuth(BASE, { method: 'POST', body: JSON.stringify({ name, code, corporationId }) });
}

export function updateDepartment(id, { name, code, corporationId }) {
  return fetchJSONAuth(`${BASE}/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ name, code, corporationId }) });
}

export function deactivateDepartment(id) {
  return fetchJSONAuth(`${BASE}/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export function listDepartmentUsers(id, { asOf } = {}) {
  const qs = asOf ? `?asOf=${encodeURIComponent(asOf)}` : '';
  return fetchJSONAuth(`${BASE}/${encodeURIComponent(id)}/users${qs}`);
}

export function listAssignments({ userId, from, to } = {}) {
  const params = new URLSearchParams();
  if (userId) params.set('userId', userId);
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const qs = params.toString();
  return fetchJSONAuth(`${BASE}/assignments${qs ? `?${qs}` : ''}`);
}

export function createAssignment({ userId, departmentId, assignmentType, startDate, endDate, reason }) {
  return fetchJSONAuth(`${BASE}/assignments`, {
    method: 'POST',
    body: JSON.stringify({ userId, departmentId, assignmentType, startDate, endDate, reason })
  });
}

export function updateAssignment(id, { departmentId, startDate, endDate, reason }) {
  return fetchJSONAuth(`${BASE}/assignments/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ departmentId, startDate, endDate, reason })
  });
}

export function deleteAssignment(id) {
  return fetchJSONAuth(`${BASE}/assignments/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export function getMonthLocks() {
  return fetchJSONAuth(`${BASE}/month-locks`);
}

export function closeMonth({ year, month }) {
  return fetchJSONAuth(`${BASE}/month-locks/close`, { method: 'POST', body: JSON.stringify({ year, month }) });
}

export function reopenMonth({ year, month, reason }) {
  return fetchJSONAuth(`${BASE}/month-locks/reopen`, { method: 'POST', body: JSON.stringify({ year, month, reason }) });
}

export function getDepartmentReport({ year, month }) {
  return fetchJSONAuth(`${BASE}/report?year=${encodeURIComponent(year)}&month=${encodeURIComponent(month)}`);
}

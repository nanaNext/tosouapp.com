import { fetchJSONAuth } from './http.api.js';

const BASE = '/api/admin/users';

export function extractUserRows(payload) {
  return Array.isArray(payload) ? payload : ((payload && payload.rows) || []);
}

export async function listUsers(options) {
  // Dùng endpoint manager để lấy toàn bộ nhân viên công ty, không giới hạn theo phòng ban
  // Endpoint này chấp nhận cả role admin lẫn manager (authorize('manager','admin'))
  try {
    const r = await fetchJSONAuth('/api/manager/users', options);
    return extractUserRows(r);
  } catch (e) {
    // Dự phòng: nếu lỗi thì gọi sang endpoint admin
    const r = await fetchJSONAuth(`${BASE}`, options);
    return extractUserRows(r);
  }
}

export async function getUser(id, options) {
  return fetchJSONAuth(`${BASE}/${encodeURIComponent(id)}`, options);
}

export async function updateUser(id, body, options) {
  return fetchJSONAuth(`${BASE}/${encodeURIComponent(id)}`, { ...(options || {}), method: 'PATCH', body: JSON.stringify(body) });
}

export async function deleteUser(id, options) {
  return fetchJSONAuth(`${BASE}/${encodeURIComponent(id)}`, { ...(options || {}), method: 'DELETE' });
}

export async function resetUserPassword(id, newPassword, options) {
  return fetchJSONAuth(`${BASE}/${encodeURIComponent(id)}/password`, { ...(options || {}), method: 'PATCH', body: JSON.stringify({ password: newPassword }) });
}

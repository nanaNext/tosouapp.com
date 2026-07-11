import { fetchJSONAuth } from './http.api.js';

const BASE = '/api/admin/users';

export async function listUsers(options) {
  // Use manager endpoint which returns all company employees without dept scoping.
  // It accepts both admin and manager roles (authorize('manager','admin')).
  try {
    const r = await fetchJSONAuth('/api/manager/users', options);
    // If response is a paged object, extract rows
    return (r && r.rows) || r;
  } catch (e) {
    // Fallback to admin endpoint for any edge case
    const r = await fetchJSONAuth(`${BASE}`, options);
    return (r && r.rows) || r;
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

import { fetchJSONAuth } from './http.api.js';

const BASE = '/api/admin/corporations';

export function listCorporations({ includeInactive = false } = {}) {
  const qs = includeInactive ? '?includeInactive=1' : '';
  return fetchJSONAuth(`${BASE}${qs}`);
}

export function createCorporation({ name, code }) {
  return fetchJSONAuth(BASE, { method: 'POST', body: JSON.stringify({ name, code }) });
}

export function updateCorporation(id, { name, code }) {
  return fetchJSONAuth(`${BASE}/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ name, code }) });
}

export function deactivateCorporation(id) {
  return fetchJSONAuth(`${BASE}/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

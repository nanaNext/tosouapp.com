import { fetchJSONAuth, fetchBlobAuth, fetchResponseAuth } from '../../api/http.api.js';

function normalizeUrl(url) {
  const u = String(url || '');
  if (!u) return '/api';
  if (u.startsWith('http://') || u.startsWith('https://')) return u;
  if (u.startsWith('/api/')) return u;
  if (u.startsWith('/')) return '/api' + u;
  return '/api/' + u;
}

export async function request(url, options) {
  return fetchResponseAuth(normalizeUrl(url), options);
}

export async function json(url, options) {
  return fetchJSONAuth(normalizeUrl(url), options);
}

export async function blob(url, options) {
  return fetchBlobAuth(normalizeUrl(url), options);
}

export async function downloadWithAuth(url, filename) {
  const res = await request(url);
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { const j = await res.json(); msg = j.message || msg; } catch (e) { /* silently ignored */ }
    throw new Error(msg);
  }

  let finalFilename = filename || 'download';
  const disposition = res.headers.get('content-disposition');
  if (disposition) {
    const utf8Regex = /filename\*=UTF-8''([^;\n]*)/i;
    const utf8Matches = utf8Regex.exec(disposition);
    if (utf8Matches != null && utf8Matches[1]) {
      finalFilename = decodeURIComponent(utf8Matches[1]);
    } else {
      const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
      const matches = filenameRegex.exec(disposition);
      if (matches != null && matches[1]) {
        finalFilename = matches[1].replace(/['"]/g, '');
      }
    }
  }

  const blob = await res.blob();
  const objUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objUrl;
  a.download = finalFilename;
  a.click();
  setTimeout(() => { try { URL.revokeObjectURL(objUrl); } catch (e) { /* silently ignored */ } }, 1000);
}

export const api = {
  get(url, options) {
    return json(url, options);
  },
  post(url, body, options) {
    const hasBody = body !== undefined;
    return json(url, { ...(options || {}), method: 'POST', body: hasBody ? JSON.stringify(body) : undefined });
  },
  patch(url, body, options) {
    const hasBody = body !== undefined;
    return json(url, { ...(options || {}), method: 'PATCH', body: hasBody ? JSON.stringify(body) : undefined });
  },
  del(url, options) {
    return json(url, { ...(options || {}), method: 'DELETE' });
  },
  upload(url, formData, options) {
    return json(url, { ...(options || {}), method: 'POST', body: formData });
  }
};

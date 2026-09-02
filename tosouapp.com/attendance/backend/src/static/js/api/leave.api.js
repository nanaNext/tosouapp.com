import { fetchJSONAuth } from './http.api.js';

const BASE = '/api/leave';

export async function myPaidBalance() {
  return await fetchJSONAuth(`${BASE}/my-balance`);
}

export async function applyPaidLeave({ startDate, endDate, reason }) {
  return await fetchJSONAuth(`${BASE}/paid`, {
    method: 'POST',
    body: JSON.stringify({ startDate, endDate, reason })
  });
}

export async function listPendingLeaves() {
  return await fetchJSONAuth(`${BASE}/pending`);
}

export async function updateLeaveStatus(id, status) {
  return await fetchJSONAuth(`${BASE}/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status })
  });
}

export async function getUserBalance(userId) {
  const qs = `userId=${encodeURIComponent(userId)}`;
  return await fetchJSONAuth(`${BASE}/user-balance?${qs}`);
}

export async function listMyRequests() {
  return await fetchJSONAuth(`${BASE}/my`);
}

// Lay danh sach ngay da dung phep co luong cua chinh nhan vien (nguon: attendance_daily).
// Tra ve { days: [{ date, kubun, days }], total } — 半休(有給)=0.5, 有給休暇=1.0.
export async function myUsedPaidLeaveDays() {
  return await fetchJSONAuth(`${BASE}/my-used-days`);
}

export async function getSummaryAll() {
  return await fetchJSONAuth(`${BASE}/summary`);
}

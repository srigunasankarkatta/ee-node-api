const API_BASE = '/api/v1';

function getToken() {
  return localStorage.getItem('admin_token');
}

export function setToken(token) {
  if (token) localStorage.setItem('admin_token', token);
  else localStorage.removeItem('admin_token');
}

export async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(json.message || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }

  return json;
}

export const auth = {
  login: (phone, password) =>
    api('/auth/login', { method: 'POST', body: { phone, password } }),
};

export const admin = {
  stats:       () => api('/admin/stats'),
  users:       (q = '') => api(`/admin/users?${q}`),
  user:        (id) => api(`/admin/users/${id}`),
  userStatus:  (id, status) => api(`/admin/users/${id}/status`, { method: 'PATCH', body: { status } }),
  withdrawals: (q = '') => api(`/admin/withdrawals?${q}`),
  approveWd:   (id) => api(`/admin/withdrawals/${id}/approve`, { method: 'PATCH' }),
  rejectWd:    (id, reason) => api(`/admin/withdrawals/${id}/reject`, { method: 'PATCH', body: { reason } }),
  kyc:         (q = '') => api(`/admin/kyc?${q}`),
  approveKyc:  (id) => api(`/admin/kyc/${id}/approve`, { method: 'PATCH' }),
  rejectKyc:   (id, reason) => api(`/admin/kyc/${id}/reject`, { method: 'PATCH', body: { reason } }),
  tradingCodes:    (q = '') => api(`/admin/codes/trading?${q}`),
  tradingCodesDay: (planId, dayNumber) => api(`/admin/codes/trading/day?plan_id=${planId}&day_number=${dayNumber}`),
  codeSubmissions: (q = '') => api(`/admin/codes/submissions?${q}`),
};

export function fmtMoney(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

export function qs(params) {
  return new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== '' && v != null)
  ).toString();
}

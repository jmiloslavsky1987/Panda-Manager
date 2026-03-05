// client/src/api.js — all /api/* fetch wrappers
// BASE is '/api' — Vite proxy routes to Express on port 3001 (INFRA-07)
const BASE = '/api';

async function apiFetch(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const getCustomers = () => apiFetch('/customers');
export const getCustomer = (id) => apiFetch(`/customers/${id}`);
export const updateCustomer = (id, body) =>
  apiFetch(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(body) });

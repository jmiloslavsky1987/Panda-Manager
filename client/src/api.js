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
export const createCustomer = (body) =>
  apiFetch('/customers', { method: 'POST', body: JSON.stringify(body) });
export const getCustomer = (id) => apiFetch(`/customers/${id}`);
export const updateCustomer = (id, body) =>
  apiFetch(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(body) });

export const patchRisk = (customerId, riskId, patch) =>
  apiFetch(`/customers/${customerId}/risks/${riskId}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });

export const patchMilestone = (customerId, milestoneId, patch) =>
  apiFetch(`/customers/${customerId}/milestones/${milestoneId}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });

export const postAction = (customerId, body) =>
  apiFetch(`/customers/${customerId}/actions`, {
    method: 'POST',
    body: JSON.stringify(body),
  });

export const patchAction = (customerId, actionId, patch) =>
  apiFetch(`/customers/${customerId}/actions/${actionId}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });

export const patchWorkstreams = (customerId, workstreams) =>
  apiFetch(`/customers/${customerId}/workstreams`, {
    method: 'PATCH',
    body: JSON.stringify(workstreams),
  });

export const postArtifact = (customerId, body) =>
  apiFetch(`/customers/${customerId}/artifacts`, {
    method: 'POST',
    body: JSON.stringify(body),
  });

export const patchArtifact = (customerId, artifactId, patch) =>
  apiFetch(`/customers/${customerId}/artifacts/${artifactId}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });

export const postHistory = (customerId, entry) =>
  apiFetch(`/customers/${customerId}/history`, {
    method: 'POST',
    body: JSON.stringify(entry),
  });

export const generateReportPptx = (customerId, type) =>
  apiFetch(`/customers/${customerId}/reports/pptx`, {
    method: 'POST',
    body: JSON.stringify({ type }),
  });


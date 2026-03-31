import { getAuthContext } from "@/components/AuthProvider";

/**
 * fetchWithAuth — drop-in replacement for fetch() in client components.
 * Intercepts 401 responses and triggers the SessionExpiredModal overlay
 * so users can re-authenticate without losing their current page context.
 */
export async function fetchWithAuth(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const res = await fetch(input, init);
  if (res.status === 401) {
    getAuthContext()?.triggerSessionExpired();
  }
  return res;
}

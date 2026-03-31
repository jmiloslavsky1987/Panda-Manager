/**
 * lib/auth-utils.ts — Okta-ready role abstraction
 *
 * Importable anywhere (no bcrypt, no Node.js-only APIs).
 * Normalizes role from better-auth credential session OR future Okta OIDC session.
 *
 * Do NOT use session.user.role directly in application code —
 * always go through resolveRole() to remain Okta-ready.
 */

type CredentialSession = { user: { role?: string } };
type OIDCSession = { claims?: { groups?: string[]; roles?: string[] } };

/**
 * resolveRole — normalizes role from better-auth credential session
 * OR future Okta OIDC session. Do not use session.user.role directly
 * in application code — always go through resolveRole().
 */
export function resolveRole(session: CredentialSession | OIDCSession): "admin" | "user" {
  // Credential path (better-auth email/password)
  if ("user" in session && session.user?.role) {
    return session.user.role === "admin" ? "admin" : "user";
  }
  // Future OIDC path (Okta) — checks groups or roles claims
  if ("claims" in session) {
    const groups = session.claims?.groups ?? [];
    const roles = session.claims?.roles ?? [];
    if (groups.includes("Admins") || roles.includes("admin")) return "admin";
  }
  return "user";
}

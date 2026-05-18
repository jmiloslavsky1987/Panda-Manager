/**
 * app/api/auth/providers/route.ts — Phase 86
 *
 * Returns which auth providers are configured. No authentication required —
 * this endpoint is called pre-login to decide which buttons to render.
 *
 * Today (env blank): { "okta": false }
 * Post-AWS migration (env populated): { "okta": true }
 *
 * Primary code path drives the login UI through a server-side prop drilled
 * into LoginForm (see app/login/page.tsx). This endpoint exists as an
 * alternative path for clients that need provider detection at runtime
 * (e.g., progressive enhancement, future external integrations).
 *
 * dynamic = 'force-dynamic' guarantees process.env is read at request time
 * rather than baked into the build (so toggling Okta env vars takes effect
 * without rebuilding the app).
 */

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    okta: Boolean(process.env.OKTA_CLIENT_ID),
  });
}

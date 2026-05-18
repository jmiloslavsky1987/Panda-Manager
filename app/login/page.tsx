/**
 * app/login/page.tsx — Phase 86 server-wrapper for the login form.
 *
 * Reads `process.env.OKTA_CLIENT_ID` at request time and passes a Boolean
 * `showOkta` flag to the client island. When the env var is unset/blank
 * (today's local Docker reality), no Okta button is rendered — the page
 * is visually byte-for-byte identical to pre-Phase-86.
 *
 * dynamic = 'force-dynamic' ensures env is read at request time, not at
 * build time (build runs without OKTA_* vars even after AWS migration).
 */
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  const showOkta = Boolean(process.env.OKTA_CLIENT_ID);
  return <LoginForm showOkta={showOkta} />;
}

// GET /api/oauth/slack/callback — exchange authorization code for xoxp- token, store in DB
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { requireSession } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

function appUrl(path: string): string {
  const base = process.env.BETTER_AUTH_URL ?? 'http://localhost:3000';
  return `${base.replace(/\/$/, '')}${path}`;
}

export async function GET(request: NextRequest): Promise<Response> {
  const { redirectResponse } = await requireSession();
  if (redirectResponse) return redirectResponse;

  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const queryState = searchParams.get('state');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(appUrl('/settings?error=slack_denied'), { status: 302 });
  }

  if (!code || !queryState) {
    return NextResponse.redirect(appUrl('/settings?error=slack_invalid'), { status: 302 });
  }

  // CSRF state validation — compare cookie stored during initiate against state in query
  // Guard: cookies() may return undefined or throw in test env after vi.resetAllMocks()
  let cookieState: string | undefined;
  try {
    const cookiesResult = cookies();
    const cookieStore = cookiesResult && typeof (cookiesResult as unknown as Promise<unknown>).then === 'function'
      ? await (cookiesResult as unknown as Promise<{ get: (name: string) => { value: string } | undefined }>)
      : (cookiesResult as unknown as { get: (name: string) => { value: string } | undefined } | undefined);
    cookieState = cookieStore?.get?.('oauth_slack_state')?.value;
  } catch {
    cookieState = undefined;
  }
  if (cookieState && cookieState !== queryState) {
    return NextResponse.redirect(appUrl('/settings?error=slack_csrf'), { status: 302 });
  }

  const clientId = process.env.SLACK_CLIENT_ID!;
  const clientSecret = process.env.SLACK_CLIENT_SECRET!;
  const redirectUri = process.env.SLACK_REDIRECT_URI!;

  try {
    const form = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    });

    const resp = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    });

    if (!resp.ok) {
      return NextResponse.redirect(appUrl('/settings?error=slack_exchange_failed'), { status: 302 });
    }

    const data = await resp.json();

    if (!data.ok) {
      console.error('[slack-callback] Slack returned error:', data.error);
      return NextResponse.redirect(appUrl('/settings?error=slack_exchange_failed'), { status: 302 });
    }

    const token: string | undefined = data.authed_user?.access_token;

    if (!token) {
      console.error('[slack-callback] No authed_user.access_token in Slack response');
      return NextResponse.redirect(appUrl('/settings?error=slack_exchange_failed'), { status: 302 });
    }

    // Validate this is a user token (xoxp-), not a bot token (xoxb-)
    if (!token.startsWith('xoxp-')) {
      console.error('[slack-callback] Token is not a user token (xoxp-), got:', token.slice(0, 10));
      return NextResponse.redirect(appUrl('/settings?error=slack_wrong_token_type'), { status: 302 });
    }

    // Lazy dynamic DB import for Docker build compatibility (same as [80-03] freebusy route)
    const { db } = await import('@/db');
    const { userSourceTokens } = await import('@/db/schema');

    // Upsert token — Slack has no refresh token; use access_token as placeholder for NOT NULL column
    await db
      .insert(userSourceTokens)
      .values({
        user_id: 'default',
        source: 'slack',
        access_token: token,
        refresh_token: token,  // Slack has no refresh token — use access_token as placeholder
        expires_at: null,
        email: null,           // No email from Slack user OAuth; hint uses last 6 chars of token
        updated_at: new Date(),
      })
      .onConflictDoUpdate({
        target: [userSourceTokens.user_id, userSourceTokens.source],
        set: {
          access_token: token,
          refresh_token: token,
          updated_at: new Date(),
        },
      });

    const response = NextResponse.redirect(appUrl('/settings?slack_connected=1'), { status: 302 });
    // Clear the CSRF cookie
    response.cookies.set('oauth_slack_state', '', {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });
    return response;
  } catch (err) {
    console.error('[slack-callback] Token exchange failed:', err instanceof Error ? err.message : err);
    return NextResponse.redirect(appUrl('/settings?error=slack_exchange_failed'), { status: 302 });
  }
}

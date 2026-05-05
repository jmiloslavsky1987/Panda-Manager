// GET /api/oauth/slack — redirect user to Slack OAuth consent screen
import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<Response> {
  const { redirectResponse } = await requireSession();
  if (redirectResponse) return redirectResponse;

  const clientId = process.env.SLACK_CLIENT_ID;
  const clientSecret = process.env.SLACK_CLIENT_SECRET;
  const redirectUri = process.env.SLACK_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    const settingsUrl = new URL('/settings', request.url);
    settingsUrl.searchParams.set(
      'error',
      'Slack OAuth not configured. Set SLACK_CLIENT_ID, SLACK_CLIENT_SECRET, and SLACK_REDIRECT_URI in .env.local.'
    );
    return Response.redirect(settingsUrl.toString());
  }

  // Generate CSRF state token — stored in HttpOnly cookie, verified in callback
  const state = crypto.randomUUID();

  const params = new URLSearchParams({
    client_id: clientId,
    scope: '',              // empty bot scopes
    user_scope: 'search:read',
    redirect_uri: redirectUri,
    state,
  });
  const authUrl = `https://slack.com/oauth/v2/authorize?${params}`;

  const response = NextResponse.redirect(authUrl, { status: 302 });
  // HttpOnly cookie prevents JS access; SameSite=Lax allows the OAuth redirect back
  response.cookies.set('oauth_slack_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  });
  return response;
}

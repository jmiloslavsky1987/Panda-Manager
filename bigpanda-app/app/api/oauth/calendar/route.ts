// GET /api/oauth/calendar — redirect user to Google Calendar OAuth consent screen
import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { requireSession } from "@/lib/auth-server";

export async function GET(request: NextRequest): Promise<Response> {
  const { session, redirectResponse } = await requireSession();
  if (redirectResponse) return redirectResponse;

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_CALENDAR_REDIRECT_URI;
  // CRITICAL: Use GOOGLE_CALENDAR_REDIRECT_URI exclusively — NO fallback to GOOGLE_REDIRECT_URI.
  // GOOGLE_REDIRECT_URI is the Gmail callback URI; using it here would route calendar auth
  // back to the Gmail callback handler (correctness bug).

  if (!clientId || !clientSecret) {
    const timeUrl = new URL('/time', request.url);
    timeUrl.searchParams.set('calendar_error', 'Calendar OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.local.');
    return NextResponse.redirect(timeUrl.toString());
  }

  if (!redirectUri) {
    const timeUrl = new URL('/time', request.url);
    timeUrl.searchParams.set('calendar_error', 'GOOGLE_CALENDAR_REDIRECT_URI_not_set');
    return NextResponse.redirect(timeUrl.toString());
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

  // Generate CSRF state token — stored in HttpOnly cookie, verified in callback
  const state = crypto.randomUUID();

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/calendar.events.readonly'],
    prompt: 'consent', // REQUIRED: ensures refresh_token is always returned
    state,
  });

  const response = NextResponse.redirect(authUrl, { status: 302 });
  // HttpOnly cookie prevents JS access; SameSite=Lax allows the OAuth redirect back
  // Use separate cookie name 'oauth_calendar_state' to avoid collision with Gmail's 'oauth_state'
  response.cookies.set('oauth_calendar_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  });
  return response;
}

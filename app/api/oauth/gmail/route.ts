// GET /api/oauth/gmail — redirect user to Google OAuth consent screen
import { NextRequest } from 'next/server';
import { google } from 'googleapis';

export async function GET(request: NextRequest): Promise<Response> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    const settingsUrl = new URL('/settings', request.url);
    settingsUrl.searchParams.set('gmail_error', 'Gmail OAuth not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI in .env.local.');
    return Response.redirect(settingsUrl.toString());
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

  // Generate CSRF state token — stored in HttpOnly cookie, verified in callback
  const state = crypto.randomUUID();

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/gmail.readonly'],
    prompt: 'consent',  // REQUIRED: ensures refresh_token is always returned
    state,
  });

  const response = Response.redirect(authUrl);
  // HttpOnly cookie prevents JS access; SameSite=Lax allows the OAuth redirect back
  response.headers.set(
    'Set-Cookie',
    `oauth_state=${state}; HttpOnly; SameSite=Lax; Path=/; Max-Age=600`
  );
  return response;
}

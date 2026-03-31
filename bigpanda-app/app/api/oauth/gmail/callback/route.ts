// GET /api/oauth/gmail/callback — exchange authorization code for tokens, store in DB
import { NextRequest } from 'next/server';
import { google } from 'googleapis';
import { db } from '@/db';
import { userSourceTokens } from '@/db/schema';
import { requireSession } from "@/lib/auth-server";

export async function GET(request: NextRequest): Promise<Response> {
  const { session, redirectResponse } = await requireSession();
  if (redirectResponse) return redirectResponse;

  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const queryState = searchParams.get('state');
  const error = searchParams.get('error');

  // User denied access
  if (error) {
    return Response.redirect(new URL('/settings?error=gmail_denied', request.url));
  }

  if (!code || !queryState) {
    return Response.redirect(new URL('/settings?error=gmail_invalid', request.url));
  }

  // CSRF state validation
  const cookieState = request.cookies.get('oauth_state')?.value;
  if (!cookieState || cookieState !== queryState) {
    return Response.redirect(new URL('/settings?error=gmail_csrf', request.url));
  }

  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI!;

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

  try {
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.refresh_token) {
      // This should not happen with prompt: 'consent' — but guard against it
      console.error('[gmail-callback] No refresh_token returned — prompt: consent may be missing in initiate route');
      return Response.redirect(new URL('/settings?error=gmail_no_refresh', request.url));
    }

    // Decode id_token to get user email (Google includes it in the token response)
    let email: string | null = null;
    if (tokens.id_token) {
      try {
        const ticket = await oauth2Client.verifyIdToken({ idToken: tokens.id_token, audience: clientId });
        email = ticket.getPayload()?.email ?? null;
      } catch {
        // email is a nice-to-have; continue without it
      }
    }

    // Upsert — single-user app uses user_id='default'
    await db
      .insert(userSourceTokens)
      .values({
        user_id: 'default',
        source: 'gmail',
        access_token: tokens.access_token ?? null,
        refresh_token: tokens.refresh_token,
        expires_at: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        email,
        updated_at: new Date(),
      })
      .onConflictDoUpdate({
        target: [userSourceTokens.user_id, userSourceTokens.source],
        set: {
          access_token: tokens.access_token ?? null,
          refresh_token: tokens.refresh_token,
          expires_at: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
          email,
          updated_at: new Date(),
        },
      });

    // Clear CSRF cookie and redirect to Settings with success flag
    const successUrl = new URL('/settings?success=gmail', request.url);
    const response = Response.redirect(successUrl);
    response.headers.set('Set-Cookie', 'oauth_state=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0');
    return response;
  } catch (err) {
    console.error('[gmail-callback] Token exchange failed:', err instanceof Error ? err.message : err);
    return Response.redirect(new URL('/settings?error=gmail_exchange', request.url));
  }
}

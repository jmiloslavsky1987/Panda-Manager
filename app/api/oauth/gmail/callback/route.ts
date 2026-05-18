// GET /api/oauth/gmail/callback — exchange authorization code for tokens, store in DB
import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { db } from '@/db';
import { userSourceTokens } from '@/db/schema';
import { requireSession } from "@/lib/auth-server";

function appUrl(path: string): string {
  const base = process.env.BETTER_AUTH_URL ?? 'http://localhost:3000';
  return `${base.replace(/\/$/, '')}${path}`;
}

export async function GET(request: NextRequest): Promise<Response> {
  const { session, redirectResponse } = await requireSession();
  if (redirectResponse) return redirectResponse;

  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const queryState = searchParams.get('state');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(appUrl('/settings?error=gmail_denied'));
  }

  if (!code || !queryState) {
    return NextResponse.redirect(appUrl('/settings?error=gmail_invalid'));
  }

  // CSRF state validation
  const cookieState = request.cookies.get('oauth_state')?.value;
  if (!cookieState || cookieState !== queryState) {
    return NextResponse.redirect(appUrl('/settings?error=gmail_csrf'));
  }

  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI!;

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

  try {
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.refresh_token) {
      console.error('[gmail-callback] No refresh_token returned — prompt: consent may be missing in initiate route');
      return NextResponse.redirect(appUrl('/settings?error=gmail_no_refresh'));
    }

    let email: string | null = null;
    if (tokens.id_token) {
      try {
        const ticket = await oauth2Client.verifyIdToken({ idToken: tokens.id_token, audience: clientId });
        email = ticket.getPayload()?.email ?? null;
      } catch {
        // email is a nice-to-have; continue without it
      }
    }

    // Phase 86: per-user scoping — tokens are owned by the connecting user, not 'default'.
    // Existing 'default' rows remain valid via the fallback read pattern in status/scan routes.
    await db
      .insert(userSourceTokens)
      .values({
        user_id: session!.user.id,
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

    const response = NextResponse.redirect(appUrl('/settings?success=gmail'), { status: 302 });
    response.cookies.set('oauth_state', '', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 0 });
    return response;
  } catch (err) {
    console.error('[gmail-callback] Token exchange failed:', err instanceof Error ? err.message : err);
    return NextResponse.redirect(appUrl('/settings?error=gmail_exchange'));
  }
}

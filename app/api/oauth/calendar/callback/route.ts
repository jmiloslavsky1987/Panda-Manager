// GET /api/oauth/calendar/callback — exchange authorization code for tokens, store in DB
import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { and, eq } from 'drizzle-orm';
import db from '@/db';
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
    return NextResponse.redirect(new URL('/time?calendar_error=calendar_denied', request.url), { status: 302 });
  }

  if (!code || !queryState) {
    return NextResponse.redirect(new URL('/time?calendar_error=calendar_invalid', request.url), { status: 302 });
  }

  // CSRF state validation — use 'oauth_calendar_state' cookie (NOT 'oauth_state' which is Gmail's cookie)
  const cookieState = request.cookies.get('oauth_calendar_state')?.value;
  if (!cookieState || cookieState !== queryState) {
    return NextResponse.redirect(new URL('/time?calendar_error=calendar_csrf', request.url), { status: 302 });
  }

  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
  // CRITICAL: Use GOOGLE_CALENDAR_REDIRECT_URI exclusively — NO fallback to GOOGLE_REDIRECT_URI
  const redirectUri = process.env.GOOGLE_CALENDAR_REDIRECT_URI!;

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

  try {
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.refresh_token) {
      // Should not happen with prompt: 'consent' — but guard defensively
      console.error('[calendar-callback] No refresh_token returned — prompt: consent may be missing in initiate route');
      return NextResponse.redirect(new URL('/time?calendar_error=calendar_no_refresh', request.url), { status: 302 });
    }

    // Upsert — single-user app uses user_id='default'; source='calendar' distinguishes from 'gmail'
    await db
      .insert(userSourceTokens)
      .values({
        user_id: 'default',
        source: 'calendar',
        access_token: tokens.access_token ?? null,
        refresh_token: tokens.refresh_token,
        expires_at: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        updated_at: new Date(),
      })
      .onConflictDoUpdate({
        target: [userSourceTokens.user_id, userSourceTokens.source],
        set: {
          access_token: tokens.access_token ?? null,
          refresh_token: tokens.refresh_token,
          expires_at: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
          updated_at: new Date(),
        },
      });

    // Clear CSRF cookie and redirect to Settings with success flag
    // REQUIRED pattern: NextResponse.redirect with { status: 302 }, then set cookie via response.cookies
    const successUrl = new URL('/settings?calendar_connected=true', request.url);
    const response = NextResponse.redirect(successUrl, { status: 302 });
    response.cookies.set('oauth_calendar_state', '', { maxAge: 0, path: '/' });
    return response;
  } catch (err) {
    console.error('[calendar-callback] Token exchange failed:', err instanceof Error ? err.message : err);
    return NextResponse.redirect(new URL('/time?calendar_error=calendar_exchange', request.url), { status: 302 });
  }
}

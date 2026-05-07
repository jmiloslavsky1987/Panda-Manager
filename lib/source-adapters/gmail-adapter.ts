import { google } from 'googleapis';
import type { SourceAdapter, UserSourceToken } from './index';

// Per-message body character limit — keeps token usage bounded across 20 messages
const MAX_BODY_CHARS = 8000;

function decodeBase64Url(data: string): string {
  return Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8');
}

function extractBody(payload: { mimeType?: string | null; body?: { data?: string | null } | null; parts?: unknown[] | null } | null | undefined): string {
  if (!payload) return '';

  // Prefer text/plain, fall back to text/html stripped of tags
  if (payload.mimeType === 'text/plain' && payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }

  if (payload.mimeType === 'text/html' && payload.body?.data) {
    return decodeBase64Url(payload.body.data).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  // Recurse into multipart
  if (payload.parts && Array.isArray(payload.parts)) {
    for (const part of payload.parts as typeof payload[]) {
      const text = extractBody(part);
      if (text) return text;
    }
  }

  return '';
}

export class GmailAdapter implements SourceAdapter {
  constructor(private readonly token: UserSourceToken) {}

  async fetchContent(query: string, since: string): Promise<string> {
    const clientId = process.env.GOOGLE_CLIENT_ID!;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI!;

    const auth = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    auth.setCredentials({ refresh_token: this.token.refresh_token });

    try {
      const gmail = google.gmail({ version: 'v1', auth });

      const sinceDate = new Date(since);
      const gmailSince = `${sinceDate.getFullYear()}/${String(sinceDate.getMonth() + 1).padStart(2, '0')}/${String(sinceDate.getDate()).padStart(2, '0')}`;
      const gmailQuery = `"${query}" after:${gmailSince}`;

      const listResp = await gmail.users.messages.list({
        userId: 'me',
        q: gmailQuery,
        maxResults: 20,
      });

      const messages = listResp.data.messages ?? [];
      if (messages.length === 0) return '';

      const parts: string[] = [];

      for (const msg of messages) {
        if (!msg.id) continue;
        try {
          const detail = await gmail.users.messages.get({
            userId: 'me',
            id: msg.id,
            format: 'full',
          });

          const headers = detail.data.payload?.headers ?? [];
          const subject = headers.find(h => h.name === 'Subject')?.value ?? '(no subject)';
          const from = headers.find(h => h.name === 'From')?.value ?? '(unknown)';
          const date = headers.find(h => h.name === 'Date')?.value ?? '';

          const body = extractBody(detail.data.payload).slice(0, MAX_BODY_CHARS);
          const text = body || (detail.data.snippet ?? '');

          parts.push(`[Gmail] From: ${from} | Date: ${date} | Subject: ${subject}\n${text}`);
        } catch {
          // Skip individual message errors — non-fatal
        }
      }

      return parts.join('\n\n');
    } catch (err) {
      console.error('[GmailAdapter] fetch failed:', err instanceof Error ? err.message : err);
      return '';
    }
  }
}

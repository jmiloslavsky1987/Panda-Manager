import { google } from 'googleapis';
import type { SourceAdapter, UserSourceToken } from './index';

export class GmailAdapter implements SourceAdapter {
  constructor(private readonly token: UserSourceToken) {}

  async fetchContent(query: string, since: string): Promise<string> {
    const clientId = process.env.GOOGLE_CLIENT_ID!;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI!;

    const auth = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    // googleapis auto-refreshes access_token when expired using refresh_token
    auth.setCredentials({ refresh_token: this.token.refresh_token });

    try {
      const gmail = google.gmail({ version: 'v1', auth });

      // Gmail search query: project name + date filter
      // Gmail date format: YYYY/MM/DD
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
            format: 'metadata',
            metadataHeaders: ['Subject', 'From', 'Date'],
          });

          const headers = detail.data.payload?.headers ?? [];
          const subject = headers.find(h => h.name === 'Subject')?.value ?? '(no subject)';
          const from = headers.find(h => h.name === 'From')?.value ?? '(unknown)';
          const snippet = detail.data.snippet ?? '';

          parts.push(`[Gmail] From: ${from} | Subject: ${subject}\n${snippet}`);
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

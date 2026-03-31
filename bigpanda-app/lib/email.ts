/**
 * lib/email.ts — Nodemailer transport + invite email utility.
 *
 * Configured via environment variables:
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
 *
 * Usage:
 *   await sendInviteEmail(to, inviteUrl, invitedByName)
 */
import nodemailer from "nodemailer";

function createTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export async function sendInviteEmail(
  to: string,
  inviteUrl: string,
  invitedByName: string
) {
  const transport = createTransport();
  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER;

  const text = `
Hi,

${invitedByName} has invited you to join the Project Assistant.

Click the link below to set your password and activate your account:
${inviteUrl}

This link expires in 48 hours.

If you did not expect this invitation, you can safely ignore this email.
`.trim();

  const html = `
<p>Hi,</p>
<p><strong>${invitedByName}</strong> has invited you to join the Project Assistant.</p>
<p>Click the button below to set your password and activate your account:</p>
<p>
  <a href="${inviteUrl}"
     style="display:inline-block;padding:10px 20px;background:#0070f3;color:#fff;text-decoration:none;border-radius:5px;">
    Accept Invite
  </a>
</p>
<p>Or copy this link:<br><a href="${inviteUrl}">${inviteUrl}</a></p>
<p><small>This link expires in 48 hours. If you did not expect this invitation, ignore this email.</small></p>
`.trim();

  await transport.sendMail({
    from,
    to,
    subject: "You've been invited to Project Assistant",
    text,
    html,
  });
}

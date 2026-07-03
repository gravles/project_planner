/**
 * Thin Resend wrapper for cron notifications. Emails always go to the
 * single owner (DIGEST_TO_EMAIL). If email env vars aren't configured the
 * send is skipped, not failed — the cron's other work still completes.
 */

const RESEND_API = 'https://api.resend.com/emails'

export function emailConfigured() {
  return !!(process.env.RESEND_API_KEY && process.env.DIGEST_TO_EMAIL)
}

export async function sendEmail({ subject, html }) {
  if (!emailConfigured()) {
    return { skipped: true, reason: 'RESEND_API_KEY / DIGEST_TO_EMAIL not set' }
  }
  const res = await fetch(RESEND_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || 'Home Projects <onboarding@resend.dev>',
      to: [process.env.DIGEST_TO_EMAIL],
      subject,
      html,
    }),
  })
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`)
  return { sent: true }
}

// Dark-themed shell matching the app aesthetic
export function emailShell(title, bodyHtml) {
  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0d1117;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 20px;">
    <h1 style="color:#f9fafb;font-size:18px;margin:0 0 4px;">Home <span style="color:#f59e0b;">Projects</span></h1>
    <p style="color:#4b5563;font-size:12px;margin:0 0 24px;">${title}</p>
    <div style="background:#111827;border:1px solid #1f2937;border-radius:14px;padding:24px;color:#9ca3af;font-size:14px;line-height:1.6;">
      ${bodyHtml}
    </div>
    <p style="color:#4b5563;font-size:11px;margin:20px 0 0;">Sent by the Home Projects daily cron.</p>
  </div>
</body>
</html>`
}

export function sectionHtml(heading, items) {
  if (!items.length) return ''
  return `<h2 style="color:#f9fafb;font-size:13px;text-transform:uppercase;letter-spacing:0.08em;margin:18px 0 8px;">${heading}</h2>
<ul style="margin:0;padding-left:18px;">
  ${items.map(i => `<li style="margin-bottom:6px;">${i}</li>`).join('\n  ')}
</ul>`
}

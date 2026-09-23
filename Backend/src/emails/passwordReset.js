import { layout } from './layout.js'

export function passwordResetEmail({ resetUrl }) {
  const bodyHtml = `
    <p style="font-size: 14px; line-height: 1.6;">
      Someone asked to reset the password on this account. If that was you, choose a new
      one below - this link works once and expires in an hour.
    </p>
    <p style="margin: 24px 0;">
      <a href="${resetUrl}" style="background:#1a1a1a; color:#ffffff; padding: 12px 24px; border-radius: 999px; text-decoration:none; font-size: 14px; display:inline-block;">
        Reset password
      </a>
    </p>
    <p style="font-size: 13px; color:#6b6b6b;">
      If you didn't request this, nothing has changed and you can ignore this email.
    </p>
  `

  return {
    subject: 'Reset your password',
    html: layout({ title: 'Reset your password', bodyHtml, preheader: 'Choose a new password' }),
    text: `Reset your password: ${resetUrl} (expires in 1 hour)`,
  }
}

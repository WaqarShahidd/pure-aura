import nodemailer from 'nodemailer'
import { env, isProduction, isTest } from '../config/env.js'
import { logger } from './logger.js'

// One transporter for the process, built lazily so importing this module never itself
// makes a network call - only actually sending an email does.
let transporterPromise = null

function getTransporter() {
  transporterPromise ??= (async () => {
    if (env.SMTP_URL) {
      return nodemailer.createTransport(env.SMTP_URL)
    }

    if (isProduction) {
      // Caught by the caller and logged, never thrown into a request handler - a
      // misconfigured mail server should degrade the feature, not the checkout it is
      // attached to.
      throw new Error('SMTP_URL is required in production to send email')
    }

    // No SMTP_URL configured locally: a real, disposable Ethereal inbox rather than a
    // silent no-op, so the whole send path - including what the email actually says -
    // can be exercised and read during development without a real mail provider.
    const testAccount = await nodemailer.createTestAccount()
    logger.info({ user: testAccount.user }, 'no SMTP_URL set - sending through a disposable Ethereal test inbox')
    return nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: { user: testAccount.user, pass: testAccount.pass },
    })
  })()

  return transporterPromise
}

// Never awaited by a request handler for its result - a slow or down mail server must
// not slow down or fail a checkout, a status change, or a password reset request. Errors
// are logged, not thrown, for the same reason.
export async function sendMail({ to, subject, html, text }) {
  // The order/auth flows that call this run heavily in the vitest suite. Reaching out to
  // a real Ethereal inbox on every one of those would make the suite network-dependent
  // and slow for no benefit - nothing there ever reads the email.
  if (isTest) {
    logger.debug({ to, subject }, 'email skipped (test environment)')
    return null
  }

  try {
    const transporter = await getTransporter()
    const info = await transporter.sendMail({ from: env.MAIL_FROM, to, subject, html, text })

    const preview = nodemailer.getTestMessageUrl(info)
    if (preview) logger.info({ to, subject, preview }, 'email sent (dev preview url)')
    else logger.info({ to, subject, messageId: info.messageId }, 'email sent')

    return info
  } catch (error) {
    logger.error({ err: error, to, subject }, 'failed to send email')
    return null
  }
}


import nodemailer from 'nodemailer';
import environment from './env.js';
import logger from './logger.js';

const { host, port, user, pass, from } = environment.smtp;

export function isMailerConfigured() {
  return Boolean(host && user && pass);
}

const transporter = isMailerConfigured()
  ? nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    })
  : null;

if (!isMailerConfigured()) {
  logger.warn(
    'SMTP is not configured (SMTP_HOST/SMTP_USER/SMTP_PASS) — transactional emails ' +
      '(password reset) will be logged instead of sent. Set them to actually deliver email.',
  );
}

/**
 * Sends an email, or logs it when SMTP isn't configured — callers (e.g.
 * authService.requestPasswordReset) don't need to branch on whether mail is
 * actually wired up; local/dev testing still works, just via the log line
 * instead of an inbox.
 */
export async function sendMail({ to, subject, html, text }) {
  if (!transporter) {
    logger.warn('Email not sent (SMTP unconfigured) — logging instead', {
      action: 'mailer.unconfigured_send',
      to,
      subject,
      text: text || html,
    });
    return { delivered: false };
  }

  await transporter.sendMail({ from, to, subject, html, text });
  return { delivered: true };
}

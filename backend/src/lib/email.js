import nodemailer from 'nodemailer';

let transporter;

function getTransporter() {
  if (transporter) return transporter;

  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else {
    transporter = {
      sendMail: async (opts) => {
        console.log('[AutoHistory Email]', opts.to, opts.subject);
        console.log(opts.text);
        return { messageId: 'console-' + Date.now() };
      },
    };
  }
  return transporter;
}

export async function sendEmail(to, subject, text) {
  if (!to) return;
  const from = process.env.SMTP_FROM || 'AutoHistory <noreply@autohistory.local>';
  await getTransporter().sendMail({ from, to, subject, text });
}

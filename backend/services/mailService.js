const nodemailer = require('nodemailer');

const isMailConfigured = () => Boolean(
  process.env.SMTP_HOST
  && process.env.SMTP_USER
  && process.env.SMTP_PASSWORD
  && process.env.MAIL_FROM
  && [465, 587].includes(Number(process.env.SMTP_PORT))
);

const sendPasswordResetEmail = async (email, resetUrl) => {
  if (!isMailConfigured()) throw new Error('SMTP chưa được cấu hình.');
  const port = Number(process.env.SMTP_PORT);
  const secure = port === 465;
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure,
    requireTLS: !secure,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    disableFileAccess: true,
    disableUrlAccess: true,
  });

  await transporter.sendMail({
    from: process.env.MAIL_FROM,
    to: email,
    subject: 'Đặt lại mật khẩu SLNA Ticketing',
    text: `Bạn đã yêu cầu đặt lại mật khẩu. Mở liên kết sau trong 15 phút:\n${resetUrl}\n\nNếu không phải bạn yêu cầu, hãy bỏ qua email này.`,
  });
};

module.exports = { isMailConfigured, sendPasswordResetEmail };

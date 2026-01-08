const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  try {
    // Create reusable transporter object using Gmail
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    // Send mail with defined transport object
    const message = {
      from: `"${process.env.FROM_NAME}" <${process.env.FROM_EMAIL}>`,
      to: options.email,
      subject: options.subject,
      text: options.message,
      html: options.html
    };

    console.log('Sending email to:', options.email);
    const info = await transporter.sendMail(message);
    console.log('Message sent: %s', info.messageId);
    return info;
  } catch (error) {
    console.error('Email sending error:', error);
    throw error;
  }
};

module.exports = sendEmail;

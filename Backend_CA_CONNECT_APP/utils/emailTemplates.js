const resetPasswordEmail = (name, verificationCode) => ({
  subject: 'Password Reset Verification Code',
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2d3748;">Hello ${name},</h2>
      <p>You are receiving this email because you (or someone else) has requested to reset the password for your account.</p>
      <p>Your verification code is:</p>
      <div style="background-color: #f7fafc; border: 1px solid #e2e8f0; border-radius: 6px; display: inline-block; margin: 20px 0; padding: 15px 30px;">
        <h1 style="color: #2d3748; font-size: 28px; letter-spacing: 4px; margin: 0; text-align: center;">${verificationCode}</h1>
      </div>
      <p>This code will expire in 10 minutes.</p>
      <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
      <p style="color: #718096; font-size: 0.9em;">
        For security reasons, do not share this code with anyone.
      </p>
    </div>
  `,
  text: `
    Hello ${name},
    \n\nYou are receiving this email because you (or someone else) has requested to reset the password for your account.
    \nYour verification code is:
    ${verificationCode}
    \nThis code will expire in 10 minutes.
    \nIf you did not request this, please ignore this email and your password will remain unchanged.
  `
});

const passwordResetConfirmationEmail = (name) => ({
  subject: 'Password Reset Successful',
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2d3748;">Hello ${name},</h2>
      <p>Your password has been successfully reset.</p>
      <p>If you did not make this change, please contact our support team immediately.</p>
    </div>
  `,
  text: `
    Hello ${name},
    \n\nYour password has been successfully reset.
    \nIf you did not make this change, please contact our support team immediately.
  `
});

module.exports = {
  resetPasswordEmail,
  passwordResetConfirmationEmail
};

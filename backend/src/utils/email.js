const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    console.log('Initializing EmailService with config:', {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      user: process.env.SMTP_USER,
      fromEmail: process.env.FROM_EMAIL
    });

    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    // Test the connection
    this.transporter.verify((error, success) => {
      if (error) {
        console.error('SMTP connection error:', error);
      } else {
        console.log('SMTP server is ready to send emails');
      }
    });
  }

  async sendVerificationEmail(email, token) {
    console.log('Attempting to send verification email to:', email);
    console.log('Verification token:', token);
    
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
    console.log('Verification URL:', verificationUrl);
    
    const mailOptions = {
      from: process.env.FROM_EMAIL || process.env.SMTP_USER,
      to: email,
      subject: 'Conferma la tua email - NotionLock',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4F46E5;">Benvenuto in NotionLock!</h2>
          <p>Grazie per esserti registrato. Per completare la registrazione, clicca sul link qui sotto:</p>
          <a href="${verificationUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">
            Conferma Email
          </a>
          <p>Se non riesci a cliccare il bottone, copia e incolla questo link nel tuo browser:</p>
          <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
          <p>Questo link scadrà tra 24 ore.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
          <p style="color: #666; font-size: 12px;">
            Se non hai richiesto questa registrazione, puoi ignorare questa email.
          </p>
        </div>
      `
    };

    try {
      console.log('Sending email with options:', {
        from: mailOptions.from,
        to: mailOptions.to,
        subject: mailOptions.subject
      });
      
      const result = await this.transporter.sendMail(mailOptions);
      console.log('Verification email sent successfully:', result.messageId);
      return result;
    } catch (error) {
      console.error('Failed to send verification email:', error);
      console.error('Error details:', {
        code: error.code,
        command: error.command,
        response: error.response
      });
      throw error;
    }
  }

  async sendPasswordResetEmail(email, token) {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    
    const mailOptions = {
      from: process.env.FROM_EMAIL || process.env.SMTP_USER,
      to: email,
      subject: 'Reset Password - NotionLock',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4F46E5;">Reset della Password</h2>
          <p>Hai richiesto di reimpostare la tua password. Clicca sul link qui sotto per procedere:</p>
          <a href="${resetUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">
            Reset Password
          </a>
          <p>Se non riesci a cliccare il bottone, copia e incolla questo link nel tuo browser:</p>
          <p style="word-break: break-all; color: #666;">${resetUrl}</p>
          <p>Questo link scadrà tra 1 ora.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
          <p style="color: #666; font-size: 12px;">
            Se non hai richiesto questo reset, puoi ignorare questa email.
          </p>
        </div>
      `
    };

    return this.transporter.sendMail(mailOptions);
  }

  async sendPasswordChangeNotification(email) {
    const mailOptions = {
      from: process.env.FROM_EMAIL || process.env.SMTP_USER,
      to: email,
      subject: 'Password Cambiata - NotionLock',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4F46E5;">Password Cambiata</h2>
          <p>La tua password è stata cambiata con successo.</p>
          <p>Se non hai effettuato tu questa modifica, contattaci immediatamente.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
          <p style="color: #666; font-size: 12px;">
            Questo è un messaggio automatico da NotionLock.
          </p>
        </div>
      `
    };

    return this.transporter.sendMail(mailOptions);
  }
}

module.exports = new EmailService();
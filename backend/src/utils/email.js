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

  async sendWelcomeEmail(email) {
    const dashboardUrl = `${process.env.FRONTEND_URL}/dashboard`;
    const mailOptions = {
      from: process.env.FROM_EMAIL || process.env.SMTP_USER,
      to: email,
      subject: 'Benvenuto in NotionLock! 🚀',
      html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #4F46E5;">Benvenuto a bordo!</h1>
                <p>Urrà! Il tuo account è stato verificato con successo.</p>
                <p>Ora puoi iniziare a proteggere le tue pagine Notion in pochi click.</p>
                
                <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="margin-top:0;">Primi Passi:</h3>
                    <ol>
                        <li>Vai alla tua Dashboard.</li>
                        <li>Incolla il link pubblico della tua pagina Notion.</li>
                        <li>Imposta una password.</li>
                        <li>Condividi il link protetto!</li>
                    </ol>
                </div>

                <a href="${dashboardUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 10px 0;">
                    Vai alla Dashboard
                </a>
            </div>
        `
    };
    return this.transporter.sendMail(mailOptions);
  }

  async sendPaymentSuccessEmail(email, planName, amount, currency) {
    const mailOptions = {
      from: process.env.FROM_EMAIL || process.env.SMTP_USER,
      to: email,
      subject: 'Pagamento Confermato - NotionLock Pro',
      html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #10B981;">Pagamento Ricevuto! 🎉</h2>
                  <p>Grazie per aver scelto NotionLock Pro.</p>
                  <p>Il tuo pagamento di <strong>${amount} ${currency}</strong> per il piano <strong>${planName}</strong> è stato confermato.</p>
                  
                  <p>Le funzionalità Pro sono ora attive sul tuo account:</p>
                  <ul>
                      <li>Nessuna pubblicità</li>
                      <li>Badge NotionLock rimosso</li>
                      <li>Supporto prioritario</li>
                  </ul>

                  <p>Puoi scaricare la ricevuta dalla tua dashboard.</p>
              </div>
          `
    };
    return this.transporter.sendMail(mailOptions);
  }

  async sendSubscriptionExpiryEmail(email) {
    const renewUrl = `${process.env.FRONTEND_URL}/pricing`; // Adjust if needed
    const mailOptions = {
      from: process.env.FROM_EMAIL || process.env.SMTP_USER,
      to: email,
      subject: 'Il tuo abbonamento NotionLock è scaduto',
      html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #EF4444;">Abbonamento Scaduto</h2>
                  <p>Il tuo abbonamento a NotionLock Pro è scaduto.</p>
                  <p>Il tuo account è tornato al piano gratuito. Le tue pagine rimangono protette, ma vedrai nuovamente le pubblicità e il badge NotionLock.</p>
                  
                  <a href="${renewUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">
                      Rinnova Ora
                  </a>
              </div>
          `
    };
    return this.transporter.sendMail(mailOptions);
  }
}

module.exports = new EmailService();
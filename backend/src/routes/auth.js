const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const emailService = require('../utils/email');
const crypto = require('crypto');

// Validation middleware
const validateRegister = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password deve essere almeno 6 caratteri')
];

const validateLogin = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
];

// Register
router.post('/register', validateRegister, async (req, res) => {
  console.log('Registration attempt received:', { email: req.body.email });
  
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('Validation errors:', errors.array());
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;
  const { db } = req;

  try {
    // Check if user exists
    const existingUser = await db.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      console.log('User already exists:', email);
      return res.status(409).json({ error: 'Email già registrata' });
    }

    console.log('Creating new user:', email);

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    console.log('Generated verification token:', verificationToken);

    // Create user
    const result = await db.query(
      'INSERT INTO users (id, email, password_hash, verification_token, verification_expires) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, created_at',
      [uuidv4(), email, hashedPassword, verificationToken, verificationExpires]
    );

    const user = result.rows[0];
    console.log('User created successfully:', user.id);

    // Send verification email
    try {
      console.log('Attempting to send verification email...');
      await emailService.sendVerificationEmail(email, verificationToken);
      console.log('Verification email sent successfully');
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // Continue anyway - user can request resend
    }

    // Create JWT (but user needs to verify email)
    const token = jwt.sign(
      { userId: user.id, email: user.email, emailVerified: false },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('Registration completed successfully for:', email);

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        emailVerified: false,
        createdAt: user.created_at
      },
      message: 'Registrazione completata. Controlla la tua email per verificare l\'account.'
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Errore durante la registrazione' });
  }
});

// Login
router.post('/login', validateLogin, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;
  const { db } = req;

  try {
    // Find user
    const result = await db.query(
      'SELECT id, email, password_hash FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Credenziali non valide' });
    }

    const user = result.rows[0];

    // Verify password
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Credenziali non valide' });
    }

    // Create JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Errore durante il login' });
  }
});

// Get current user
router.get('/me', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Token mancante' });
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const { db } = req;
    const result = await db.query(
      'SELECT id, email, email_verified, created_at FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Utente non trovato' });
    }

    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Auth check error:', error);
    res.status(401).json({ error: 'Token non valido' });
  }
});

// Verify email
router.post('/verify-email', async (req, res) => {
  const { token } = req.body;
  const { db } = req;

  try {
    const result = await db.query(
      'SELECT id, email FROM users WHERE verification_token = $1 AND verification_expires > NOW()',
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Token non valido o scaduto' });
    }

    const user = result.rows[0];

    // Update user as verified
    await db.query(
      'UPDATE users SET email_verified = TRUE, verification_token = NULL, verification_expires = NULL WHERE id = $1',
      [user.id]
    );

    res.json({ message: 'Email verificata con successo' });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ error: 'Errore durante la verifica' });
  }
});

// Request password reset
router.post('/forgot-password', [body('email').isEmail().normalizeEmail()], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email } = req.body;
  const { db } = req;

  try {
    const result = await db.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      // Don't reveal if email exists
      return res.json({ message: 'Se l\'email esiste, riceverai un link per il reset' });
    }

    const user = result.rows[0];
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Save reset token
    await db.query(
      'UPDATE users SET reset_token = $1, reset_expires = $2 WHERE id = $3',
      [resetToken, resetExpires, user.id]
    );

    // Send reset email
    try {
      await emailService.sendPasswordResetEmail(email, resetToken);
    } catch (emailError) {
      console.error('Failed to send reset email:', emailError);
      return res.status(500).json({ error: 'Errore nell\'invio dell\'email' });
    }

    res.json({ message: 'Se l\'email esiste, riceverai un link per il reset' });
  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({ error: 'Errore durante la richiesta' });
  }
});

// Reset password
router.post('/reset-password', [
  body('token').notEmpty(),
  body('password').isLength({ min: 6 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { token, password } = req.body;
  const { db } = req;

  try {
    const result = await db.query(
      'SELECT id, email FROM users WHERE reset_token = $1 AND reset_expires > NOW()',
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Token non valido o scaduto' });
    }

    const user = result.rows[0];

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Update password and clear reset token
    await db.query(
      'UPDATE users SET password_hash = $1, reset_token = NULL, reset_expires = NULL WHERE id = $2',
      [hashedPassword, user.id]
    );

    // Send notification email
    try {
      await emailService.sendPasswordChangeNotification(user.email);
    } catch (emailError) {
      console.error('Failed to send notification email:', emailError);
    }

    res.json({ message: 'Password reimpostata con successo' });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ error: 'Errore durante il reset' });
  }
});

// Change account password
router.post('/change-password', [
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 6 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Token mancante' });
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const { currentPassword, newPassword } = req.body;
    const { db } = req;

    // Get current user with password
    const result = await db.query(
      'SELECT id, email, password_hash FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Utente non trovato' });
    }

    const user = result.rows[0];

    // Verify current password
    const isCurrentValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isCurrentValid) {
      return res.status(400).json({ error: 'Password attuale non corretta' });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await db.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [hashedNewPassword, user.id]
    );

    // Send notification email
    try {
      await emailService.sendPasswordChangeNotification(user.email);
    } catch (emailError) {
      console.error('Failed to send notification email:', emailError);
    }

    res.json({ message: 'Password cambiata con successo' });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({ error: 'Errore durante il cambio password' });
  }
});

module.exports = router;
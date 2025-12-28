// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const { Pool } = require('pg');
const Redis = require('ioredis');

// Import routes
const authRoutes = require('./routes/auth');
const checkoutRoutes = require('./routes/checkout');
const domainRoutes = require('./routes/domains');
const pagesRoutes = require('./routes/pages');
const publicRoutes = require('./routes/public');
const adminRoutes = require('./routes/admin'); // Added admin routes import
const settingsRoutes = require('./routes/settings');

// Initialize Express
const app = express();
const PORT = process.env.PORT || 3001;

// Database connection
const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false // Disabilitato SSL per PostgreSQL in Docker
});

// Redis connection
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.set('trust proxy', true); // Trust Traefik proxy
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'https://notionlock.com',
  'https://www.notionlock.com',
  'http://localhost:3000'
].filter(Boolean); // Remove empty values

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }

    // Optional: Allow custom domains that are verified? 
    // For now, let's keep it strict to the main dashboard domains + localhost
    // If we need to support custom domains calling the API via CORS, we'd need to lookup the DB.
    // However, usually custom domains are handled by the proxy or same-origin if CNAME'd.

    const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
    return callback(new Error(msg), false);
  },
  credentials: true
}));
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));

// Route imports
const webhookRoutes = require('./routes/webhook');
app.use(morgan('combined'));

// Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs (increased for development)
  message: 'Troppi tentativi, riprova tra 15 minuti'
});

const passwordLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // limit each IP to 5 password attempts per minute
  message: 'Troppi tentativi password, riprova tra 1 minuto'
});

// Make db and redis available to routes
app.use((req, res, next) => {
  req.db = db;
  req.redis = redis;
  next();
});

// Routes - order matters! Specific routes first, then general
app.use('/api/auth/login', authLimiter, authRoutes); // Rate limit only login
app.use('/api/auth/register', authLimiter, authRoutes); // Rate limit only register
app.use('/api/auth/verify-email', authRoutes); // No rate limit on verification
app.use('/api/auth/me', authRoutes); // No rate limit on user info
app.use('/api/auth', authRoutes); // All other auth routes without rate limit
app.use('/api/pages', pagesRoutes);
app.use('/api/verify', passwordLimiter, publicRoutes);
app.use('/api/p', publicRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/webhook', webhookRoutes);
app.use('/api/domains', domainRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Si è verificato un errore'
      : err.message
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  await db.end();
  await redis.quit();
  process.exit(0);
});

require('dotenv').config();
const { Pool } = require('pg');

const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function initDatabase() {
  try {
    console.log('Creating tables...');

    // Create users table
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        email_verified BOOLEAN DEFAULT FALSE,
        verification_token VARCHAR(255),
        verification_expires TIMESTAMP,
        reset_token VARCHAR(255),
        reset_expires TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create protected_pages table
    await db.query(`
      CREATE TABLE IF NOT EXISTS protected_pages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        notion_url TEXT NOT NULL,
        slug VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        title VARCHAR(255) DEFAULT 'Pagina Protetta',
        visits_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create access_logs table
    await db.query(`
      CREATE TABLE IF NOT EXISTS access_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        protected_page_id UUID REFERENCES protected_pages(id) ON DELETE CASCADE,
        ip_hash VARCHAR(64),
        success BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create indexes
    await db.query('CREATE INDEX IF NOT EXISTS idx_pages_user_id ON protected_pages(user_id);');
    await db.query('CREATE INDEX IF NOT EXISTS idx_pages_slug ON protected_pages(slug);');
    await db.query('CREATE INDEX IF NOT EXISTS idx_logs_page_id ON access_logs(protected_page_id);');

    console.log('Database initialized successfully!');
  } catch (error) {
    console.error('Database initialization error:', error);
  } finally {
    await db.end();
  }
}

initDatabase();
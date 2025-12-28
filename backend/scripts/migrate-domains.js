const { Pool } = require('pg');
require('dotenv').config({ path: '../.env' }); // Adjust path if needed

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false
});

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Starting migration for Custom Domains...');

    await client.query('BEGIN');

    // Create custom_domains table
    await client.query(`
      CREATE TABLE IF NOT EXISTS custom_domains (
        id UUID PRIMARY KEY,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        domain VARCHAR(255) UNIQUE NOT NULL,
        page_id UUID REFERENCES protected_pages(id) ON DELETE CASCADE,
        verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Add index for faster lookup during routing
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_custom_domains_domain ON custom_domains(domain);
    `);

    await client.query('COMMIT');
    console.log('Migration completed successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();

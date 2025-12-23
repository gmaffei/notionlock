require('dotenv').config();
const { Pool } = require('pg');

const db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function migrate() {
    try {
        console.log('Adding role column to users table...');

        await db.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user';
    `);

        console.log('Migration completed successfully!');
    } catch (error) {
        console.error('Migration error:', error);
    } finally {
        await db.end();
    }
}

migrate();

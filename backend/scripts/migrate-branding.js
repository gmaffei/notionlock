
require('dotenv').config();
const { Pool } = require('pg');

const db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false
});

async function migrate() {
    try {
        console.log('Starting migration: Add Subscription and Branding columns to Users...');

        // Add subscription_status
        await db.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT 'free';
    `);

        // Add branding_enabled
        await db.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS branding_enabled BOOLEAN DEFAULT true;
    `);

        // Add custom_domain column too since it was mentioned as a Pro feature
        await db.query(`
      ALTER TABLE protected_pages
      ADD COLUMN IF NOT EXISTS custom_domain VARCHAR(255);
    `);

        console.log('Migration completed successfully.');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await db.end();
    }
}

migrate();

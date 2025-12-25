require('dotenv').config();
const { Pool } = require('pg');

const db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false
});

async function migrate() {
    try {
        console.log('Creating app_settings table...');

        // Key-Value store. Value is JSONB for flexibility.
        await db.query(`
      CREATE TABLE IF NOT EXISTS app_settings (
        key VARCHAR(100) PRIMARY KEY,
        value JSONB NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

        // Insert default pricing configuration if not exists
        const defaultConfig = {
            monthly: { usd: 4.99, eur: 4.99, variant_id: '' },
            yearly: { usd: 49.00, eur: 49.00, variant_id: '' },
            lifetime: { enabled: true, usd: 99.00, eur: 99.00, variant_id: '' },
            discount: { percent: 0, active: false }
        };

        await db.query(`
      INSERT INTO app_settings (key, value)
      VALUES ($1, $2)
      ON CONFLICT (key) DO NOTHING;
    `, ['pricing_config', JSON.stringify(defaultConfig)]);

        console.log('Migration settings completed successfully!');
    } catch (error) {
        console.error('Migration error:', error);
    } finally {
        await db.end();
    }
}

migrate();

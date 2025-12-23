require('dotenv').config();
const { Pool } = require('pg');

const email = process.argv[2];

if (!email) {
    console.log('Usage: node scripts/promote-admin.js <email>');
    process.exit(1);
}

const db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function promote() {
    try {
        console.log(`Promoting ${email} to admin...`);

        const result = await db.query(
            "UPDATE users SET role = 'admin' WHERE email = $1 RETURNING id",
            [email]
        );

        if (result.rows.length === 0) {
            console.error('User not found!');
        } else {
            console.log('Success! User is now an admin.');
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await db.end();
    }
}

promote();

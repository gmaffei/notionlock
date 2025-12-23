require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false
});

async function reset() {
    try {
        const email = 'maffei.gianfranco@gmail.com';
        const password = 'NotionLock2024!';

        console.log(`Resetting password for ${email}...`);

        // Hash with 12 rounds (matching auth.js which likely uses default or specified)
        // Checking auth.js... it uses 12 rounds! 
        // "const hashedPassword = await bcrypt.hash(password, 12);"
        const hash = await bcrypt.hash(password, 12);

        await db.query(`
      UPDATE users 
      SET password_hash = $1, role = 'admin', email_verified = true 
      WHERE email = $2
    `, [hash, email]);

        console.log('Password reset successfully with bcrypt cost 12.');
        console.log('New Hash prefix:', hash.substring(0, 10) + '...');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await db.end();
    }
}

reset();

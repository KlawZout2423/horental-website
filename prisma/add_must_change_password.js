const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function addMustChangePasswordColumn() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();
    console.log('✅ Connected to database');

    await client.query(`
      ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;
    `);
    console.log('✅ mustChangePassword column added (or already exists)');

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await client.end();
  }
}

addMustChangePasswordColumn();

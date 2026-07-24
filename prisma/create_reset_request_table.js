const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function createPasswordResetRequestTable() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();
    console.log('✅ Connected to database');

    await client.query(`
      CREATE TABLE IF NOT EXISTS "PasswordResetRequest" (
        "id"         SERIAL PRIMARY KEY,
        "name"       TEXT NOT NULL,
        "identifier" TEXT NOT NULL,
        "message"    TEXT,
        "status"     TEXT NOT NULL DEFAULT 'pending',
        "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS "PasswordResetRequest_createdAt_idx" ON "PasswordResetRequest" ("createdAt");
      CREATE INDEX IF NOT EXISTS "PasswordResetRequest_status_idx" ON "PasswordResetRequest" ("status");
    `);
    console.log('✅ PasswordResetRequest table created (or already exists)');

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await client.end();
  }
}

createPasswordResetRequestTable();

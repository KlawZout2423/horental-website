const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function createAuditLogTable() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();
    console.log('✅ Connected to database');

    await client.query(`
      CREATE TABLE IF NOT EXISTS "AuditLog" (
        "id"        SERIAL PRIMARY KEY,
        "action"    TEXT NOT NULL,
        "details"   TEXT NOT NULL,
        "userEmail" TEXT,
        "ipAddress" TEXT,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS "AuditLog_createdAt_idx" ON "AuditLog" ("createdAt");
      CREATE INDEX IF NOT EXISTS "AuditLog_action_idx" ON "AuditLog" ("action");
    `);
    console.log('✅ AuditLog table created (or already exists)');

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await client.end();
  }
}

createAuditLogTable();

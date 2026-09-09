import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';

if (fs.existsSync('.env.local')) {
  dotenv.config({ path: '.env.local' });
} else if (fs.existsSync('.env')) {
  dotenv.config({ path: '.env' });
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  console.log('Migrating database schema...');
  await pool.query(`
    ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP(3);
  `);
  console.log('✔ Added lastLoginAt column to User table.');

  await pool.query(`
    ALTER TABLE "PageVisit" ADD COLUMN IF NOT EXISTS "sessionId" TEXT;
    CREATE INDEX IF NOT EXISTS "PageVisit_sessionId_idx" ON "PageVisit"("sessionId");
  `);
  console.log('✔ Added sessionId column and index to PageVisit table.');
}

main()
  .catch(console.error)
  .finally(() => pool.end());

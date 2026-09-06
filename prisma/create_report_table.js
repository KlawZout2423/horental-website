// Run this once to create the Report table in production
// Usage: node prisma/create_report_table.js

import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const { Client } = pg;

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  await client.connect();
  console.log('Connected to database. Creating Report table...');

  await client.query(`
    CREATE TABLE IF NOT EXISTS "Report" (
      "id"         SERIAL PRIMARY KEY,
      "propertyId" INTEGER NOT NULL,
      "reporterId" INTEGER,
      "reason"     TEXT NOT NULL,
      "details"    TEXT,
      "status"     TEXT NOT NULL DEFAULT 'pending',
      "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Report_propertyId_fkey"
        FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE,
      CONSTRAINT "Report_reporterId_fkey"
        FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE SET NULL
    );
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS "Report_createdAt_idx" ON "Report"("createdAt");
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS "Report_status_idx" ON "Report"("status");
  `);

  await client.end();
  console.log('✅ Report table created (or already exists).');
}

main().catch((e) => {
  console.error('Error:', e.message);
  process.exit(1);
});

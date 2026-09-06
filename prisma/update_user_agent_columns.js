// Migration script: Add agent columns to User table in production DB
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('❌ DATABASE_URL not set');
  process.exit(1);
}

const client = new pg.Client({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    await client.connect();
    console.log('Connected to PostgreSQL DB...');

    await client.query(`
      ALTER TABLE "User" 
      ADD COLUMN IF NOT EXISTS "agencyName" TEXT,
      ADD COLUMN IF NOT EXISTS "experienceYears" TEXT,
      ADD COLUMN IF NOT EXISTS "licenseNumber" TEXT,
      ADD COLUMN IF NOT EXISTS "subscriptionPlan" TEXT DEFAULT 'starter',
      ADD COLUMN IF NOT EXISTS "isProfileComplete" BOOLEAN DEFAULT false;
    `);

    console.log('✅ Agent columns added to "User" table successfully!');
  } catch (err) {
    console.error('❌ Error executing migration:', err);
  } finally {
    await client.end();
  }
}

run();

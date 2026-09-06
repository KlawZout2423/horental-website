import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // Create table NotificationRead if it doesn't exist yet
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "NotificationRead" (
      "id" SERIAL PRIMARY KEY,
      "userId" INTEGER NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
      "propertyId" INTEGER NOT NULL REFERENCES "Property"("id") ON DELETE CASCADE,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "NotificationRead_userId_propertyId_key" UNIQUE ("userId", "propertyId")
    );
    CREATE INDEX IF NOT EXISTS "NotificationRead_userId_idx" ON "NotificationRead"("userId");
  `);
  console.log('✅ NotificationRead table verified and ready in PostgreSQL.');
}

main().catch(console.error).finally(() => pool.end());

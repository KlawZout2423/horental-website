import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
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
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const visits = await prisma.pageVisit.findMany({
    orderBy: { createdAt: 'asc' }
  });

  const duplicateIds = [];
  for (let i = 1; i < visits.length; i++) {
    const prev = visits[i - 1];
    const curr = visits[i];

    const timeDiffMs = new Date(curr.createdAt).getTime() - new Date(prev.createdAt).getTime();
    if (curr.path === prev.path && timeDiffMs < 5000) {
      duplicateIds.push(curr.id);
    }
  }

  console.log(`Found ${duplicateIds.length} duplicate visit logs within 5-second windows.`);

  if (duplicateIds.length > 0) {
    const deleted = await prisma.pageVisit.deleteMany({
      where: { id: { in: duplicateIds } }
    });
    console.log(`Successfully cleaned up ${deleted.count} duplicate visit records.`);
  }

  const remaining = await prisma.pageVisit.count();
  console.log(`Remaining clean total page visits: ${remaining}`);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

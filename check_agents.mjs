import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Show all agents and their verification status
const agents = await prisma.user.findMany({
  where: { role: { in: ['agent', 'landlord'] } },
  select: { id: true, name: true, email: true, role: true, verificationStatus: true }
});
console.log('=== AGENTS IN DB ===');
console.log(JSON.stringify(agents, null, 2));

await prisma.$disconnect();
await pool.end();

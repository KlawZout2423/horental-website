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
  // Ensure Eugene Dush (id 8) is definitely Admin
  const adminEugene = await prisma.user.updateMany({
    where: {
      OR: [
        { id: 8 },
        { phone: '0595744536' },
        { email: '0595744536@horentals.com' },
        { name: { contains: 'Eugene Dush', mode: 'insensitive' } }
      ]
    },
    data: {
      role: 'admin'
    }
  });
  console.log('Updated Eugene Dush to Admin:', adminEugene);

  // Check for Eugene Fiadufe Yao Dushie (0571542612)
  const agentDushie = await prisma.user.findMany({
    where: {
      OR: [
        { phone: '0571542612' },
        { email: 'eugenedush@gmail.com' },
        { name: { contains: 'Fiadufe', mode: 'insensitive' } }
      ]
    }
  });
  console.log('Agent Eugene Fiadufe search:', agentDushie);
}

main().catch(console.error).finally(() => pool.end());

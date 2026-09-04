import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
dotenv.config({ path: '.env.local' });

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // Confirm Eugene Dush (id 8) is admin
  const eugeneAdmin = await prisma.user.findFirst({
    where: { id: 8 }
  });
  console.log('Admin Eugene Dush:', eugeneAdmin);

  // Check or create Eugene Fiadufe Yao Dushie as an agent
  const existingAgent = await prisma.user.findFirst({
    where: {
      OR: [
        { email: 'eugenedush@gmail.com' },
        { phone: '0571542612' }
      ]
    }
  });

  if (existingAgent) {
    const updated = await prisma.user.update({
      where: { id: existingAgent.id },
      data: {
        name: 'Eugene Fiadufe Yao Dushie',
        role: 'agent',
        verificationStatus: 'unverified',
        agentLocation: 'Ho, Volta Region',
        bio: 'Registered rental agent on HO Rentals.',
        agentWhatsapp: '0571542612'
      }
    });
    console.log('Updated existing agent account:', updated);
  } else {
    const hashedPassword = await bcrypt.hash('HoRentals2025', 10);
    const created = await prisma.user.create({
      data: {
        name: 'Eugene Fiadufe Yao Dushie',
        email: 'eugenedush@gmail.com',
        phone: '0571542612',
        password: hashedPassword,
        role: 'agent',
        verificationStatus: 'unverified',
        agentLocation: 'Ho, Volta Region',
        bio: 'Registered rental agent on HO Rentals.',
        agentWhatsapp: '0571542612'
      }
    });
    console.log('Created new agent account:', created);
  }
}

main().catch(console.error).finally(() => pool.end());

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({
    where: {
      name: {
        contains: 'Fiati Kossi Elvis',
        mode: 'insensitive'
      }
    }
  });

  if (!user) {
    console.log('User not found.');
    return;
  }

  console.log('Found user:', user.name, 'with role:', user.role);

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: { role: 'landlord' }
  });

  console.log('Updated user role to:', updatedUser.role);
}

main()
  .catch(e => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

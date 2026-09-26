import prisma from './lib/prisma'; async function main() { console.log(await prisma.user.findMany({ where: { name: { contains: 'Fiati' } } })); } main();

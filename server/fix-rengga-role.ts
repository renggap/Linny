import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixRenggaRole() {
  const email = 'rengga@neodigital.co.id';
  const userId = '43c15901-87cf-452e-b493-849222889b6d';

  // Update global role
  await prisma.user.update({
    where: { email },
    data: { role: 'Administrator' }
  });
  console.log(`✅ Updated ${email} global role to Administrator`);

  // Update all team memberships
  const result = await prisma.teamMember.updateMany({
    where: { userId },
    data: { role: 'Administrator' }
  });
  console.log(`✅ Updated ${result.count} team memberships to Administrator`);
}

fixRenggaRole()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Error:', err);
    process.exit(1);
  });

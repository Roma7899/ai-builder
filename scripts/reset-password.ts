import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { createInterface } from 'node:readline';

const rl = createInterface({ input: process.stdin, output: process.stdout });
const ask = (q: string) => new Promise<string>((r) => rl.question(q, r));

async function main() {
  const email = process.argv[2] || await ask('Email: ');
  const password = process.argv[3] || await ask('New password: ');
  rl.close();

  const prisma = new PrismaClient();

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`User not found: ${email}`);
    await prisma.$disconnect();
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.update({ where: { email }, data: { passwordHash } });

  console.log(`Password reset for ${email}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

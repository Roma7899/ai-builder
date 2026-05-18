import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { withRls } from '../lib/withRls';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://localhost:5432/test';

let prisma: PrismaClient;

beforeAll(async () => {
  prisma = new PrismaClient({ datasourceUrl: DATABASE_URL });
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('Multi-tenant RLS isolation', () => {
  it('User A must never access User B data even with valid JWT', async () => {
    const userAId = 'test-user-a';
    const userBId = 'test-user-b';

    const userAProject = await withRls(prisma, userAId, async (tx) => {
      return tx.project.create({
        data: {
          name: `User A Project ${Date.now()}`,
          userId: userAId,
          status: 'draft',
        },
      });
    });

    expect(userAProject).toBeDefined();
    expect(userAProject.userId).toBe(userAId);

    const userBProjects = await withRls(prisma, userBId, async (tx) => {
      return tx.project.findMany({
        where: { userId: userAId },
      });
    });

    expect(userBProjects).toHaveLength(0);

    const userASeesOwnProject = await withRls(prisma, userAId, async (tx) => {
      return tx.project.findUnique({ where: { id: userAProject.id } });
    });

    expect(userASeesOwnProject).toBeDefined();
    expect(userASeesOwnProject!.id).toBe(userAProject.id);

    await withRls(prisma, userAId, async (tx) => {
      await tx.project.delete({ where: { id: userAProject.id } });
    });
  });
});

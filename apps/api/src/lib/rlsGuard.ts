import type { PrismaClient } from '@prisma/client';

const RLS_CONTEXT_SYMBOL = Symbol('rlsContext');

declare module '@prisma/client' {
  interface PrismaClient {
    [RLS_CONTEXT_SYMBOL]?: boolean;
  }
}

export function assertRlsContext(prisma: PrismaClient): void {
  if (!prisma[RLS_CONTEXT_SYMBOL]) {
    throw new Error(
      'RLS_VIOLATION: Direct Prisma access detected outside withRls transaction. ' +
      'All database operations must be wrapped in withRls().'
    );
  }
}

export function markRlsContext(prisma: PrismaClient): void {
  prisma[RLS_CONTEXT_SYMBOL] = true;
}

export function clearRlsContext(prisma: PrismaClient): void {
  prisma[RLS_CONTEXT_SYMBOL] = false;
}

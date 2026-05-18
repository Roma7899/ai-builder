import type { PrismaClient } from '@prisma/client';

const rlsContextMap = new WeakMap<object, boolean>();

export function assertRlsContext(prisma: PrismaClient): void {
  if (!rlsContextMap.get(prisma as object)) {
    throw new Error(
      'RLS_VIOLATION: Direct Prisma access detected outside withRls transaction. ' +
      'All database operations must be wrapped in withRls().'
    );
  }
}

export function markRlsContext(prisma: PrismaClient): void {
  rlsContextMap.set(prisma as object, true);
}

export function clearRlsContext(prisma: PrismaClient): void {
  rlsContextMap.set(prisma as object, false);
}

import type { PrismaClient } from '@prisma/client';

export async function withRls<T>(
  prisma: PrismaClient,
  userId: string,
  fn: (tx: any) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx: any) => {
    await tx.$executeRaw`SELECT set_config('app.current_user_id', ${userId}, true)`;
    return fn(tx);
  });
}

export function createRlsProxy(prisma: PrismaClient): PrismaClient {
  return new Proxy(prisma, {
    get(target, prop, receiver) {
      if (prop === '$transaction') {
        return target.$transaction.bind(target);
      }
      if (prop === '$connect' || prop === '$disconnect' || prop === '$on' || prop === '$use' || prop === '$extends') {
        return target[prop as keyof PrismaClient].bind(target);
      }
      if (prop === '$queryRaw' || prop === '$executeRaw') {
        return target[prop as keyof PrismaClient].bind(target);
      }
      if (typeof prop === 'string' && !prop.startsWith('$')) {
        const model = (target as any)[prop];
        if (model && typeof model === 'object') {
          return new Proxy(model, {
            get(modelTarget, modelProp) {
              if (typeof modelProp === 'string' && ['findUnique', 'findMany', 'findFirst', 'create', 'update', 'updateMany', 'delete', 'deleteMany', 'upsert', 'count', 'aggregate', 'groupBy'].includes(modelProp)) {
                throw new Error(
                  `RLS_VIOLATION: Direct prisma.${String(prop)}.${String(modelProp)}() call detected. ` +
                  `All DB operations must go through withRls().`
                );
              }
              return Reflect.get(modelTarget, modelProp, receiver);
            },
          });
        }
      }
      return Reflect.get(target, prop, receiver);
    },
  });
}

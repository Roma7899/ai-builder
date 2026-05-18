import type { PrismaClient } from '@prisma/client';
import { withRls } from '../../lib/withRls';

export class SiteVersionsService {
  constructor(private prisma: PrismaClient) {}

  async create(projectId: string, version: number, siteJson: unknown, userId: string, promptUsed?: string) {
    return withRls(this.prisma, userId, async (tx) =>
      tx.siteVersion.create({
        data: { projectId, version, siteJson: siteJson as any, promptUsed },
      })
    );
  }

  async findByProjectId(projectId: string, userId: string) {
    return withRls(this.prisma, userId, async (tx) =>
      tx.siteVersion.findMany({
        where: { projectId },
        orderBy: { version: 'desc' },
      })
    );
  }

  async getLatest(projectId: string, userId: string) {
    return withRls(this.prisma, userId, async (tx) =>
      tx.siteVersion.findFirst({
        where: { projectId },
        orderBy: { version: 'desc' },
      })
    );
  }
}

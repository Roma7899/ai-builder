import { PrismaClient } from '@prisma/client';
import crypto from 'node:crypto';
import dns from 'node:dns/promises';
import { AppError } from '../auth/auth.service';
import { addDnsRecord } from '../publish/cdn.client';
import { withRls } from '../../lib/withRls';

const CDN_TARGET = process.env.CDN_CNAME_TARGET ?? '';

export class DomainsService {
  constructor(private prisma: PrismaClient) {}

  private verifyOwnership(projectId: string, userId: string) {
    return withRls(this.prisma, userId, async (tx) => {
      const project = await tx.project.findUnique({ where: { id: projectId } });
      if (!project) throw new AppError(404, 'Project not found');
      if (project.userId !== userId) throw new AppError(403, 'Forbidden');
      return project;
    });
  }

  private generateVerificationToken(projectId: string, domain: string): string {
    const secret = process.env.DOMAIN_VERIFICATION_SECRET ?? crypto.randomUUID();
    return crypto
      .createHash('sha256')
      .update(`${projectId}:${domain}:${secret}`)
      .digest('hex')
      .slice(0, 16);
  }

  private validateDomain(domain: string): void {
    const pattern = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;
    if (!pattern.test(domain)) {
      throw new AppError(400, 'Invalid domain format');
    }
  }

  /**
   * Registers a custom domain for a project.
   * Creates a Domain row and returns the TXT verification record.
   */
  async addDomain(projectId: string, userId: string, domain: string) {
    await this.verifyOwnership(projectId, userId);
    this.validateDomain(domain);

    const existing = await withRls(this.prisma, userId, async (tx) =>
      tx.domain.findUnique({ where: { domain } })
    );
    if (existing) {
      if (existing.projectId !== projectId) {
        throw new AppError(409, 'Domain is already in use');
      }
      if (existing.verified) {
        throw new AppError(400, 'Domain is already verified for this project');
      }
    }

    const verificationToken = this.generateVerificationToken(projectId, domain);

    const domainRecord = await withRls(this.prisma, userId, async (tx) =>
      tx.domain.upsert({
        where: { domain },
        update: { projectId, verified: false, sslStatus: 'pending' },
        create: { projectId, domain, verified: false, sslStatus: 'pending' },
      })
    );

    return {
      domainId: domainRecord.id,
      txtRecord: `verify=${verificationToken}`,
      txtName: `_verify.${domain}`,
    };
  }

  /**
   * Verifies a domain by checking the DNS TXT record.
   * If verified, triggers Cloudflare zone setup.
   */
  async verifyDomain(projectId: string, userId: string) {
    await this.verifyOwnership(projectId, userId);

    const domainRecord = await withRls(this.prisma, userId, async (tx) =>
      tx.domain.findFirst({
        where: { projectId },
        orderBy: { createdAt: 'desc' },
      })
    );
    if (!domainRecord) throw new AppError(404, 'No domain found for this project');

    if (domainRecord.verified) {
      return { verified: true, domain: domainRecord.domain };
    }

    const expectedToken = this.generateVerificationToken(projectId, domainRecord.domain);

    try {
      const records = await dns.resolveTxt(`_verify.${domainRecord.domain}`);
      const flatRecords = records.flat();
      const matched = flatRecords.some((r) => r.includes(expectedToken));

      if (!matched) {
        return { verified: false, domain: domainRecord.domain };
      }

      let cfZoneId: string | null = null;

      try {
        if (CDN_TARGET) {
          const result = await addDnsRecord(domainRecord.domain, CDN_TARGET);
          cfZoneId = result.id;
        }
      } catch (cfErr: any) {
        console.warn('Cloudflare DNS record creation failed:', cfErr.message);
      }

      await withRls(this.prisma, userId, async (tx) =>
        tx.domain.update({
          where: { id: domainRecord.id },
          data: { verified: true, cfZoneId, sslStatus: 'active' },
        })
      );

      return { verified: true, domain: domainRecord.domain };
    } catch (err: any) {
      if (err.code === 'ENOTFOUND' || err.code === 'ENODATA') {
        return { verified: false, domain: domainRecord.domain };
      }
      throw err;
    }
  }
}

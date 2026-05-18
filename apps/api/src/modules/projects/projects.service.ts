import { PrismaClient, Prisma } from '@prisma/client';
import crypto from 'node:crypto';
import { AppError } from '../auth/auth.service';
import { withRls } from '../../lib/withRls';

export class ProjectsService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Returns all non-deleted projects belonging to the authenticated user.
   * Runs inside an RLS-guarded transaction.
   */
  async findAll(userId: string) {
    return withRls(this.prisma, userId, (tx) =>
      tx.project.findMany({
        where: { userId, status: { not: 'deleted' } },
        orderBy: { createdAt: 'desc' },
      })
    );
  }

  /**
   * Creates a new project for the authenticated user.
   * Generates a unique slug from the project name.
   * Runs inside an RLS-guarded transaction.
   *
   * @throws {AppError} 409 if slug collides
   */
  async create(userId: string, name: string) {
    const baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const suffix = crypto.randomUUID().slice(0, 8);
    const slug = `${baseSlug}-${suffix}`;

    return withRls(this.prisma, userId, async (tx) => {
      try {
        return await tx.project.create({
          data: { userId, name, slug },
        });
      } catch (err) {
        if ((err as any)?.code === 'P2002') {
          throw new AppError(409, 'A project with this name already exists');
        }
        throw err;
      }
    });
  }

  /**
   * Updates a project's name. Verifies ownership.
   * Runs inside an RLS-guarded transaction.
   *
   * @throws {AppError} 404 if project not found
   * @throws {AppError} 403 if project belongs to a different user
   */
  async update(userId: string, projectId: string, name: string) {
    return withRls(this.prisma, userId, async (tx) => {
      const project = await tx.project.findUnique({ where: { id: projectId } });
      if (!project) {
        throw new AppError(404, 'Project not found');
      }
      if (project.userId !== userId) {
        throw new AppError(403, 'Forbidden');
      }
      return tx.project.update({
        where: { id: projectId },
        data: { name },
      });
    });
  }

  /**
   * Soft-deletes a project by setting status to "deleted". Verifies ownership.
   * Runs inside an RLS-guarded transaction.
   *
   * @throws {AppError} 404 if project not found
   * @throws {AppError} 403 if project belongs to a different user
   */
  async delete(userId: string, projectId: string): Promise<void> {
    await withRls(this.prisma, userId, async (tx) => {
      const project = await tx.project.findUnique({ where: { id: projectId } });
      if (!project) {
        throw new AppError(404, 'Project not found');
      }
      if (project.userId !== userId) {
        throw new AppError(403, 'Forbidden');
      }
      await tx.project.update({
        where: { id: projectId },
        data: { status: 'deleted' },
      });
    });
  }
}

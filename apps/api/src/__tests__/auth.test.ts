import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService, AppError } from '../modules/auth/auth.service';

vi.mock('jsonwebtoken', () => ({
  default: {
    sign: vi.fn(() => 'mock-access-token'),
  },
}));

vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn(() => 'hashed-password'),
    compare: vi.fn(),
  },
}));

function createMockPrisma(existingUser: any = null) {
  return {
    user: {
      findUnique: vi.fn().mockResolvedValue(existingUser),
      create: vi.fn().mockImplementation(({ data }: any) =>
        Promise.resolve({ id: 'user-1', ...data })
      ),
    },
  } as any;
}

function createMockRedis() {
  return {
    set: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
  } as any;
}

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('register', () => {
    it('registers a new user successfully', async () => {
      const prisma = createMockPrisma(null);
      const redis = createMockRedis();
      const service = new AuthService(prisma, redis);

      const result = await service.register('new@example.com', 'password123');

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'new@example.com' },
      });
      expect(prisma.user.create).toHaveBeenCalled();
      expect(result.accessToken).toBe('mock-access-token');
      expect(result.user.email).toBe('new@example.com');
    });

    it('throws 409 when email already exists', async () => {
      const prisma = createMockPrisma({ id: 'existing', email: 'used@example.com' });
      const redis = createMockRedis();
      const service = new AuthService(prisma, redis);

      await expect(
        service.register('used@example.com', 'password123')
      ).rejects.toThrow(AppError);

      try {
        await service.register('used@example.com', 'password123');
      } catch (e) {
        expect(e).toBeInstanceOf(AppError);
        expect((e as AppError).statusCode).toBe(409);
        expect((e as AppError).message).toBe('Registration failed');
      }
    });

    it('throws 409 on Prisma unique constraint violation (P2002)', async () => {
      const prisma = createMockPrisma(null);
      prisma.user.create = vi.fn().mockRejectedValue({ code: 'P2002' });
      const redis = createMockRedis();
      const service = new AuthService(prisma, redis);

      try {
        await service.register('race@example.com', 'password123');
      } catch (e) {
        expect(e).toBeInstanceOf(AppError);
        expect((e as AppError).statusCode).toBe(409);
      }
    });

    it('re-throws non-P2002 errors from create', async () => {
      const prisma = createMockPrisma(null);
      const dbError = new Error('DB connection failed');
      prisma.user.create = vi.fn().mockRejectedValue(dbError);
      const redis = createMockRedis();
      const service = new AuthService(prisma, redis);

      await expect(
        service.register('test@example.com', 'password123')
      ).rejects.toThrow('DB connection failed');
    });
  });

  describe('login', () => {
    it('logs in successfully with valid credentials', async () => {
      const { default: bcrypt } = await import('bcrypt');
      (bcrypt.compare as any).mockResolvedValue(true);

      const user = {
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
      };
      const prisma = createMockPrisma(user);
      const redis = createMockRedis();
      const service = new AuthService(prisma, redis);

      const result = await service.login('test@example.com', 'correct-password');

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(result.accessToken).toBe('mock-access-token');
      expect(result.user.email).toBe('test@example.com');
    });

    it('throws 401 when user not found', async () => {
      const prisma = createMockPrisma(null);
      const redis = createMockRedis();
      const service = new AuthService(prisma, redis);

      try {
        await service.login('unknown@example.com', 'password123');
      } catch (e) {
        expect(e).toBeInstanceOf(AppError);
        expect((e as AppError).statusCode).toBe(401);
        expect((e as AppError).message).toBe('Invalid email or password');
      }
    });

    it('throws 401 when password is wrong', async () => {
      const { default: bcrypt } = await import('bcrypt');
      (bcrypt.compare as any).mockResolvedValue(false);

      const user = {
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
      };
      const prisma = createMockPrisma(user);
      const redis = createMockRedis();
      const service = new AuthService(prisma, redis);

      try {
        await service.login('test@example.com', 'wrong-password');
      } catch (e) {
        expect(e).toBeInstanceOf(AppError);
        expect((e as AppError).statusCode).toBe(401);
        expect((e as AppError).message).toBe('Invalid email or password');
      }
    });

    it('throws 401 when user has no passwordHash (OAuth account)', async () => {
      const user = {
        id: 'user-2',
        email: 'oauth@example.com',
        passwordHash: null,
      };
      const prisma = createMockPrisma(user);
      const redis = createMockRedis();
      const service = new AuthService(prisma, redis);

      try {
        await service.login('oauth@example.com', 'any-password');
      } catch (e) {
        expect(e).toBeInstanceOf(AppError);
        expect((e as AppError).statusCode).toBe(401);
      }
    });
  });

  describe('logout', () => {
    it('deletes refresh token from Redis', async () => {
      const prisma = createMockPrisma();
      const redis = createMockRedis();
      const service = new AuthService(prisma, redis);

      await service.logout('user-1');

      expect(redis.del).toHaveBeenCalledWith('refresh:user-1');
    });
  });
});

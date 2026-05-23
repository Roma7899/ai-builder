import type { PrismaClient } from '@prisma/client';
import type Redis from 'ioredis';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { withRls } from '../../lib/withRls';

const SALT_ROUNDS = 12;
const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL = 2592000;

const ROTATE_SCRIPT = `
local key = KEYS[1]
local expected = ARGV[1]
local newValue = ARGV[2]
local ttl = tonumber(ARGV[3])

local stored = redis.call('GET', key)
if stored == expected then
  redis.call('SET', key, newValue, 'EX', ttl)
  return 1
end
return 0
`;

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class AuthService {
  constructor(
    private prisma: PrismaClient,
    private redis: Redis
  ) {}

  async register(email: string, password: string) {
    const existing = await (this.prisma as any).user.findUnique({ where: { email } });
    if (existing) {
      throw new AppError(409, 'Registration failed');
    }

    try {
      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

      const user = await (this.prisma as any).user.create({
        data: { email, passwordHash },
      });

      const accessToken = this.generateAccessToken(user.id);
      const refreshToken = await this.generateRefreshToken(user.id);

      return {
        accessToken,
        refreshToken,
        user: { id: user.id, email: user.email },
      };
    } catch (e) {
      if ((e as any)?.code === 'P2002') {
        throw new AppError(409, 'Registration failed');
      }
      throw e;
    }
  }

  async login(email: string, password: string) {
    const user = await (this.prisma as any).user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
      throw new AppError(401, 'Invalid email or password');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new AppError(401, 'Invalid email or password');
    }

    const accessToken = this.generateAccessToken(user.id);
    const refreshToken = await this.generateRefreshToken(user.id);

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email },
    };
  }

  async refresh(refreshTokenStr: string) {
    let decoded: string;
    try {
      decoded = Buffer.from(refreshTokenStr, 'base64url').toString();
    } catch {
      throw new AppError(401, 'Invalid refresh token');
    }

    const separatorIndex = decoded.indexOf('.');
    if (separatorIndex === -1) {
      throw new AppError(401, 'Invalid refresh token');
    }

    const userId = decoded.slice(0, separatorIndex);
    const tokenValue = decoded.slice(separatorIndex + 1);

    const newTokenValue = crypto.randomBytes(32).toString('hex');
    const key = `refresh:${userId}`;

    const rotated = await this.redis.eval(
      ROTATE_SCRIPT,
      1,
      key,
      tokenValue,
      newTokenValue,
      REFRESH_TOKEN_TTL
    );

    if (rotated !== 1) {
      throw new AppError(401, 'Invalid or expired refresh token');
    }

    const user = await withRls(this.prisma, userId, async (tx) =>
      tx.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true },
      })
    );
    if (!user) throw new AppError(401, 'User not found');

    const newRefreshToken = Buffer.from(`${userId}.${newTokenValue}`).toString('base64url');
    const accessToken = this.generateAccessToken(userId);

    return { accessToken, refreshToken: newRefreshToken, user };
  }

  async forgotPassword(email: string): Promise<string> {
    const user = await (this.prisma as any).user.findUnique({ where: { email } });
    if (!user) throw new AppError(404, 'User not found');

    const token = crypto.randomBytes(32).toString('hex');
    await this.redis.set(`reset:${email}`, token, 'EX', 900);

    return token;
  }

  async resetPasswordWithToken(email: string, token: string, newPassword: string) {
    const stored = await this.redis.get(`reset:${email}`);
    if (!stored || stored !== token) throw new AppError(400, 'Invalid or expired reset token');

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await (this.prisma as any).user.update({
      where: { email },
      data: { passwordHash },
    });

    await this.redis.del(`reset:${email}`);
  }

  async adminResetPassword(email: string, newPassword: string) {
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    try {
      await (this.prisma as any).user.update({
        where: { email },
        data: { passwordHash },
      });
    } catch (e: any) {
      if (e?.code === 'P2025') throw new AppError(404, 'User not found');
      throw e;
    }
  }

  async logout(userId: string): Promise<void> {
    await this.redis.del(`refresh:${userId}`);
  }

  private generateAccessToken(userId: string): string {
    const privateKey = (process.env.JWT_PRIVATE_KEY ?? '').replace(/\\n/g, '\n');
    return jwt.sign({ sub: userId, iss: 'ai-builder', aud: 'api' }, privateKey, {
      algorithm: 'RS256',
      expiresIn: ACCESS_TOKEN_TTL,
    });
  }

  private async generateRefreshToken(userId: string): Promise<string> {
    const tokenValue = crypto.randomBytes(32).toString('hex');
    await this.redis.set(
      `refresh:${userId}`,
      tokenValue,
      'EX',
      REFRESH_TOKEN_TTL
    );
    return Buffer.from(`${userId}.${tokenValue}`).toString('base64url');
  }
}

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

  /**
   * Registers a new user with email and password.
   * Checks for duplicate email, hashes the password, creates the user,
   * and returns JWT access token + refresh token.
   *
   * @throws {AppError} 409 if email is already registered
   */
  async register(email: string, password: string) {
    return withRls(this.prisma, '', async (tx) => {
      const existing = await tx.user.findUnique({ where: { email } });
      if (existing) {
        throw new AppError(409, 'Registration failed');
      }

      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

      const user = await tx.user.create({
        data: { email, passwordHash },
      });

      const accessToken = this.generateAccessToken(user.id);
      const refreshToken = await this.generateRefreshToken(user.id);

      return {
        accessToken,
        refreshToken,
        user: { id: user.id, email: user.email },
      };
    });
  }

  /**
   * Authenticates a user with email and password.
   * Verifies credentials and returns JWT access token + refresh token.
   *
   * @throws {AppError} 401 if credentials are invalid
   */
  async login(email: string, password: string) {
    return withRls(this.prisma, '', async (tx) => {
      const user = await tx.user.findUnique({ where: { email } });
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
    });
  }

  /**
   * Refreshes an access token using a refresh token.
   * Atomically validates and rotates the token in Redis using a Lua script.
   * Only one concurrent refresh per token can succeed — others get 401.
   * Returns a new access token, new refresh token, and user data.
   *
   * @throws {AppError} 401 if refresh token is invalid, expired, or already rotated
   */
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

  /**
   * Invalidates the refresh token for the given user in Redis.
   */
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

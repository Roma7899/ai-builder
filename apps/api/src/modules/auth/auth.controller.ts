import type { FastifyRequest, FastifyReply } from 'fastify';
import { AuthService, AppError } from './auth.service';
import { registerSchema, loginSchema } from './auth.schema';
import { AuthMonitor } from '../../lib/monitoring/auth';
import { getRedis } from '../../lib/redisFactory';

export class AuthController {
  constructor(private authService: AuthService) {}

  register = async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = registerSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation failed',
        details: parsed.error.issues,
      });
    }

    try {
      const result = await this.authService.register(parsed.data.email, parsed.data.password);
      this.setRefreshCookie(reply, result.refreshToken);
      return reply.status(201).send({
        accessToken: result.accessToken,
        user: result.user,
      });
    } catch (err) {
      return this.handleError(reply, err);
    }
  };

  login = async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation failed',
        details: parsed.error.issues,
      });
    }

    try {
      const result = await this.authService.login(parsed.data.email, parsed.data.password);
      this.setRefreshCookie(reply, result.refreshToken);
      return reply.send({
        accessToken: result.accessToken,
        user: result.user,
      });
    } catch (err) {
      AuthMonitor.recordFailedLogin(getRedis(), request.ip, parsed.data.email).catch(() => {});
      return this.handleError(reply, err);
    }
  };

  refresh = async (request: FastifyRequest, reply: FastifyReply) => {
    const refreshTokenCookie = request.cookies?.refreshToken;
    if (!refreshTokenCookie) {
      return reply.status(401).send({ error: 'Refresh token missing' });
    }

    try {
      const result = await this.authService.refresh(refreshTokenCookie);
      this.setRefreshCookie(reply, result.refreshToken);
      return reply.send({ accessToken: result.accessToken, user: result.user });
    } catch (err) {
      AuthMonitor.recordRefreshFailure(getRedis()).catch(() => {});
      return this.handleError(reply, err);
    }
  };

  logout = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await this.authService.logout(request.userId);
    } catch {
      // noop — always clear cookie
    }
    reply.clearCookie('refreshToken', { path: '/api/auth' });
    return reply.send({ message: 'Logged out' });
  };

  adminResetPassword = async (request: FastifyRequest, reply: FastifyReply) => {
    const adminSecret = process.env.ADMIN_SECRET;
    if (!adminSecret || request.headers['x-admin-secret'] !== adminSecret) {
      return reply.status(403).send({ error: 'Forbidden' });
    }
    const { email, password } = request.body as { email?: string; password?: string };
    if (!email || !password) {
      return reply.status(400).send({ error: 'email and password required' });
    }
    try {
      await this.authService.adminResetPassword(email, password);
      return reply.send({ message: 'Password reset' });
    } catch (err) {
      return this.handleError(reply, err);
    }
  };

  forgotPassword = async (request: FastifyRequest, reply: FastifyReply) => {
    const { email } = request.body as { email?: string };
    if (!email) return reply.status(400).send({ error: 'Email required' });

    try {
      const token = await this.authService.forgotPassword(email);
      const resetUrl = `${request.protocol}://${request.hostname}/reset-password?email=${encodeURIComponent(email)}&token=${token}`;
      return reply.send({ message: 'Reset link generated', resetUrl });
    } catch (err) {
      return this.handleError(reply, err);
    }
  };

  resetPasswordWithToken = async (request: FastifyRequest, reply: FastifyReply) => {
    const { email, token, password } = request.body as { email?: string; token?: string; password?: string };
    if (!email || !token || !password) {
      return reply.status(400).send({ error: 'email, token, and password required' });
    }

    try {
      await this.authService.resetPasswordWithToken(email, token, password);
      return reply.send({ message: 'Password reset successfully' });
    } catch (err) {
      return this.handleError(reply, err);
    }
  };

  googleStub = async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.status(501).send({ message: 'Coming soon' });
  };

  googleCallbackStub = async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.status(501).send({ message: 'Coming soon' });
  };

  private setRefreshCookie(reply: FastifyReply, token: string) {
    reply.setCookie('refreshToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/auth',
      maxAge: 2592000,
    });
  }

  private handleError(reply: FastifyReply, err: unknown) {
    if (err instanceof AppError) {
      return reply.status(err.statusCode).send({ error: err.message });
    }
    return reply.status(500).send({ error: 'Internal server error' });
  }
}

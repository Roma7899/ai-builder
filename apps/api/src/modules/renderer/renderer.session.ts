import jwt from 'jsonwebtoken';
import { config } from '../../config';

const SESSION_TTL = '5m';

export function createSessionToken(userId: string): string {
  const privateKey = config.jwt.privateKey;
  return jwt.sign(
    { sub: userId, iss: 'ai-builder', aud: 'renderer-session' },
    privateKey,
    { algorithm: 'RS256', expiresIn: SESSION_TTL }
  );
}

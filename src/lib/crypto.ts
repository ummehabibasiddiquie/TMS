import crypto from 'crypto';

const RESET_TOKEN_LENGTH = 32;
const RESET_TOKEN_EXPIRY_MINUTES = 15;

export function generateSecureToken(): string {
  return crypto.randomBytes(RESET_TOKEN_LENGTH).toString('hex');
}

export async function hashToken(token: string): Promise<string> {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function verifyTokenHash(token: string, hash: string): Promise<boolean> {
  const tokenHash = await hashToken(token);
  return crypto.timingSafeEqual(Buffer.from(tokenHash), Buffer.from(hash));
}

export function getTokenExpiryDate(): Date {
  const now = new Date();
  now.setMinutes(now.getMinutes() + RESET_TOKEN_EXPIRY_MINUTES);
  return now;
}

export function isTokenExpired(expiresAt: Date): boolean {
  return new Date() > expiresAt;
}

import jwt from 'jsonwebtoken';

export interface JwtAccessPayload {
  userId: string;
  username: string;
  role: string;
  type: 'access';
  iat?: number;
  exp?: number;
}

export interface JwtRefreshPayload {
  userId: string;
  username: string;
  role: string;
  type: 'refresh';
  iat?: number;
  exp?: number;
}

export type JwtPayload = JwtAccessPayload | JwtRefreshPayload;

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

const JWT_SECRET = process.env['JWT_SECRET'] ?? 'changeme-dev-secret-do-not-use-in-prod';
const JWT_REFRESH_SECRET =
  process.env['JWT_REFRESH_SECRET'] ?? 'changeme-dev-refresh-secret-do-not-use-in-prod';

// 30 days for access, 90 days for refresh
const ACCESS_TOKEN_TTL = 30 * 24 * 60 * 60;
const REFRESH_TOKEN_TTL = 90 * 24 * 60 * 60;

// In-memory revocation store. Replace with Redis/DB in production for multi-instance support.
const revokedTokens = new Set<string>();

export function revokeToken(token: string): void {
  revokedTokens.add(token);
}

export function isTokenRevoked(token: string): boolean {
  return revokedTokens.has(token);
}

export function generateTokenPair(userId: string, username: string, role: string): TokenPair {
  const base = { userId, username, role };
  const accessToken = jwt.sign({ ...base, type: 'access' }, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_TTL,
  });
  const refreshToken = jwt.sign({ ...base, type: 'refresh' }, JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_TOKEN_TTL,
  });
  return { accessToken, refreshToken, expiresIn: ACCESS_TOKEN_TTL };
}

export function verifyAccessToken(token: string): JwtAccessPayload {
  const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
  if (decoded.type !== 'access') throw new Error('Invalid token type');
  return decoded as JwtAccessPayload;
}

export function verifyRefreshToken(token: string): JwtRefreshPayload {
  const decoded = jwt.verify(token, JWT_REFRESH_SECRET) as JwtPayload;
  if (decoded.type !== 'refresh') throw new Error('Invalid token type');
  return decoded as JwtRefreshPayload;
}

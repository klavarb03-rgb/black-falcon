import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { getDataSource } from '../database';
import { UserRepository } from '../repositories';
import { generateTokenPair, revokeToken, verifyRefreshToken, isTokenRevoked } from '../utils/jwt';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

export async function login(req: Request, res: Response): Promise<void> {
  const { username, password } = req.body as { username?: unknown; password?: unknown };

  if (typeof username !== 'string' || !username || typeof password !== 'string' || !password) {
    res.status(400).json({ error: 'username and password are required' });
    return;
  }

  const ds = await getDataSource();
  const users = new UserRepository(ds);
  const user = await users.findByUsername(username);

  // Constant-time response to prevent user enumeration
  if (!user || !user.isActive) {
    await bcrypt.hash(password, 12); // dummy hash to equalize timing
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const tokens = generateTokenPair(user.id, user.username, user.role);

  res.status(200).json({
    user: {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
    },
    ...tokens,
  });
}

export function logout(req: Request, res: Response): void {
  const authHeader = req.headers['authorization'];
  const { refreshToken } = req.body as { refreshToken?: unknown };

  if (authHeader?.startsWith('Bearer ')) {
    revokeToken(authHeader.slice(7));
  }

  if (typeof refreshToken === 'string' && refreshToken) {
    revokeToken(refreshToken);
  }

  res.status(200).json({ message: 'Logged out successfully' });
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const { refreshToken } = req.body as { refreshToken?: unknown };

  if (typeof refreshToken !== 'string' || !refreshToken) {
    res.status(400).json({ error: 'refreshToken is required' });
    return;
  }

  if (isTokenRevoked(refreshToken)) {
    res.status(401).json({ error: 'Refresh token has been revoked' });
    return;
  }

  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    res.status(401).json({ error: 'Invalid or expired refresh token' });
    return;
  }

  const ds = await getDataSource();
  const users = new UserRepository(ds);
  const user = await users.findById(payload.userId);

  if (!user || !user.isActive) {
    res.status(401).json({ error: 'User not found or inactive' });
    return;
  }

  // Rotate refresh token: revoke old, issue new pair
  revokeToken(refreshToken);
  const tokens = generateTokenPair(user.id, user.username, user.role);

  res.status(200).json({
    user: {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
    },
    ...tokens,
  });
}

export async function me(req: Request, res: Response): Promise<void> {
  const { userId } = (req as AuthenticatedRequest).user;

  const ds = await getDataSource();
  const users = new UserRepository(ds);
  const user = await users.findById(userId);

  if (!user || !user.isActive) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  res.status(200).json({
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    role: user.role,
  });
}

import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { User } from '@prisma/client';
import { verifyToken } from '../utils/jwt';

// Backward-compat alias. req.user is now exposed on the base Express Request
// via module augmentation in src/types/express.d.ts.
export type AuthenticatedRequest = Request;

export const AUTH_COOKIE_NAME = 'auth_token';

function extractToken(req: Request): string | undefined {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice('Bearer '.length).trim();
  }
  // express-session and cookie-parser both populate req.cookies; fall back
  // to a raw cookie header parse for environments without cookie-parser.
  const cookies = (req as Request & { cookies?: Record<string, string> }).cookies;
  if (cookies && typeof cookies[AUTH_COOKIE_NAME] === 'string') {
    return cookies[AUTH_COOKIE_NAME];
  }
  const rawCookie = req.headers.cookie;
  if (typeof rawCookie === 'string') {
    for (const part of rawCookie.split(';')) {
      const [name, ...rest] = part.trim().split('=');
      if (name === AUTH_COOKIE_NAME) {
        return decodeURIComponent(rest.join('='));
      }
    }
  }
  return undefined;
}

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const decoded = verifyToken(token);
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });

    if (!user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(403).json({ error: 'Invalid or expired token' });
  }
};

export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = extractToken(req);
    if (token) {
      const decoded = verifyToken(token);
      const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
      if (user) {
        req.user = user;
      }
    }
    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

/**
 * Restrict an endpoint to admin users. Must be chained after authenticateToken
 * so req.user is populated. Returns 403 for non-admins.
 */
export const requireAdmin = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  if (!(req.user as User & { isAdmin?: boolean }).isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

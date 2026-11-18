import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: 'instructor' | 'learner';
  preferred_language: 'en' | 'kn' | 'hi';
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

const DEFAULT_DEV_SECRET = 'smart-tech-dev-jwt-secret-change-in-production';
const JWT_SECRET = process.env.JWT_SECRET || DEFAULT_DEV_SECRET;

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  console.warn(
    '[security] WARNING: JWT_SECRET environment variable is not set in production. Set a strong random secret before deploying.'
  );
}

export function signToken(user: AuthUser): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      preferred_language: user.preferred_language,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function verifyToken(token: string): AuthUser {
  return jwt.verify(token, JWT_SECRET) as AuthUser;
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }

  try {
    const token = authHeader.slice(7);
    req.user = verifyToken(token);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired authentication token.' });
  }
}

export function optionalAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.slice(7);
      req.user = verifyToken(token);
    } catch {
      req.user = undefined;
    }
  }
  next();
}

export function requireRole(role: 'instructor' | 'learner') {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }
    if (req.user.role !== role) {
      res.status(403).json({ error: `Access denied. ${role} role required.` });
      return;
    }
    next();
  };
}

interface RateBucket {
  count: number;
  resetAt: number;
}

const authRateBuckets = new Map<string, RateBucket>();

export function rateLimitAuth(maxRequests = 60, windowMs = 15 * 60 * 1000) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const current = authRateBuckets.get(key);

    if (!current || current.resetAt <= now) {
      authRateBuckets.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    if (current.count >= maxRequests) {
      const retryAfterSec = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
      res.setHeader('Retry-After', String(retryAfterSec));
      res.status(429).json({
        error: 'Too many authentication attempts. Please wait a moment and try again.',
      });
      return;
    }

    current.count += 1;
    next();
  };
}

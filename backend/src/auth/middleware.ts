// ==============================================================================
// Auth Middleware — JWT verification & role-based access control
// ==============================================================================

import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, type TokenPayload } from './utils.js';

// ─── Extend Express Request to carry authenticated user ─────────────────────

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

// ─── authenticate — Verify JWT from Authorization header ────────────────────

/**
 * Extracts and verifies the JWT from the `Authorization: Bearer <token>` header.
 * Attaches the decoded payload to `req.user`.
 * Returns 401 if missing or invalid.
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'Authentication required',
      message: 'Missing or malformed Authorization header. Expected: Bearer <token>',
    });
    return;
  }

  const token = authHeader.slice(7); // Remove 'Bearer '
  const payload = verifyAccessToken(token);

  if (!payload) {
    res.status(401).json({
      error: 'Invalid token',
      message: 'Token is invalid, expired, or malformed.',
    });
    return;
  }

  req.user = payload;
  next();
}

// ─── requireRole — Check user has one of the specified roles ────────────────

/**
 * Middleware factory that checks `req.user.role` against a list of allowed roles.
 * Must be used after `authenticate`.
 *
 * @example
 * router.get('/admin-only', authenticate, requireRole('admin'), handler);
 * router.get('/staff-or-admin', authenticate, requireRole('admin', 'staff'), handler);
 */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        error: 'Forbidden',
        message: `This action requires one of these roles: ${roles.join(', ')}. Your role: ${req.user.role}`,
      });
      return;
    }

    next();
  };
}

// ─── requireOwnership — Drivers can only access their own resources ─────────

/**
 * Middleware factory that ensures the authenticated user owns the resource.
 * Checks `req.params[paramName]` against `req.user.userId`.
 * Admins and staff bypass this check.
 *
 * @param paramName - The route parameter containing the user ID to check against.
 *
 * @example
 * // Only the booking owner (or admin/staff) can access:
 * router.get('/bookings/:userId', authenticate, requireOwnership('userId'), handler);
 */
export function requireOwnership(paramName: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Admins and staff can access any resource
    if (req.user.role === 'admin' || req.user.role === 'staff') {
      next();
      return;
    }

    const resourceOwnerId = req.params[paramName];
    if (resourceOwnerId !== req.user.userId) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'You can only access your own resources.',
      });
      return;
    }

    next();
  };
}

// ==============================================================================
// Auth Utilities — Password hashing & JWT token management
// ==============================================================================

import argon2 from 'argon2';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { config } from '../config.js';

// ─── Password Hashing (Argon2id) ────────────────────────────────────────────

export async function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, {
    type: argon2.argon2id,
    memoryCost: 65536, // 64 MB
    timeCost: 3,
    parallelism: 4,
  });
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plain);
  } catch {
    return false;
  }
}

// ─── JWT Tokens ─────────────────────────────────────────────────────────────

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

export interface RefreshTokenPayload {
  userId: string;
  type: 'refresh';
}

/**
 * Sign an access token (short-lived, contains user info for middleware).
 */
export function signAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtAccessExpiry as SignOptions['expiresIn'],
    issuer: 'parker-os',
    subject: payload.userId,
  });
}

/**
 * Sign a refresh token (long-lived, only contains userId).
 */
export function signRefreshToken(userId: string): string {
  const payload: RefreshTokenPayload = { userId, type: 'refresh' };
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtRefreshExpiry as SignOptions['expiresIn'],
    issuer: 'parker-os',
    subject: userId,
  });
}

/**
 * Verify and decode an access token.
 * Returns the payload or null if invalid/expired.
 */
export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, config.jwtSecret, {
      issuer: 'parker-os',
    }) as jwt.JwtPayload & TokenPayload;

    return {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    };
  } catch {
    return null;
  }
}

/**
 * Verify and decode a refresh token.
 * Returns the payload or null if invalid/expired.
 */
export function verifyRefreshToken(token: string): RefreshTokenPayload | null {
  try {
    const decoded = jwt.verify(token, config.jwtSecret, {
      issuer: 'parker-os',
    }) as jwt.JwtPayload & RefreshTokenPayload;

    if (decoded.type !== 'refresh') return null;

    return {
      userId: decoded.userId,
      type: 'refresh',
    };
  } catch {
    return null;
  }
}

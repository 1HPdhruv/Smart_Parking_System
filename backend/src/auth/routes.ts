// ==============================================================================
// Auth Routes — Register, Login, Refresh
// ==============================================================================

import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { getDb } from '../db.js';
import {
  hashPassword,
  verifyPassword,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from './utils.js';

export const authRouter = Router();

// ─── Validation Schemas ─────────────────────────────────────────────────────

const registerSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  role: z.enum(['driver', 'admin', 'staff']).default('driver'),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const refreshSchema = z.object({
  refresh_token: z.string().min(1),
});

// ─── POST /api/auth/register ────────────────────────────────────────────────

authRouter.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate input
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const { name, email, password, role } = parsed.data;
    const db = getDb();

    // Check if email already exists
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({
        error: 'Email already registered',
        message: 'An account with this email address already exists.',
      });
      return;
    }

    // Hash password and create user
    const password_hash = await hashPassword(password);
    const user = await db.user.create({
      data: { name, email, password_hash, role },
    });

    // Issue tokens
    const accessToken = signAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });
    const refreshToken = signRefreshToken(user.id);

    res.status(201).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        created_at: user.created_at,
      },
      access_token: accessToken,
      refresh_token: refreshToken,
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/auth/login ───────────────────────────────────────────────────

authRouter.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate input
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const { email, password } = parsed.data;
    const db = getDb();

    // Find user by email
    const user = await db.user.findUnique({ where: { email } });
    if (!user) {
      // Use same error message for both cases to prevent email enumeration
      res.status(401).json({
        error: 'Invalid credentials',
        message: 'Email or password is incorrect.',
      });
      return;
    }

    // Verify password
    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      res.status(401).json({
        error: 'Invalid credentials',
        message: 'Email or password is incorrect.',
      });
      return;
    }

    // Issue tokens
    const accessToken = signAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });
    const refreshToken = signRefreshToken(user.id);

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        created_at: user.created_at,
      },
      access_token: accessToken,
      refresh_token: refreshToken,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/auth/refresh ─────────────────────────────────────────────────

authRouter.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate input
    const parsed = refreshSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const { refresh_token } = parsed.data;

    // Verify refresh token
    const payload = verifyRefreshToken(refresh_token);
    if (!payload) {
      res.status(401).json({
        error: 'Invalid refresh token',
        message: 'Refresh token is invalid or expired. Please log in again.',
      });
      return;
    }

    // Look up user to ensure they still exist and get current role
    const db = getDb();
    const user = await db.user.findUnique({ where: { id: payload.userId } });
    if (!user) {
      res.status(401).json({
        error: 'User not found',
        message: 'The user associated with this token no longer exists.',
      });
      return;
    }

    // Rotate tokens
    const accessToken = signAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });
    const newRefreshToken = signRefreshToken(user.id);

    res.json({
      access_token: accessToken,
      refresh_token: newRefreshToken,
    });
  } catch (err) {
    console.error('Refresh error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

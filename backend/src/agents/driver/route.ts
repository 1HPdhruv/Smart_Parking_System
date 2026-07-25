// ==============================================================================
// Driver Agent Route — POST /api/driver-agent/chat
// ==============================================================================

import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { config } from '../../config.js';
import { authenticate, requireRole } from '../../auth/middleware.js';
import { runConversationTurn } from '../conversation.js';
import { DRIVER_SYSTEM_PROMPT } from './system-prompt.js';
import { DRIVER_TOOLS } from './tools.js';
import { handleDriverTool } from './handlers.js';

export const driverAgentRouter = Router();

const chatSchema = z.object({
  message: z.string().min(1).max(4000),
  session_id: z.string().optional(),
});

driverAgentRouter.post(
  '/chat',
  authenticate,
  requireRole('driver', 'admin', 'staff'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!config.anthropicApiKey) {
        res.status(503).json({
          error: 'Agent not configured',
          message: 'ANTHROPIC_API_KEY environment variable is not set. Add it in the Render dashboard under Environment Variables.',
        });
        return;
      }
      const parsed = chatSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
        return;
      }

      const { message, session_id } = parsed.data;
      const user = req.user!;

      // Session ID: caller-provided or auto-generated from userId
      const sessionId = session_id ?? `driver:${user.userId}`;

      const context = {
        userId: user.userId,
        userRole: user.role,
        sessionId,
      };

      const reply = await runConversationTurn(
        DRIVER_SYSTEM_PROMPT,
        DRIVER_TOOLS,
        handleDriverTool,
        message,
        context,
      );

      res.json({ reply, session_id: sessionId });
    } catch (err) {
      console.error('Driver agent error:', err);
      res.status(500).json({ error: 'Agent error', message: (err as Error).message });
    }
  },
);

// ==============================================================================
// Ops Agent Route — POST /api/ops-agent/chat
// ==============================================================================

import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { authenticate, requireRole } from '../../auth/middleware.js';
import { runConversationTurn } from '../conversation.js';
import { OPS_SYSTEM_PROMPT } from './system-prompt.js';
import { OPS_TOOLS } from './tools.js';
import { handleOpsTool } from './handlers.js';

export const opsAgentRouter = Router();

const chatSchema = z.object({
  message: z.string().min(1).max(4000),
  session_id: z.string().optional(),
});

opsAgentRouter.post(
  '/chat',
  authenticate,
  requireRole('admin', 'staff'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const parsed = chatSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
        return;
      }

      const { message, session_id } = parsed.data;
      const user = req.user!;

      const sessionId = session_id ?? `ops:${user.userId}`;

      const context = {
        userId: user.userId,
        userRole: user.role,
        sessionId,
      };

      const reply = await runConversationTurn(
        OPS_SYSTEM_PROMPT,
        OPS_TOOLS,
        handleOpsTool,
        message,
        context,
      );

      res.json({ reply, session_id: sessionId });
    } catch (err) {
      console.error('Ops agent error:', err);
      res.status(500).json({ error: 'Agent error', message: (err as Error).message });
    }
  },
);

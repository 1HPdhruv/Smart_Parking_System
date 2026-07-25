// ==============================================================================
// Audit Log Route — GET /api/audit-log
// ==============================================================================

import { Router, type Request, type Response } from 'express';
import { authenticate, requireRole } from '../auth/middleware.js';
import { getDb } from '../db.js';

export const auditRouter = Router();

auditRouter.get(
  '/',
  authenticate,
  requireRole('admin', 'staff'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const db = getDb();
      const {
        agent,
        tool,
        outcome,
        date_start,
        date_end,
        limit = '50',
        offset = '0',
      } = req.query as Record<string, string>;

      const entries = await db.agentAuditLog.findMany({
        where: {
          ...(agent && { agent }),
          ...(tool && { tool_name: tool }),
          ...(outcome && { outcome }),
          ...(date_start || date_end
            ? {
                created_at: {
                  ...(date_start && { gte: new Date(date_start) }),
                  ...(date_end && { lte: new Date(date_end) }),
                },
              }
            : {}),
        },
        orderBy: { created_at: 'desc' },
        take: Math.min(parseInt(limit, 10), 200),
        skip: parseInt(offset, 10),
        include: { pending_approvals: { select: { id: true, status: true, expires_at: true } } },
      });

      const total = await db.agentAuditLog.count({
        where: {
          ...(agent && { agent }),
          ...(tool && { tool_name: tool }),
          ...(outcome && { outcome }),
        },
      });

      res.json({
        entries: entries.map((e) => ({
          id: e.id,
          agent: e.agent,
          tool_name: e.tool_name,
          input: e.input,
          outcome: e.outcome,
          reasoning: e.reasoning,
          approved_by: e.approved_by,
          created_at: e.created_at,
          pending_approval: e.pending_approvals[0] ?? null,
        })),
        total,
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10),
      });
    } catch (err) {
      console.error('Audit log error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// ==============================================================================
// Approvals Route — CRUD for pending admin approvals
// ==============================================================================

import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { authenticate, requireRole } from '../auth/middleware.js';
import { getDb } from '../db.js';
import { evaluatePolicy, getApprovalContext } from '../policy/engine.js';
import { executeApprovedAction } from '../services/approvals.js';

export const approvalsRouter = Router();

// All approval routes require admin or staff
approvalsRouter.use(authenticate, requireRole('admin', 'staff'));

// ─── GET /api/pending-approvals ─────────────────────────────────────────────

approvalsRouter.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const db = getDb();
    const approvals = await db.pendingApproval.findMany({
      where: { status: 'pending' },
      include: { audit_log: true },
      orderBy: { audit_log: { created_at: 'desc' } },
    });

    res.json({
      approvals: approvals.map((a) => ({
        id: a.id,
        audit_log_id: a.audit_log_id,
        agent: a.audit_log.agent,
        tool_name: a.audit_log.tool_name,
        input: a.audit_log.input,
        reasoning: a.audit_log.reasoning,
        expires_at: a.expires_at,
        created_at: a.audit_log.created_at,
        expired: a.expires_at ? new Date() > a.expires_at : false,
      })),
    });
  } catch (err) {
    console.error('List approvals error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/pending-approvals/:id/approve ────────────────────────────────

approvalsRouter.post('/:id/approve', async (req: Request, res: Response): Promise<void> => {
  try {
    const approvalId = parseInt(String(req.params['id'] ?? ''), 10);
    const db = getDb();

    const approval = await db.pendingApproval.findUnique({
      where: { id: approvalId },
      include: { audit_log: true },
    });

    if (!approval) {
      res.status(404).json({ error: 'Approval not found' });
      return;
    }

    if (approval.status !== 'pending') {
      res.status(409).json({ error: `Approval is already ${approval.status}` });
      return;
    }

    // Check if expired
    if (approval.expires_at && new Date() > approval.expires_at) {
      res.status(410).json({ error: 'Approval has expired' });
      return;
    }

    // Get the original tool call context
    const context = await getApprovalContext(approval.audit_log_id);
    if (!context) {
      res.status(500).json({ error: 'Could not retrieve original tool context' });
      return;
    }

    // Execute the approved action
    const executionResult = await executeApprovedAction(context.toolName, context.args);

    // Mark approval as resolved
    await db.pendingApproval.update({
      where: { id: approvalId },
      data: {
        status: 'approved',
        resolved_by: req.user!.userId,
        resolved_at: new Date(),
      },
    });

    // Update audit log with approver
    await db.agentAuditLog.update({
      where: { id: approval.audit_log_id },
      data: { approved_by: req.user!.userId },
    });

    res.json({
      status: 'approved',
      approval_id: approvalId,
      tool_name: context.toolName,
      result: executionResult,
    });
  } catch (err) {
    console.error('Approve error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/pending-approvals/:id/reject ─────────────────────────────────

const rejectSchema = z.object({ reason: z.string().optional() });

approvalsRouter.post('/:id/reject', async (req: Request, res: Response): Promise<void> => {
  try {
    const approvalId = parseInt(String(req.params['id'] ?? ''), 10);
    const parsed = rejectSchema.safeParse(req.body);
    const db = getDb();

    const approval = await db.pendingApproval.findUnique({ where: { id: approvalId } });

    if (!approval) {
      res.status(404).json({ error: 'Approval not found' });
      return;
    }

    if (approval.status !== 'pending') {
      res.status(409).json({ error: `Approval is already ${approval.status}` });
      return;
    }

    await db.pendingApproval.update({
      where: { id: approvalId },
      data: {
        status: 'rejected',
        resolved_by: req.user!.userId,
        resolved_at: new Date(),
      },
    });

    res.json({
      status: 'rejected',
      approval_id: approvalId,
      reason: parsed.success ? parsed.data.reason : undefined,
    });
  } catch (err) {
    console.error('Reject error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

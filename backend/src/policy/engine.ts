// ==============================================================================
// Policy Engine — evaluatePolicy() entry point
// ==============================================================================
// Every Ops Agent tool call that mutates state passes through this before
// executing. Dispatches to rule-specific handlers, logs to agent_audit_log,
// and creates pending_approvals when needed.

import { getDb } from '../db.js';
import {
  rulePricing,
  ruleGateOverride,
  ruleSensorRetry,
  ruleAnomalyFlag,
  ruleStaffDispatch,
  type PolicyResult,
} from './rules.js';

export type { PolicyResult };

export interface PolicyContext {
  /** The agent making the call ('driver' | 'ops') */
  agent: 'driver' | 'ops';
  /** Optional user ID of the operator if authenticated */
  userId?: string;
}

// ─── Rule Dispatch Map ──────────────────────────────────────────────────────

const RULE_MAP: Record<string, (args: Record<string, unknown>) => Promise<PolicyResult>> = {
  adjust_pricing: rulePricing,
  override_gate: ruleGateOverride,
  retry_sensor: ruleSensorRetry,
  flag_anomaly: ruleAnomalyFlag,
  dispatch_staff: ruleStaffDispatch,
};

// Expiry durations for pending approvals
const GATE_TOOLS = new Set(['override_gate']);
const DEFAULT_EXPIRY_MINUTES = 30;
const GATE_EXPIRY_MINUTES = 10;

// ─── Main Entry Point ───────────────────────────────────────────────────────

/**
 * Evaluate a policy for a given tool call.
 *
 * 1. Dispatches to the appropriate rule handler
 * 2. Logs the evaluation to agent_audit_log (always, regardless of outcome)
 * 3. If pending_approval, creates a pending_approvals row with expiry
 *
 * @returns The policy result with status and reason
 */
export async function evaluatePolicy(
  toolName: string,
  args: Record<string, unknown>,
  context: PolicyContext,
): Promise<PolicyResult & { auditLogId: number }> {
  const db = getDb();

  // Find the rule handler
  const ruleHandler = RULE_MAP[toolName];

  let result: PolicyResult;

  if (!ruleHandler) {
    // No policy rule defined for this tool — default to applied
    // Read-only tools (like get_zone_metrics) bypass the engine entirely,
    // so this is a fallback for any unknown mutating tool.
    result = {
      status: 'applied',
      reason: `No policy rule defined for tool "${toolName}" — defaulting to applied`,
    };
  } else {
    // Evaluate the rule
    result = await ruleHandler(args);
  }

  // Always log to agent_audit_log
  const inputData = (result.modifiedArgs ?? args) as Record<string, unknown>;
  const auditEntry = await db.agentAuditLog.create({
    data: {
      agent: context.agent,
      tool_name: toolName,
      input: inputData as unknown as import('@prisma/client').Prisma.InputJsonValue,
      outcome: result.status,
      reasoning: result.reason,
    },
  });

  // If pending_approval, create a pending_approvals row
  if (result.status === 'pending_approval') {
    const expiryMinutes = GATE_TOOLS.has(toolName)
      ? GATE_EXPIRY_MINUTES
      : DEFAULT_EXPIRY_MINUTES;

    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    await db.pendingApproval.create({
      data: {
        audit_log_id: auditEntry.id,
        expires_at: expiresAt,
        status: 'pending',
      },
    });

    console.log(
      `[Policy] ${toolName}: pending_approval (expires in ${expiryMinutes}min) — ${result.reason}`
    );
  } else {
    console.log(`[Policy] ${toolName}: ${result.status} — ${result.reason}`);
  }

  return { ...result, auditLogId: auditEntry.id };
}

// ─── Execute Approved Action ────────────────────────────────────────────────

/**
 * Called when an admin approves a pending action.
 * Re-dispatches the original tool call's execution.
 * This is used by the approval endpoint in Phase 7.
 */
export async function getApprovalContext(auditLogId: number): Promise<{
  toolName: string;
  args: Record<string, unknown>;
} | null> {
  const db = getDb();
  const entry = await db.agentAuditLog.findUnique({ where: { id: auditLogId } });

  if (!entry || !entry.tool_name) return null;

  return {
    toolName: entry.tool_name,
    args: (entry.input as Record<string, unknown>) ?? {},
  };
}

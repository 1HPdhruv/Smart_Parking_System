// ==============================================================================
// Policy Rules — Individual rule implementations for each Ops Agent tool
// ==============================================================================
// Each rule returns { status, reason, modifiedArgs? }.
// modifiedArgs is used when the engine needs to override agent-provided values
// (e.g., forcing severity upgrade on flag_anomaly).

import { getDb } from '../db.js';

export interface PolicyResult {
  status: 'applied' | 'pending_approval' | 'rejected';
  reason: string;
  modifiedArgs?: Record<string, unknown>;
}

// ─── 1. adjust_pricing ──────────────────────────────────────────────────────
// Applied ONLY if ALL of:
//   - new_tariff_per_hour is within [min_tariff_pct, max_tariff_pct] of zone's base_tariff
//   - Change from current tariff is within max_step_change_pct
//   - No more than 3 pricing changes for that zone in the last 60 minutes
// Otherwise: pending_approval

export async function rulePricing(args: Record<string, unknown>): Promise<PolicyResult> {
  const zoneId = args['zone_id'] as string;
  const newTariff = Number(args['new_tariff_per_hour']);

  if (!zoneId || isNaN(newTariff)) {
    return { status: 'rejected', reason: 'Missing zone_id or invalid new_tariff_per_hour' };
  }

  const db = getDb();
  const zone = await db.zone.findUnique({ where: { id: zoneId } });

  if (!zone) {
    return { status: 'rejected', reason: `Zone "${zoneId}" not found` };
  }

  const baseTariff = Number(zone.base_tariff_per_hour);
  const minPct = Number(zone.min_tariff_pct);
  const maxPct = Number(zone.max_tariff_pct);
  const maxStepPct = Number(zone.max_step_change_pct);

  // Check: new tariff within absolute bounds
  const minAllowed = baseTariff * (minPct / 100);
  const maxAllowed = baseTariff * (maxPct / 100);

  if (newTariff < minAllowed || newTariff > maxAllowed) {
    return {
      status: 'pending_approval',
      reason: `New tariff ₹${newTariff}/hr is outside allowed range [₹${minAllowed}, ₹${maxAllowed}] (${minPct}%–${maxPct}% of base ₹${baseTariff})`,
    };
  }

  // Check: step change from current tariff
  const currentTariff = baseTariff; // base_tariff_per_hour is the current effective tariff
  const stepChange = Math.abs(newTariff - currentTariff) / currentTariff * 100;

  if (stepChange > maxStepPct) {
    return {
      status: 'pending_approval',
      reason: `Step change of ${stepChange.toFixed(1)}% exceeds max allowed ${maxStepPct}% (current: ₹${currentTariff}, new: ₹${newTariff})`,
    };
  }

  // Check: rate limit — no more than 3 pricing changes in last 60 minutes
  const sixtyMinAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentChanges = await db.agentAuditLog.count({
    where: {
      tool_name: 'adjust_pricing',
      outcome: 'applied',
      created_at: { gte: sixtyMinAgo },
      input: { path: ['zone_id'], equals: zoneId },
    },
  });

  if (recentChanges >= 3) {
    return {
      status: 'pending_approval',
      reason: `Rate limit: ${recentChanges} pricing changes for zone "${zoneId}" in the last 60 minutes (max 3)`,
    };
  }

  return {
    status: 'applied',
    reason: `Tariff change ₹${currentTariff} → ₹${newTariff}/hr approved (within bounds, step ${stepChange.toFixed(1)}%, ${recentChanges}/3 recent changes)`,
  };
}

// ─── 2. override_gate ───────────────────────────────────────────────────────
// open_once + linked_booking_id → verify booking is active+paid+same zone; applied/rejected
// open_once without booking or hold_open → always pending_approval

export async function ruleGateOverride(args: Record<string, unknown>): Promise<PolicyResult> {
  const action = args['action'] as string;
  const bookingId = args['linked_booking_id'] as string | undefined;

  // hold_open always requires approval
  if (action === 'hold_open') {
    return {
      status: 'pending_approval',
      reason: 'hold_open action always requires admin approval',
    };
  }

  // open_once without a linked booking requires approval
  if (action === 'open_once' && !bookingId) {
    return {
      status: 'pending_approval',
      reason: 'open_once without a linked booking requires admin approval',
    };
  }

  // open_once with a linked booking — verify it
  if (action === 'open_once' && bookingId) {
    const db = getDb();
    const booking = await db.booking.findUnique({ where: { id: bookingId } });

    if (!booking) {
      return { status: 'rejected', reason: `Booking "${bookingId}" not found` };
    }

    if (booking.status !== 'active') {
      return { status: 'rejected', reason: `Booking "${bookingId}" is not active (status: ${booking.status})` };
    }

    if (booking.payment_status !== 'paid') {
      return { status: 'rejected', reason: `Booking "${bookingId}" is not paid (payment: ${booking.payment_status})` };
    }

    // Verify booking belongs to the gate's zone
    const gateId = args['gate_id'] as string;
    // Gate ID convention: extract zone from gate_id (e.g., "zone_a_entry" → "zone_a")
    // or check against the booking's zone_id directly
    const gateZone = gateId?.replace(/_(?:entry|exit)$/, '');
    if (gateZone && booking.zone_id !== gateZone) {
      return {
        status: 'rejected',
        reason: `Booking "${bookingId}" belongs to zone "${booking.zone_id}" but gate "${gateId}" belongs to zone "${gateZone}"`,
      };
    }

    return {
      status: 'applied',
      reason: `Gate override approved: booking ${bookingId} is active, paid, and in the correct zone`,
    };
  }

  // Unknown action
  return {
    status: 'pending_approval',
    reason: `Unknown gate action "${action}" — requires admin approval`,
  };
}

// ─── 3. retry_sensor ────────────────────────────────────────────────────────
// Applied unless >3 retries on that sensor_id in last 60 minutes, then rejected.

export async function ruleSensorRetry(args: Record<string, unknown>): Promise<PolicyResult> {
  const sensorId = args['sensor_id'] as string;

  if (!sensorId) {
    return { status: 'rejected', reason: 'Missing sensor_id' };
  }

  const db = getDb();
  const sixtyMinAgo = new Date(Date.now() - 60 * 60 * 1000);

  const recentRetries = await db.agentAuditLog.count({
    where: {
      tool_name: 'retry_sensor',
      outcome: 'applied',
      created_at: { gte: sixtyMinAgo },
      input: { path: ['sensor_id'], equals: sensorId },
    },
  });

  if (recentRetries > 3) {
    return {
      status: 'rejected',
      reason: `Sensor "${sensorId}" has been retried ${recentRetries} times in the last 60 minutes (max 3). Use dispatch_staff instead.`,
    };
  }

  return {
    status: 'applied',
    reason: `Sensor retry approved (${recentRetries}/3 recent retries for "${sensorId}")`,
  };
}

// ─── 4. flag_anomaly ────────────────────────────────────────────────────────
// Always applied (it's just logging), but force severity to at least 'medium'
// when category is 'suspected_fraud' or 'barrier_fault'.

const SEVERITY_ORDER = ['low', 'medium', 'high', 'critical'];
const FORCE_MEDIUM_CATEGORIES = ['suspected_fraud', 'barrier_fault'];

export async function ruleAnomalyFlag(args: Record<string, unknown>): Promise<PolicyResult> {
  const category = args['category'] as string;
  const severity = args['severity'] as string;
  let modifiedArgs: Record<string, unknown> | undefined;

  if (FORCE_MEDIUM_CATEGORIES.includes(category)) {
    const severityIndex = SEVERITY_ORDER.indexOf(severity);
    const mediumIndex = SEVERITY_ORDER.indexOf('medium');

    if (severityIndex < mediumIndex) {
      // Severity is below medium — force upgrade
      modifiedArgs = { ...args, severity: 'medium' };
      return {
        status: 'applied',
        reason: `Anomaly logged. Severity upgraded from "${severity}" to "medium" because category is "${category}"`,
        modifiedArgs,
      };
    }
  }

  return {
    status: 'applied',
    reason: `Anomaly flagged: category="${category}", severity="${severity}"`,
  };
}

// ─── 5. dispatch_staff ──────────────────────────────────────────────────────
// Always applied. If priority is 'urgent', trigger notification.

export async function ruleStaffDispatch(args: Record<string, unknown>): Promise<PolicyResult> {
  const priority = args['priority'] as string;
  const isUrgent = priority === 'urgent';

  if (isUrgent) {
    // Trigger immediate notification (stubbed as log line per spec)
    console.log(`🚨 [URGENT DISPATCH] Zone: ${args['zone_id']}, Summary: ${args['issue_summary']}`);
    // TODO: Wire to webhook/Slack/email when notification service is configured
  }

  return {
    status: 'applied',
    reason: isUrgent
      ? `Staff dispatched with URGENT priority — notification triggered`
      : `Staff dispatched with priority="${priority}"`,
  };
}

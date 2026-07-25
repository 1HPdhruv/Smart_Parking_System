// ==============================================================================
// Ops Agent — Tool Execution Handlers
// ==============================================================================
// All mutating tools go through evaluatePolicy() first.
// get_zone_metrics is read-only and bypasses the policy engine.

import { getDb } from '../../db.js';
import { evaluatePolicy } from '../../policy/engine.js';
import { mqttPublish } from '../../mqtt/client.js';
import type { ConversationContext } from '../conversation.js';

// ─── Handler Dispatch ───────────────────────────────────────────────────────

export async function handleOpsTool(
  toolName: string,
  args: Record<string, unknown>,
  context: ConversationContext,
): Promise<unknown> {
  switch (toolName) {
    case 'get_zone_metrics':
      // Read-only: bypasses policy engine
      return handleGetZoneMetrics(args);

    case 'adjust_pricing':
    case 'flag_anomaly':
    case 'retry_sensor':
    case 'override_gate':
    case 'dispatch_staff':
      return handleMutatingTool(toolName, args, context);

    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}

// ─── get_zone_metrics (read-only) ───────────────────────────────────────────

async function handleGetZoneMetrics(args: Record<string, unknown>) {
  const zoneIds = args['zone_ids'] as string[] | undefined;
  const timeframeStart = new Date(args['timeframe_start'] as string);
  const timeframeEnd = new Date(args['timeframe_end'] as string);
  const metrics = args['metrics'] as string[] | undefined;

  const db = getDb();

  // Fetch requested zones
  const zones = await db.zone.findMany({
    where: zoneIds ? { id: { in: zoneIds } } : undefined,
    include: { slots: true },
  });

  const results = await Promise.all(
    zones.map(async (zone) => {
      const zoneResult: Record<string, unknown> = {
        zone_id: zone.id,
        zone_name: zone.name,
        base_tariff_per_hour: Number(zone.base_tariff_per_hour),
      };

      const allMetrics = !metrics || metrics.length === 0;

      if (allMetrics || metrics?.includes('occupancy')) {
        const occupied = zone.slots.filter((s) => s.status === 'occupied').length;
        zoneResult['occupancy'] = {
          total_slots: zone.slots.length,
          occupied,
          free: zone.slots.length - occupied,
          rate: zone.slots.length > 0 ? Math.round((occupied / zone.slots.length) * 100) : 0,
        };
      }

      if (allMetrics || metrics?.includes('bookings')) {
        const bookings = await db.booking.findMany({
          where: {
            zone_id: zone.id,
            created_at: { gte: timeframeStart, lte: timeframeEnd },
          },
        });
        zoneResult['bookings'] = {
          total: bookings.length,
          active: bookings.filter((b) => b.status === 'active').length,
          completed: bookings.filter((b) => b.status === 'completed').length,
          cancelled: bookings.filter((b) => b.status === 'cancelled').length,
        };
      }

      if (allMetrics || metrics?.includes('revenue')) {
        const paidBookings = await db.booking.findMany({
          where: {
            zone_id: zone.id,
            payment_status: 'paid',
            created_at: { gte: timeframeStart, lte: timeframeEnd },
          },
        });
        const revenue = paidBookings.reduce((sum, b) => sum + Number(b.quoted_price ?? 0), 0);
        zoneResult['revenue'] = { total_inr: Math.round(revenue * 100) / 100 };
      }

      if (allMetrics || metrics?.includes('sensor_health')) {
        const sensorData = await db.sensorData.findMany({
          where: {
            slot: { zone_id: zone.id },
            recorded_at: { gte: timeframeStart, lte: timeframeEnd },
          },
          orderBy: { recorded_at: 'desc' },
          take: 100,
        });
        zoneResult['sensor_health'] = {
          recent_readings: sensorData.length,
          status: sensorData.length > 0 ? 'reporting' : 'no_recent_data',
        };
      }

      if (allMetrics || metrics?.includes('anomalies')) {
        const anomalies = await db.anomaly.findMany({
          where: {
            zone_id: zone.id,
            created_at: { gte: timeframeStart, lte: timeframeEnd },
          },
        });
        zoneResult['anomalies'] = {
          total: anomalies.length,
          by_severity: {
            critical: anomalies.filter((a) => a.severity === 'critical').length,
            high: anomalies.filter((a) => a.severity === 'high').length,
            medium: anomalies.filter((a) => a.severity === 'medium').length,
            low: anomalies.filter((a) => a.severity === 'low').length,
          },
        };
      }

      return zoneResult;
    }),
  );

  return {
    timeframe: { start: timeframeStart.toISOString(), end: timeframeEnd.toISOString() },
    zones: results,
  };
}

// ─── Mutating tools — all go through the policy engine ──────────────────────

async function handleMutatingTool(
  toolName: string,
  args: Record<string, unknown>,
  context: ConversationContext,
) {
  // Step 1: Evaluate policy (logs to audit, creates pending_approval if needed)
  const policyResult = await evaluatePolicy(toolName, args, {
    agent: 'ops',
    userId: context.userId,
  });

  // Step 2: If rejected or pending_approval, return without executing
  if (policyResult.status !== 'applied') {
    return {
      status: policyResult.status,
      reason: policyResult.reason,
      audit_log_id: policyResult.auditLogId,
      message:
        policyResult.status === 'pending_approval'
          ? 'Action queued for admin approval. No changes have been made yet.'
          : 'Action was rejected by the policy engine. No changes have been made.',
    };
  }

  // Step 3: Execute the tool with potentially modified args (e.g., severity upgrade)
  const effectiveArgs = (policyResult.modifiedArgs ?? args) as Record<string, unknown>;

  const result = await executeOpsAction(toolName, effectiveArgs);
  return {
    status: 'applied',
    reason: policyResult.reason,
    audit_log_id: policyResult.auditLogId,
    result,
  };
}

// ─── Ops Action Execution ───────────────────────────────────────────────────

async function executeOpsAction(
  toolName: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  const db = getDb();

  switch (toolName) {
    case 'adjust_pricing': {
      const zoneId = args['zone_id'] as string;
      const newTariff = Number(args['new_tariff_per_hour']);
      const reason = args['reason'] as string;

      await db.zone.update({
        where: { id: zoneId },
        data: { base_tariff_per_hour: newTariff },
      });

      return {
        zone_id: zoneId,
        new_tariff_per_hour: newTariff,
        reason,
        updated_at: new Date().toISOString(),
      };
    }

    case 'flag_anomaly': {
      const anomaly = await db.anomaly.create({
        data: {
          zone_id: args['zone_id'] as string,
          sensor_id: args['sensor_id'] as string | undefined,
          category: args['category'] as string,
          severity: args['severity'] as string,
          description: args['description'] as string,
        },
      });
      return { anomaly_id: anomaly.id, logged_at: anomaly.created_at };
    }

    case 'retry_sensor': {
      const sensorId = args['sensor_id'] as string;
      // Publish a retry command via MQTT to the control channel
      mqttPublish(`parking/control/sensor/${sensorId}/retry`, JSON.stringify({
        action: 'retry',
        reason: args['reason'],
        timestamp: new Date().toISOString(),
      }));
      return { sensor_id: sensorId, retry_command_sent: true };
    }

    case 'override_gate': {
      const gateId = args['gate_id'] as string;
      const action = args['action'] as string;
      // Publish gate override command
      mqttPublish(`parking/control/gate/${gateId}`, JSON.stringify({
        action,
        linked_booking_id: args['linked_booking_id'],
        reason: args['reason'],
        timestamp: new Date().toISOString(),
      }));
      return { gate_id: gateId, action, command_sent: true };
    }

    case 'dispatch_staff': {
      // Record dispatch in issue_reports for tracking
      const report = await db.issueReport.create({
        data: {
          zone_id: args['zone_id'] as string,
          category: 'staff_dispatch',
          description: args['issue_summary'] as string,
          status: 'open',
        },
      });
      return {
        dispatch_id: report.id,
        zone_id: args['zone_id'],
        priority: args['priority'],
        dispatched_at: new Date().toISOString(),
      };
    }

    default:
      return { error: `No executor for tool "${toolName}"` };
  }
}

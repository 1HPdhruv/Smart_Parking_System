// ==============================================================================
// Approved Action Executor — Re-runs the original tool call on admin approval
// ==============================================================================

import { getDb } from '../db.js';
import { mqttPublish } from '../mqtt/client.js';

/**
 * Execute an ops tool action that was previously pending_approval.
 * Mirrors the execution logic in ops/handlers.ts executeOpsAction().
 */
export async function executeApprovedAction(
  toolName: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  const db = getDb();

  switch (toolName) {
    case 'adjust_pricing': {
      const zoneId = args['zone_id'] as string;
      const newTariff = Number(args['new_tariff_per_hour']);
      await db.zone.update({
        where: { id: zoneId },
        data: { base_tariff_per_hour: newTariff },
      });
      return { zone_id: zoneId, new_tariff_per_hour: newTariff, updated_at: new Date().toISOString() };
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
      return { anomaly_id: anomaly.id };
    }

    case 'override_gate': {
      const gateId = args['gate_id'] as string;
      const action = args['action'] as string;
      mqttPublish(`parking/control/gate/${gateId}`, JSON.stringify({
        action,
        linked_booking_id: args['linked_booking_id'],
        reason: `Admin approved: ${args['reason']}`,
        timestamp: new Date().toISOString(),
      }));
      return { gate_id: gateId, action, command_sent: true };
    }

    case 'retry_sensor': {
      const sensorId = args['sensor_id'] as string;
      mqttPublish(`parking/control/sensor/${sensorId}/retry`, JSON.stringify({
        action: 'retry',
        reason: args['reason'],
        timestamp: new Date().toISOString(),
      }));
      return { sensor_id: sensorId, retry_command_sent: true };
    }

    case 'dispatch_staff': {
      const report = await db.issueReport.create({
        data: {
          zone_id: args['zone_id'] as string,
          category: 'staff_dispatch',
          description: args['issue_summary'] as string,
          status: 'open',
        },
      });
      return { dispatch_id: report.id, dispatched_at: new Date().toISOString() };
    }

    default:
      throw new Error(`No executor defined for approved action: ${toolName}`);
  }
}

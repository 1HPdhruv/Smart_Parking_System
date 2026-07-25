// ==============================================================================
// Ops Agent — Tool Definitions (JSON Schemas for Claude)
// ==============================================================================
// Exactly the 6 tools from spec section 5.

import type { ToolDefinition } from '../conversation.js';

export const OPS_TOOLS: ToolDefinition[] = [
  {
    name: 'get_zone_metrics',
    description: 'Retrieve operational metrics for one or more parking zones over a time window. Read-only — bypasses policy engine.',
    input_schema: {
      type: 'object',
      properties: {
        zone_ids: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional list of zone IDs to query. If omitted, returns all zones.',
        },
        timeframe_start: {
          type: 'string',
          description: 'ISO 8601 start of the time window',
        },
        timeframe_end: {
          type: 'string',
          description: 'ISO 8601 end of the time window',
        },
        metrics: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['occupancy', 'revenue', 'bookings', 'sensor_health', 'anomalies'],
          },
          description: 'Optional list of specific metrics to include. If omitted, returns all.',
        },
      },
      required: ['timeframe_start', 'timeframe_end'],
    },
  },
  {
    name: 'adjust_pricing',
    description: 'Adjust the hourly tariff for a parking zone. Goes through the policy engine — may result in pending_approval if outside allowed bounds or rate-limited. Always report the actual status from the response.',
    input_schema: {
      type: 'object',
      properties: {
        zone_id: {
          type: 'string',
          description: 'Zone ID to adjust pricing for',
        },
        new_tariff_per_hour: {
          type: 'number',
          description: 'New hourly tariff in INR',
        },
        effective_from: {
          type: 'string',
          description: 'Optional ISO 8601 datetime when the change takes effect',
        },
        effective_until: {
          type: 'string',
          description: 'Optional ISO 8601 datetime when the change expires',
        },
        reason: {
          type: 'string',
          description: 'Reason for the pricing adjustment',
        },
      },
      required: ['zone_id', 'new_tariff_per_hour', 'reason'],
    },
  },
  {
    name: 'flag_anomaly',
    description: 'Log an anomaly detected in a zone or sensor. Always applied (logging only), but severity may be upgraded by policy for suspected_fraud or barrier_fault categories.',
    input_schema: {
      type: 'object',
      properties: {
        zone_id: {
          type: 'string',
          description: 'Zone ID where the anomaly was detected',
        },
        sensor_id: {
          type: 'string',
          description: 'Optional sensor ID involved',
        },
        category: {
          type: 'string',
          description: 'Anomaly category',
          enum: ['suspected_fraud', 'barrier_fault', 'sensor_drift', 'occupancy_mismatch', 'network_issue', 'other'],
        },
        severity: {
          type: 'string',
          description: 'Severity level (may be upgraded by policy engine)',
          enum: ['low', 'medium', 'high', 'critical'],
        },
        description: {
          type: 'string',
          description: 'Detailed description of the anomaly',
        },
      },
      required: ['zone_id', 'category', 'severity', 'description'],
    },
  },
  {
    name: 'retry_sensor',
    description: 'Retry a sensor that has stopped reporting or is malfunctioning. Rate-limited to 3 retries per sensor per 60 minutes — after that, policy engine will reject and you should use dispatch_staff.',
    input_schema: {
      type: 'object',
      properties: {
        sensor_id: {
          type: 'string',
          description: 'Sensor ID to retry (e.g., "zone_a_slot3")',
        },
        reason: {
          type: 'string',
          description: 'Reason for the retry attempt',
        },
      },
      required: ['sensor_id', 'reason'],
    },
  },
  {
    name: 'override_gate',
    description: 'Override a gate to open. open_once with a linked booking is auto-approved if valid. open_once without a booking or hold_open always goes to pending_approval. Report the exact status returned.',
    input_schema: {
      type: 'object',
      properties: {
        gate_id: {
          type: 'string',
          description: 'Gate ID (e.g., "zone_a_entry", "zone_b_exit")',
        },
        action: {
          type: 'string',
          description: 'Action to perform',
          enum: ['open_once', 'hold_open'],
        },
        linked_booking_id: {
          type: 'string',
          description: 'Optional booking ID to link the override to (recommended for open_once)',
        },
        reason: {
          type: 'string',
          description: 'Reason for the gate override',
        },
      },
      required: ['gate_id', 'action', 'reason'],
    },
  },
  {
    name: 'dispatch_staff',
    description: 'Dispatch staff to a zone for an issue. Always applied. If priority is "urgent", an immediate notification is triggered.',
    input_schema: {
      type: 'object',
      properties: {
        zone_id: {
          type: 'string',
          description: 'Zone where staff should be dispatched',
        },
        priority: {
          type: 'string',
          description: 'Dispatch priority level',
          enum: ['low', 'normal', 'urgent'],
        },
        issue_summary: {
          type: 'string',
          description: 'Brief summary of why staff are needed',
        },
        linked_ticket_id: {
          type: 'number',
          description: 'Optional linked issue report or anomaly ID',
        },
      },
      required: ['zone_id', 'priority', 'issue_summary'],
    },
  },
];

// ==============================================================================
// Driver Agent — Tool Definitions (JSON Schemas for Claude)
// ==============================================================================
// These are the exact tool definitions from spec section 4.

import type { ToolDefinition } from '../conversation.js';

export const DRIVER_TOOLS: ToolDefinition[] = [
  {
    name: 'search_availability',
    description: 'Search for available parking slots near a location for a given time window. Returns a list of available zones and slots with their details.',
    input_schema: {
      type: 'object',
      properties: {
        location: {
          type: 'string',
          description: 'Text description of the desired parking location (e.g., "Main Block", "Tech Park", zone name)',
        },
        latitude: {
          type: 'number',
          description: 'Optional latitude for proximity search',
        },
        longitude: {
          type: 'number',
          description: 'Optional longitude for proximity search',
        },
        start_time: {
          type: 'string',
          description: 'ISO 8601 datetime for when parking begins (e.g., "2025-01-15T09:00:00Z")',
        },
        end_time: {
          type: 'string',
          description: 'ISO 8601 datetime for when parking ends',
        },
        vehicle_type: {
          type: 'string',
          description: 'Type of vehicle (e.g., "car", "bike")',
          enum: ['car', 'bike'],
        },
        max_distance_km: {
          type: 'number',
          description: 'Optional maximum distance in km from the specified location',
        },
      },
      required: ['location', 'start_time', 'end_time', 'vehicle_type'],
    },
  },
  {
    name: 'get_price_quote',
    description: 'Get a server-computed price quote for parking in a specific zone for a given time window. You MUST call this before stating any price to the driver.',
    input_schema: {
      type: 'object',
      properties: {
        zone_id: {
          type: 'string',
          description: 'The zone ID to get pricing for (e.g., "zone_a")',
        },
        slot_id: {
          type: 'string',
          description: 'Optional specific slot ID',
        },
        start_time: {
          type: 'string',
          description: 'ISO 8601 datetime for parking start',
        },
        end_time: {
          type: 'string',
          description: 'ISO 8601 datetime for parking end',
        },
      },
      required: ['zone_id', 'start_time', 'end_time'],
    },
  },
  {
    name: 'create_booking',
    description: 'Create a parking booking. ONLY call this after the driver has explicitly confirmed the quoted price. The server will re-validate the price before confirming.',
    input_schema: {
      type: 'object',
      properties: {
        driver_id: {
          type: 'string',
          description: 'The authenticated driver\'s user ID',
        },
        zone_id: {
          type: 'string',
          description: 'Zone ID for the booking',
        },
        slot_id: {
          type: 'string',
          description: 'Specific slot ID to book',
        },
        start_time: {
          type: 'string',
          description: 'ISO 8601 datetime for parking start',
        },
        end_time: {
          type: 'string',
          description: 'ISO 8601 datetime for parking end',
        },
        quoted_price: {
          type: 'number',
          description: 'The price previously quoted by get_price_quote',
        },
        vehicle_plate: {
          type: 'string',
          description: 'Vehicle license plate or RFID tag',
        },
        payment_method_id: {
          type: 'string',
          description: 'Optional payment method identifier',
        },
      },
      required: ['driver_id', 'zone_id', 'slot_id', 'start_time', 'end_time', 'quoted_price', 'vehicle_plate'],
    },
  },
  {
    name: 'cancel_booking',
    description: 'Cancel an active booking. The refund amount is computed by the server, not by you. If the refund exceeds a threshold, the cancellation may require admin review.',
    input_schema: {
      type: 'object',
      properties: {
        booking_id: {
          type: 'string',
          description: 'The booking ID to cancel',
        },
        reason: {
          type: 'string',
          description: 'Optional reason for cancellation',
        },
      },
      required: ['booking_id'],
    },
  },
  {
    name: 'extend_booking',
    description: 'Extend the end time of an active booking.',
    input_schema: {
      type: 'object',
      properties: {
        booking_id: {
          type: 'string',
          description: 'The booking ID to extend',
        },
        new_end_time: {
          type: 'string',
          description: 'New ISO 8601 end datetime (must be after current end time)',
        },
      },
      required: ['booking_id', 'new_end_time'],
    },
  },
  {
    name: 'get_directions',
    description: 'Get directions to a parking zone from the driver\'s current location.',
    input_schema: {
      type: 'object',
      properties: {
        zone_id: {
          type: 'string',
          description: 'The zone ID to get directions to',
        },
        origin_latitude: {
          type: 'number',
          description: 'Optional starting latitude',
        },
        origin_longitude: {
          type: 'number',
          description: 'Optional starting longitude',
        },
      },
      required: ['zone_id'],
    },
  },
  {
    name: 'report_issue',
    description: 'Report an issue or problem with a parking zone or booking. This creates a support ticket — it does not resolve the issue.',
    input_schema: {
      type: 'object',
      properties: {
        zone_id: {
          type: 'string',
          description: 'The zone ID where the issue is occurring',
        },
        category: {
          type: 'string',
          description: 'Issue category',
          enum: ['billing', 'access', 'safety', 'cleanliness', 'equipment', 'other'],
        },
        description: {
          type: 'string',
          description: 'Detailed description of the issue',
        },
        booking_id: {
          type: 'string',
          description: 'Optional related booking ID',
        },
      },
      required: ['zone_id', 'category', 'description'],
    },
  },
];

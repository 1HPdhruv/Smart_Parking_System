// ==============================================================================
// MQTT Client — Connection management for ESP32 device communication
// ==============================================================================
// Connects to the MQTT broker and dispatches incoming messages to handlers.
// Subscribes to exactly the topics from the spec section 3 contract.
// Runs in-process with Express (Render web services support long-running processes).

import mqtt from 'mqtt';
import { config } from '../config.js';
import { handleSlotStatus, handleEntryVehicle, handleExitRequest } from './handlers.js';

let client: mqtt.MqttClient | null = null;

// ─── Topic patterns the ESP32 firmware publishes to ─────────────────────────
// We subscribe with MQTT wildcards to catch all zones/slots.

const SUBSCRIPTIONS = [
  'parking/+/+/status',        // parking/{zone_id}/slot{n}/status
  'parking/+/entry/vehicle_id', // parking/{zone_id}/entry/vehicle_id
  'parking/+/exit/request',     // parking/{zone_id}/exit/request
  'parking/control/#',          // manual override commands (listen only)
];

// ─── Topic Parsing ──────────────────────────────────────────────────────────

interface ParsedSlotStatus {
  type: 'slot_status';
  zoneId: string;
  slotKey: string;  // e.g. "slot1", "slot2"
}

interface ParsedEntryVehicle {
  type: 'entry_vehicle';
  zoneId: string;
}

interface ParsedExitRequest {
  type: 'exit_request';
  zoneId: string;
}

interface ParsedControl {
  type: 'control';
  subtopic: string;
}

type ParsedTopic = ParsedSlotStatus | ParsedEntryVehicle | ParsedExitRequest | ParsedControl | null;

function parseTopic(topic: string): ParsedTopic {
  const parts = topic.split('/');

  // All topics start with "parking/"
  if (parts[0] !== 'parking') return null;

  // parking/control/...
  if (parts[1] === 'control') {
    return { type: 'control', subtopic: parts.slice(2).join('/') };
  }

  const zoneId = parts[1];
  if (!zoneId) return null;

  // parking/{zone_id}/slot{n}/status
  if (parts[3] === 'status' && parts[2]?.startsWith('slot')) {
    return { type: 'slot_status', zoneId, slotKey: parts[2] };
  }

  // parking/{zone_id}/entry/vehicle_id
  if (parts[2] === 'entry' && parts[3] === 'vehicle_id') {
    return { type: 'entry_vehicle', zoneId };
  }

  // parking/{zone_id}/exit/request
  if (parts[2] === 'exit' && parts[3] === 'request') {
    return { type: 'exit_request', zoneId };
  }

  return null;
}

// ─── Message Router ─────────────────────────────────────────────────────────

async function onMessage(topic: string, payload: Buffer) {
  const message = payload.toString().trim();
  const parsed = parseTopic(topic);

  if (!parsed) {
    console.warn(`[MQTT] Unknown topic: ${topic}`);
    return;
  }

  try {
    switch (parsed.type) {
      case 'slot_status':
        await handleSlotStatus(parsed.zoneId, parsed.slotKey, message);
        break;

      case 'entry_vehicle':
        await handleEntryVehicle(parsed.zoneId, message, publish);
        break;

      case 'exit_request':
        await handleExitRequest(parsed.zoneId, message, publish);
        break;

      case 'control':
        console.log(`[MQTT] Control message on ${parsed.subtopic}: ${message}`);
        // Control messages are listened to but not acted on automatically.
        // The Ops Agent's override_gate tool publishes to parking/control/# separately.
        break;
    }
  } catch (err) {
    console.error(`[MQTT] Error handling ${topic}:`, err);
  }
}

// ─── Publish Helper ─────────────────────────────────────────────────────────

function publish(topic: string, message: string): void {
  if (!client || !client.connected) {
    console.error(`[MQTT] Cannot publish to ${topic} — not connected`);
    return;
  }
  client.publish(topic, message, { qos: 1 }, (err) => {
    if (err) {
      console.error(`[MQTT] Publish error on ${topic}:`, err);
    } else {
      console.log(`[MQTT] Published to ${topic}: ${message}`);
    }
  });
}

// ─── Connect ────────────────────────────────────────────────────────────────

export function connectMqtt(): mqtt.MqttClient {
  if (client) return client;

  const brokerUrl = config.mqttBrokerUrl;
  console.log(`[MQTT] Connecting to ${brokerUrl}...`);

  const options: mqtt.IClientOptions = {
    clientId: `parker-os-backend-${Date.now()}`,
    clean: true,
    reconnectPeriod: 5000,      // Auto-reconnect every 5s
    connectTimeout: 30000,
    keepalive: 60,
    ...(config.mqttUser && {
      username: config.mqttUser,
      password: config.mqttPassword,
    }),
  };

  client = mqtt.connect(brokerUrl, options);

  client.on('connect', () => {
    console.log('[MQTT] Connected to broker');

    // Subscribe to all topics
    for (const topic of SUBSCRIPTIONS) {
      client!.subscribe(topic, { qos: 1 }, (err) => {
        if (err) {
          console.error(`[MQTT] Subscribe error for ${topic}:`, err);
        } else {
          console.log(`[MQTT] Subscribed to ${topic}`);
        }
      });
    }
  });

  client.on('message', (topic, payload) => {
    // Fire-and-forget async handling — errors are caught inside onMessage
    void onMessage(topic, payload);
  });

  client.on('error', (err) => {
    console.error('[MQTT] Connection error:', err.message);
  });

  client.on('reconnect', () => {
    console.log('[MQTT] Reconnecting...');
  });

  client.on('close', () => {
    console.log('[MQTT] Connection closed');
  });

  client.on('offline', () => {
    console.warn('[MQTT] Client went offline');
  });

  return client;
}

// ─── Disconnect ─────────────────────────────────────────────────────────────

export async function disconnectMqtt(): Promise<void> {
  if (client) {
    return new Promise((resolve) => {
      client!.end(false, () => {
        console.log('[MQTT] Disconnected');
        client = null;
        resolve();
      });
    });
  }
}

// ─── Export publish for use by handlers and agents ───────────────────────────

export function mqttPublish(topic: string, message: string): void {
  publish(topic, message);
}

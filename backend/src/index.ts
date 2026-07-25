// ==============================================================================
// Parker OS Backend — Express Application (Complete)
// ==============================================================================

import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { disconnectDb } from './db.js';
import { authRouter } from './auth/routes.js';
import { connectMqtt, disconnectMqtt } from './mqtt/client.js';
import { driverAgentRouter } from './agents/driver/route.js';
import { opsAgentRouter } from './agents/ops/route.js';
import { zonesRouter } from './routes/zones.js';
import { approvalsRouter } from './routes/approvals.js';
import { auditRouter } from './routes/audit.js';

const app = express();

// ─── Global Middleware ──────────────────────────────────────────────────────

app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json({ limit: '1mb' }));

// ─── Health Check ───────────────────────────────────────────────────────────

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'parker-os-backend', timestamp: new Date().toISOString() });
});

// ─── Routes ─────────────────────────────────────────────────────────────────

app.use('/api/auth', authRouter);
app.use('/api/driver-agent', driverAgentRouter);
app.use('/api/ops-agent', opsAgentRouter);
app.use('/api/zones', zonesRouter);
app.use('/api/pending-approvals', approvalsRouter);
app.use('/api/audit-log', auditRouter);

// ─── Seed Endpoint (one-time, protected by SEED_SECRET env var) ────────────

app.post('/api/admin/seed', async (req, res) => {
  const secret = process.env.SEED_SECRET;
  if (!secret || req.headers['x-seed-secret'] !== secret) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    const { getDb } = await import('./db.js');
    const db = getDb();

    const ZONES = [
      { id: 'zone_a', name: 'Zone A — Main Block', base_tariff_per_hour: 30, min_tariff_pct: 70, max_tariff_pct: 150, max_step_change_pct: 25, slotCount: 10, vehicleTypes: ['car','car','car','car','car','car','car','car','bike','bike'] },
      { id: 'zone_b', name: 'Zone B — Tech Park',  base_tariff_per_hour: 25, min_tariff_pct: 70, max_tariff_pct: 150, max_step_change_pct: 25, slotCount: 10, vehicleTypes: ['car','car','car','car','car','car','bike','bike','bike','bike'] },
      { id: 'zone_c', name: 'Zone C — Hostel Area', base_tariff_per_hour: 20, min_tariff_pct: 70, max_tariff_pct: 150, max_step_change_pct: 25, slotCount: 10, vehicleTypes: ['car','car','car','car','bike','bike','bike','bike','bike','bike'] },
      { id: 'zone_d', name: 'Zone D — Sports Complex', base_tariff_per_hour: 15, min_tariff_pct: 70, max_tariff_pct: 150, max_step_change_pct: 25, slotCount: 10, vehicleTypes: ['car','car','car','car','car','bike','bike','bike','bike','bike'] },
    ];

    const summary: string[] = [];
    for (const zone of ZONES) {
      await db.zone.upsert({
        where: { id: zone.id },
        update: { name: zone.name, base_tariff_per_hour: zone.base_tariff_per_hour, min_tariff_pct: zone.min_tariff_pct, max_tariff_pct: zone.max_tariff_pct, max_step_change_pct: zone.max_step_change_pct },
        create: { id: zone.id, name: zone.name, base_tariff_per_hour: zone.base_tariff_per_hour, min_tariff_pct: zone.min_tariff_pct, max_tariff_pct: zone.max_tariff_pct, max_step_change_pct: zone.max_step_change_pct },
      });
      for (let i = 1; i <= zone.slotCount; i++) {
        const slotId = `${zone.id}_slot${i}`;
        const vehicleType = zone.vehicleTypes[i - 1] ?? 'car';
        await db.slot.upsert({
          where: { id: slotId },
          update: { zone_id: zone.id, vehicle_type: vehicleType, status: 'free' },
          create: { id: slotId, zone_id: zone.id, vehicle_type: vehicleType, status: 'free' },
        });
      }
      summary.push(`${zone.name}: ${zone.slotCount} slots`);
    }

    return res.json({ ok: true, seeded: summary });
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

// ─── 404 Handler ────────────────────────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ─── Start Server ───────────────────────────────────────────────────────────

const server = app.listen(config.port, () => {
  console.log(`🚗 Parker OS Backend running on port ${config.port}`);
  console.log(`   Health:    GET  /api/health`);
  console.log(`   Auth:      POST /api/auth/register|login|refresh`);
  console.log(`   Driver AI: POST /api/driver-agent/chat`);
  console.log(`   Ops AI:    POST /api/ops-agent/chat`);
  console.log(`   Zones:     GET  /api/zones/:id/metrics`);
  console.log(`   Approvals: GET  /api/pending-approvals`);
  console.log(`   Audit:     GET  /api/audit-log`);

  if (config.mqttBrokerUrl) {
    try {
      connectMqtt();
      console.log(`   MQTT:      subscriber started (${config.mqttBrokerUrl})`);
    } catch (err) {
      console.warn(`   MQTT:      failed to start:`, (err as Error).message);
    }
  } else {
    console.log(`   MQTT:      skipped (MQTT_BROKER_URL not set)`);
  }
});

// ─── Graceful Shutdown ──────────────────────────────────────────────────────

async function shutdown(signal: string) {
  console.log(`\n${signal} received. Shutting down...`);
  server.close(async () => {
    await disconnectMqtt();
    await disconnectDb();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export { app };

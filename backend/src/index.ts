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

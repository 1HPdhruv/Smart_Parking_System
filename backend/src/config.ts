// ==============================================================================
// Config — Centralized environment variable access
// ==============================================================================
// DATABASE_URL and JWT_SECRET are required at startup (core auth + db).
// ANTHROPIC_API_KEY is validated lazily — agent routes return a 503 if missing.
// MQTT_BROKER_URL is optional — MQTT subscriber skips gracefully if not set.

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optional(name: string, fallback = ''): string {
  return process.env[name] ?? fallback;
}

// Only these two crash the process on startup.
// Everything else degrades gracefully so the server can healthcheck.
export const config = {
  // Database — required (Prisma won't connect without it)
  databaseUrl: required('DATABASE_URL'),

  // Groq — optional at startup; agent routes return 503 if unset
  groqApiKey: optional('GROQ_API_KEY'),
  groqModel: optional('GROQ_MODEL', 'llama-3.3-70b-versatile'),

  // MQTT — optional; subscriber is skipped if not configured
  mqttBrokerUrl: optional('MQTT_BROKER_URL'),
  mqttUser: optional('MQTT_USER'),
  mqttPassword: optional('MQTT_PASSWORD'),

  // Auth — JWT_SECRET required (auth won't work without it)
  jwtSecret: required('JWT_SECRET'),
  jwtAccessExpiry: optional('JWT_ACCESS_EXPIRY', '15m'),
  jwtRefreshExpiry: optional('JWT_REFRESH_EXPIRY', '7d'),

  // Server
  port: parseInt(optional('PORT', '3001'), 10),
  corsOrigin: optional('CORS_ORIGIN', '*'),

  // Business rules
  refundReviewThreshold: parseFloat(optional('REFUND_REVIEW_THRESHOLD', '500')),
  priceTolerancePct: parseFloat(optional('PRICE_TOLERANCE_PCT', '5')),
} as const;

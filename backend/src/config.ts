// ==============================================================================
// Config — Centralized environment variable access
// ==============================================================================
// All env vars are read here and exported as typed constants.
// Fails fast at startup if required vars are missing.

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optional(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

export const config = {
  // Database
  databaseUrl: required('DATABASE_URL'),

  // Anthropic
  anthropicApiKey: required('ANTHROPIC_API_KEY'),
  claudeModel: optional('CLAUDE_MODEL', 'claude-sonnet-4-6'),

  // MQTT
  mqttBrokerUrl: required('MQTT_BROKER_URL'),
  mqttUser: optional('MQTT_USER', ''),
  mqttPassword: optional('MQTT_PASSWORD', ''),

  // Auth
  jwtSecret: required('JWT_SECRET'),
  jwtAccessExpiry: optional('JWT_ACCESS_EXPIRY', '15m'),
  jwtRefreshExpiry: optional('JWT_REFRESH_EXPIRY', '7d'),

  // Server
  port: parseInt(optional('PORT', '3001'), 10),
  corsOrigin: optional('CORS_ORIGIN', 'http://localhost:5173'),

  // Business rules
  refundReviewThreshold: parseFloat(optional('REFUND_REVIEW_THRESHOLD', '500')),
  priceTolerancePct: parseFloat(optional('PRICE_TOLERANCE_PCT', '5')),
} as const;

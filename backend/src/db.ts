// ==============================================================================
// Database — Prisma client singleton
// ==============================================================================
// Uses @prisma/adapter-neon for serverless-compatible connection pooling.
// The adapter works with Neon's pooled connection string (-pooler suffix).

import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { config } from './config.js';

let prisma: PrismaClient;

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaNeon({ connectionString: config.databaseUrl });

  return new PrismaClient({
    adapter,
    log: process.env['NODE_ENV'] === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
}

// Singleton — reuse across requests
export function getDb(): PrismaClient {
  if (!prisma) {
    prisma = createPrismaClient();
  }
  return prisma;
}

// For graceful shutdown
export async function disconnectDb(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
  }
}

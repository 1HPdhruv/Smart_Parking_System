// ==============================================================================
// Pricing Service — Server-side price calculation
// ==============================================================================
// ALL price computation happens here. Neither agent is allowed to compute
// money amounts itself — they call get_price_quote which delegates here.

import { getDb } from '../db.js';

export interface PriceQuote {
  zone_id: string;
  slot_id: string | null;
  start_time: string;
  end_time: string;
  duration_hours: number;
  base_tariff_per_hour: number;
  computed_price: number;
  currency: string;
}

/**
 * Compute a price quote for parking in a zone for a given time window.
 * This is the single source of truth for pricing — agents relay this, never compute.
 */
export async function computePriceQuote(
  zoneId: string,
  startTime: string,
  endTime: string,
  slotId?: string,
): Promise<PriceQuote> {
  const db = getDb();
  const zone = await db.zone.findUnique({ where: { id: zoneId } });

  if (!zone) {
    throw new Error(`Zone "${zoneId}" not found`);
  }

  const start = new Date(startTime);
  const end = new Date(endTime);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new Error('Invalid start_time or end_time');
  }

  if (end <= start) {
    throw new Error('end_time must be after start_time');
  }

  const durationMs = end.getTime() - start.getTime();
  const durationHours = durationMs / (1000 * 60 * 60);

  // Price = base_tariff_per_hour × duration_hours
  // Future: add dynamic pricing multipliers, surge pricing, etc.
  const baseTariff = Number(zone.base_tariff_per_hour);
  const computedPrice = Math.round(baseTariff * durationHours * 100) / 100;

  return {
    zone_id: zoneId,
    slot_id: slotId ?? null,
    start_time: startTime,
    end_time: endTime,
    duration_hours: Math.round(durationHours * 100) / 100,
    base_tariff_per_hour: baseTariff,
    computed_price: computedPrice,
    currency: 'INR',
  };
}

/**
 * Validate that a quoted price matches a fresh server-side calculation
 * within the configured tolerance percentage.
 */
export async function validateQuotedPrice(
  zoneId: string,
  startTime: string,
  endTime: string,
  quotedPrice: number,
  tolerancePct: number,
): Promise<{ valid: boolean; freshQuote: PriceQuote; deviation: number }> {
  const freshQuote = await computePriceQuote(zoneId, startTime, endTime);

  const deviation = Math.abs(freshQuote.computed_price - quotedPrice) / freshQuote.computed_price * 100;
  const valid = deviation <= tolerancePct;

  return { valid, freshQuote, deviation };
}

/**
 * Compute a refund amount for a cancelled booking.
 * Refund logic: full refund if cancelled before start_time,
 * prorated refund based on remaining time if cancelled during booking.
 */
export function computeRefund(
  quotedPrice: number,
  startTime: Date | null,
  endTime: Date | null,
  cancelledAt: Date = new Date(),
): { refundAmount: number; refundReason: string } {
  if (!startTime || !endTime) {
    return { refundAmount: quotedPrice, refundReason: 'Full refund — no time window set' };
  }

  // If cancelled before the booking starts → full refund
  if (cancelledAt < startTime) {
    return { refundAmount: quotedPrice, refundReason: 'Full refund — cancelled before start time' };
  }

  // If cancelled after the booking ended → no refund
  if (cancelledAt >= endTime) {
    return { refundAmount: 0, refundReason: 'No refund — booking already ended' };
  }

  // Prorated refund: refund for remaining unused time
  const totalDuration = endTime.getTime() - startTime.getTime();
  const usedDuration = cancelledAt.getTime() - startTime.getTime();
  const remainingFraction = 1 - (usedDuration / totalDuration);
  const refundAmount = Math.round(quotedPrice * remainingFraction * 100) / 100;

  return {
    refundAmount,
    refundReason: `Prorated refund — ${Math.round(remainingFraction * 100)}% of time unused`,
  };
}

// ==============================================================================
// Driver Agent — Tool Execution Handlers
// ==============================================================================
// Each handler corresponds to a tool definition in tools.ts.
// Handlers execute the actual business logic and return results to Claude.

import { getDb } from '../../db.js';
import { config } from '../../config.js';
import { computePriceQuote, validateQuotedPrice } from '../../services/pricing.js';
import { createBooking, cancelBooking, extendBooking } from '../../services/booking.js';
import type { ConversationContext } from '../conversation.js';

// ─── Zone coordinates for directions (SRMIST KTR campus) ───────────────────
const ZONE_COORDINATES: Record<string, { lat: number; lng: number; address: string }> = {
  zone_a: { lat: 12.8231, lng: 80.0442, address: 'Zone A — Main Block, SRMIST KTR' },
  zone_b: { lat: 12.8225, lng: 80.0455, address: 'Zone B — Tech Park, SRMIST KTR' },
  zone_c: { lat: 12.8240, lng: 80.0430, address: 'Zone C — Hostel Area, SRMIST KTR' },
  zone_d: { lat: 12.8218, lng: 80.0465, address: 'Zone D — Sports Complex, SRMIST KTR' },
};

// ─── Location search mapping ────────────────────────────────────────────────
const LOCATION_ALIASES: Record<string, string[]> = {
  zone_a: ['main block', 'main', 'block a', 'zone a', 'zone_a', 'entrance'],
  zone_b: ['tech park', 'tech', 'block b', 'zone b', 'zone_b', 'it park'],
  zone_c: ['hostel', 'hostel area', 'block c', 'zone c', 'zone_c', 'dorms'],
  zone_d: ['sports', 'sports complex', 'block d', 'zone d', 'zone_d', 'gym', 'ground'],
};

function matchZones(location: string): string[] {
  const lower = location.toLowerCase().trim();
  const matched: string[] = [];

  for (const [zoneId, aliases] of Object.entries(LOCATION_ALIASES)) {
    if (aliases.some((alias) => lower.includes(alias)) || lower.includes(zoneId)) {
      matched.push(zoneId);
    }
  }

  // If no specific match, return all zones
  if (matched.length === 0) return Object.keys(LOCATION_ALIASES);
  return matched;
}

// ─── Handler Dispatch ───────────────────────────────────────────────────────

export async function handleDriverTool(
  toolName: string,
  args: Record<string, unknown>,
  context: ConversationContext,
): Promise<unknown> {
  switch (toolName) {
    case 'search_availability':
      return handleSearchAvailability(args);
    case 'get_price_quote':
      return handleGetPriceQuote(args);
    case 'create_booking':
      return handleCreateBooking(args, context);
    case 'cancel_booking':
      return handleCancelBooking(args);
    case 'extend_booking':
      return handleExtendBooking(args);
    case 'get_directions':
      return handleGetDirections(args);
    case 'report_issue':
      return handleReportIssue(args);
    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}

// ─── search_availability ────────────────────────────────────────────────────

async function handleSearchAvailability(args: Record<string, unknown>) {
  const location = args['location'] as string;
  const vehicleType = args['vehicle_type'] as string;
  const startTime = args['start_time'] as string;
  const endTime = args['end_time'] as string;

  const db = getDb();
  const zoneIds = matchZones(location);

  // Find free slots in matching zones
  const results = await Promise.all(
    zoneIds.map(async (zoneId) => {
      const zone = await db.zone.findUnique({ where: { id: zoneId } });
      if (!zone) return null;

      const freeSlots = await db.slot.findMany({
        where: {
          zone_id: zoneId,
          status: 'free',
          ...(vehicleType && { vehicle_type: vehicleType }),
        },
      });

      // Check for conflicting bookings on these slots
      const availableSlots = [];
      for (const slot of freeSlots) {
        const conflict = await db.booking.findFirst({
          where: {
            slot_id: slot.id,
            status: 'active',
            start_time: { lte: new Date(endTime) },
            end_time: { gte: new Date(startTime) },
          },
        });
        if (!conflict) {
          availableSlots.push({
            slot_id: slot.id,
            vehicle_type: slot.vehicle_type,
          });
        }
      }

      return {
        zone_id: zone.id,
        zone_name: zone.name,
        base_tariff_per_hour: Number(zone.base_tariff_per_hour),
        currency: 'INR',
        available_slots: availableSlots,
        total_available: availableSlots.length,
      };
    }),
  );

  const zones = results.filter(Boolean);

  return {
    search_location: location,
    vehicle_type: vehicleType,
    time_window: { start: startTime, end: endTime },
    zones,
    total_available: zones.reduce((sum, z) => sum + (z?.total_available ?? 0), 0),
  };
}

// ─── get_price_quote ────────────────────────────────────────────────────────

async function handleGetPriceQuote(args: Record<string, unknown>) {
  const zoneId = args['zone_id'] as string;
  const startTime = args['start_time'] as string;
  const endTime = args['end_time'] as string;
  const slotId = args['slot_id'] as string | undefined;

  try {
    const quote = await computePriceQuote(zoneId, startTime, endTime, slotId);
    return quote;
  } catch (err) {
    return { error: (err as Error).message };
  }
}

// ─── create_booking ─────────────────────────────────────────────────────────

async function handleCreateBooking(
  args: Record<string, unknown>,
  context: ConversationContext,
) {
  const zoneId = args['zone_id'] as string;
  const slotId = args['slot_id'] as string;
  const startTime = args['start_time'] as string;
  const endTime = args['end_time'] as string;
  const quotedPrice = Number(args['quoted_price']);
  const vehiclePlate = args['vehicle_plate'] as string;
  const paymentMethodId = args['payment_method_id'] as string | undefined;

  // Server MUST re-validate quoted_price against a fresh quote
  const { valid, freshQuote, deviation } = await validateQuotedPrice(
    zoneId,
    startTime,
    endTime,
    quotedPrice,
    config.priceTolerancePct,
  );

  if (!valid) {
    return {
      error: `Price validation failed. Quoted: ₹${quotedPrice}, Fresh calculation: ₹${freshQuote.computed_price} (${deviation.toFixed(1)}% deviation, max allowed: ${config.priceTolerancePct}%). Please get a new price quote.`,
    };
  }

  // Use the authenticated driver's ID, not what the agent passes
  const result = await createBooking({
    driver_id: context.userId,
    zone_id: zoneId,
    slot_id: slotId,
    start_time: startTime,
    end_time: endTime,
    quoted_price: quotedPrice,
    vehicle_plate: vehiclePlate,
    payment_method_id: paymentMethodId,
  });

  return result;
}

// ─── cancel_booking ─────────────────────────────────────────────────────────

async function handleCancelBooking(args: Record<string, unknown>) {
  const bookingId = args['booking_id'] as string;
  const reason = args['reason'] as string | undefined;

  return cancelBooking(bookingId, reason);
}

// ─── extend_booking ─────────────────────────────────────────────────────────

async function handleExtendBooking(args: Record<string, unknown>) {
  const bookingId = args['booking_id'] as string;
  const newEndTime = args['new_end_time'] as string;

  return extendBooking(bookingId, newEndTime);
}

// ─── get_directions ─────────────────────────────────────────────────────────

async function handleGetDirections(args: Record<string, unknown>) {
  const zoneId = args['zone_id'] as string;
  const originLat = args['origin_latitude'] as number | undefined;
  const originLng = args['origin_longitude'] as number | undefined;

  const destination = ZONE_COORDINATES[zoneId];
  if (!destination) {
    return { error: `Zone "${zoneId}" not found` };
  }

  // Build a Google Maps link for directions
  let mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${destination.lat},${destination.lng}`;
  if (originLat !== undefined && originLng !== undefined) {
    mapsUrl += `&origin=${originLat},${originLng}`;
  }

  return {
    zone_id: zoneId,
    destination: destination.address,
    coordinates: { latitude: destination.lat, longitude: destination.lng },
    maps_url: mapsUrl,
    instructions: `Navigate to ${destination.address}. Follow campus signage for parking zone ${zoneId.replace('zone_', '').toUpperCase()}.`,
  };
}

// ─── report_issue ───────────────────────────────────────────────────────────

async function handleReportIssue(args: Record<string, unknown>) {
  const zoneId = args['zone_id'] as string;
  const category = args['category'] as string;
  const description = args['description'] as string;
  const bookingId = args['booking_id'] as string | undefined;

  const db = getDb();

  const report = await db.issueReport.create({
    data: {
      zone_id: zoneId,
      category,
      description,
      booking_id: bookingId,
      status: 'open',
    },
  });

  return {
    ticket_id: report.id,
    status: 'open',
    message: `Issue report #${report.id} created successfully. Our team will review it shortly.`,
    zone_id: zoneId,
    category,
  };
}

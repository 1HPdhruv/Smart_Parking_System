// ==============================================================================
// Booking Service — CRUD operations for bookings
// ==============================================================================

import { getDb } from '../db.js';
import { computeRefund } from './pricing.js';
import { config } from '../config.js';

export interface CreateBookingInput {
  driver_id: string;
  zone_id: string;
  slot_id: string;
  start_time: string;
  end_time: string;
  quoted_price: number;
  vehicle_plate: string;
  payment_method_id?: string;
}

export interface BookingResult {
  success: boolean;
  booking?: {
    id: string;
    zone_id: string;
    slot_id: string;
    start_time: string;
    end_time: string;
    quoted_price: number;
    status: string;
    payment_status: string;
    vehicle_plate_or_tag: string;
  };
  error?: string;
}

/**
 * Create a new booking. Called by the Driver Agent's create_booking tool
 * AFTER the server has validated the quoted_price.
 */
export async function createBooking(input: CreateBookingInput): Promise<BookingResult> {
  const db = getDb();

  // Check slot is free
  const slot = await db.slot.findUnique({ where: { id: input.slot_id } });
  if (!slot) {
    return { success: false, error: `Slot "${input.slot_id}" not found` };
  }
  if (slot.status !== 'free') {
    return { success: false, error: `Slot "${input.slot_id}" is currently ${slot.status}` };
  }
  if (slot.zone_id !== input.zone_id) {
    return { success: false, error: `Slot "${input.slot_id}" is not in zone "${input.zone_id}"` };
  }

  // Check for conflicting bookings on the same slot
  const conflicting = await db.booking.findFirst({
    where: {
      slot_id: input.slot_id,
      status: 'active',
      OR: [
        {
          start_time: { lte: new Date(input.end_time) },
          end_time: { gte: new Date(input.start_time) },
        },
      ],
    },
  });

  if (conflicting) {
    return { success: false, error: `Slot "${input.slot_id}" has a conflicting active booking` };
  }

  // Create booking and mark slot as occupied
  const booking = await db.booking.create({
    data: {
      user_id: input.driver_id,
      zone_id: input.zone_id,
      slot_id: input.slot_id,
      start_time: new Date(input.start_time),
      end_time: new Date(input.end_time),
      quoted_price: input.quoted_price,
      status: 'active',
      payment_status: input.payment_method_id ? 'paid' : 'pending',
      vehicle_plate_or_tag: input.vehicle_plate,
    },
  });

  // Mark slot as occupied
  await db.slot.update({
    where: { id: input.slot_id },
    data: { status: 'occupied' },
  });

  return {
    success: true,
    booking: {
      id: booking.id,
      zone_id: booking.zone_id,
      slot_id: booking.slot_id,
      start_time: booking.start_time?.toISOString() ?? '',
      end_time: booking.end_time?.toISOString() ?? '',
      quoted_price: Number(booking.quoted_price),
      status: booking.status,
      payment_status: booking.payment_status,
      vehicle_plate_or_tag: booking.vehicle_plate_or_tag ?? '',
    },
  };
}

export interface CancelResult {
  status: 'cancelled' | 'requires_review' | 'error';
  refund_amount?: number;
  refund_reason?: string;
  error?: string;
}

/**
 * Cancel a booking. Refund amount is computed server-side.
 * If refund exceeds the configured threshold, returns requires_review.
 */
export async function cancelBooking(
  bookingId: string,
  reason?: string,
): Promise<CancelResult> {
  const db = getDb();
  const booking = await db.booking.findUnique({ where: { id: bookingId } });

  if (!booking) {
    return { status: 'error', error: `Booking "${bookingId}" not found` };
  }

  if (booking.status !== 'active') {
    return { status: 'error', error: `Booking "${bookingId}" is already ${booking.status}` };
  }

  // Compute refund server-side
  const quotedPrice = Number(booking.quoted_price ?? 0);
  const { refundAmount, refundReason } = computeRefund(
    quotedPrice,
    booking.start_time,
    booking.end_time,
  );

  // Check if refund exceeds review threshold
  if (refundAmount > config.refundReviewThreshold) {
    return {
      status: 'requires_review',
      refund_amount: refundAmount,
      refund_reason: `${refundReason}. Refund ₹${refundAmount} exceeds threshold ₹${config.refundReviewThreshold} — requires admin review.`,
    };
  }

  // Execute cancellation
  await db.booking.update({
    where: { id: bookingId },
    data: {
      status: 'cancelled',
      payment_status: refundAmount > 0 ? 'refunded' : booking.payment_status,
    },
  });

  // Free the slot
  await db.slot.update({
    where: { id: booking.slot_id },
    data: { status: 'free' },
  });

  return {
    status: 'cancelled',
    refund_amount: refundAmount,
    refund_reason: reason ? `${refundReason} (Driver reason: ${reason})` : refundReason,
  };
}

/**
 * Extend a booking's end time.
 */
export async function extendBooking(
  bookingId: string,
  newEndTime: string,
): Promise<{ success: boolean; new_end_time?: string; error?: string }> {
  const db = getDb();
  const booking = await db.booking.findUnique({ where: { id: bookingId } });

  if (!booking) {
    return { success: false, error: `Booking "${bookingId}" not found` };
  }

  if (booking.status !== 'active') {
    return { success: false, error: `Booking "${bookingId}" is not active (status: ${booking.status})` };
  }

  const newEnd = new Date(newEndTime);
  if (isNaN(newEnd.getTime())) {
    return { success: false, error: 'Invalid new_end_time' };
  }

  if (booking.end_time && newEnd <= booking.end_time) {
    return { success: false, error: 'new_end_time must be after current end_time' };
  }

  await db.booking.update({
    where: { id: bookingId },
    data: { end_time: newEnd },
  });

  return { success: true, new_end_time: newEnd.toISOString() };
}

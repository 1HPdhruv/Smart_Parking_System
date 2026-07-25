// ==============================================================================
// MQTT Handlers — Business logic for each ESP32 topic
// ==============================================================================
// Each handler corresponds to a specific MQTT topic from the contract in spec
// section 3. All DB mutations go through Prisma.

import { getDb } from '../db.js';

type PublishFn = (topic: string, message: string) => void;

// ─── Slot Status ────────────────────────────────────────────────────────────
// Topic: parking/{zone_id}/slot{n}/status
// Payload: "occupied" | "free"
//
// Updates slots.status and inserts a sensor_data row.

export async function handleSlotStatus(
  zoneId: string,
  slotKey: string,   // e.g. "slot1"
  status: string,
): Promise<void> {
  const normalizedStatus = status.toLowerCase().trim();

  if (normalizedStatus !== 'free' && normalizedStatus !== 'occupied') {
    console.warn(`[MQTT:SlotStatus] Invalid status "${status}" for ${zoneId}/${slotKey}`);
    return;
  }

  // Slot ID convention: {zone_id}_{slotKey} — matches seed data
  const slotId = `${zoneId}_${slotKey}`;
  const db = getDb();

  try {
    // Update slot status
    await db.slot.update({
      where: { id: slotId },
      data: { status: normalizedStatus },
    });

    // Insert sensor data row for telemetry history
    await db.sensorData.create({
      data: {
        slot_id: slotId,
        status: normalizedStatus,
      },
    });

    console.log(`[MQTT:SlotStatus] ${slotId} → ${normalizedStatus}`);
  } catch (err) {
    // Slot might not exist in DB — log but don't crash
    console.error(`[MQTT:SlotStatus] Error updating ${slotId}:`, err);
  }
}

// ─── Entry Vehicle ──────────────────────────────────────────────────────────
// Topic: parking/{zone_id}/entry/vehicle_id
// Payload: RFID tag or license plate string from the ESP32 scanner
//
// Looks up an active, paid booking matching that vehicle tag/plate for the zone.
// Publishes "granted" or "denied" to parking/{zone_id}/entry/authorize.
// Logs the check to agent_audit_log.

export async function handleEntryVehicle(
  zoneId: string,
  vehicleTag: string,
  publish: PublishFn,
): Promise<void> {
  const authorizeTopic = `parking/${zoneId}/entry/authorize`;
  const db = getDb();
  const tag = vehicleTag.trim();

  if (!tag) {
    console.warn(`[MQTT:Entry] Empty vehicle tag for ${zoneId}`);
    publish(authorizeTopic, 'denied');
    return;
  }

  try {
    // Find an active, paid booking for this zone with matching vehicle tag/plate
    const booking = await db.booking.findFirst({
      where: {
        zone_id: zoneId,
        vehicle_plate_or_tag: tag,
        status: 'active',
        payment_status: 'paid',
      },
      orderBy: { created_at: 'desc' },
    });

    let authorized = false;
    let reason: string;

    if (booking) {
      // Check if the booking's time window is valid
      const now = new Date();
      const startValid = !booking.start_time || booking.start_time <= now;
      const endValid = !booking.end_time || booking.end_time >= now;

      if (startValid && endValid) {
        authorized = true;
        reason = `Booking ${booking.id} found — active, paid, within time window`;

        // Create a parking log entry for this entry
        await db.parkingLog.create({
          data: {
            booking_id: booking.id,
            entry_time: now,
          },
        });
      } else {
        reason = `Booking ${booking.id} found but outside time window (start: ${booking.start_time?.toISOString()}, end: ${booking.end_time?.toISOString()})`;
      }
    } else {
      reason = `No active, paid booking found for vehicle "${tag}" in zone "${zoneId}"`;
    }

    // Publish authorization result to the gate
    publish(authorizeTopic, authorized ? 'granted' : 'denied');

    // Log to agent_audit_log as per spec
    await db.agentAuditLog.create({
      data: {
        agent: 'ops',
        tool_name: 'gate_entry_check',
        input: { zone_id: zoneId, vehicle_tag: tag, booking_id: booking?.id ?? null },
        outcome: 'applied',
        reasoning: reason,
      },
    });

    console.log(`[MQTT:Entry] ${zoneId} vehicle="${tag}" → ${authorized ? 'granted' : 'denied'}: ${reason}`);
  } catch (err) {
    console.error(`[MQTT:Entry] Error processing entry for ${zoneId}:`, err);
    // On error, deny entry for safety
    publish(authorizeTopic, 'denied');
  }
}

// ─── Exit Request ───────────────────────────────────────────────────────────
// Topic: parking/{zone_id}/exit/request
// Payload: "exit_requested" (or any truthy value from ESP32)
//
// Finds the most recent active booking for this zone with no exit_time logged.
// Marks it completed, publishes "granted" to exit/authorize, writes exit_time.

export async function handleExitRequest(
  zoneId: string,
  _message: string,
  publish: PublishFn,
): Promise<void> {
  const authorizeTopic = `parking/${zoneId}/exit/authorize`;
  const db = getDb();

  try {
    // Find the most recent active booking for this zone that has a parking log
    // with entry_time but no exit_time
    const parkingLog = await db.parkingLog.findFirst({
      where: {
        exit_time: null,
        entry_time: { not: null },
        booking: {
          zone_id: zoneId,
          status: 'active',
        },
      },
      orderBy: { entry_time: 'desc' },
      include: { booking: true },
    });

    if (!parkingLog) {
      // Fallback: find any active booking for this zone (might not have a parking log yet)
      const fallbackBooking = await db.booking.findFirst({
        where: {
          zone_id: zoneId,
          status: 'active',
        },
        orderBy: { created_at: 'desc' },
      });

      if (fallbackBooking) {
        // Complete the booking even without a parking log
        const now = new Date();
        await db.booking.update({
          where: { id: fallbackBooking.id },
          data: { status: 'completed' },
        });

        await db.parkingLog.create({
          data: {
            booking_id: fallbackBooking.id,
            exit_time: now,
          },
        });

        publish(authorizeTopic, 'granted');
        console.log(`[MQTT:Exit] ${zoneId} → granted (fallback booking ${fallbackBooking.id})`);
      } else {
        // No active booking at all — still grant exit (don't trap vehicles)
        publish(authorizeTopic, 'granted');
        console.warn(`[MQTT:Exit] ${zoneId} → granted (no active booking found — safety release)`);
      }
      return;
    }

    // Normal flow: we have a parking log with entry but no exit
    const now = new Date();

    // Update the parking log with exit time
    await db.parkingLog.update({
      where: { id: parkingLog.id },
      data: { exit_time: now },
    });

    // Mark the booking as completed
    await db.booking.update({
      where: { id: parkingLog.booking.id },
      data: { status: 'completed' },
    });

    // Free the slot
    await db.slot.update({
      where: { id: parkingLog.booking.slot_id },
      data: { status: 'free' },
    });

    publish(authorizeTopic, 'granted');
    console.log(`[MQTT:Exit] ${zoneId} → granted (booking ${parkingLog.booking.id} completed, slot ${parkingLog.booking.slot_id} freed)`);
  } catch (err) {
    console.error(`[MQTT:Exit] Error processing exit for ${zoneId}:`, err);
    // On error, grant exit — never trap a vehicle
    publish(authorizeTopic, 'granted');
  }
}

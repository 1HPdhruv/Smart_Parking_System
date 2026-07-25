// ==============================================================================
// Zones Route — GET /api/zones/:id/metrics
// ==============================================================================

import { Router, type Request, type Response } from 'express';
import { authenticate } from '../auth/middleware.js';
import { getDb } from '../db.js';

export const zonesRouter = Router();

zonesRouter.get('/:id/metrics', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const zoneId = String(req.params['id'] ?? '');
    const db = getDb();

    const zone = await db.zone.findUnique({ where: { id: zoneId } });

    if (!zone) {
      res.status(404).json({ error: `Zone "${zoneId}" not found` });
      return;
    }

    const slots = await db.slot.findMany({ where: { zone_id: zoneId } });
    const occupied = slots.filter((s) => s.status === 'occupied').length;
    const free = slots.filter((s) => s.status === 'free').length;

    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [bookingsToday, activeBookings, anomaliesRecent] = await Promise.all([
      db.booking.count({ where: { zone_id: zoneId, created_at: { gte: dayAgo } } }),
      db.booking.count({ where: { zone_id: zoneId, status: 'active' } }),
      db.anomaly.count({ where: { zone_id: zoneId, created_at: { gte: dayAgo } } }),
    ]);

    res.json({
      zone_id: zone.id,
      zone_name: zone.name,
      tariff: {
        base_per_hour: Number(zone.base_tariff_per_hour),
        currency: 'INR',
        bounds: { min_pct: Number(zone.min_tariff_pct), max_pct: Number(zone.max_tariff_pct) },
      },
      occupancy: {
        total_slots: slots.length,
        occupied,
        free,
        rate_pct: slots.length > 0 ? Math.round((occupied / slots.length) * 100) : 0,
      },
      bookings_today: bookingsToday,
      active_bookings: activeBookings,
      anomalies_24h: anomaliesRecent,
      slots: slots.map((s) => ({ id: s.id, status: s.status, vehicle_type: s.vehicle_type })),
    });
  } catch (err) {
    console.error('Zone metrics error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

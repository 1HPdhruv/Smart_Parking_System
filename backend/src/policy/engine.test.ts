// ==============================================================================
// Policy Engine — Unit Tests
// ==============================================================================
// Tests every rule from spec section 6 with edge cases.
// Uses Vitest with mocked Prisma client.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  rulePricing,
  ruleGateOverride,
  ruleSensorRetry,
  ruleAnomalyFlag,
  ruleStaffDispatch,
} from './rules.js';

// ─── Mock Prisma ────────────────────────────────────────────────────────────

const mockZone = {
  id: 'zone_a',
  name: 'Zone A',
  base_tariff_per_hour: 30,
  min_tariff_pct: 70,
  max_tariff_pct: 150,
  max_step_change_pct: 25,
};

const mockBookingActive = {
  id: '00000000-0000-0000-0000-000000000001',
  zone_id: 'zone_a',
  status: 'active',
  payment_status: 'paid',
};

const mockBookingInactive = {
  id: '00000000-0000-0000-0000-000000000002',
  zone_id: 'zone_a',
  status: 'completed',
  payment_status: 'paid',
};

const mockBookingUnpaid = {
  id: '00000000-0000-0000-0000-000000000003',
  zone_id: 'zone_a',
  status: 'active',
  payment_status: 'pending',
};

const mockPrisma = {
  zone: {
    findUnique: vi.fn(),
  },
  booking: {
    findUnique: vi.fn(),
  },
  agentAuditLog: {
    count: vi.fn(),
  },
};

// Mock the db module
vi.mock('../db.js', () => ({
  getDb: () => mockPrisma,
}));

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('Policy Rules', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── adjust_pricing ──────────────────────────────────────────────────────

  describe('rulePricing', () => {
    it('should approve tariff within bounds and step limit', async () => {
      mockPrisma.zone.findUnique.mockResolvedValue(mockZone);
      mockPrisma.agentAuditLog.count.mockResolvedValue(0);

      const result = await rulePricing({
        zone_id: 'zone_a',
        new_tariff_per_hour: 35, // 16.7% step change, within 25% max
      });

      expect(result.status).toBe('applied');
    });

    it('should require approval when tariff exceeds upper bound', async () => {
      mockPrisma.zone.findUnique.mockResolvedValue(mockZone);
      mockPrisma.agentAuditLog.count.mockResolvedValue(0);

      // max_tariff_pct = 150% of base 30 = 45
      const result = await rulePricing({
        zone_id: 'zone_a',
        new_tariff_per_hour: 50, // above max allowed 45
      });

      expect(result.status).toBe('pending_approval');
      expect(result.reason).toContain('outside allowed range');
    });

    it('should require approval when tariff below lower bound', async () => {
      mockPrisma.zone.findUnique.mockResolvedValue(mockZone);
      mockPrisma.agentAuditLog.count.mockResolvedValue(0);

      // min_tariff_pct = 70% of base 30 = 21
      const result = await rulePricing({
        zone_id: 'zone_a',
        new_tariff_per_hour: 18, // below min allowed 21
      });

      expect(result.status).toBe('pending_approval');
      expect(result.reason).toContain('outside allowed range');
    });

    it('should require approval when step change exceeds max', async () => {
      mockPrisma.zone.findUnique.mockResolvedValue(mockZone);
      mockPrisma.agentAuditLog.count.mockResolvedValue(0);

      // base = 30, max_step_change_pct = 25%, so max change = 7.5
      // new = 22 → step change = 26.7% > 25%
      const result = await rulePricing({
        zone_id: 'zone_a',
        new_tariff_per_hour: 22, // within absolute bounds (21–45) but step > 25%
      });

      expect(result.status).toBe('pending_approval');
      expect(result.reason).toContain('Step change');
    });

    it('should require approval when rate limit exceeded (3+ changes in 60min)', async () => {
      mockPrisma.zone.findUnique.mockResolvedValue(mockZone);
      mockPrisma.agentAuditLog.count.mockResolvedValue(3); // already 3 changes

      const result = await rulePricing({
        zone_id: 'zone_a',
        new_tariff_per_hour: 32, // valid change otherwise
      });

      expect(result.status).toBe('pending_approval');
      expect(result.reason).toContain('Rate limit');
    });

    it('should reject when zone not found', async () => {
      mockPrisma.zone.findUnique.mockResolvedValue(null);

      const result = await rulePricing({
        zone_id: 'nonexistent',
        new_tariff_per_hour: 30,
      });

      expect(result.status).toBe('rejected');
      expect(result.reason).toContain('not found');
    });

    it('should reject when args are invalid', async () => {
      const result = await rulePricing({});
      expect(result.status).toBe('rejected');
      expect(result.reason).toContain('Missing');
    });
  });

  // ── override_gate ─────────────────────────────────────────────────────────

  describe('ruleGateOverride', () => {
    it('should approve open_once with valid active paid booking in correct zone', async () => {
      mockPrisma.booking.findUnique.mockResolvedValue(mockBookingActive);

      const result = await ruleGateOverride({
        gate_id: 'zone_a_entry',
        action: 'open_once',
        linked_booking_id: mockBookingActive.id,
      });

      expect(result.status).toBe('applied');
    });

    it('should reject open_once when booking is not active', async () => {
      mockPrisma.booking.findUnique.mockResolvedValue(mockBookingInactive);

      const result = await ruleGateOverride({
        gate_id: 'zone_a_entry',
        action: 'open_once',
        linked_booking_id: mockBookingInactive.id,
      });

      expect(result.status).toBe('rejected');
      expect(result.reason).toContain('not active');
    });

    it('should reject open_once when booking is not paid', async () => {
      mockPrisma.booking.findUnique.mockResolvedValue(mockBookingUnpaid);

      const result = await ruleGateOverride({
        gate_id: 'zone_a_entry',
        action: 'open_once',
        linked_booking_id: mockBookingUnpaid.id,
      });

      expect(result.status).toBe('rejected');
      expect(result.reason).toContain('not paid');
    });

    it('should reject open_once when booking zone does not match gate zone', async () => {
      const wrongZoneBooking = { ...mockBookingActive, zone_id: 'zone_b' };
      mockPrisma.booking.findUnique.mockResolvedValue(wrongZoneBooking);

      const result = await ruleGateOverride({
        gate_id: 'zone_a_entry',
        action: 'open_once',
        linked_booking_id: wrongZoneBooking.id,
      });

      expect(result.status).toBe('rejected');
      expect(result.reason).toContain('zone');
    });

    it('should require approval for open_once without linked_booking_id', async () => {
      const result = await ruleGateOverride({
        gate_id: 'zone_a_entry',
        action: 'open_once',
      });

      expect(result.status).toBe('pending_approval');
      expect(result.reason).toContain('without a linked booking');
    });

    it('should always require approval for hold_open', async () => {
      const result = await ruleGateOverride({
        gate_id: 'zone_a_entry',
        action: 'hold_open',
        linked_booking_id: mockBookingActive.id,
      });

      expect(result.status).toBe('pending_approval');
      expect(result.reason).toContain('hold_open');
    });

    it('should reject when booking not found', async () => {
      mockPrisma.booking.findUnique.mockResolvedValue(null);

      const result = await ruleGateOverride({
        gate_id: 'zone_a_entry',
        action: 'open_once',
        linked_booking_id: 'nonexistent',
      });

      expect(result.status).toBe('rejected');
      expect(result.reason).toContain('not found');
    });
  });

  // ── retry_sensor ──────────────────────────────────────────────────────────

  describe('ruleSensorRetry', () => {
    it('should approve when under rate limit', async () => {
      mockPrisma.agentAuditLog.count.mockResolvedValue(2);

      const result = await ruleSensorRetry({ sensor_id: 'sensor_1' });

      expect(result.status).toBe('applied');
    });

    it('should approve when at exactly 3 retries', async () => {
      mockPrisma.agentAuditLog.count.mockResolvedValue(3);

      const result = await ruleSensorRetry({ sensor_id: 'sensor_1' });

      expect(result.status).toBe('applied');
    });

    it('should reject when over 3 retries in 60 minutes', async () => {
      mockPrisma.agentAuditLog.count.mockResolvedValue(4);

      const result = await ruleSensorRetry({ sensor_id: 'sensor_1' });

      expect(result.status).toBe('rejected');
      expect(result.reason).toContain('dispatch_staff');
    });

    it('should reject when sensor_id is missing', async () => {
      const result = await ruleSensorRetry({});

      expect(result.status).toBe('rejected');
      expect(result.reason).toContain('Missing sensor_id');
    });
  });

  // ── flag_anomaly ──────────────────────────────────────────────────────────

  describe('ruleAnomalyFlag', () => {
    it('should apply and keep severity as-is for normal categories', async () => {
      const result = await ruleAnomalyFlag({
        zone_id: 'zone_a',
        category: 'sensor_drift',
        severity: 'low',
      });

      expect(result.status).toBe('applied');
      expect(result.modifiedArgs).toBeUndefined();
    });

    it('should upgrade severity to medium for suspected_fraud when low', async () => {
      const result = await ruleAnomalyFlag({
        zone_id: 'zone_a',
        category: 'suspected_fraud',
        severity: 'low',
      });

      expect(result.status).toBe('applied');
      expect(result.modifiedArgs?.severity).toBe('medium');
    });

    it('should upgrade severity to medium for barrier_fault when low', async () => {
      const result = await ruleAnomalyFlag({
        zone_id: 'zone_a',
        category: 'barrier_fault',
        severity: 'low',
      });

      expect(result.status).toBe('applied');
      expect(result.modifiedArgs?.severity).toBe('medium');
    });

    it('should NOT downgrade severity when already high for suspected_fraud', async () => {
      const result = await ruleAnomalyFlag({
        zone_id: 'zone_a',
        category: 'suspected_fraud',
        severity: 'high',
      });

      expect(result.status).toBe('applied');
      expect(result.modifiedArgs).toBeUndefined(); // no modification needed
    });

    it('should NOT downgrade severity when already medium for barrier_fault', async () => {
      const result = await ruleAnomalyFlag({
        zone_id: 'zone_a',
        category: 'barrier_fault',
        severity: 'medium',
      });

      expect(result.status).toBe('applied');
      expect(result.modifiedArgs).toBeUndefined();
    });
  });

  // ── dispatch_staff ────────────────────────────────────────────────────────

  describe('ruleStaffDispatch', () => {
    it('should always apply for normal priority', async () => {
      const result = await ruleStaffDispatch({
        zone_id: 'zone_a',
        priority: 'normal',
        issue_summary: 'Broken light',
      });

      expect(result.status).toBe('applied');
    });

    it('should apply and note notification for urgent priority', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await ruleStaffDispatch({
        zone_id: 'zone_a',
        priority: 'urgent',
        issue_summary: 'Gate stuck open',
      });

      expect(result.status).toBe('applied');
      expect(result.reason).toContain('URGENT');
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[URGENT DISPATCH]')
      );

      consoleSpy.mockRestore();
    });

    it('should apply for low priority', async () => {
      const result = await ruleStaffDispatch({
        zone_id: 'zone_b',
        priority: 'low',
        issue_summary: 'Faded line markings',
      });

      expect(result.status).toBe('applied');
    });
  });
});

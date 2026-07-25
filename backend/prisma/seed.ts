// ==============================================================================
// Seed — Populate zones and slots for SRMIST KTR campus
// ==============================================================================
// Run with: npm run db:seed
// Zone IDs match the MQTT topic pattern: parking/{zone_id}/slot{n}/status

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ZONES = [
  {
    id: 'zone_a',
    name: 'Zone A — Main Block',
    base_tariff_per_hour: 30,
    min_tariff_pct: 70,
    max_tariff_pct: 150,
    max_step_change_pct: 25,
    slotCount: 10,
    vehicleTypes: ['car', 'car', 'car', 'car', 'car', 'car', 'car', 'car', 'bike', 'bike'],
  },
  {
    id: 'zone_b',
    name: 'Zone B — Tech Park',
    base_tariff_per_hour: 25,
    min_tariff_pct: 70,
    max_tariff_pct: 150,
    max_step_change_pct: 25,
    slotCount: 10,
    vehicleTypes: ['car', 'car', 'car', 'car', 'car', 'car', 'bike', 'bike', 'bike', 'bike'],
  },
  {
    id: 'zone_c',
    name: 'Zone C — Hostel Area',
    base_tariff_per_hour: 20,
    min_tariff_pct: 70,
    max_tariff_pct: 150,
    max_step_change_pct: 25,
    slotCount: 10,
    vehicleTypes: ['car', 'car', 'car', 'car', 'bike', 'bike', 'bike', 'bike', 'bike', 'bike'],
  },
  {
    id: 'zone_d',
    name: 'Zone D — Sports Complex',
    base_tariff_per_hour: 15,
    min_tariff_pct: 70,
    max_tariff_pct: 150,
    max_step_change_pct: 25,
    slotCount: 10,
    vehicleTypes: ['car', 'car', 'car', 'car', 'car', 'bike', 'bike', 'bike', 'bike', 'bike'],
  },
];

async function main() {
  console.log('🌱 Seeding database...');

  for (const zone of ZONES) {
    // Upsert zone
    await prisma.zone.upsert({
      where: { id: zone.id },
      update: {
        name: zone.name,
        base_tariff_per_hour: zone.base_tariff_per_hour,
        min_tariff_pct: zone.min_tariff_pct,
        max_tariff_pct: zone.max_tariff_pct,
        max_step_change_pct: zone.max_step_change_pct,
      },
      create: {
        id: zone.id,
        name: zone.name,
        base_tariff_per_hour: zone.base_tariff_per_hour,
        min_tariff_pct: zone.min_tariff_pct,
        max_tariff_pct: zone.max_tariff_pct,
        max_step_change_pct: zone.max_step_change_pct,
      },
    });

    // Upsert slots — IDs match MQTT topic: parking/{zone_id}/slot{n}/status
    for (let i = 1; i <= zone.slotCount; i++) {
      const slotId = `${zone.id}_slot${i}`;
      const vehicleType = zone.vehicleTypes[i - 1] ?? 'car';

      await prisma.slot.upsert({
        where: { id: slotId },
        update: {
          zone_id: zone.id,
          vehicle_type: vehicleType,
          status: 'free',
        },
        create: {
          id: slotId,
          zone_id: zone.id,
          vehicle_type: vehicleType,
          status: 'free',
        },
      });
    }

    console.log(`  ✅ ${zone.name}: ${zone.slotCount} slots`);
  }

  console.log('🌱 Seeding complete!');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

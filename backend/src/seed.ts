import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // 1. Create Zones
  const zoneA = await prisma.zone.upsert({
    where: { name: "Zone A" },
    update: {},
    create: { name: "Zone A", level: "L1", capacity: 48 },
  });

  const zoneB = await prisma.zone.upsert({
    where: { name: "Zone B" },
    update: {},
    create: { name: "Zone B", level: "L2", capacity: 60 },
  });

  const zoneC = await prisma.zone.upsert({
    where: { name: "Zone C" },
    update: {},
    create: { name: "Zone C", level: "L3", capacity: 30 },
  });

  // 2. Create Slots for Zone A
  for (let i = 1; i <= 48; i++) {
    const slotId = `A${String(i).padStart(2, "0")}`;
    await prisma.slot.upsert({
      where: { id: slotId },
      update: {},
      create: { id: slotId, zoneId: zoneA.id, status: "available" }
    });
  }

  console.log("✅ Database seeded with Zones and Slots!");
}

main()
  .catch((e) => {
    console.error("Failed to seed database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const BUILDINGS = [
  {
    buildingId: 'BLDG-LODHA-WORLD-ONE',
    buildingName: 'Lodha World One',
    assetType: 'Supertall Residential',
    status: 'EXISTING',
    totalFloors: 117,
    totalBasements: 4,
    description: 'Iconic 117-storey supertall residential skyscraper in the World Towers complex, Worli, Mumbai.',
  },
  {
    buildingId: 'BLDG-LODHA-TRUMP',
    buildingName: 'Tower 4: Trump Tower Mumbai (Wing 4)',
    assetType: 'Ultra-Luxury Branded Residential Skyscraper Tower',
    status: 'EXISTING',
    totalFloors: 78,
    totalBasements: 4,
    description: 'Height: 268.4m. Units: 385. Carpet Area: 52551.2 sqm. Status: Occupancy Granted (Part 6, Part 7, Part 12 OCCs up to 78th Floor)',
  },
  {
    buildingId: 'BLDG-LODHA-MARQUISE',
    buildingName: 'Tower 3: Marquise (Wing 3)',
    assetType: 'Residential Skyscraper Tower',
    status: 'EXISTING',
    totalFloors: 76,
    totalBasements: 4,
    description: 'Height: 268.4m. Units: 396. Carpet Area: 51413.04 sqm. Status: Occupancy Granted (Part 3, Part 4, Part 5, Part 12 OCCs up to 76th Floor)',
  },
  {
    buildingId: 'BLDG-LODHA-KIARA',
    buildingName: 'Tower 5: Kiara (Wing 5)',
    assetType: 'Residential Skyscraper Tower',
    status: 'EXISTING',
    totalFloors: 66,
    totalBasements: 4,
    description: 'Height: 219.35m. Units: 322. Carpet Area: 39189.84 sqm. Status: Occupancy Granted (Part 10 and Part 11 OCCs for 7th to 66th Floors)',
  },
  {
    buildingId: 'BLDG-LODHA-ADRINA',
    buildingName: 'Lodha Adrina',
    assetType: 'Luxury Residential',
    status: 'EXISTING',
    totalFloors: 78,
    totalBasements: 4,
    description: 'Sophisticated 78-storey residential tower with premium sea-facing apartments.',
  },
  {
    buildingId: 'BLDG-LODHA-PARKSIDE',
    buildingName: 'Tower 2: Parkside (Wing 2)',
    assetType: 'Residential Skyscraper Tower',
    status: 'EXISTING',
    totalFloors: 78,
    totalBasements: 4,
    description: 'Height: 268.4m. Units: 549. Carpet Area: 47871.28 sqm. Status: Occupancy Granted (Part 3, Part 4, Part 5, Part 12 OCCs up to 78th Floor)',
  },
  {
    buildingId: 'BLDG-LODHA-ALLURA',
    buildingName: 'Tower 1: Allura (Wing 1)',
    assetType: 'Residential Skyscraper Tower',
    status: 'EXISTING',
    totalFloors: 78,
    totalBasements: 4,
    description: 'Height: 268.4m. Units: 549. Carpet Area: 49402.11 sqm. Status: Occupancy Granted (Part 3, Part 4, Part 5, Part 12 OCCs up to 78th Floor)',
  },
];

function generateFloorId(buildingId: string, floorNumber: number): string {
  const prefix = buildingId.startsWith('BLDG-')
    ? buildingId.replace('BLDG-', 'FLR-')
    : `FLR-${buildingId}`;

  const paddedStr = floorNumber.toString().padStart(2, '0');
  return `${prefix}-L${paddedStr}`;
}

async function main() {
  console.log('--- Starting GEOCAD End-to-End Database Seeding ---');

  for (const bdata of BUILDINGS) {
    console.log(`\nSeeding building: ${bdata.buildingName} (${bdata.buildingId})...`);

    // 1. Create or upsert Building
    const building = await prisma.building.upsert({
      where: { buildingId: bdata.buildingId },
      update: {
        buildingName: bdata.buildingName,
        assetType: bdata.assetType,
        status: bdata.status,
      },
      create: {
        buildingId: bdata.buildingId,
        buildingName: bdata.buildingName,
        assetType: bdata.assetType,
        status: bdata.status,
      },
    });

    // 2. Upsert Version 1
    const version = await prisma.buildingVersion.upsert({
      where: {
        buildingId_versionNumber: {
          buildingId: building.buildingId,
          versionNumber: 1,
        },
      },
      update: {
        totalFloors: bdata.totalFloors,
        totalBasements: bdata.totalBasements,
        description: bdata.description,
        status: 'EXISTING',
      },
      create: {
        buildingId: building.buildingId,
        versionNumber: 1,
        status: 'EXISTING',
        totalFloors: bdata.totalFloors,
        totalBasements: bdata.totalBasements,
        description: bdata.description,
      },
    });

    // 3. Link currentVersionId on building
    await prisma.building.update({
      where: { buildingId: building.buildingId },
      data: {
        currentVersionId: version.id,
      },
    });

    console.log(`  -> Version linked (ID: ${version.id}, Floors: ${bdata.totalFloors})`);

    // 4. Seed Floors & Units for this building version
    const FLOOR_HEIGHT_M = 3.5;
    let totalUnitsCount = 0;

    for (let floorNum = 1; floorNum <= bdata.totalFloors; floorNum++) {
      const floorId = generateFloorId(building.buildingId, floorNum);
      const floorName = `Floor ${floorNum}`;
      const elevationMinM = (floorNum - 1) * FLOOR_HEIGHT_M;
      const elevationMaxM = floorNum * FLOOR_HEIGHT_M;

      const floor = await prisma.floor.upsert({
        where: {
          buildingVersionId_floorNumber: {
            buildingVersionId: version.id,
            floorNumber: floorNum,
          },
        },
        update: {
          floorName,
          elevationMinM,
          elevationMaxM,
          status: 'EXISTING',
        },
        create: {
          floorId,
          buildingVersionId: version.id,
          floorNumber: floorNum,
          floorName,
          elevationMinM,
          elevationMaxM,
          status: 'EXISTING',
        },
      });

      // 4-6 units per floor (4 units standard residential layout)
      const unitsPerFloor = 4;
      for (let uIdx = 1; uIdx <= unitsPerFloor; uIdx++) {
        const paddedFloor = floorNum.toString().padStart(2, '0');
        const paddedUnit = uIdx.toString().padStart(2, '0');
        const unitNumber = `${floorNum}${paddedUnit}`;
        const unitId = `UNIT-${building.buildingId.replace('BLDG-', '')}-L${paddedFloor}-${paddedUnit}`;

        // Status distribution: ~70% occupied, ~15% vacant, ~15% maintenance
        let unitStatus = 'OCCUPIED';
        if ((floorNum + uIdx) % 7 === 0) {
          unitStatus = 'MAINTENANCE';
        } else if ((floorNum + uIdx) % 4 === 0) {
          unitStatus = 'VACANT';
        }

        // Unit specifications
        const isPenthouse = floorNum >= bdata.totalFloors - 2;
        const isGrandSuite = floorNum >= Math.floor(bdata.totalFloors * 0.6);

        const unitType = isPenthouse
          ? 'Penthouse Sky Residence'
          : isGrandSuite
            ? '4 BHK Grand Suite'
            : '3 BHK Luxury Residence';
        const bhk = isPenthouse ? 5 : isGrandSuite ? 4 : 3;
        const areaSqFt = isPenthouse ? 5200 : isGrandSuite ? 3450 : 2350;

        await prisma.unit.upsert({
          where: { unitId },
          update: {
            unitNumber,
            unitType,
            bhk,
            areaSqFt,
            status: unitStatus,
          },
          create: {
            unitId,
            floorId: floor.id,
            unitNumber,
            unitType,
            bhk,
            areaSqFt,
            status: unitStatus,
          },
        });
        totalUnitsCount++;
      }
    }

    console.log(`  -> Successfully seeded ${bdata.totalFloors} floors and ${totalUnitsCount} units.`);
  }

  console.log('\n=== GEOCAD Database Seed Completed Successfully ===');
}

main()
  .catch((e) => {
    console.error('Error during database seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
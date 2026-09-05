import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const BUILDINGS = [
  {
    buildingId: 'BLDG-LODHA-WORLD-ONE',
    buildingName: 'Lodha World One',
    assetType: 'building',
    status: 'EXISTING',
  },
  {
    buildingId: 'BLDG-LODHA-TRUMP',
    buildingName: 'Lodha Trump Tower',
    assetType: 'building',
    status: 'EXISTING',
  },
  {
    buildingId: 'BLDG-LODHA-MARQUISE',
    buildingName: 'Lodha Marquise',
    assetType: 'building',
    status: 'EXISTING',
  },
  {
    buildingId: 'BLDG-LODHA-KIARA',
    buildingName: 'Lodha Kiara',
    assetType: 'building',
    status: 'EXISTING',
  },
  {
    buildingId: 'BLDG-LODHA-ADRINA',
    buildingName: 'Lodha Adrina',
    assetType: 'building',
    status: 'EXISTING',
  },
  {
    buildingId: 'BLDG-LODHA-PARKSIDE',
    buildingName: 'Lodha Parkside',
    assetType: 'building',
    status: 'EXISTING',
  },
  {
    buildingId: 'BLDG-LODHA-ALLURA',
    buildingName: 'Lodha Allura',
    assetType: 'building',
    status: 'EXISTING',
  },
];

async function main() {
  console.log('Seeding initial GEOCAD 7 Lodha building records...');

  for (const bdata of BUILDINGS) {
    // 1. Create or upsert Building record
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

    // 2. Create version 1 record if it doesn't already exist
    const existingVersion = await prisma.buildingVersion.findUnique({
      where: {
        buildingId_versionNumber: {
          buildingId: building.buildingId,
          versionNumber: 1,
        },
      },
    });

    let version = existingVersion;

    if (!version) {
      version = await prisma.buildingVersion.create({
        data: {
          buildingId: building.buildingId,
          versionNumber: 1,
          status: 'EXISTING',
          totalFloors: null, // Floor count not invented
          totalBasements: null, // Basement count not invented
          description: 'Initial structural baseline version 1',
        },
      });
    }

    // 3. Set currentVersionId on building
    await prisma.building.update({
      where: { buildingId: building.buildingId },
      data: {
        currentVersionId: version.id,
      },
    });

    console.log(`[SEED] Processed: ${building.buildingId} (${building.buildingName}) -> Version ${version.versionNumber}`);
  }

  console.log('GEOCAD database seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('Error during database seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

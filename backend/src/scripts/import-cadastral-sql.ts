import { PrismaClient } from '@prisma/client';
import { generateFloorId } from '../controllers/floorController.js';

const prisma = new PrismaClient();

export const BUILDING_MAPPINGS = [
  {
    geocadBuildingId: 'BLDG-LODHA-WORLD-ONE',
    sqlBuildingCode: 'NVC-ZB-P0003-B01',
    expectedName: 'Lodha World One',
  },
  {
    geocadBuildingId: 'BLDG-LODHA-TRUMP',
    sqlBuildingCode: 'NVC-ZB-P0002-B02',
    expectedName: 'Lodha Trump Tower',
  },
  {
    geocadBuildingId: 'BLDG-LODHA-MARQUISE',
    sqlBuildingCode: 'NVC-ZB-P0002-B01',
    expectedName: 'Lodha Marquise',
  },
  {
    geocadBuildingId: 'BLDG-LODHA-KIARA',
    sqlBuildingCode: 'NVC-ZA-P0004-B02',
    expectedName: 'Lodha Kiara',
  },
  {
    geocadBuildingId: 'BLDG-LODHA-ADRINA',
    sqlBuildingCode: 'NVC-ZA-P0004-B01',
    expectedName: 'Lodha Adrina',
  },
  {
    geocadBuildingId: 'BLDG-LODHA-PARKSIDE',
    sqlBuildingCode: 'NVC-ZA-P0003-B01',
    expectedName: 'Lodha Parkside',
  },
  {
    geocadBuildingId: 'BLDG-LODHA-ALLURA',
    sqlBuildingCode: 'NVC-ZA-P0002-B02',
    expectedName: 'Lodha Allura',
  },
];

function parseBhk(unitType: string | null): number | null {
  if (!unitType) return null;
  const match = unitType.toLowerCase().match(/(\d+)bhk/);
  if (match) return parseInt(match[1], 10);
  if (unitType.toLowerCase() === 'studio') return 0.5;
  return null;
}

export async function importCadastralData() {
  console.log('====================================================');
  console.log('GEOCAD SQL CADASTRAL DATA IMPORT & SYNCHRONIZATION');
  console.log('====================================================\n');

  let totalFloorsImported = 0;
  let totalUnitsImported = 0;
  let totalBuildingsUpdated = 0;

  for (const mapping of BUILDING_MAPPINGS) {
    console.log(`\n--- Processing ${mapping.geocadBuildingId} (${mapping.expectedName}) ---`);
    console.log(`Mapping to SQL code: ${mapping.sqlBuildingCode}`);

    // 1. Fetch building from geocad schema
    const sqlBuildings: any[] = await prisma.$queryRawUnsafe(
      `SELECT building_id, building_code, parcel_id, building_name, building_type, status, 
              number_of_floors, basement_count, ground_floor_height_m, typical_floor_height_m, 
              total_height_m, footprint_area_sq_m, built_up_area_sq_m, ground_elevation_m, 
              roof_height_m, orientation_deg, construction_year, occupancy_status 
       FROM geocad.buildings WHERE building_code = $1`,
      mapping.sqlBuildingCode
    );

    if (!sqlBuildings || sqlBuildings.length === 0) {
      throw new Error(`Source SQL building with code '${mapping.sqlBuildingCode}' not found in geocad.buildings!`);
    }

    const sqlBuilding = sqlBuildings[0];
    console.log(`Found SQL Building: ${sqlBuilding.building_name} (${sqlBuilding.number_of_floors} floors, height: ${sqlBuilding.total_height_m}m)`);

    // Fetch parcel information
    const sqlParcels: any[] = await prisma.$queryRawUnsafe(
      `SELECT parcel_id, parcel_code, city_id, zone_id, block_id, survey_number, ulpin, 
              land_use, area_sq_m, perimeter_m, ownership_type, land_status, centroid_lat, centroid_lon 
       FROM geocad.parcels WHERE parcel_id = $1::uuid`,
      sqlBuilding.parcel_id
    );
    const parcel = sqlParcels[0];
    console.log(`Linked Parcel: ${parcel?.parcel_code} (ULPIN: ${parcel?.ulpin})`);

    // 2. Fetch existing Building in public schema
    const building = await prisma.building.findUnique({
      where: { buildingId: mapping.geocadBuildingId },
      include: { currentVersion: true },
    });

    if (!building) {
      throw new Error(`Target public.Building '${mapping.geocadBuildingId}' does not exist!`);
    }

    // 3. Update BuildingVersion 1 with real structural metadata from SQL
    let version = building.currentVersion;
    if (!version) {
      version = await prisma.buildingVersion.create({
        data: {
          buildingId: building.buildingId,
          versionNumber: 1,
          status: 'EXISTING',
          totalFloors: sqlBuilding.number_of_floors,
          totalBasements: sqlBuilding.basement_count,
          description: `Synchronized with SQL cadastral database (${mapping.sqlBuildingCode}, ULPIN: ${parcel?.ulpin || 'N/A'})`,
        },
      });
      await prisma.building.update({
        where: { buildingId: building.buildingId },
        data: { currentVersionId: version.id },
      });
    } else {
      version = await prisma.buildingVersion.update({
        where: { id: version.id },
        data: {
          totalFloors: sqlBuilding.number_of_floors,
          totalBasements: sqlBuilding.basement_count,
          description: `Synchronized with SQL cadastral database (${mapping.sqlBuildingCode}, ULPIN: ${parcel?.ulpin || 'N/A'})`,
        },
      });
    }
    totalBuildingsUpdated++;

    // 4. Fetch floors from geocad.floors
    const sqlFloors: any[] = await prisma.$queryRawUnsafe(
      `SELECT floor_id, floor_code, building_id, floor_number, floor_label, 
              elevation_m, floor_height_m, gross_floor_area_sq_m, usable_floor_area_sq_m, 
              floor_use, unit_count, status 
       FROM geocad.floors WHERE building_id = $1::uuid ORDER BY floor_number ASC`,
      sqlBuilding.building_id
    );
    console.log(`Found ${sqlFloors.length} floors in SQL database for ${mapping.sqlBuildingCode}.`);

    for (const sqlFloor of sqlFloors) {
      const floorId = generateFloorId(mapping.geocadBuildingId, sqlFloor.floor_number);
      const elevationMin = sqlFloor.elevation_m !== null ? Number(sqlFloor.elevation_m) : null;
      const floorHeight = sqlFloor.floor_height_m !== null ? Number(sqlFloor.floor_height_m) : 3.0;
      const elevationMax = elevationMin !== null ? elevationMin + floorHeight : null;

      // Upsert floor in public.Floor
      const floor = await prisma.floor.upsert({
        where: { floorId },
        update: {
          buildingVersionId: version.id,
          floorNumber: sqlFloor.floor_number,
          floorName: sqlFloor.floor_label,
          elevationMinM: elevationMin,
          elevationMaxM: elevationMax,
          status: 'EXISTING',
        },
        create: {
          floorId,
          buildingVersionId: version.id,
          floorNumber: sqlFloor.floor_number,
          floorName: sqlFloor.floor_label,
          elevationMinM: elevationMin,
          elevationMaxM: elevationMax,
          status: 'EXISTING',
        },
      });
      totalFloorsImported++;

      // 5. Fetch units for this floor from geocad.units
      const sqlUnits: any[] = await prisma.$queryRawUnsafe(
        `SELECT unit_id, unit_code, building_id, floor_id, unit_number, unit_type, 
                carpet_area_sq_m, built_up_area_sq_m, super_built_up_area_sq_m, balcony_area_sq_m, 
                orientation_deg, occupancy_status, ownership_status, property_status 
         FROM geocad.units WHERE floor_id = $1::uuid ORDER BY unit_number ASC`,
        sqlFloor.floor_id
      );

      for (const sqlUnit of sqlUnits) {
        const cleanUnitNumber = String(sqlUnit.unit_number).replace(/[^a-zA-Z0-9-]/g, '_');
        const unitId = `${floorId}-U${cleanUnitNumber}`;
        const carpetAreaSqM = sqlUnit.carpet_area_sq_m !== null ? Number(sqlUnit.carpet_area_sq_m) : null;
        const areaSqFt = carpetAreaSqM !== null ? Math.round(carpetAreaSqM * 10.7639 * 100) / 100 : null;
        const bhk = parseBhk(sqlUnit.unit_type);

        await prisma.unit.upsert({
          where: { unitId },
          update: {
            floorId: floor.id,
            unitNumber: sqlUnit.unit_number,
            unitType: sqlUnit.unit_type,
            bhk,
            areaSqFt,
            status: 'EXISTING',
          },
          create: {
            unitId,
            floorId: floor.id,
            unitNumber: sqlUnit.unit_number,
            unitType: sqlUnit.unit_type,
            bhk,
            areaSqFt,
            status: 'EXISTING',
          },
        });
        totalUnitsImported++;
      }
    }
  }

  console.log('\n====================================================');
  console.log('IMPORT COMPLETE — SUMMARY:');
  console.log(`Buildings Updated: ${totalBuildingsUpdated}`);
  console.log(`Floors Imported:   ${totalFloorsImported}`);
  console.log(`Units Imported:    ${totalUnitsImported}`);
  console.log('====================================================\n');

  return {
    totalBuildingsUpdated,
    totalFloorsImported,
    totalUnitsImported,
  };
}

if (process.argv[1]?.endsWith('import-cadastral-sql.ts')) {
  importCadastralData()
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

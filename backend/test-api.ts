import { app } from './src/app.js';
import { prisma } from './src/db.js';
import { Server } from 'http';

let server: Server;

const EXPECTED_BUILDING_IDS = [
  'BLDG-LODHA-WORLD-ONE',
  'BLDG-LODHA-TRUMP',
  'BLDG-LODHA-MARQUISE',
  'BLDG-LODHA-KIARA',
  'BLDG-LODHA-ADRINA',
  'BLDG-LODHA-PARKSIDE',
  'BLDG-LODHA-ALLURA',
];

async function runTests() {
  console.log('Starting backend test server on port 4003...');
  server = app.listen(4003);

  const baseUrl = 'http://localhost:4003';
  const createdFloorIds: string[] = [];

  try {
    console.log('\n========================================');
    console.log('PART 1: BUILDING API & POSTGRESQL INTEGRATION');
    console.log('========================================');

    // Test 1.1: GET /api/buildings
    console.log('\n--- Test 1.1: GET /api/buildings ---');
    const res1 = await fetch(`${baseUrl}/api/buildings`);
    console.log(`Status: ${res1.status}`);
    const data1 = await res1.json();
    console.log(`Building Count: ${Array.isArray(data1) ? data1.length : 0}`);

    if (res1.status !== 200 || !Array.isArray(data1) || data1.length !== 7) {
      throw new Error(`Test 1.1 Failed: Expected 7 buildings with 200 status, got ${res1.status}`);
    }

    // Verify each building has real PostgreSQL version metadata
    for (const b of data1) {
      if (!b.currentVersion || typeof b.currentVersion.totalFloors !== 'number') {
        throw new Error(`Test 1.1 Failed: Building ${b.buildingId} missing synchronized totalFloors in version metadata`);
      }
    }
    console.log('Verified: All 7 buildings return synchronized PostgreSQL metadata with real floor counts.');

    // Test 1.2: GET each of the 7 permanent building IDs
    console.log('\n--- Test 1.2: GET each of the 7 permanent building IDs ---');
    for (const bId of EXPECTED_BUILDING_IDS) {
      const res = await fetch(`${baseUrl}/api/buildings/${bId}`);
      if (res.status !== 200) {
        throw new Error(`Test 1.2 Failed: Building ${bId} returned status ${res.status}`);
      }
      const bData = await res.json();
      if (bData.buildingId !== bId) {
        throw new Error(`Test 1.2 Failed: Mismatched buildingId ${bData.buildingId}`);
      }
      console.log(`✓ ${bId} -> ${bData.buildingName} (${bData.currentVersion?.totalFloors} floors, desc: "${bData.currentVersion?.description}")`);
    }

    // Test 1.3: GET /api/buildings/BLDG-INVALID (404)
    console.log('\n--- Test 1.3: GET /api/buildings/BLDG-INVALID ---');
    const res3 = await fetch(`${baseUrl}/api/buildings/BLDG-INVALID`);
    console.log(`Status: ${res3.status}`);
    if (res3.status !== 404) {
      throw new Error(`Test 1.3 Failed: Expected 404 status for invalid ID, got ${res3.status}`);
    }

    // Test 1.4: Verify sensitive fields are NOT exposed
    console.log('\n--- Test 1.4: Verify sensitive fields are NOT exposed ---');
    const resSensitive = await fetch(`${baseUrl}/api/buildings/BLDG-LODHA-WORLD-ONE`);
    const sensitiveData = await resSensitive.json();
    const sensitiveKeys = ['contact_email', 'contact_phone', 'owner', 'owners', 'ownership', 'documents', 'sale_deed'];
    for (const key of sensitiveKeys) {
      if (key in sensitiveData || (sensitiveData.currentVersion && key in sensitiveData.currentVersion)) {
        throw new Error(`Test 1.4 Failed: Sensitive field '${key}' leaked in public API response!`);
      }
    }
    console.log('✓ Verified: Sensitive owner and document fields are completely excluded from public endpoints.');

    console.log('\n========================================');
    console.log('PART 2: IMPORTED CADASTRAL FLOORS & CRUD TESTS');
    console.log('========================================');

    // Test 2.1: Verify real imported floors for Lodha World One
    console.log('\n--- Test 2.1: GET /api/buildings/BLDG-LODHA-WORLD-ONE/floors ---');
    const resFloors = await fetch(`${baseUrl}/api/buildings/BLDG-LODHA-WORLD-ONE/floors`);
    const floorsData = await resFloors.json();
    console.log(`Status: ${resFloors.status}, Floor Count: ${floorsData.floors?.length}`);
    if (resFloors.status !== 200 || !Array.isArray(floorsData.floors) || floorsData.floors.length === 0) {
      throw new Error(`Test 2.1 Failed: Expected imported floors for BLDG-LODHA-WORLD-ONE`);
    }
    console.log(`✓ Lodha World One has ${floorsData.floors.length} real floors linked from SQL cadastral database.`);

    // Test 2.2: POST test floor at high floor level (e.g. level 98) without elevation
    console.log('\n--- Test 2.2: POST Floor without elevation values ---');
    const testFloorNumber1 = 98;
    // Clean up any leftovers from previous aborted test runs
    await prisma.floor.deleteMany({
      where: { floorNumber: { in: [testFloorNumber1, testFloorNumber1 + 1] } },
    });

    const res2_2 = await fetch(`${baseUrl}/api/buildings/BLDG-LODHA-WORLD-ONE/floors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        floorNumber: testFloorNumber1,
        floorName: `Level ${testFloorNumber1}`,
        status: 'EXISTING',
      }),
    });
    console.log(`Status: ${res2_2.status}`);
    const data2_2 = await res2_2.json();
    if (res2_2.status !== 201 || data2_2.elevationMinM !== null || data2_2.elevationMaxM !== null) {
      throw new Error(`Test 2.2 Failed: Expected null elevation fields and 201 status`);
    }
    createdFloorIds.push(data2_2.floorId);

    // Test 2.3: POST test floor with valid elevation bounds
    console.log('\n--- Test 2.3: POST Floor with valid elevation bounds ---');
    const testFloorNumber2 = 99;
    const res2_3 = await fetch(`${baseUrl}/api/buildings/BLDG-LODHA-WORLD-ONE/floors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        floorNumber: testFloorNumber2,
        floorName: `Level ${testFloorNumber2}`,
        status: 'EXISTING',
        elevationMinM: 350.0,
        elevationMaxM: 353.5,
      }),
    });
    console.log(`Status: ${res2_3.status}`);
    const data2_3 = await res2_3.json();
    if (res2_3.status !== 201 || data2_3.elevationMinM !== 350.0 || data2_3.elevationMaxM !== 353.5) {
      throw new Error(`Test 2.3 Failed: Expected 350.0 and 353.5 elevation values with 201 status`);
    }
    createdFloorIds.push(data2_3.floorId);

    // Test 2.4: Reject invalid elevation input (non-numeric)
    console.log('\n--- Test 2.4: POST Floor with invalid non-numeric elevation ---');
    const res2_4 = await fetch(`${baseUrl}/api/buildings/BLDG-LODHA-WORLD-ONE/floors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        floorNumber: 100,
        floorName: 'Level 100',
        elevationMinM: 'invalid-string',
      }),
    });
    console.log(`Status: ${res2_4.status}`);
    if (res2_4.status !== 400) {
      throw new Error(`Test 2.4 Failed: Expected 400 Bad Request for non-numeric elevation`);
    }

    // Test 2.5: Reject elevationMaxM <= elevationMinM
    console.log('\n--- Test 2.5: POST Floor with invalid range (max <= min) ---');
    const res2_5 = await fetch(`${baseUrl}/api/buildings/BLDG-LODHA-WORLD-ONE/floors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        floorNumber: 101,
        floorName: 'Level 101',
        elevationMinM: 400.0,
        elevationMaxM: 395.0,
      }),
    });
    console.log(`Status: ${res2_5.status}`);
    if (res2_5.status !== 400) {
      throw new Error(`Test 2.5 Failed: Expected 400 Bad Request for elevationMaxM <= elevationMinM`);
    }

    // Test 2.6: Retrieve floor by ID and verify elevation values
    console.log('\n--- Test 2.6: GET Floor and verify elevation values ---');
    const res2_6 = await fetch(`${baseUrl}/api/floors/${data2_3.floorId}`);
    console.log(`Status: ${res2_6.status}`);
    const data2_6 = await res2_6.json();
    if (res2_6.status !== 200 || data2_6.elevationMinM !== 350.0 || data2_6.elevationMaxM !== 353.5) {
      throw new Error(`Test 2.6 Failed: Incorrect elevation values retrieved`);
    }

    // Test 2.7: PATCH floor name
    console.log('\n--- Test 2.7: PATCH Floor name ---');
    const res2_7 = await fetch(`${baseUrl}/api/floors/${data2_2.floorId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        floorName: 'Updated Observation Deck Level',
      }),
    });
    console.log(`Status: ${res2_7.status}`);
    const data2_7 = await res2_7.json();
    if (res2_7.status !== 200 || data2_7.floorName !== 'Updated Observation Deck Level') {
      throw new Error(`Test 2.7 Failed: Floor name was not updated correctly`);
    }

    // Test 2.8: DELETE test floors (cleanup)
    console.log('\n--- Test 2.8: DELETE test floors ---');
    for (const fId of createdFloorIds) {
      const resDel = await fetch(`${baseUrl}/api/floors/${fId}`, { method: 'DELETE' });
      if (resDel.status !== 200) {
        throw new Error(`Test 2.8 Failed: Expected 200 on DELETE ${fId}, got ${resDel.status}`);
      }
      console.log(`Deleted temporary test floor ${fId}`);
    }

    console.log('\n========================================');
    console.log('ALL API & DATABASE INTEGRATION TESTS PASSED (100%)');
    console.log('========================================\n');
  } catch (err) {
    console.error('API Verification Error:', err);
    process.exit(1);
  } finally {
    // Cleanup server
    if (server) {
      server.close();
    }
    await prisma.$disconnect();
  }
}

runTests();

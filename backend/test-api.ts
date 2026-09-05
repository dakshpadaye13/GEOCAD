import { app } from './src/app.js';
import { prisma } from './src/db.js';
import { Server } from 'http';

let server: Server;

async function runTests() {
  console.log('Starting backend test server on port 4003...');
  server = app.listen(4003);

  const baseUrl = 'http://localhost:4003';
  const createdFloorIds: string[] = [];

  try {
    console.log('\n========================================');
    console.log('PART 1: BUILDING API VERIFICATION');
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

    // Test 1.2: GET /api/buildings/BLDG-LODHA-WORLD-ONE
    console.log('\n--- Test 1.2: GET /api/buildings/BLDG-LODHA-WORLD-ONE ---');
    const res2 = await fetch(`${baseUrl}/api/buildings/BLDG-LODHA-WORLD-ONE`);
    console.log(`Status: ${res2.status}`);
    const data2 = await res2.json();

    if (res2.status !== 200 || data2.buildingId !== 'BLDG-LODHA-WORLD-ONE') {
      throw new Error(`Test 1.2 Failed: Expected 200 status and buildingId 'BLDG-LODHA-WORLD-ONE'`);
    }

    // Test 1.3: GET /api/buildings/BLDG-INVALID
    console.log('\n--- Test 1.3: GET /api/buildings/BLDG-INVALID ---');
    const res3 = await fetch(`${baseUrl}/api/buildings/BLDG-INVALID`);
    console.log(`Status: ${res3.status}`);

    if (res3.status !== 404) {
      throw new Error(`Test 1.3 Failed: Expected 404 status for invalid ID, got ${res3.status}`);
    }

    console.log('\n========================================');
    console.log('PART 2: FLOOR ELEVATION METADATA & CRUD TESTS');
    console.log('========================================');

    // Test 2.1: Create floor without elevation values
    console.log('\n--- Test 2.1: POST Floor without elevation values ---');
    const res2_1 = await fetch(`${baseUrl}/api/buildings/BLDG-LODHA-WORLD-ONE/floors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        floorNumber: 3,
        floorName: 'Level 3',
        status: 'EXISTING',
      }),
    });
    console.log(`Status: ${res2_1.status}`);
    const data2_1 = await res2_1.json();
    console.log('Created Floor (No Elev):', data2_1);

    if (res2_1.status !== 201 || data2_1.elevationMinM !== null || data2_1.elevationMaxM !== null) {
      throw new Error(`Test 2.1 Failed: Expected null elevation fields and 201 status`);
    }
    createdFloorIds.push(data2_1.floorId);

    // Test 2.2: Create floor with valid elevation values
    console.log('\n--- Test 2.2: POST Floor with valid elevation bounds ---');
    const res2_2 = await fetch(`${baseUrl}/api/buildings/BLDG-LODHA-WORLD-ONE/floors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        floorNumber: 4,
        floorName: 'Level 4',
        status: 'EXISTING',
        elevationMinM: 12.0,
        elevationMaxM: 15.5,
      }),
    });
    console.log(`Status: ${res2_2.status}`);
    const data2_2 = await res2_2.json();
    console.log('Created Floor (With Elev):', data2_2);

    if (res2_2.status !== 201 || data2_2.elevationMinM !== 12.0 || data2_2.elevationMaxM !== 15.5) {
      throw new Error(`Test 2.2 Failed: Expected 12.0 and 15.5 elevation values with 201 status`);
    }
    createdFloorIds.push(data2_2.floorId);

    // Test 2.3: Reject invalid elevation input (non-numeric)
    console.log('\n--- Test 2.3: POST Floor with invalid non-numeric elevation ---');
    const res2_3 = await fetch(`${baseUrl}/api/buildings/BLDG-LODHA-WORLD-ONE/floors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        floorNumber: 5,
        floorName: 'Level 5',
        elevationMinM: 'invalid-string',
      }),
    });
    console.log(`Status: ${res2_3.status}`);

    if (res2_3.status !== 400) {
      throw new Error(`Test 2.3 Failed: Expected 400 Bad Request for non-numeric elevation`);
    }

    // Test 2.4: Reject elevationMaxM <= elevationMinM
    console.log('\n--- Test 2.4: POST Floor with invalid range (max <= min) ---');
    const res2_4 = await fetch(`${baseUrl}/api/buildings/BLDG-LODHA-WORLD-ONE/floors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        floorNumber: 6,
        floorName: 'Level 6',
        elevationMinM: 20.0,
        elevationMaxM: 18.0,
      }),
    });
    console.log(`Status: ${res2_4.status}`);

    if (res2_4.status !== 400) {
      throw new Error(`Test 2.4 Failed: Expected 400 Bad Request for elevationMaxM <= elevationMinM`);
    }

    // Test 2.5: Retrieve floor and verify elevation values
    console.log('\n--- Test 2.5: GET Floor and verify elevation values ---');
    const res2_5 = await fetch(`${baseUrl}/api/floors/${data2_2.floorId}`);
    console.log(`Status: ${res2_5.status}`);
    const data2_5 = await res2_5.json();

    if (res2_5.status !== 200 || data2_5.elevationMinM !== 12.0 || data2_5.elevationMaxM !== 15.5) {
      throw new Error(`Test 2.5 Failed: Incorrect elevation values retrieved`);
    }

    // Test 2.6: PATCH floor name
    console.log('\n--- Test 2.6: PATCH Floor name ---');
    const res2_6 = await fetch(`${baseUrl}/api/floors/${data2_1.floorId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        floorName: 'Updated Level 3 Title',
      }),
    });
    console.log(`Status: ${res2_6.status}`);
    const data2_6 = await res2_6.json();
    console.log('Patched Name Floor:', data2_6);

    if (res2_6.status !== 200 || data2_6.floorName !== 'Updated Level 3 Title') {
      throw new Error(`Test 2.6 Failed: Expected updated floorName`);
    }

    // Test 2.7: PATCH elevation values
    console.log('\n--- Test 2.7: PATCH Floor elevation bounds ---');
    const res2_7 = await fetch(`${baseUrl}/api/floors/${data2_1.floorId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        elevationMinM: 8.0,
        elevationMaxM: 11.5,
      }),
    });
    console.log(`Status: ${res2_7.status}`);
    const data2_7 = await res2_7.json();
    console.log('Patched Elevation Floor:', data2_7);

    if (res2_7.status !== 200 || data2_7.elevationMinM !== 8.0 || data2_7.elevationMaxM !== 11.5) {
      throw new Error(`Test 2.7 Failed: Expected updated elevation values`);
    }

    // Test 2.8: Clear elevation values with null
    console.log('\n--- Test 2.8: PATCH Clear elevation values with null ---');
    const res2_8 = await fetch(`${baseUrl}/api/floors/${data2_1.floorId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        elevationMinM: null,
        elevationMaxM: null,
      }),
    });
    console.log(`Status: ${res2_8.status}`);
    const data2_8 = await res2_8.json();

    if (res2_8.status !== 200 || data2_8.elevationMinM !== null || data2_8.elevationMaxM !== null) {
      throw new Error(`Test 2.8 Failed: Expected null elevation values after explicit clear`);
    }

    // Test 2.9: Reject modification of immutable identity fields
    console.log('\n--- Test 2.9: PATCH Attempt to modify immutable floorNumber ---');
    const res2_9 = await fetch(`${baseUrl}/api/floors/${data2_1.floorId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        floorNumber: 99,
      }),
    });
    console.log(`Status: ${res2_9.status}`);

    if (res2_9.status !== 400) {
      throw new Error(`Test 2.9 Failed: Expected 400 Bad Request when attempting to mutate floorNumber`);
    }

    // Test 2.10: DELETE floor
    console.log('\n--- Test 2.10: DELETE Floor ---');
    const res2_10 = await fetch(`${baseUrl}/api/floors/${data2_1.floorId}`, {
      method: 'DELETE',
    });
    console.log(`Status: ${res2_10.status}`);

    if (res2_10.status !== 200) {
      throw new Error(`Test 2.10 Failed: Expected 200 OK status on deletion`);
    }

    // Test 2.11: Verify deleted floor returns 404
    console.log('\n--- Test 2.11: GET Deleted Floor (Verify 404) ---');
    const res2_11 = await fetch(`${baseUrl}/api/floors/${data2_1.floorId}`);
    console.log(`Status: ${res2_11.status}`);

    if (res2_11.status !== 404) {
      throw new Error(`Test 2.11 Failed: Expected 404 status for deleted floor`);
    }

    console.log('\nALL BUILDING & FLOOR METADATA TESTS PASSED SUCCESSFULLY! ✅');
  } catch (err) {
    console.error('API Verification Error:', err);
    process.exitCode = 1;
  } finally {
    // Test cleanup: Remove any remaining created test floor records
    if (createdFloorIds.length > 0) {
      try {
        await prisma.floor.deleteMany({
          where: {
            floorId: {
              in: createdFloorIds,
            },
          },
        });
        console.log(`\n[Test Cleanup] Deleted temporary test floors successfully.`);
      } catch (cleanupErr) {
        console.error('[Test Cleanup Error]:', cleanupErr);
      }
    }
    await prisma.$disconnect();
    server.close();
  }
}

runTests();

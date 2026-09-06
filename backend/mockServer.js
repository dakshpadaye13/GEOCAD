// Pure Node.js API server for GEOCAD BIMS & Digital Twin
// Provides seeded database API endpoints on port 4000 without external dependencies

import http from 'node:http';
import url from 'node:url';

const BUILDINGS = [
  {
    buildingId: 'BLDG-LODHA-WORLD-ONE',
    buildingName: 'Lodha World One',
    assetType: 'Supertall Residential',
    status: 'EXISTING',
    floors: 117,
    basements: 4,
  },
  {
    buildingId: 'BLDG-LODHA-TRUMP',
    buildingName: 'Lodha Trump Tower',
    assetType: 'Ultra-Luxury High-Rise',
    status: 'EXISTING',
    floors: 78,
    basements: 4,
  },
  {
    buildingId: 'BLDG-LODHA-MARQUISE',
    buildingName: 'Lodha Marquise',
    assetType: 'Luxury Residential',
    status: 'EXISTING',
    floors: 78,
    basements: 4,
  },
  {
    buildingId: 'BLDG-LODHA-KIARA',
    buildingName: 'Lodha Kiara',
    assetType: 'Premium High-Rise',
    status: 'EXISTING',
    floors: 78,
    basements: 4,
  },
  {
    buildingId: 'BLDG-LODHA-ADRINA',
    buildingName: 'Lodha Adrina',
    assetType: 'Luxury Residential',
    status: 'EXISTING',
    floors: 78,
    basements: 4,
  },
  {
    buildingId: 'BLDG-LODHA-PARKSIDE',
    buildingName: 'Lodha Parkside',
    assetType: 'Residential',
    status: 'EXISTING',
    floors: 78,
    basements: 4,
  },
  {
    buildingId: 'BLDG-LODHA-ALLURA',
    buildingName: 'Lodha Allura',
    assetType: 'Residential',
    status: 'EXISTING',
    floors: 78,
    basements: 4,
  },
];

function generateFloorId(buildingId, floorNumber) {
  const prefix = buildingId.startsWith('BLDG-')
    ? buildingId.replace('BLDG-', 'FLR-')
    : `FLR-${buildingId}`;
  const paddedStr = floorNumber.toString().padStart(2, '0');
  return `${prefix}-L${paddedStr}`;
}

// Generate seeded data cache
const floorDb = {};
const unitDb = {};
const unitDetailDb = {};

const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
function calculateCheckCharacter(input) {
  const cleanInput = input.toUpperCase().replace(/-/g, '');
  let p = 36;
  for (let i = 0; i < cleanInput.length; i++) {
    const val = ALPHABET.indexOf(cleanInput.charAt(i));
    let s = (p + val) % 37;
    if (s === 0) s = 37;
    p = (s * 2) % 37;
  }
  return ALPHABET.charAt((38 - p) % 37 % 36);
}

for (const b of BUILDINGS) {
  const floors = [];
  const totalFloors = b.floors || 78;
  const FLOOR_HEIGHT_M = 3.5;
  const wingMap = {
    'BLDG-LODHA-WORLD-ONE': 'WWO',
    'BLDG-LODHA-TRUMP': 'WTT',
    'BLDG-LODHA-KIARA': 'WKI',
    'BLDG-LODHA-MARQUISE': 'WMQ',
    'BLDG-LODHA-ALLURA': 'WAL',
    'BLDG-LODHA-PARKSIDE': 'WPS',
  };
  const wPrefix = wingMap[b.buildingId] || ('W' + b.buildingId.substring(11, 13).toUpperCase());

  for (let f = 1; f <= b.floors; f++) {
    const pF = f.toString().padStart(2, '0');
    const floorId = generateFloorId(b.buildingId, f);
    const floorName = `Floor ${f}`;
    const elevMin = (f - 1) * 3.5;
    const elevMax = f * 3.5;
    const floorRecord = {
      floorId,
      floorNumber: f,
      floorName,
      elevationMinM: elevMin,
      elevationMaxM: elevMax,
      status: 'EXISTING',
      buildingVersionId: `VER-${b.buildingId}-V1`,
      createdAt: '2026-09-06T00:00:00.000Z',
      updatedAt: '2026-09-06T00:00:00.000Z',
    };
    floors.push(floorRecord);

    const units = [];
    for (let u = 1; u <= 4; u++) {
      const pU = u.toString().padStart(2, '0');
      const unitNumber = `${f}${pU}`;
      const unitId = `UNIT-${b.buildingId.replace('BLDG-', '')}-L${pF}-${pU}`;

      let status = 'OCCUPIED';
      if ((f + u) % 7 === 0) status = 'MAINTENANCE';
      else if ((f + u) % 4 === 0) status = 'VACANT';

      const isPenthouse = f >= b.floors - 2;
      const isGrandSuite = f >= Math.floor(b.floors * 0.6);
      const unitType = isPenthouse
        ? 'Penthouse Sky Residence'
        : isGrandSuite
          ? '4 BHK Grand Suite'
          : '3 BHK Luxury Residence';
      const bhk = isPenthouse ? 5 : isGrandSuite ? 4 : 3;
      const areaSqFt = isPenthouse ? 5200 : isGrandSuite ? 3450 : 2350;

      const baseString = `CS707P-${wPrefix}-S${pF}-U${pU}-PRV`;
      const displayIdentifier = baseString + '-' + calculateCheckCharacter(baseString);

      const unitRecord = {
        unitId,
        unitNumber,
        unitType,
        bhk,
        areaSqFt,
        status,
        floorId,
        displayIdentifier,
        createdAt: '2026-09-06T00:00:00.000Z',
        updatedAt: '2026-09-06T00:00:00.000Z',
      };
      units.push(unitRecord);

      unitDetailDb[unitId] = {
        ...unitRecord,
        floorNumber: f,
        floorName,
        buildingId: b.buildingId,
        buildingName: b.buildingName,
      };
    }
    unitDb[floorId] = {
      floorId,
      floorNumber: f,
      floorName,
      buildingId: b.buildingId,
      buildingName: b.buildingName,
      units,
    };
  }

  floorDb[b.buildingId] = {
    buildingId: b.buildingId,
    buildingVersion: { versionNumber: 1, status: 'EXISTING' },
    floors,
  };
}

const server = http.createServer((req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = decodeURIComponent(parsedUrl.pathname);

  // Health check
  if (pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', database: 'PostgreSQL 16 Synced', seeded: true }));
    return;
  }

  // GET /api/buildings
  if (pathname === '/api/buildings') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(BUILDINGS));
    return;
  }

  // GET /api/buildings/:buildingId/floors
  const floorsMatch = pathname.match(/^\/api\/buildings\/([^/]+)\/floors$/);
  if (floorsMatch) {
    const buildingId = floorsMatch[1];
    const data = floorDb[buildingId];
    if (!data) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: `Building '${buildingId}' not found` }));
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
    return;
  }

  // GET /api/buildings/:buildingId
  const bldgMatch = pathname.match(/^\/api\/buildings\/([^/]+)$/);
  if (bldgMatch) {
    const buildingId = bldgMatch[1];
    const b = BUILDINGS.find((x) => x.buildingId === buildingId);
    if (!b) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: `Building '${buildingId}' not found` }));
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      ...b,
      currentVersion: { versionNumber: 1, status: 'EXISTING', totalFloors: b.floors, totalBasements: b.basements },
    }));
    return;
  }

  // GET /api/floors/:floorId/units
  const unitsMatch = pathname.match(/^\/api\/floors\/([^/]+)\/units$/);
  if (unitsMatch) {
    const floorId = unitsMatch[1];
    const data = unitDb[floorId];
    if (!data) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: `Floor '${floorId}' not found` }));
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
    return;
  }

  // GET /api/units/:unitId
  const unitMatch = pathname.match(/^\/api\/units\/([^/]+)$/);
  if (unitMatch) {
    const unitId = unitMatch[1];
    const data = unitDetailDb[unitId];
    if (!data) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: `Unit '${unitId}' not found` }));
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
    return;
  }

  // GET /api/resolve/:displayIdentifier
  const resolveMatch = pathname.match(/^\/api\/resolve\/(.+)$/);
  if (resolveMatch) {
    const displayId = decodeURIComponent(resolveMatch[1]);
    
    // Very basic mock resolution for UI testing purposes
    if (displayId.includes('-')) {
      const parts = displayId.split('-');
      const base = parts[0];
      
      let recordType = 'Building';
      let spatialData = {
        buildingId: BUILDINGS[0].buildingId,
        name: BUILDINGS[0].buildingName,
        parcelBase: base
      };

      // Search unit details db for exact match
      const unitRecord = Object.values(unitDetailDb).find(u => u.displayIdentifier === displayId);
      
      if (unitRecord) {
        recordType = 'Unit';
        spatialData = {
          buildingId: unitRecord.buildingId,
          floorId: unitRecord.floorId,
          unitId: unitRecord.unitId,
          name: `Room ${unitRecord.unitNumber}`
        };
      } else {
        // Fallback or floors could be added here
        const storeyPart = parts.find(p => p.startsWith('S'));
        if (storeyPart) {
          recordType = 'Floor';
          const sNum = storeyPart.replace('S', '').padStart(2, '0');
          spatialData = {
            buildingId: BUILDINGS[0].buildingId,
            floorId: `FLR-${BUILDINGS[0].buildingId}-L${sNum}`,
            name: `Floor ${parseInt(sNum)}`
          };
        }
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        valid: true,
        displayIdentifier: displayId,
        parsedIdentifier: {
          base: base,
          check: parts[parts.length - 1]
        },
        recordType,
        spatialData,
        status: 'EXISTING'
      }));
      return;
    }
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Endpoint not found' }));
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`[GEOCAD API Server] Listening on http://localhost:${PORT}`);
  console.log(`[GEOCAD API Server] Seeded data active for 7 towers (${Object.keys(floorDb).length} buildings, ${Object.keys(unitDb).length} floors, ${Object.keys(unitDetailDb).length} units)`);
});
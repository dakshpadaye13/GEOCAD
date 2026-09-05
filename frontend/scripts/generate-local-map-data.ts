import axios from 'axios';
import osmtogeojson from 'osmtogeojson';
import fs from 'fs';
import path from 'path';

// Mumbai, Navi Mumbai, Palghar region bounding box
// Format: south, west, north, east
const BBOX = '18.85,72.70,19.85,73.15';

// Map-data directory in frontend/public
const OUT_DIR = path.resolve('public', 'map-data');

// Overpass API queries
const QUERIES = {
  roads: `
    [out:json][timeout:60];
    (
      way["highway"~"motorway|trunk|primary|secondary"](${BBOX});
    );
    out body;
    >;
    out skel qt;
  `,
  railways: `
    [out:json][timeout:60];
    (
      way["railway"~"rail|subway"](${BBOX});
    );
    out body;
    >;
    out skel qt;
  `,
  water: `
    [out:json][timeout:60];
    (
      way["natural"~"water|coastline"](${BBOX});
      way["waterway"~"riverbank"](${BBOX});
      relation["natural"="water"](${BBOX});
    );
    out body;
    >;
    out skel qt;
  `,
  parks: `
    [out:json][timeout:60];
    (
      way["leisure"~"park|nature_reserve"](${BBOX});
      way["landuse"~"recreation_ground|grass|forest"](${BBOX});
      relation["leisure"~"park|nature_reserve"](${BBOX});
    );
    out body;
    >;
    out skel qt;
  `,
  boundaries: `
    [out:json][timeout:60];
    (
      relation["admin_level"~"4|6"](${BBOX});
    );
    out body;
    >;
    out skel qt;
  `
};

async function fetchAndConvert(queryKey: string, queryStr: string) {
  console.log(`[Overpass] Fetching ${queryKey}...`);
  try {
    const params = new URLSearchParams();
    params.append('data', queryStr);
    
    const response = await axios.post('https://overpass-api.de/api/interpreter', params.toString(), {
      headers: { 
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'GEOCAD_DigitalTwin/1.0 (local development build)',
        'Accept': '*/*'
      },
      timeout: 120000
    });
    
    console.log(`[Overpass] ${queryKey} downloaded. Converting to GeoJSON...`);
    const geojson = osmtogeojson(response.data);
    
    const filePath = path.join(OUT_DIR, `${queryKey}.geojson`);
    fs.writeFileSync(filePath, JSON.stringify(geojson));
    
    const stats = fs.statSync(filePath);
    console.log(`[Success] Saved ${queryKey}.geojson (${(stats.size / 1024 / 1024).toFixed(2)} MB, ${geojson.features.length} features)`);
  } catch (error: any) {
    console.error(`[Error] Failed to process ${queryKey}:`, error.message);
  }
}

async function main() {
  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }

  // To respect rate limits, we execute sequentially
  for (const [key, query] of Object.entries(QUERIES)) {
    await fetchAndConvert(key, query);
    // Wait 2 seconds between requests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('--- All local map layers generated! ---');
}

main();

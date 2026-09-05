import { LayerSpecification, SourceSpecification } from 'maplibre-gl';

export const LOCAL_MAP_SOURCES: Record<string, SourceSpecification> = {
  'osm-basemap': {
    type: 'raster',
    tiles: [
      'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}'
    ],
    tileSize: 256,
    attribution: '&copy; Esri, HERE, Garmin, FAO, NOAA, USGS, EPA'
  },
  'roads': {
    type: 'geojson',
    data: '/map-data/roads.geojson'
  },
  'water': {
    type: 'geojson',
    data: '/map-data/water.geojson'
  },
  'railways': {
    type: 'geojson',
    data: '/map-data/railways.geojson'
  },
  'boundaries': {
    type: 'geojson',
    data: '/map-data/boundaries.geojson'
  },
  'buildings': {
    type: 'geojson',
    data: '/map-data/buildings.geojson'
  },
  'pois': {
    type: 'geojson',
    data: '/map-data/pois.geojson'
  }
};

export const LOCAL_MAP_LAYERS: LayerSpecification[] = [
  // Background — clean architectural light canvas
  {
    id: 'background',
    type: 'background',
    paint: {
      'background-color': '#f8fafc' // slate-50 / pure light
    }
  },

  // Global basemap context (CartoDB Light)
  {
    id: 'basemap-raster',
    type: 'raster',
    source: 'osm-basemap',
    paint: {
      'raster-opacity': 0.6 // Slightly faded so our local data pops
    }
  },

  // Water — vibrant blue as requested
  {
    id: 'water-layer',
    type: 'fill',
    source: 'water',
    paint: {
      'fill-color': '#2563eb', // blue-600
      'fill-opacity': 0.8
    }
  },
  {
    id: 'water-outline',
    type: 'line',
    source: 'water',
    paint: {
      'line-color': '#1d4ed8', // blue-700
      'line-width': 1
    }
  },

  // Boundaries (Admin)
  {
    id: 'boundaries-layer',
    type: 'line',
    source: 'boundaries',
    paint: {
      'line-color': '#cbd5e1', // slate-300
      'line-width': 1.5,
      'line-dasharray': [2, 2]
    }
  },

  // Railways
  {
    id: 'railways-layer',
    type: 'line',
    source: 'railways',
    paint: {
      'line-color': '#94a3b8', // slate-400
      'line-width': 1,
      'line-dasharray': [3, 3]
    }
  },

  // Roads - secondary
  {
    id: 'roads-secondary',
    type: 'line',
    source: 'roads',
    filter: ['==', 'highway', 'secondary'],
    paint: {
      'line-color': '#e2e8f0', // slate-200
      'line-width': 1.5
    }
  },

  // Roads - primary
  {
    id: 'roads-primary',
    type: 'line',
    source: 'roads',
    filter: ['==', 'highway', 'primary'],
    paint: {
      'line-color': '#cbd5e1', // slate-300
      'line-width': 2.5
    }
  },

  // Roads - motorway/trunk
  {
    id: 'roads-motorway',
    type: 'line',
    source: 'roads',
    filter: ['match', ['get', 'highway'], ['motorway', 'trunk'], true, false],
    paint: {
      'line-color': '#94a3b8', // slate-400
      'line-width': 3.5
    }
  },

  // Building Footprints (2D Box Structure)
  {
    id: 'buildings-layer',
    type: 'fill-extrusion',
    source: 'buildings',
    paint: {
      'fill-extrusion-color': '#e2e8f0', // slate-200
      'fill-extrusion-height': [
        'interpolate', ['linear'], ['zoom'],
        14, 0,
        15.5, ['*', 3, ['to-number', ['get', 'building:levels'], 3]]
      ],
      'fill-extrusion-base': 0,
      'fill-extrusion-opacity': 0.8
    }
  },

  // Road Names Annotation
  {
    id: 'road-labels',
    type: 'symbol',
    source: 'roads',
    filter: ['has', 'name'],
    layout: {
      'text-field': ['get', 'name'],
      'text-font': ['Open Sans Regular'],
      'text-size': 11,
      'symbol-placement': 'line',
      'text-max-angle': 30
    },
    paint: {
      'text-color': '#475569',
      'text-halo-color': '#ffffff',
      'text-halo-width': 1.5
    }
  },

  // POIs Annotation (Comprehensive)
  {
    id: 'pois-labels',
    type: 'symbol',
    source: 'pois',
    filter: ['has', 'name'],
    layout: {
      'text-field': [
        'concat',
        [
          'case',
          ['in', ['get', 'amenity'], ['literal', ['hospital', 'clinic']]], '🏥 ',
          ['in', ['get', 'amenity'], ['literal', ['school', 'college', 'university']]], '🎓 ',
          ['in', ['get', 'amenity'], ['literal', ['restaurant', 'food_court']]], '🍽️ ',
          ['==', ['get', 'amenity'], 'cafe'], '☕ ',
          ['==', ['get', 'amenity'], 'fast_food'], '🍔 ',
          ['==', ['get', 'amenity'], 'bar'], '🍺 ',
          ['==', ['get', 'amenity'], 'police'], '🚓 ',
          ['==', ['get', 'amenity'], 'fire_station'], '🚒 ',
          ['==', ['get', 'amenity'], 'bank'], '🏦 ',
          ['==', ['get', 'amenity'], 'post_office'], '📮 ',
          ['==', ['get', 'amenity'], 'pharmacy'], '💊 ',
          ['has', 'shop'], '🛒 ',
          ['==', ['get', 'amenity'], 'place_of_worship'], '🛕 ',
          ['in', ['get', 'leisure'], ['literal', ['park', 'garden']]], '🌳 ',
          ['==', ['get', 'leisure'], 'playground'], '🛝 ',
          ['==', ['get', 'tourism'], 'hotel'], '🏨 ',
          ['in', ['get', 'tourism'], ['literal', ['museum', 'gallery']]], '🏛️ ',
          ['has', 'public_transport'], '🚌 ',
          ['has', 'railway'], '🚇 ',
          '📍 ' // fallback
        ],
        ['get', 'name']
      ],
      'text-font': ['Open Sans Bold'],
      'text-size': [
        'interpolate', ['linear'], ['zoom'],
        14, 0,
        15, 11,
        16, 13
      ],
      'text-anchor': 'top',
      'text-offset': [0, 0.5]
    },
    paint: {
      'text-color': [
        'case',
        // Health
        ['in', ['get', 'amenity'], ['literal', ['hospital', 'clinic', 'pharmacy']]], '#dc2626', // red-600
        // Education
        ['in', ['get', 'amenity'], ['literal', ['school', 'college', 'university']]], '#7c3aed', // violet-600
        // Food & Drink
        ['in', ['get', 'amenity'], ['literal', ['restaurant', 'food_court', 'cafe', 'fast_food', 'bar']]], '#ea580c', // orange-600
        // Civic Services
        ['in', ['get', 'amenity'], ['literal', ['police', 'fire_station', 'post_office', 'bank']]], '#2563eb', // blue-600
        // Places of Worship
        ['==', ['get', 'amenity'], 'place_of_worship'], '#c026d3', // fuchsia-600
        // Leisure
        ['in', ['get', 'leisure'], ['literal', ['park', 'garden', 'playground']]], '#16a34a', // green-600
        // Tourism
        ['in', ['get', 'tourism'], ['literal', ['hotel', 'museum', 'gallery']]], '#4f46e5', // indigo-600
        // Transit
        ['has', 'public_transport'], '#0284c7', // sky-600
        ['has', 'railway'], '#0284c7', // sky-600
        // Commercial
        ['has', 'shop'], '#0d9488', // teal-600
        // Default
        '#1e293b' // slate-800
      ],
      'text-halo-color': '#ffffff',
      'text-halo-width': 2
    }
  }
];

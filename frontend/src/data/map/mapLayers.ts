import { LayerSpecification, SourceSpecification } from 'maplibre-gl';

export const LOCAL_MAP_SOURCES: Record<string, SourceSpecification> = {
  'roads': {
    type: 'geojson',
    data: '/map-data/roads.geojson'
  },
  'water': {
    type: 'geojson',
    data: '/map-data/water.geojson'
  },
  'parks': {
    type: 'geojson',
    data: '/map-data/parks.geojson'
  },
  'railways': {
    type: 'geojson',
    data: '/map-data/railways.geojson'
  },
  'boundaries': {
    type: 'geojson',
    data: '/map-data/boundaries.geojson'
  },
  'geocad-3d-zones': {
    type: 'geojson',
    data: '/map-data/geocad-3d-zones.geojson'
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
  
  // Water — pale clear azure
  {
    id: 'water-layer',
    type: 'fill',
    source: 'water',
    paint: {
      'fill-color': '#bae6fd', // sky-200
      'fill-opacity': 0.85
    }
  },

  // Parks — fresh green lawns
  {
    id: 'parks-layer',
    type: 'fill',
    source: 'parks',
    paint: {
      'fill-color': '#dcfce7', // emerald-100
      'fill-opacity': 0.7
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

  // 3D Zone Highlights (shows the bounding box of Lodha Park area)
  {
    id: 'geocad-3d-zones-layer',
    type: 'line',
    source: 'geocad-3d-zones',
    paint: {
      'line-color': '#06b6d4', // cyan-500
      'line-width': 2,
      'line-opacity': [
        'interpolate',
        ['linear'],
        ['zoom'],
        14, 0.8,
        15, 0.4,
        16, 0.0 // Fade out when zoomed into the 3D model
      ]
    }
  },
  {
    id: 'geocad-3d-zones-fill',
    type: 'fill',
    source: 'geocad-3d-zones',
    paint: {
      'fill-color': '#06b6d4',
      'fill-opacity': [
        'interpolate',
        ['linear'],
        ['zoom'],
        14, 0.1,
        15, 0.05,
        16, 0.0
      ]
    }
  }
];

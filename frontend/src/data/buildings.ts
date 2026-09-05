export interface BuildingMetadata {
  buildingId: string;
  buildingName: string;
  floors: number;
  basements: number;
  heightM: number;
  heightStr: string;
  assetType: string;
  parking: string;
  status: string;
  description: string;
  lon: number;
  lat: number;
  center: [number, number, number]; // [X, Y, Z] in 3D scene space
  cameraPosition: [number, number, number]; // [X, Y, Z] camera framing position
}

export const VALID_BUILDING_IDS = new Set<string>([
  'BLDG-LODHA-WORLD-ONE',
  'BLDG-LODHA-TRUMP',
  'BLDG-LODHA-MARQUISE',
  'BLDG-LODHA-KIARA',
  'BLDG-LODHA-ADRINA',
  'BLDG-LODHA-PARKSIDE',
  'BLDG-LODHA-ALLURA',
]);

export const BUILDINGS_DATA: Record<string, BuildingMetadata> = {
  'BLDG-LODHA-WORLD-ONE': {
    buildingId: 'BLDG-LODHA-WORLD-ONE',
    buildingName: 'Lodha World One',
    floors: 117,
    basements: 4,
    heightM: 442,
    heightStr: '442 m',
    assetType: 'Supertall Residential',
    parking: '4 Basement Levels (1,200+ Spaces)',
    status: 'Existing',
    description: 'Iconic 117-storey supertall residential skyscraper in the World Towers complex, Worli, Mumbai. One of the tallest residential structures in South Asia, featuring curved aerodynamic glass curtain walls.',
    lon: 72.826550,
    lat: 19.003243,
    center: [-194, 138, 90],
    cameraPosition: [-110, 220, 240],
  },
  'BLDG-LODHA-TRUMP': {
    buildingId: 'BLDG-LODHA-TRUMP',
    buildingName: 'Lodha Trump Tower',
    floors: 78,
    basements: 4,
    heightM: 268,
    heightStr: '268 m',
    assetType: 'Ultra-Luxury High-Rise',
    parking: '4 Basement Levels (800+ Spaces)',
    status: 'Existing',
    description: 'Ultra-luxury 78-storey golden reflective curtain-wall skyscraper offering private jet access, fractional aircraft membership, and white-glove concierge services.',
    lon: 72.827424,
    lat: 19.002318,
    center: [-102, 111, 193],
    cameraPosition: [-30, 180, 310],
  },
  'BLDG-LODHA-MARQUISE': {
    buildingId: 'BLDG-LODHA-MARQUISE',
    buildingName: 'Lodha Marquise',
    floors: 78,
    basements: 4,
    heightM: 268,
    heightStr: '268 m',
    assetType: 'Luxury Residential',
    parking: '4 Basement Levels (750+ Spaces)',
    status: 'Existing',
    description: 'Exclusive 78-storey residential tower overlooking the 7-acre private urban park with panoramic vistas of the Arabian Sea and the Mumbai skyline.',
    lon: 72.826332,
    lat: 19.002255,
    center: [-217, 140, 200],
    cameraPosition: [-140, 210, 320],
  },
  'BLDG-LODHA-KIARA': {
    buildingId: 'BLDG-LODHA-KIARA',
    buildingName: 'Lodha Kiara',
    floors: 78,
    basements: 4,
    heightM: 268,
    heightStr: '268 m',
    assetType: 'Premium High-Rise',
    parking: '4 Basement Levels (700+ Spaces)',
    status: 'Existing',
    description: 'Modern 78-storey tower featuring intelligent spatial planning, expansive private sundecks, and unobstructed Arabian Sea and racecourse views.',
    lon: 72.829001,
    lat: 19.003952,
    center: [64, 121, 11],
    cameraPosition: [160, 190, 130],
  },
  'BLDG-LODHA-ADRINA': {
    buildingId: 'BLDG-LODHA-ADRINA',
    buildingName: 'Lodha Adrina',
    floors: 78,
    basements: 4,
    heightM: 268,
    heightStr: '268 m',
    assetType: 'Luxury Residential',
    parking: '4 Basement Levels (650+ Spaces)',
    status: 'Existing',
    description: 'Premier residential tower situated in the north-east precinct with direct connectivity to high-end wellness pavilions and landscaped recreation zones.',
    lon: 72.829771,
    lat: 19.004905,
    center: [145, 133, -95],
    cameraPosition: [240, 200, 20],
  },
  'BLDG-LODHA-PARKSIDE': {
    buildingId: 'BLDG-LODHA-PARKSIDE',
    buildingName: 'Lodha Parkside',
    floors: 78,
    basements: 4,
    heightM: 268,
    heightStr: '268 m',
    assetType: 'Parkfront Residential',
    parking: '4 Basement Levels (650+ Spaces)',
    status: 'Existing',
    description: 'Fronts directly onto the central manicured lawns and sports grounds, crafted for active luxury living in the heart of South Mumbai.',
    lon: 72.828251,
    lat: 19.004653,
    center: [-15, 134, -67],
    cameraPosition: [80, 190, 50],
  },
  'BLDG-LODHA-ALLURA': {
    buildingId: 'BLDG-LODHA-ALLURA',
    buildingName: 'Lodha Allura',
    floors: 78,
    basements: 4,
    heightM: 268,
    heightStr: '268 m',
    assetType: 'Luxury High-Rise',
    parking: '4 Basement Levels (650+ Spaces)',
    status: 'Existing',
    description: 'Bespoke sky villas with world-class finishes, high-speed elevators, and dual aspect views of the Eastern harbor and Western Arabian Sea.',
    lon: 72.828602,
    lat: 19.005192,
    center: [22, 134, -127],
    cameraPosition: [110, 200, -10],
  },
};
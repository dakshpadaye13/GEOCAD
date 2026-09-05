export interface BuildingMetadata {
  buildingId: string;
  buildingName: string;
  floors: number | string;
  basements: number | string;
  parking: string;
  status: string;
  description: string;
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
    floors: 'Not configured',
    basements: 'Not configured',
    parking: 'Not configured',
    status: 'Existing',
    description: 'Iconic supertall residential tower in World Towers complex, Worli, Mumbai.'
  },
  'BLDG-LODHA-TRUMP': {
    buildingId: 'BLDG-LODHA-TRUMP',
    buildingName: 'Lodha Trump Tower',
    floors: 'Not configured',
    basements: 'Not configured',
    parking: 'Not configured',
    status: 'Existing',
    description: 'Luxury high-rise residential tower at Lodha Park.'
  },
  'BLDG-LODHA-MARQUISE': {
    buildingId: 'BLDG-LODHA-MARQUISE',
    buildingName: 'Lodha Marquise',
    floors: 'Not configured',
    basements: 'Not configured',
    parking: 'Not configured',
    status: 'Existing',
    description: 'Exclusive residential tower overlooking the central park grounds.'
  },
  'BLDG-LODHA-KIARA': {
    buildingId: 'BLDG-LODHA-KIARA',
    buildingName: 'Lodha Kiara',
    floors: 'Not configured',
    basements: 'Not configured',
    parking: 'Not configured',
    status: 'Existing',
    description: 'High-rise residential tower offering panoramic cityscape views.'
  },
  'BLDG-LODHA-ADRINA': {
    buildingId: 'BLDG-LODHA-ADRINA',
    buildingName: 'Lodha Adrina',
    floors: 'Not configured',
    basements: 'Not configured',
    parking: 'Not configured',
    status: 'Existing',
    description: 'Premium residential tower located on the north-east precinct.'
  },
  'BLDG-LODHA-PARKSIDE': {
    buildingId: 'BLDG-LODHA-PARKSIDE',
    buildingName: 'Lodha Parkside',
    floors: 'Not configured',
    basements: 'Not configured',
    parking: 'Not configured',
    status: 'Existing',
    description: 'Parkside luxury tower surrounded by central landscape amenities.'
  },
  'BLDG-LODHA-ALLURA': {
    buildingId: 'BLDG-LODHA-ALLURA',
    buildingName: 'Lodha Allura',
    floors: 'Not configured',
    basements: 'Not configured',
    parking: 'Not configured',
    status: 'Existing',
    description: 'High-rise residential tower situated in the central Park cluster.'
  }
};

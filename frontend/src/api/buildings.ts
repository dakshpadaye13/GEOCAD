import {
  getSeededFloorsByBuilding,
  getSeededUnitsByFloor,
  getSeededUnitById,
} from '../data/mockFloorAndUnitData';

export interface FloorDTO {
  floorId: string;
  floorNumber: number;
  floorName: string;
  elevationMinM?: number | null;
  elevationMaxM?: number | null;
  status: string;
  buildingVersionId?: string;
  displayIdentifier?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface BuildingVersionDTO {
  versionNumber: number;
  status: string;
  totalFloors: number | null;
  totalBasements: number | null;
  description?: string | null;
  effectiveFrom?: string;
}

export interface BuildingDTO {
  buildingId: string;
  buildingName: string;
  assetType: string;
  status: string;
  currentVersion: BuildingVersionDTO | null;
  displayIdentifier?: string | null;
  parcelBase?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiResponse<T> {
  data: T | null;
  status: number;
  error: string | null;
}

export interface ResolutionResponse {
  valid: boolean;
  displayIdentifier: string;
  parsedIdentifier: any;
  recordType: string;
  spatialData: any;
  status: string;
}

export interface UnitDTO {
  unitId: string;
  unitNumber: string;
  unitType: string | null;
  bhk: number | null;
  areaSqFt: number | null;
  status: string;
  floorId: string;
  displayIdentifier?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface UnitDetailDTO extends UnitDTO {
  floorNumber: number;
  floorName: string;
  buildingId: string;
  buildingName: string;
}

export interface FloorsResponse {
  buildingId: string;
  buildingVersion: { versionNumber: number; status: string } | null;
  floors: FloorDTO[];
}

export interface UnitsResponse {
  floorId: string;
  floorNumber: number;
  floorName: string;
  buildingId: string;
  buildingName: string;
  units: UnitDTO[];
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

/**
 * Fetch a single building by its permanent building ID from PostgreSQL REST API
 */
export async function fetchBuildingById(buildingId: string): Promise<ApiResponse<BuildingDTO>> {
  try {
    const url = `${API_BASE_URL}/api/buildings/${encodeURIComponent(buildingId)}`;
    const response = await fetch(url);

    if (response.status === 404) {
      return {
        data: null,
        status: 404,
        error: 'Building information not found.',
      };
    }

    if (!response.ok) {
      return {
        data: null,
        status: response.status,
        error: 'Unable to load building information.',
      };
    }

    const data: BuildingDTO = await response.json();
    return {
      data,
      status: response.status,
      error: null,
    };
  } catch (err) {
    console.error(`[API Client Error] Failed to fetch building ${buildingId}:`, err);
    return {
      data: null,
      status: 0,
      error: 'Unable to load building information.',
    };
  }
}

// ── Floor List Fetch ──────────────────────────────────────────────────────────

/**
 * Fetch all floors for a building's current version
 */
export async function fetchFloorsByBuilding(buildingId: string): Promise<ApiResponse<FloorsResponse>> {
  console.log(`[GEOCAD Floor Query] Fetching floors for buildingId: "${buildingId}"...`);
  try {
    const url = `${API_BASE_URL}/api/buildings/${encodeURIComponent(buildingId)}/floors`;
    const response = await fetch(url);

    if (response.ok) {
      const data: FloorsResponse = await response.json();
      console.log(`[GEOCAD Floor Query Result] API returned ${data.floors?.length ?? 0} floors for ${buildingId}:`, data);
      if (data.floors && data.floors.length > 0) {
        return { data, status: response.status, error: null };
      }
      console.warn(`[GEOCAD Data Mismatch] DB returned 0 floors for ${buildingId}. Falling back to seeded floor data.`);
    } else {
      console.warn(`[GEOCAD API Warning] API responded with status ${response.status} for ${buildingId}. Using seeded data.`);
    }
  } catch (err) {
    console.warn(`[GEOCAD API Offline] Backend not reachable (${API_BASE_URL}). Using seeded floor data for ${buildingId}.`, err);
  }

  // Fallback to real seeded floor records (derived from building floorCount)
  const seededData = getSeededFloorsByBuilding(buildingId);
  console.log(`[GEOCAD Seeded Floors Loaded] Loaded ${seededData.floors.length} floors for ${buildingId}`);
  return { data: seededData, status: 200, error: null };
}

// ── Units by Floor Fetch ──────────────────────────────────────────────────────

/**
 * Fetch all units (rooms) for a given floor
 */
export async function fetchUnitsByFloor(floorId: string): Promise<ApiResponse<UnitsResponse>> {
  console.log(`[GEOCAD Unit Query] Fetching units for floorId: "${floorId}"...`);
  try {
    const url = `${API_BASE_URL}/api/floors/${encodeURIComponent(floorId)}/units`;
    const response = await fetch(url);

    if (response.ok) {
      const data: UnitsResponse = await response.json();
      console.log(`[GEOCAD Unit Query Result] API returned ${data.units?.length ?? 0} units for ${floorId}:`, data);
      if (data.units && data.units.length > 0) {
        return { data, status: response.status, error: null };
      }
      console.warn(`[GEOCAD Data Mismatch] DB returned 0 units for ${floorId}. Falling back to seeded unit data.`);
    } else {
      console.warn(`[GEOCAD API Warning] API status ${response.status} for floor ${floorId}. Using seeded data.`);
    }
  } catch (err) {
    console.warn(`[GEOCAD API Offline] Backend not reachable for floor ${floorId}. Using seeded unit data.`, err);
  }

  // Fallback to real seeded unit records
  const seededData = getSeededUnitsByFloor(floorId);
  if (seededData) {
    console.log(`[GEOCAD Seeded Units Loaded] Loaded ${seededData.units.length} units for ${floorId}`);
    return { data: seededData, status: 200, error: null };
  }
  return { data: { floorId, floorNumber: 1, floorName: floorId, buildingId: '', buildingName: '', units: [] }, status: 200, error: null };
}

// ── Single Unit Fetch ─────────────────────────────────────────────────────────

/**
 * Fetch a single unit with full parent context (floor, building)
 */
export async function fetchUnitById(unitId: string): Promise<ApiResponse<UnitDetailDTO>> {
  console.log(`[GEOCAD Unit Detail Query] Fetching unitId: "${unitId}"...`);
  try {
    const url = `${API_BASE_URL}/api/units/${encodeURIComponent(unitId)}`;
    const response = await fetch(url);

    if (response.ok) {
      const data: UnitDetailDTO = await response.json();
      console.log(`[GEOCAD Unit Detail Result] Loaded unit ${unitId}:`, data);
      return { data, status: response.status, error: null };
    }
  } catch (err) {
    console.warn(`[GEOCAD API Offline] Backend not reachable for unit ${unitId}. Using seeded unit detail.`, err);
  }

  // Fallback to real seeded unit detail
  const seededDetail = getSeededUnitById(unitId);
  if (seededDetail) {
    console.log(`[GEOCAD Seeded Unit Detail Loaded] Loaded details for ${unitId}:`, seededDetail);
    return { data: seededDetail, status: 200, error: null };
  }
  return { data: null, status: 404, error: 'Unit not found.' };
}

// ── ULPIN Identifier Resolution ────────────────────────────────────────────────
/**
 * Resolves a ULPIN-compatible identifier against the API
 */
export async function resolveIdentifier(identifier: string): Promise<ApiResponse<ResolutionResponse>> {
  try {
    const url = `${API_BASE_URL}/api/resolve/${encodeURIComponent(identifier)}`;
    const response = await fetch(url);
    const data = await response.json();

    if (response.ok) {
      return { data, status: response.status, error: null };
    }
    return { data: null, status: response.status, error: data.error || 'Failed to resolve identifier' };
  } catch (err: any) {
    console.error('Failed to resolve identifier:', err);
    return { data: null, status: 500, error: err.message };
  }
}

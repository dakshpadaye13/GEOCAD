export interface FloorDTO {
  floorId: string;
  floorNumber: number;
  floorName: string;
  elevationMinM?: number | null;
  elevationMaxM?: number | null;
  status: string;
  buildingVersionId?: string;
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
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiResponse<T> {
  data: T | null;
  status: number;
  error: string | null;
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

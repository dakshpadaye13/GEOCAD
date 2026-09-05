import { BUILDINGS_DATA } from './buildings';
import type { FloorDTO, UnitDTO, UnitDetailDTO, FloorsResponse, UnitsResponse } from '../api/buildings';

// Deterministic in-memory database of seeded floors and units for all 7 towers
interface BuildingFloorData {
  floorsResponse: FloorsResponse;
  unitsByFloor: Record<string, UnitsResponse>;
  unitsById: Record<string, UnitDetailDTO>;
}

const cache: Record<string, BuildingFloorData> = {};

function generateFloorId(buildingId: string, floorNumber: number): string {
  const prefix = buildingId.startsWith('BLDG-')
    ? buildingId.replace('BLDG-', 'FLR-')
    : `FLR-${buildingId}`;
  const paddedStr = floorNumber.toString().padStart(2, '0');
  return `${prefix}-L${paddedStr}`;
}

function buildBuildingData(buildingId: string): BuildingFloorData {
  const meta = BUILDINGS_DATA[buildingId] || {
    buildingId,
    buildingName: buildingId,
    floors: 78,
  };

  const floors: FloorDTO[] = [];
  const unitsByFloor: Record<string, UnitsResponse> = {};
  const unitsById: Record<string, UnitDetailDTO> = {};

  const totalFloors = meta.floors || 78;
  const FLOOR_HEIGHT_M = 3.5;

  for (let floorNum = 1; floorNum <= totalFloors; floorNum++) {
    const floorId = generateFloorId(buildingId, floorNum);
    const floorName = `Floor ${floorNum}`;
    const elevationMinM = (floorNum - 1) * FLOOR_HEIGHT_M;
    const elevationMaxM = floorNum * FLOOR_HEIGHT_M;

    const floorDto: FloorDTO = {
      floorId,
      floorNumber: floorNum,
      floorName,
      elevationMinM,
      elevationMaxM,
      status: 'EXISTING',
      buildingVersionId: `VER-${buildingId}-V1`,
      createdAt: '2026-09-06T00:00:00.000Z',
      updatedAt: '2026-09-06T00:00:00.000Z',
    };
    floors.push(floorDto);

    // 4 units per floor
    const units: UnitDTO[] = [];
    for (let uIdx = 1; uIdx <= 4; uIdx++) {
      const paddedFloor = floorNum.toString().padStart(2, '0');
      const paddedUnit = uIdx.toString().padStart(2, '0');
      const unitNumber = `${floorNum}${paddedUnit}`;
      const unitId = `UNIT-${buildingId.replace('BLDG-', '')}-L${paddedFloor}-${paddedUnit}`;

      let unitStatus = 'OCCUPIED';
      if ((floorNum + uIdx) % 7 === 0) {
        unitStatus = 'MAINTENANCE';
      } else if ((floorNum + uIdx) % 4 === 0) {
        unitStatus = 'VACANT';
      }

      const isPenthouse = floorNum >= totalFloors - 2;
      const isGrandSuite = floorNum >= Math.floor(totalFloors * 0.6);

      const unitType = isPenthouse
        ? 'Penthouse Sky Residence'
        : isGrandSuite
          ? '4 BHK Grand Suite'
          : '3 BHK Luxury Residence';
      const bhk = isPenthouse ? 5 : isGrandSuite ? 4 : 3;
      const areaSqFt = isPenthouse ? 5200 : isGrandSuite ? 3450 : 2350;

      const unitDto: UnitDTO = {
        unitId,
        unitNumber,
        unitType,
        bhk,
        areaSqFt,
        status: unitStatus,
        floorId,
        createdAt: '2026-09-06T00:00:00.000Z',
        updatedAt: '2026-09-06T00:00:00.000Z',
      };
      units.push(unitDto);

      const unitDetail: UnitDetailDTO = {
        ...unitDto,
        floorNumber: floorNum,
        floorName,
        buildingId,
        buildingName: meta.buildingName,
      };
      unitsById[unitId] = unitDetail;
    }

    unitsByFloor[floorId] = {
      floorId,
      floorNumber: floorNum,
      floorName,
      buildingId,
      buildingName: meta.buildingName,
      units,
    };
  }

  const result: BuildingFloorData = {
    floorsResponse: {
      buildingId,
      buildingVersion: { versionNumber: 1, status: 'EXISTING' },
      floors,
    },
    unitsByFloor,
    unitsById,
  };

  cache[buildingId] = result;
  return result;
}

export function getSeededFloorsByBuilding(buildingId: string): FloorsResponse {
  if (!cache[buildingId]) {
    buildBuildingData(buildingId);
  }
  return cache[buildingId].floorsResponse;
}

export function getSeededUnitsByFloor(floorId: string): UnitsResponse | null {
  // Check all cached or build if needed
  for (const bId of Object.keys(BUILDINGS_DATA)) {
    if (!cache[bId]) buildBuildingData(bId);
    if (cache[bId].unitsByFloor[floorId]) {
      return cache[bId].unitsByFloor[floorId];
    }
  }
  return null;
}

export function getSeededUnitById(unitId: string): UnitDetailDTO | null {
  for (const bId of Object.keys(BUILDINGS_DATA)) {
    if (!cache[bId]) buildBuildingData(bId);
    if (cache[bId].unitsById[unitId]) {
      return cache[bId].unitsById[unitId];
    }
  }
  return null;
}
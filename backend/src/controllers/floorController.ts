import { Request, Response } from 'express';
import { prisma } from '../db.js';

/**
 * Generate a deterministic, human-readable permanent floorId
 * e.g., BLDG-LODHA-WORLD-ONE + floor 3 => FLR-LODHA-WORLD-ONE-L03
 */
export function generateFloorId(buildingId: string, floorNumber: number): string {
  const prefix = buildingId.startsWith('BLDG-')
    ? buildingId.replace('BLDG-', 'FLR-')
    : `FLR-${buildingId}`;

  let suffix: string;
  if (floorNumber >= 0) {
    const paddedStr = floorNumber.toString().padStart(2, '0');
    suffix = `L${paddedStr}`;
  } else {
    const paddedStr = Math.abs(floorNumber).toString().padStart(2, '0');
    suffix = `B${paddedStr}`;
  }

  return `${prefix}-${suffix}`;
}

/**
 * GET /api/buildings/:buildingId/floors
 * Fetch all floors associated with the current BuildingVersion of a building
 */
export async function getFloorsByBuilding(req: Request, res: Response): Promise<void> {
  const { buildingId } = req.params;

  try {
    const building = await prisma.building.findUnique({
      where: { buildingId },
      include: {
        currentVersion: {
          include: {
            floors: {
              orderBy: {
                floorNumber: 'asc',
              },
            },
          },
        },
      },
    });

    if (!building) {
      res.status(404).json({ error: `Building '${buildingId}' not found` });
      return;
    }

    if (!building.currentVersion) {
      res.status(200).json({
        buildingId: building.buildingId,
        buildingVersion: null,
        floors: [],
      });
      return;
    }

    const formattedFloors = building.currentVersion.floors.map((flr) => ({
      floorId: flr.floorId,
      floorNumber: flr.floorNumber,
      floorName: flr.floorName,
      elevationMinM: flr.elevationMinM,
      elevationMaxM: flr.elevationMaxM,
      status: flr.status,
      createdAt: flr.createdAt,
      updatedAt: flr.updatedAt,
    }));

    res.status(200).json({
      buildingId: building.buildingId,
      buildingVersion: {
        versionNumber: building.currentVersion.versionNumber,
        status: building.currentVersion.status,
      },
      floors: formattedFloors,
    });
  } catch (error) {
    console.error(`Error fetching floors for building ${buildingId}:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * GET /api/floors/:floorId
 * Fetch single floor record with parent building and version details
 */
export async function getFloorById(req: Request, res: Response): Promise<void> {
  const { floorId } = req.params;

  try {
    const floor = await prisma.floor.findUnique({
      where: { floorId },
      include: {
        buildingVersion: {
          include: {
            building: true,
          },
        },
      },
    });

    if (!floor) {
      res.status(404).json({ error: `Floor '${floorId}' not found` });
      return;
    }

    res.status(200).json({
      floorId: floor.floorId,
      floorNumber: floor.floorNumber,
      floorName: floor.floorName,
      elevationMinM: floor.elevationMinM,
      elevationMaxM: floor.elevationMaxM,
      status: floor.status,
      buildingVersionId: floor.buildingVersionId,
      buildingVersion: {
        versionNumber: floor.buildingVersion.versionNumber,
        status: floor.buildingVersion.status,
      },
      buildingId: floor.buildingVersion.building.buildingId,
      buildingName: floor.buildingVersion.building.buildingName,
      createdAt: floor.createdAt,
      updatedAt: floor.updatedAt,
    });
  } catch (error) {
    console.error(`Error fetching floor ${floorId}:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * POST /api/buildings/:buildingId/floors
 * Create a new floor for the specified building's current active version
 */
export async function createFloor(req: Request, res: Response): Promise<void> {
  const { buildingId } = req.params;
  const { floorNumber, floorName, status, elevationMinM, elevationMaxM } = req.body;

  // 1. Input Validation: floorNumber
  if (typeof floorNumber !== 'number' || !Number.isInteger(floorNumber)) {
    res.status(400).json({ error: 'floorNumber must be an integer' });
    return;
  }

  if (floorNumber < -10 || floorNumber > 300) {
    res.status(400).json({ error: 'floorNumber must be between -10 and 300' });
    return;
  }

  // 2. Input Validation: floorName
  if (typeof floorName !== 'string' || floorName.trim().length === 0) {
    res.status(400).json({ error: 'floorName is required and must be a non-empty string' });
    return;
  }

  // 3. Elevation Validation
  let minElev: number | null = null;
  let maxElev: number | null = null;

  if (elevationMinM !== undefined && elevationMinM !== null) {
    if (typeof elevationMinM !== 'number' || isNaN(elevationMinM)) {
      res.status(400).json({ error: 'elevationMinM must be a valid number or null' });
      return;
    }
    minElev = elevationMinM;
  }

  if (elevationMaxM !== undefined && elevationMaxM !== null) {
    if (typeof elevationMaxM !== 'number' || isNaN(elevationMaxM)) {
      res.status(400).json({ error: 'elevationMaxM must be a valid number or null' });
      return;
    }
    maxElev = elevationMaxM;
  }

  if (minElev !== null && maxElev !== null && maxElev <= minElev) {
    res.status(400).json({ error: 'elevationMaxM must be greater than elevationMinM' });
    return;
  }

  const floorStatus = typeof status === 'string' && status.trim() !== '' ? status.trim() : 'EXISTING';

  try {
    // 4. Find building & resolve current version
    const building = await prisma.building.findUnique({
      where: { buildingId },
      include: {
        currentVersion: true,
      },
    });

    if (!building) {
      res.status(404).json({ error: `Building '${buildingId}' not found` });
      return;
    }

    if (!building.currentVersion) {
      res.status(400).json({ error: `Building '${buildingId}' has no active currentVersion` });
      return;
    }

    const buildingVersionId = building.currentVersion.id;

    // 5. Duplicate Check: buildingVersionId + floorNumber
    const existingFloor = await prisma.floor.findUnique({
      where: {
        buildingVersionId_floorNumber: {
          buildingVersionId,
          floorNumber,
        },
      },
    });

    if (existingFloor) {
      res.status(409).json({ error: `Floor ${floorNumber} already exists for this building version` });
      return;
    }

    // 6. Deterministic permanent floorId generation
    const floorId = generateFloorId(building.buildingId, floorNumber);

    // 7. Create Floor record
    const newFloor = await prisma.floor.create({
      data: {
        floorId,
        buildingVersionId,
        floorNumber,
        floorName: floorName.trim(),
        elevationMinM: minElev,
        elevationMaxM: maxElev,
        status: floorStatus,
      },
    });

    res.status(201).json({
      floorId: newFloor.floorId,
      floorNumber: newFloor.floorNumber,
      floorName: newFloor.floorName,
      elevationMinM: newFloor.elevationMinM,
      elevationMaxM: newFloor.elevationMaxM,
      status: newFloor.status,
      buildingVersionId: newFloor.buildingVersionId,
      createdAt: newFloor.createdAt,
      updatedAt: newFloor.updatedAt,
    });
  } catch (error: any) {
    if (error.code === 'P2002') {
      res.status(409).json({ error: `Floor ${floorNumber} already exists for this building version` });
      return;
    }
    console.error(`Error creating floor for building ${buildingId}:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * PATCH /api/floors/:floorId
 * Update an existing floor's metadata (floorName, status, elevationMinM, elevationMaxM)
 */
export async function updateFloor(req: Request, res: Response): Promise<void> {
  const { floorId } = req.params;
  const { floorName, status, elevationMinM, elevationMaxM, buildingId, buildingVersionId, floorNumber, floorId: bodyFloorId } = req.body;

  try {
    // 1. Fetch existing floor
    const existingFloor = await prisma.floor.findUnique({
      where: { floorId },
    });

    if (!existingFloor) {
      res.status(404).json({ error: `Floor '${floorId}' not found` });
      return;
    }

    // 2. Immutable fields check
    if (
      (bodyFloorId !== undefined && bodyFloorId !== existingFloor.floorId) ||
      (floorNumber !== undefined && floorNumber !== existingFloor.floorNumber) ||
      (buildingVersionId !== undefined && buildingVersionId !== existingFloor.buildingVersionId) ||
      (buildingId !== undefined)
    ) {
      res.status(400).json({ error: 'floorId, buildingId, buildingVersionId, and floorNumber are immutable' });
      return;
    }

    // 3. Validate floorName if provided
    let updatedFloorName = existingFloor.floorName;
    if (floorName !== undefined) {
      if (typeof floorName !== 'string' || floorName.trim().length === 0) {
        res.status(400).json({ error: 'floorName must be a non-empty string' });
        return;
      }
      updatedFloorName = floorName.trim();
    }

    // 4. Validate status if provided
    let updatedStatus = existingFloor.status;
    if (status !== undefined) {
      if (typeof status !== 'string' || status.trim().length === 0) {
        res.status(400).json({ error: 'status must be a non-empty string' });
        return;
      }
      updatedStatus = status.trim();
    }

    // 5. Validate & resolve elevation bounds
    let updatedMinElev = existingFloor.elevationMinM;
    if (elevationMinM !== undefined) {
      if (elevationMinM === null) {
        updatedMinElev = null;
      } else if (typeof elevationMinM === 'number' && !isNaN(elevationMinM)) {
        updatedMinElev = elevationMinM;
      } else {
        res.status(400).json({ error: 'elevationMinM must be a valid number or null' });
        return;
      }
    }

    let updatedMaxElev = existingFloor.elevationMaxM;
    if (elevationMaxM !== undefined) {
      if (elevationMaxM === null) {
        updatedMaxElev = null;
      } else if (typeof elevationMaxM === 'number' && !isNaN(elevationMaxM)) {
        updatedMaxElev = elevationMaxM;
      } else {
        res.status(400).json({ error: 'elevationMaxM must be a valid number or null' });
        return;
      }
    }

    if (updatedMinElev !== null && updatedMaxElev !== null && updatedMaxElev <= updatedMinElev) {
      res.status(400).json({ error: 'elevationMaxM must be greater than elevationMinM' });
      return;
    }

    // 6. Apply database update
    const updatedFloor = await prisma.floor.update({
      where: { floorId },
      data: {
        floorName: updatedFloorName,
        status: updatedStatus,
        elevationMinM: updatedMinElev,
        elevationMaxM: updatedMaxElev,
      },
    });

    res.status(200).json({
      floorId: updatedFloor.floorId,
      floorNumber: updatedFloor.floorNumber,
      floorName: updatedFloor.floorName,
      elevationMinM: updatedFloor.elevationMinM,
      elevationMaxM: updatedFloor.elevationMaxM,
      status: updatedFloor.status,
      buildingVersionId: updatedFloor.buildingVersionId,
      createdAt: updatedFloor.createdAt,
      updatedAt: updatedFloor.updatedAt,
    });
  } catch (error) {
    console.error(`Error updating floor ${floorId}:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * DELETE /api/floors/:floorId
 * Delete a single floor record without deleting parent Building or BuildingVersion
 */
export async function deleteFloor(req: Request, res: Response): Promise<void> {
  const { floorId } = req.params;

  try {
    const existingFloor = await prisma.floor.findUnique({
      where: { floorId },
    });

    if (!existingFloor) {
      res.status(404).json({ error: `Floor '${floorId}' not found` });
      return;
    }

    await prisma.floor.delete({
      where: { floorId },
    });

    res.status(200).json({ message: `Floor '${floorId}' deleted successfully` });
  } catch (error) {
    console.error(`Error deleting floor ${floorId}:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

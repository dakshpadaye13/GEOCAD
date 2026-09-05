import { Request, Response } from 'express';
import { prisma } from '../db.js';

/**
 * Format raw Prisma building record into clean public API response
 */
function formatBuilding(building: any) {
  return {
    buildingId: building.buildingId,
    buildingName: building.buildingName,
    assetType: building.assetType,
    status: building.status,
    currentVersion: building.currentVersion
      ? {
          versionNumber: building.currentVersion.versionNumber,
          status: building.currentVersion.status,
          totalFloors: building.currentVersion.totalFloors,
          totalBasements: building.currentVersion.totalBasements,
          description: building.currentVersion.description,
          effectiveFrom: building.currentVersion.effectiveFrom,
        }
      : null,
    createdAt: building.createdAt,
    updatedAt: building.updatedAt,
  };
}

/**
 * GET /api/buildings
 * Returns list of all buildings with their current BuildingVersion details
 */
export async function getAllBuildings(_req: Request, res: Response): Promise<void> {
  try {
    const buildings = await prisma.building.findMany({
      include: {
        currentVersion: true,
      },
      orderBy: {
        buildingId: 'asc',
      },
    });

    const response = buildings.map(formatBuilding);
    res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching buildings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * GET /api/buildings/:buildingId
 * Returns details for a single building by its permanent business ID
 */
export async function getBuildingById(req: Request, res: Response): Promise<void> {
  const { buildingId } = req.params;

  try {
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

    res.status(200).json(formatBuilding(building));
  } catch (error) {
    console.error(`Error fetching building ${buildingId}:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

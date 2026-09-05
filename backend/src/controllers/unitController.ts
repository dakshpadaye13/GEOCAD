import { Request, Response } from 'express';
import { prisma } from '../db.js';

/**
 * GET /api/floors/:floorId/units
 * Fetch all units associated with a given floor
 */
export async function getUnitsByFloor(req: Request, res: Response): Promise<void> {
  const { floorId } = req.params;

  try {
    const floor = await prisma.floor.findUnique({
      where: { floorId },
      include: {
        units: {
          orderBy: {
            unitNumber: 'asc',
          },
        },
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

    const formattedUnits = floor.units.map((unit) => ({
      unitId: unit.unitId,
      unitNumber: unit.unitNumber,
      unitType: unit.unitType,
      bhk: unit.bhk,
      areaSqFt: unit.areaSqFt,
      status: unit.status,
      floorId: unit.floorId,
      createdAt: unit.createdAt,
      updatedAt: unit.updatedAt,
    }));

    res.status(200).json({
      floorId: floor.floorId,
      floorNumber: floor.floorNumber,
      floorName: floor.floorName,
      buildingId: floor.buildingVersion.building.buildingId,
      buildingName: floor.buildingVersion.building.buildingName,
      units: formattedUnits,
    });
  } catch (error) {
    console.error(`Error fetching units for floor ${floorId}:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * GET /api/units/:unitId
 * Fetch a single unit with parent floor and building context
 */
export async function getUnitById(req: Request, res: Response): Promise<void> {
  const { unitId } = req.params;

  try {
    const unit = await prisma.unit.findUnique({
      where: { unitId },
      include: {
        floor: {
          include: {
            buildingVersion: {
              include: {
                building: true,
              },
            },
          },
        },
      },
    });

    if (!unit) {
      res.status(404).json({ error: `Unit '${unitId}' not found` });
      return;
    }

    res.status(200).json({
      unitId: unit.unitId,
      unitNumber: unit.unitNumber,
      unitType: unit.unitType,
      bhk: unit.bhk,
      areaSqFt: unit.areaSqFt,
      status: unit.status,
      floorId: unit.floor.floorId,
      floorNumber: unit.floor.floorNumber,
      floorName: unit.floor.floorName,
      buildingId: unit.floor.buildingVersion.building.buildingId,
      buildingName: unit.floor.buildingVersion.building.buildingName,
      createdAt: unit.createdAt,
      updatedAt: unit.updatedAt,
    });
  } catch (error) {
    console.error(`Error fetching unit ${unitId}:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

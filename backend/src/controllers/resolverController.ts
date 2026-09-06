import { Request, Response } from 'express';
import { prisma } from '../db.js';
import { validateDisplayIdentifier, parseDisplayIdentifier } from '../services/identifierService.js';

export const resolveIdentifier = async (req: Request, res: Response) => {
  try {
    const { displayIdentifier } = req.params;
    const asOfDate = req.query.as_of ? new Date(req.query.as_of as string) : null;

    // 1 & 2 & 3. Parse and Validate
    const validation = validateDisplayIdentifier(displayIdentifier);
    if (!validation.valid) {
      return res.status(400).json({ error: 'Malformed identifier', details: validation.reason });
    }

    const parsed = parseDisplayIdentifier(displayIdentifier);

    // 4. Extract Base
    const baseParcel = parsed.base;

    // Check IdentifierHistory for RETIRED status first
    const historyRecord = await prisma.identifierHistory.findUnique({
      where: { displayIdentifier }
    });

    if (historyRecord) {
      if (historyRecord.status === 'RETIRED') {
        return res.status(410).json({ 
          error: 'Identifier has been retired',
          supersededBy: historyRecord.supersededBy,
          validFrom: historyRecord.validFrom,
          validTo: historyRecord.validTo
        });
      }
    }

    // 5. Find corresponding GEOCAD record (active)
    // We search across all spatial tables
    let record = null;
    let recordType = '';
    let spatialData: any = {};

    // Search Building
    const building = await prisma.building.findUnique({
      where: { displayIdentifier },
      include: { currentVersion: true }
    });
    if (building) {
      record = building;
      recordType = 'Building';
      spatialData = {
        buildingId: building.buildingId,
        name: building.buildingName,
        parcelBase: building.parcelBase
      };
    }

    // Search Floor
    if (!record) {
      const floor = await prisma.floor.findUnique({
        where: { displayIdentifier },
        include: { buildingVersion: { include: { building: true } } }
      });
      if (floor) {
        record = floor;
        recordType = 'Floor';
        spatialData = {
          floorId: floor.floorId,
          name: floor.floorName,
          elevationMinM: floor.elevationMinM,
          elevationMaxM: floor.elevationMaxM,
          buildingId: floor.buildingVersion.building.buildingId
        };
      }
    }

    // Search Unit
    if (!record) {
      const unit = await prisma.unit.findUnique({
        where: { displayIdentifier },
        include: { floor: { include: { buildingVersion: { include: { building: true } } } } }
      });
      if (unit) {
        record = unit;
        recordType = 'Unit';
        spatialData = {
          unitId: unit.unitId,
          type: unit.unitType,
          bhk: unit.bhk,
          areaSqFt: unit.areaSqFt,
          floorId: unit.floor.floorId,
          buildingId: unit.floor.buildingVersion.building.buildingId
        };
      }
    }

    // Search Parking
    if (!record) {
      const parking = await prisma.parking.findUnique({
        where: { displayIdentifier },
        include: { buildingVersion: { include: { building: true } } }
      });
      if (parking) {
        record = parking;
        recordType = 'Parking';
        spatialData = {
          parkingId: parking.parkingId,
          type: parking.parkingType,
          buildingId: parking.buildingVersion.building.buildingId
        };
      }
    }

    // Search Basement
    if (!record) {
      const basement = await prisma.basement.findUnique({
        where: { displayIdentifier },
        include: { buildingVersion: { include: { building: true } } }
      });
      if (basement) {
        record = basement;
        recordType = 'Basement';
        spatialData = {
          basementId: basement.basementId,
          name: basement.basementName,
          buildingId: basement.buildingVersion.building.buildingId
        };
      }
    }

    // Handle Historical query filtering (basic implementation, filtering out records created after the asOfDate)
    if (record && asOfDate) {
      if (record.createdAt > asOfDate) {
        // Record didn't exist at that time
        record = null;
      }
    }

    if (!record) {
      return res.status(404).json({ error: 'Record not found for the given identifier' });
    }

    // 6. Return the spatial record
    // 7. Return geometry metadata / linked info
    // 8. Return validation status
    // 9. No ownership information exposed
    return res.status(200).json({
      valid: true,
      displayIdentifier,
      parsedIdentifier: parsed,
      recordType,
      spatialData,
      status: record.status,
      // We don't expose any personal or ownership information here
    });

  } catch (error: any) {
    console.error('Resolution Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

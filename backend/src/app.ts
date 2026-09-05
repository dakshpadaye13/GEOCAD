import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { getAllBuildings, getBuildingById } from './controllers/buildingController.js';
import { getFloorsByBuilding, getFloorById, createFloor, updateFloor, deleteFloor } from './controllers/floorController.js';
import { getUnitsByFloor, getUnitById } from './controllers/unitController.js';

export const app = express();

app.use(cors());
app.use(express.json());

// Building API Routes
app.get('/api/buildings', getAllBuildings);
app.get('/api/buildings/:buildingId', getBuildingById);

// Floor API Routes
app.get('/api/buildings/:buildingId/floors', getFloorsByBuilding);
app.post('/api/buildings/:buildingId/floors', createFloor);
app.get('/api/floors/:floorId', getFloorById);
app.patch('/api/floors/:floorId', updateFloor);
app.delete('/api/floors/:floorId', deleteFloor);

// Unit API Routes
app.get('/api/floors/:floorId/units', getUnitsByFloor);
app.get('/api/units/:unitId', getUnitById);

// 404 Handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global Error Handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled Server Error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

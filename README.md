# GEOCAD — 3D City Digital Twin & Building Information Modeling Platform

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-brightgreen.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61dafb.svg)](https://react.dev/)
[![Three.js](https://img.shields.io/badge/Three.js-r169-black.svg)](https://threejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791.svg)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5.x-2D3748.svg)](https://www.prisma.io/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ed.svg)](https://www.docker.com/)

**GEOCAD** is an enterprise-grade 3D Digital Twin and Building Information Modeling System (BIMS) for urban real estate and city infrastructure. The platform pairs a high-fidelity WebGL 3D city viewer (Three.js / React Three Fiber) with a relational spatial database (PostgreSQL 16 / Prisma ORM) and an authoritative Blender 3D/GIS modeling pipeline.

The reference project models the **Lodha Park** district in Lower Parel, Mumbai (`18.9986° N, 72.8258°�b), featuring real-world geospatial alignment, satellite GIS basemaps, interactive building selection, building versioning, and floor-level lifecycle tracking.

---

## Table of Contents

- [Key Features](#key-features)
- [System Architecture]#system-architecture)
- [Permanent Building Registry]#permanent-building-registry)
- [Project Directory Structure](#project-directory-structure)
- [Prerquisites & System Requirements]#prerquisites---system-requirements)
- [Step-by-Step Setup & Run Commands]#step-by-step-setup---run-commands)
  - [1. Database Setup (PostgreSQL in Docker)](#1-database-setup-postgresql-in-docker)
  - [2. Backend API Setup](#2-backend-api-setup)
  - [3. Frontend Web App Setup](#3-frontend-web-app-setup)
- [Complete API Reference & cURL Commands](#complete-api-reference---curl-commands)
  - [Buildings API](#buildings-api)
  - [Floors API](#floors-api)
- [3D Model & GIS Pipeline](#3d-model--gis-pipeline)
- [Data Non-Invention Policy]#data-non-invention-policy)
- [Git & GitHub Commands]#git---github-commands)
- [Documentation Index]#documentation-index)

---

## Key Features

* **Interactive 3D Web City Twin**: Real-time rendering of urban district models using Three.js and `@react-three/fiber` with raycasting selection, orbit controls, dynamic lighting, and glowing emissive facade highlights.
* **Bi-directional BIM Integration**: Seamless synchronization between 3D glTF/GLB-geometry nodes and PostgreSQL database records via immutable building IDs (`BLDG-LODHA-*`).
* **Building Lifecycle Versioning**: Versioned building master data (`BuildingVersion`) supporting historical revisions without losing original baseline geometry.
* **Floor Lifecycle & Elevation Bounds API**: Full CRUD API for building floors (`FLR-*`) supporting floor numbers, display names, and vertical elevation bounds (`elevationMinM`, `elevationMaxM`) for WebGL vertical slice highlighting.
* **BlenderGIS Master Integration**: Real-world georeferenced city modeling pipeline with satellite texture basemaps, OSM vector road layouts, and calibrated solar angles.
* **Zero Fake Data Policy**: Strict non-invention standard ensuring database records reflect only authoritative physical facts.

---

## System Architecture

```text
                                    +---------------------------------------+
                                    |         Blender 3D Master             |
                                    |    (lodha final.blend / BlenderGIS)   |
                                    +------------------+-------------------+
                                                      |
                                                glTF 2.0 Export
                                                      v
+--------------------------------+         +--------------------------------+
|         React Frontend        | <====== |   Web Model (lodha_final.glb)  |
|  - React 18 + Vite + TS       |         |   (frontend/public/models/)   |
|  - Three.js / R3F / Drei      |         +--------------------------------+
|  - Raycasting & Building HUD  |
+--------------+------------------+
                |
           REST AP (HTTP / JSON)
                |
                v
+---------------+------------------+
|       Express Backend         |
|  - Node.js + Express + TS     |
|  - Prisma 5 ORM               |
|  - Building & Floor Routers   |
+--------------+------------------+
                |
         TCP / Port 5432
                v
+---------------+------------------+
|     PostgreSQL 16 (Docker)    |
|  - Database: geocad_db        |
|  - Building, BuildingVersion  |
|  - Floor Models               |
+---------------------------------+
```

---

## Permanent Building Registry

The Lodha Park site contains seven authoritative permanent buildings registered in the spatial database:

| Building ID | Tower Name | Blender Object Name | glTF Node Name | Base Status |
| :--- | :--- | :--- | :--- | :---: |
| `BLDG-LODHA-WORLD-ONEc | Lodha World One | `BLDG-LODHA-WORLD-ONE` | `BLDG-LODHA-WORLD-ONE` | Active (v1) |
| `BLDG-LODHA-TRUMP` | Trump Tower Mumbai | `BLDG-LODHA-TRUMP` | `BLDG-LODHA-TRUMP` | Active (v1) |
| `BLDG-LODHA-MARQUISE` | Lodha Marquise | `BLDG-LODHA-MARQUISE` | `BLDG-LODHA-MARQUISE` | Active (v1) |
| `BLDG-LODHA-KIARA` | Lodha Kiara | `BLDG-LODHA-KIARA` | `BLDG-LODHA-KIARA` | Active (v1) |
| `BLDG-LODHA-ADRINA` | Lodha Adrina | `BLDG-LODHA-ADRINA` | `BLDG-LODHA-ADRINA` | Active (v1) |
| `BLDG-LODHA-PARKSIDE` | Lodha Parkside | `BLDG-LODHA-PARKSIDE` | `BLDG-LODHA-PARKSIDE` | Active (v1) |
| `BLDG-LODHA-ALLURA` | Lodha Allura | `BLDG-LODHA-ALLURA` | `BLDG-LODHA-ALLURA` | Active (v1) |

---
## Project Directory Structure

```text
GEOCAD/
└── .gitignore                   # Comprehensive git ignore configuration
└── README.md                    # Project documentation & execution guide
⒔⒐① 3d-assets/                   # High-resolution textures, satellite tiles, raw GLB
␂   └①① models/                  # Full district 3D assets (lodha_final.glb)
␂   └── textures/                # Satellite rasters (esri_satellite.jpg, mumbai_regional)
⒔⒐① backend/                     # Express REST API service
��   └①① prisma/                  # Prisma schema, migrations, and seed script
␂   │   └①① migrations/          # Version-controlled SQL migrations
␂   ␂   └── schema.prisma        # Database models (Building, Version, Floor)
��   │   └①① seed.ts              # Idempotent baseline seed runner
␂   └①① src/                     # TypeScript API source
␂        └── app.ts               # Express application configuration
��        └── db.ts                # PrismaClient singleton instance
␂         └── index.ts             # Backend entry point (Port 4000)
␂         └── routes/              # Route handlers (buildings.ts, floors.ts)
␂         └── services/            # Business logic & metadata elevation validators
␂   └── test-api.ts              # Automated end-to-end API test suite
��   └①① .env.example             # Backend environment template
��   └①① package.json             # Backend dependencies & npm scripts
��⒐① blender/                    # Authoritative Blender master files
��   └①① lodha final.blend        # Blender master scene
␂   └── lodha final_backup.blend # Emergency scene backup
⒔⒐① database/                    # Spatial database assets & OSM extracts
␂   └①① mumbai_lodha.osm         # OpenStreetMap raw vector road extract
��⒐① documentation/               # Technical specs & audit reports
␂   └── project-restart-audit.md # Restart & recovery audit report
␂   └①① floor-api.md             # Floor CRUD API specification
��   └①① floor-3d-geometry-audit.md # 3D mesh geometry audit report
��   └①① database-architecture.md # PostgreSQL entity-relationship design
��   └①① building-selection.md    # WebGL raycasting & highlight spec
⒔⒐① frontend/                   # Vite + React 18 + Three.js application
    └①① public/                  # Static assets served directly
    │   └①① models/              # lodha_final.glb (web-optimized binary glTF)
    ��   └①① src/                     # React application source code
    │        └── components/          # CityCanvas.tsx, BuildingInfoPanel.tsx
    │        └── api/                 # Axios / fetch client for backend endpoints
    ␂         └── App.tsx              # Root application layout & state
    │        └── main.tsx             # React DOM root entry point
    ��   └①① .env.example             # Frontend environment template
    └①① vite.config.ts           # Vite configuration
    ��⒐① package.json             # Frontend dependencies & npm scripts
```

---

## Prerequisites & System Requirements
�Ensure the following tools are installed on your workstation:

* **Node.js**: v18.0.0 or higher (v20+ LTS recommended)
� **npm**: v9.0.0 or higher
* **Docker & Docker Desktop**: Running on Windows/macOS/Linux
* **PostgreSQL**: v16 (orchestrated via Docker container)
* **Blender**: v4.0 or higher (optional, required for 3D modeling edits)
� **Git**: v2.30 or higher

---

## Step-by-Step Setup & Run Commands

### 1. Database Setup (PostgreSQL in Docker)

Run PostgreSQL 16 using Docker Desktop:

```bash
# Create and run PostgreSQL 16 container
docker run -d \
  --name geocad-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=geocad_db \
  -p 5432:5432 \
  postgres:16

# If the container already exists from a previous run, simply start it:
docker start geocad-postgres

# Verify the container is healthy and running:
docker ps --filter "name=geocad-postgres"
```

---

### 2. Backend API Setup

Open a terminal in the `backend/` directory:

```bash
cd backend

# Copy environment file
cp .env.example .env
# On Windows PowerShell:
# Copy-Item .env.example .env

# Install backend dependencies
npm install

# Push database schema & run migrations
npx prisma migrate dev --name init

# Generate Prisma Client
npx prisma generate

# Seed baseline building data (Lodha Park 7 towers)
npx tsx prisma/seed.ts

# Run the automated API verification test suite (12 assertions)
npx tsx test-api.ts

# Start backend development server (runs on port 4000)
npm run dev
```

The backend server is accessible at `http://localhost:4000`.

---

##3 3. Frontend Web App Setup

Open a second terminal in the `frontend/` directory:

``gbash
cd frontend

# Copy environment file
cp .env.example .env
# On Windows PowerShell:
# Copy-Item .env.example .env

# Install frontend dependencies
npm install

# Start Vite development server
npm run dev
```

Open your browser at `http://localhost:5173` to view the interactive 3D digital twin.

#### Production Frontend Build

To build and preview the optimized production bundle:

``gbash
cd frontend

# Compile TypeScript and build production bundle
npm run build

# Preview production build locally
npm run preview
```

---

## Complete API Reference & cURL Commands

All API endpoints accept and return `application/json`.

### Buildings API

#### 1. List All Buildings
Returns all 7 registered buildings with their current active versions.

```bash
curl -X GETE http://localhost:4000/api/buildings
```

#### 2. Get Building by Permanent ID
Returns comprehensive details, metadata, coordinates, and active version for a building.

```bash
curl -X GET http://localhost:4000/api/buildings/BLDG-LODHA-WORLD-ONE
```

---

### Floors API

#### 3. List All Floors for a Building
Returns all floors ordered by `floorNumber ASC`.

```bash
curl -X GETE http://localhost:4000/api/buildings/BLDG-LODHA-WORLD-ONE/floors
```

#### 4. Create a Floor (Without Elevation Bounds)
Registers a new floor with deterministic ID (`FLR-{buildingId}-{floorNumber}`).

```bash
curl -X POST http://localhost:4000/api/buildings/BLDG-LODHA-WORLD-ONE/floors \
  -h "Content-Type: application/json" \
  -d '{
    "floorNumber": 1,
    "name": "Ground Lobby"
  }'
```

#### 5. Create a Floor (With Elevation Bounds)
Registers a floor with verified vertical elevation bounds in meters.

``gbash
curl -X POST http://localhost:4000/api/buildings/BLDG-LODHA-WORLD-ONE/floors \
  -H "Content-Type: application/json" \
  -d '{
    "floorNumber": 5,
    "name": "Level 5 Residences",
    "elevationMinM": 18.5,
    "elevationMaxM": 22.0
  }'
```

#### 6. Get Single Floor by Floor ID
``gbash
curl -X GET http://localhost:4000/api/floors/FLR-BLDG-LODHA-WORLD-ONE-5
```

#### 7. Update Floor Metadata or Elevation Bounds
Update display name or elevation bounds (`floorNumber` and `buildingId` are immutable).

``gbash
curl -X PATCH http://localhost:4000/api/floors/FLR-BLDG-LODHA-WORLD-ONE-5 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Level 5 - Luxury Suites",
    "elevationMinM": 19.0,
    "elevationMaxM": 22.5
  }'
```

#### 8. Delete a Floor
```bash
curl -X DELETE http://localhost:4000/api/floors/FLR-BLDG-LODHA-WORLD-ONE-5
```

---

## 3D Model & GIS Pipeline

### Authoritative Files
* **Blender Master**: `blender/lodha final.blend` (184 objects, real-world satellite ground plane, 7 permanent building meshes).
* **Web GLB**: `frontend/public/models/lodha_final.glb` (Binary glTF 2.0 container, 3.61 MB).

### Geometry Integrity Rules
1. **Category D Extrusions**: All 7 building objects are single continuous vertical extrusions without physical floor slab sub-meshes. Do not simulate or fabricate physical internal geometries in the GLB.
2. **Permanent Object Names**: Mesh objects in Blender and nodes in glTF must retain permanent IDs:
   `BLDG-LODHA-WORLD-ONE`, `BLDG-LODHA-TRUMP`, `BLDG-LODHA-MARQUISE`, `BLDG-LODHA-KIARA`, `BLDG-LODHA-ADRINA`, `BLDG-LODHA-PARKSIDE`, `BLDG-LODHA-ALLURA`.
3. **glTF Export Settings**:
   * Format: `glTF Binary (.glb)b
   * Include: `Custom Properties` (checked)
�   * Transform: ` +Y Up`
�   * Geometry: Apply Modifiers (checked)

---

## Data Non-Invention Policy

GEOCAD strictly enforces a **Zero Fabricated Data** policy:
* When physical floor counts, architectural drawings, or authoritative surveys are unverified, fields like `totalFloors` in `BuildingVersion` remain strictly `null`.
* Floor records in the `Floor` table are created only when explicit architectural elevation slices or floor numbers are verified.
* No placeholder floors or hypothetical units are ever generated.

---

## Git & GitHub Commands

### 1. Initialize & Review Working Tree
```bash
git status
```

### 2. Stage All Project Files
```bash
git add .
```

### 3. Commit Project Baseline
``gbash
git commit -m "feat: initial commit of GEOCAD 3D city digital twin & BIMS platform"
```

### 4. Configure Default Branch
```bash
git branch -M main
```

### 5. Link to GitHub Repository & Push
Create an empty repository on GitHub named `GEOCAD` (do not initialize with README or license), then link and push:

``gbash
# Add your GitHub repository remote
git remote add origin https://github.com/<VOUR_GITHUB_USERNAME=/GEOCAD.git

# Push main branch to GitHub
git push -u origin main
```

### 6. Subsequent Development Workflow
```bash
# Check status
git status

# Create feature branch
git checkout -b feature/visual-quality-upgrade

# Stage & commit changes
git add .
git commit -m "feat: enhance WebGL lighting, tone mapping and environment reflections"

# Push feature branch
git push -u origin feature/visual-quality-upgrade
```

---

## Documentation Index

Detailed architectural documentation is available in `documentation/`:

* [`project-restart-audit.md`](documentation/project-restart-audit.md) — Comprehensive recovery audit report & visual quality diagnosis.
* [`floor-api.md`](documentation/floor-api.md) — Complete Floor CRUD API specifications & design patterns.
* [`floor-3d-geometry-audit.md`](documentation/floor-3d-geometry-audit.md) — Detailed mesh audit of 7 continuous building extrusions.
* [`database-architecture.md`](documentation/database-architecture.md) — PostgreSQL schema and entity-relationship models.
* [`building-selection.md`](documentation/building-selection.md) — Three.js raycasting, selection state, and emissive highlighting specification.
* [`postgresql-setup.md`](documentation/postgresql-setup.md) — Docker container configuration & Prisma setup guide.

---

## License

This project is licensed under the MIT License — see the LICENSE file for details.

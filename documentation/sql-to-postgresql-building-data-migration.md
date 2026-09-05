# GEOCAD — SQL to PostgreSQL Building Data Migration & Audit Report

## 1. Source SQL Location & Overview

- **Source Directory**: `C:\Users\daksh\GEOCAD\backend\building data base\`
- **Files Found**:
  - `001_schema.sql` (26,149 bytes) — Full DDL schema dump for PostgreSQL 14+ with PostGIS 3+ and pgcrypto extensions. Defines 10 core cadastral tables, constraints, spatial and B-tree indexes, cross-hierarchy integrity triggers, and 2 analytical views in a dedicated `geocad` schema.
  - `002_seed.sql` (30,354 bytes) — Procedural PL/pgSQL data seed generating a synthetic hierarchical property dataset for "New Veda City".
  - `003_example_queries.sql` (4,292 bytes) — 8 sample analytical, GeoJSON, and ML feature extraction queries.
  - `models.py` (14,143 bytes) — SQLAlchemy 2.0 & GeoAlchemy2 ORM models mirroring `001_schema.sql` 1:1.
  - `README.md` (5,321 bytes) — Cadastral property hierarchy specification and synthetic dataset documentation.
- **SQL Nature**: Both a complete **schema dump** (`001_schema.sql`) and a procedural **data dump** (`002_seed.sql`).

---

## 2. Source Database Schema (`geocad` Schema)

The source SQL establishes a 7-level cadastral and architectural hierarchy under the `geocad` schema:
```
CITY (cities)
  └── ZONE (zones)
        └── PARCEL (parcels with ULPIN)
              └── BUILDING (buildings)
                    ├── FLOOR (floors)
                    │     ├── FLOOR_PLAN (floor_plans)
                    │     └── UNIT (units)
                    │           ├── ROOM (rooms)
                    │           └── OWNERSHIP (ownerships) ── OWNER (owners)
                    └── DOCUMENT (documents - polymorphic)
```

### Table Details

| Table | Primary Key | Foreign Keys | Key Business / Spatial Fields | Record Count (Seed) |
| :--- | :--- | :--- | :--- | :--- |
| `geocad.cities` | `city_id` (UUID) | None | `city_code` (UNIQUE), `city_name`, `state`, `country`, `boundary_geometry` (MultiPolygon, 4326), `status` | 1 |
| `geocad.zones` | `zone_id` (UUID) | `city_id` -> `cities` | `zone_code` (UNIQUE), `zone_name`, `zone_type`, `land_use`, `area_sq_m`, `boundary_geometry` (MultiPolygon, 4326) | 5 |
| `geocad.parcels` | `parcel_id` (UUID) | `city_id` -> `cities`, `zone_id` -> `zones` | `parcel_code` (UNIQUE), `ulpin` (UNIQUE), `block_id`, `survey_number`, `land_use`, `area_sq_m`, `ownership_type`, `centroid_lat`, `centroid_lon`, `boundary_geometry` (Polygon, 4326), `vertex_coordinates` (JSONB) | 14 |
| `geocad.buildings` | `building_id` (UUID) | `parcel_id` -> `parcels` | `building_code` (UNIQUE), `building_name`, `building_type`, `status`, `number_of_floors`, `basement_count`, `ground_floor_height_m`, `typical_floor_height_m`, `total_height_m`, `footprint_area_sq_m`, `built_up_area_sq_m`, `ground_elevation_m`, `roof_height_m`, `orientation_deg`, `construction_year`, `occupancy_status`, `building_geometry` (PolygonZ, 4326), `centroid` (PointZ, 4326) | ~17 |
| `geocad.floors` | `floor_id` (UUID) | `building_id` -> `buildings` | `floor_code` (UNIQUE), `floor_number`, `floor_label`, `elevation_m`, `floor_height_m`, `gross_floor_area_sq_m`, `usable_floor_area_sq_m`, `unit_count`, `geometry` (PolygonZ, 4326). Unique: `(building_id, floor_number)` | ~100 |
| `geocad.floor_plans` | `floor_plan_id` (UUID) | `floor_id` -> `floors` | `floor_plan_code` (UNIQUE), `plan_version`, `total_area_sq_m`, `built_up_area_sq_m`, `wall_geometry`, `door_geometry`, `window_geometry`, `stair_geometry`, `lift_geometry`, `corridor_geometry`, `plan_file`, `plan_image`, `is_current`. Unique: `(floor_id, plan_version)` | ~100 |
| `geocad.units` | `unit_id` (UUID) | `building_id` -> `buildings`, `floor_id` -> `floors` | `unit_code` (UNIQUE), `unit_number`, `unit_type`, `carpet_area_sq_m`, `built_up_area_sq_m`, `super_built_up_area_sq_m`, `balcony_area_sq_m`, `entrance_coordinates`, `unit_geometry` (Polygon, 4326), `occupancy_status`, `ownership_status`. Unique: `(floor_id, unit_number)` | ~300 |
| `geocad.rooms` | `room_id` (UUID) | `unit_id` -> `units` | `room_code` (UNIQUE), `room_number`, `room_type`, `area_sq_m`, `length_m`, `width_m`, `height_m`, `floor_elevation_m`, `ceiling_height_m`, `centroid`, `geometry` (Polygon, 4326), `polygon_vertices` (JSONB). Unique: `(unit_id, room_number)` | ~1,200 |
| `geocad.owners` | `owner_id` (UUID) | None | `owner_code` (UNIQUE), `full_name`, `owner_type`, `contact_email`, `contact_phone`, `is_synthetic` (BOOLEAN DEFAULT TRUE) | 48 |
| `geocad.ownerships` | `ownership_id` (UUID) | `unit_id` -> `units`, `owner_id` -> `owners` | `ownership_code` (UNIQUE), `ownership_type`, `share_percentage`, `registration_date`, `valid_from`, `valid_to`, `status` | ~300 |
| `geocad.documents` | `document_id` (UUID) | Polymorphic (`property_type` + `property_id`) | `document_code` (UNIQUE), `property_type`, `document_type`, `document_number`, `issue_date`, `registration_date`, `document_url`, `verification_status` | ~400 |

---

## 3. Current GEOCAD Database Schema (`public` Schema)

The current live GEOCAD database (`geocad_db` running in container `geocad-postgres` on port 5432) uses Prisma ORM with tables in the `public` schema:

| Table | Primary Key | Business Key | Foreign Keys | Key Fields | Current Count |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `public.Building` | `id` (UUID) | `buildingId` (TEXT UNIQUE) | `currentVersionId` -> `BuildingVersion.id` | `buildingId`, `buildingName`, `assetType`, `status`, `createdAt`, `updatedAt` | 7 |
| `public.BuildingVersion` | `id` (UUID) | `(buildingId, versionNumber)` | `buildingId` -> `Building.buildingId` | `versionNumber` (default 1), `status`, `totalFloors`, `totalBasements`, `description`, `effectiveFrom`, `effectiveTo` | 7 |
| `public.Floor` | `id` (UUID) | `floorId` (TEXT UNIQUE) | `buildingVersionId` -> `BuildingVersion.id` | `floorNumber`, `floorName`, `elevationMinM`, `elevationMaxM`, `status` | 0 |
| `public.Unit` | `id` (UUID) | `unitId` (TEXT UNIQUE) | `floorId` -> `Floor.id` | `unitNumber`, `unitType`, `bhk`, `areaSqFt`, `status` | 0 |
| `public.Parking` | `id` (UUID) | `parkingId` (TEXT UNIQUE) | `buildingVersionId` -> `BuildingVersion.id` | `parkingNumber`, `parkingType`, `floorNumber`, `areaSqFt`, `status` | 0 |
| `public.Basement` | `id` (UUID) | `basementId` (TEXT UNIQUE) | `buildingVersionId` -> `BuildingVersion.id` | `basementNumber`, `basementName`, `status` | 0 |

---

## 4. Schema Comparison & Data Mapping

| Entity | `geocad.*` (Source SQL) | `public.*` (Current GEOCAD) | Mapping Category | Mapping Assessment |
| :--- | :--- | :--- | :--- | :--- |
| **City / Zone / Parcel** | `geocad.cities`, `zones`, `parcels` | *No direct equivalent* | **Category C** | Cadastral hierarchy above Building; can be retained in `geocad` schema for GIS integration. |
| **Building Identity** | `building_id` (UUID), `building_code` (TEXT) | `id` (UUID), `buildingId` (TEXT, e.g. `BLDG-LODHA-*`) | **Category B** | Permanent building IDs must bridge `geocad.buildings.building_code` or a mapping table to `Building.buildingId`. |
| **Building Metadata** | `building_name`, `number_of_floors`, `total_height_m`, `construction_year`, `status` | `Building.buildingName`, `BuildingVersion.totalFloors`, `description` | **Category A / B** | Direct mapping to enrich `BuildingVersion` structural metadata. |
| **Floor Level** | `geocad.floors` (`floor_code`, `floor_number`, `elevation_m`, `floor_height_m`) | `public.Floor` (`floorId`, `floorNumber`, `floorName`, `elevationMinM`, `elevationMaxM`) | **Category B** | `elevationMinM = elevation_m`, `elevationMaxM = elevation_m + floor_height_m`. |
| **Units** | `geocad.units` (`unit_code`, `unit_number`, `unit_type`, `carpet_area_sq_m`) | `public.Unit` (`unitId`, `unitNumber`, `unitType`, `areaSqFt`) | **Category B** | `areaSqFt = carpet_area_sq_m * 10.7639`. |
| **Rooms** | `geocad.rooms` (1,200 rooms with geometry) | *No current table* | **Category C** | Architectural interior data for future interior visualization. |
| **Owners & Ownership** | `geocad.owners`, `ownerships` | *No current table* | **Category D (Sensitive)** | **MUST NOT be publicly exposed**; reserved for future authenticated portal. |
| **Documents** | `geocad.documents` (BPA, OC, Sale Deeds) | *No current table* | **Category D (Sensitive)** | Legal/deed records; protected from public API. |

---

## 5. Critical Audit Finding — Rule 20 Stop Condition Trigger

### The Finding
The synthetic seed script `002_seed.sql` generates **17 buildings** belonging to **New Veda City** with coordinates centered at `(78.860..78.940, 21.460..21.520)` and names/codes:
- `NVC-ZA-P0001-B01` -> "Residential Tower NVC-ZA-P0001-B01" (9 floors)
- `NVC-ZA-P0001-B02` -> "Residential Tower NVC-ZA-P0001-B02" (5 floors)
- `NVC-ZA-P0002-B01` -> "Residential Tower NVC-ZA-P0002-B01" (5 floors)
- `NVC-ZA-P0003-B01` -> "Residential Tower NVC-ZA-P0003-B01" (7 floors)
- `NVC-ZA-P0003-B02` -> "Residential Tower NVC-ZA-P0003-B02" (8 floors)
- `NVC-ZA-P0004-B01` -> "Residential Tower NVC-ZA-P0004-B01" (7 floors)
- `NVC-ZB-P0001-B01` -> "Commercial Tower NVC-ZB-P0001-B01" (9 floors)
- `NVC-ZB-P0001-B02` -> "Commercial Tower NVC-ZB-P0001-B02" (10 floors)
- `NVC-ZB-P0002-B01` -> "Commercial Tower NVC-ZB-P0002-B01" (10 floors)
- `NVC-ZB-P0003-B01` -> "Commercial Tower NVC-ZB-P0003-B01" (12 floors)
- `NVC-ZB-P0003-B02` -> "Commercial Tower NVC-ZB-P0003-B02" (13 floors)
- `NVC-ZC-P0001-B01` through `B02` (Mixed Use Towers)
- `NVC-ZD-P0001-B01` through `B02` (Industrial Towers)

None of these 17 buildings have any textual, code, or coordinate reference to the **7 permanent Lodha Park buildings**:
1. `BLDG-LODHA-WORLD-ONE` ("Lodha World One")
2. `BLDG-LODHA-TRUMP` ("Lodha Trump Tower")
3. `BLDG-LODHA-MARQUISE` ("Lodha Marquise")
4. `BLDG-LODHA-KIARA` ("Lodha Kiara")
5. `BLDG-LODHA-ADRINA` ("Lodha Adrina")
6. `BLDG-LODHA-PARKSIDE` ("Lodha Parkside")
7. `BLDG-LODHA-ALLURA` ("Lodha Allura")

### Environment Prerequisite Finding
- `001_schema.sql` requires PostgreSQL extension `postgis` (`CREATE EXTENSION IF NOT EXISTS "postgis";`).
- The running Docker container `geocad-postgres` is based on standard `postgres:16` without PostGIS binaries installed (`SELECT * FROM pg_available_extensions WHERE name='postgis'` returned 0 rows). Running `001_schema.sql` directly inside `geocad-postgres` would fail with an extension error unless PostGIS is installed or geometry types are decoupled.

### Mandatory Compliance with Rule 20
Rule 20 explicitly commands:
> *"If the SQL building data cannot be safely mapped to the 7 permanent GEOCAD buildings: STOP the import. Do NOT create guessed mappings. Do NOT modify the database with uncertain data. Instead report exactly: what was found, what can be mapped, what cannot be mapped, what additional mapping information is required."*

---

## 6. Proposed Alignment & Mapping Strategy for User Review

To safely connect this rich cadastral schema into GEOCAD without guessing, three clear architectural options are available:

### Option 1 (Recommended): Explicit Cadastral Bridge to Lodha Park Towers
Create an explicit bridge mapping 7 of the high-rise residential/commercial towers from the SQL dataset to the 7 permanent Lodha Park building IDs:
| SQL Building Code | Proposed GEOCAD `buildingId` | 3D Object / Permanent Identity | Type |
| :--- | :--- | :--- | :--- |
| `NVC-ZB-P0003-B02` | `BLDG-LODHA-WORLD-ONE` | `BLDG-LODHA-WORLD-ONE` | Iconic High-Rise |
| `NVC-ZB-P0003-B01` | `BLDG-LODHA-TRUMP` | `BLDG-LODHA-TRUMP` | Commercial / Luxury Tower |
| `NVC-ZB-P0002-B01` | `BLDG-LODHA-MARQUISE` | `BLDG-LODHA-MARQUISE` | High-Rise Residential |
| `NVC-ZA-P0003-B02` | `BLDG-LODHA-KIARA` | `BLDG-LODHA-KIARA` | Residential Tower |
| `NVC-ZA-P0003-B01` | `BLDG-LODHA-ADRINA` | `BLDG-LODHA-ADRINA` | Residential Tower |
| `NVC-ZA-P0001-B01` | `BLDG-LODHA-PARKSIDE` | `BLDG-LODHA-PARKSIDE` | Residential Tower |
| `NVC-ZA-P0001-B02` | `BLDG-LODHA-ALLURA` | `BLDG-LODHA-ALLURA` | Residential Tower |

### Option 2: Provide a Dedicated Lodha Park SQL Seed
The user provides or approves an adapted SQL seed where `002_seed.sql` explicitly names `city_name = 'Mumbai'`, `zone_name = 'Lower Parel / Worli'`, and the 7 buildings have their real business IDs (`BLDG-LODHA-WORLD-ONE`, `BLDG-LODHA-TRUMP`, etc.) with authentic floor counts (76, 57, 76, etc.).

### Option 3: Schema Coexistence with Foreign Key Link
Import the full `geocad` schema into PostgreSQL (adapting geometry to standard types if PostGIS is not loaded into the Docker container) and add a `lodha_building_id` column to `geocad.buildings` pointing to `public.Building.buildingId`.

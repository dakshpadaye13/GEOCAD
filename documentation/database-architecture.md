# GEOCAD Database Architecture & Schema Specification

## 1. Database Technology
- **Engine**: PostgreSQL (Production & Development standard).
- **ORM / Schema Tool**: Prisma ORM (`v5.22.0`).
- **Runtime Environment**: Node.js / TypeScript (`tsx` for seed scripts).
- **Security & Privacy**: Sensitive owner/beneficiary data, government allocation records, auth credentials, and audit logs are isolated from public 3D web assets (GLB) and maintained strictly within the secure database layer.

---

## 2. Prisma Configuration
The database layer is housed in the `backend/` workspace directory:
- **Schema Location**: `backend/prisma/schema.prisma`
- **Environment Config**: `backend/.env` (git-ignored) & `backend/.env.example` (committed template).
- **Seed Script**: `backend/prisma/seed.ts` configured via `package.json` `prisma.seed` hook (`tsx prisma/seed.ts`).

---

## 3. Database Entities & Models

### A. `Building` (Permanent Identity Entity)
Represents the permanent business entity of a building. Retains its stable identity across reconstructions, height adjustments, or architectural updates.
- `id` (String, UUID, Primary Key)
- `buildingId` (String, Unique Index) - Human-readable permanent identifier matching 3D GLB mesh name (e.g., `BLDG-LODHA-WORLD-ONE`).
- `buildingName` (String) - Human-readable display title.
- `assetType` (String, Default: `"building"`) - Spatial categorization.
- `currentVersionId` (String, Unique, Optional) - Reference to the active structural version.
- `status` (String, Default: `"EXISTING"`) - Status flag (`EXISTING`, `UNDER_RECONSTRUCTION`, `DEMOLISHED`, etc.).
- `createdAt` / `updatedAt` (DateTime timestamps).

### B. `BuildingVersion` (Versioned Structural Record)
Stores structural metadata, floor counts, and basements for a specific revision of a building.
- `id` (String, UUID, Primary Key)
- `buildingId` (String, Foreign Key to `Building.buildingId`, Cascading Delete)
- `versionNumber` (Int, Default: `1`) - Incremental structural version (1, 2, ...).
- `status` (String, Default: `"EXISTING"`)
- `totalFloors` (Int, Optional/Nullable) - Nullable when floor count is unconfirmed; avoids invented data.
- `totalBasements` (Int, Optional/Nullable) - Nullable when basement count is unconfirmed.
- `description` (String, Optional) - Historical rationale or description of structural state.
- `effectiveFrom` (DateTime, Default: `now()`)
- `effectiveTo` (DateTime, Optional) - Set when replaced by a newer version.
- `createdAt` / `updatedAt` (DateTime timestamps).
- Unique Constraint: `[buildingId, versionNumber]`.

### C. `Floor` (Floor Level Entity)
Represents horizontal levels attached to a specific building version.
- `id` (String, UUID, Primary Key)
- `floorId` (String, Unique Index) - Stable identifier (e.g., `FLR-LODHA-WORLD-ONE-L15`).
- `buildingVersionId` (String, Foreign Key to `BuildingVersion.id`, Cascading Delete)
- `floorNumber` (Int) - Relative vertical ordinal level.
- `floorName` (String) - Named floor designation (e.g., `"Level 15"`).
- `status` (String, Default: `"EXISTING"`)

### D. `Unit` (Unit / Apartment / Commercial Space)
Represents individual units on a specific floor.
- `id` (String, UUID, Primary Key)
- `unitId` (String, Unique Index) - Stable identifier suitable for future 3D unit mapping.
- `floorId` (String, Foreign Key to `Floor.id`, Cascading Delete)
- `unitNumber` (String) - Unit designation (e.g., `"1502"`).
- `unitType` (String, Optional) - Space classification (e.g., `"Residential"`, `"Retail"`).
- `bhk` (Float, Optional) - Bedroom count representation.
- `areaSqFt` (Float, Optional) - Area measurement.
- `status` (String, Default: `"EXISTING"`)

### E. `Parking` (Parking Slot Entity)
Represents allocated or structural parking units linked to a building version.
- `id` (String, UUID, Primary Key)
- `parkingId` (String, Unique Index) - Permanent parking ID.
- `buildingVersionId` (String, Foreign Key to `BuildingVersion.id`, Cascading Delete)
- `parkingNumber` (String) - Bay label or number.
- `parkingType` (String, Optional) - Stack, standard, EV, basement bay, etc.
- `floorNumber` (Int, Optional) - Associated level.
- `areaSqFt` (Float, Optional)
- `status` (String, Default: `"EXISTING"`)

### F. `Basement` (Sub-surface Baseline Level)
Represents subterranean levels linked to a building version.
- `id` (String, UUID, Primary Key)
- `basementId` (String, Unique Index) - Permanent basement ID.
- `buildingVersionId` (String, Foreign Key to `BuildingVersion.id`, Cascading Delete)
- `basementNumber` (Int) - Negative or ordinal index (e.g., `-1`, `-2`).
- `basementName` (String) - Label (e.g., `"Basement Level B1"`).
- `status` (String, Default: `"EXISTING"`)

---

## 4. Entity Relationships

```mermaid
erDiagram
    Building ||--o{ BuildingVersion : "has historical versions"
    Building ||--o| BuildingVersion : "currentVersion"
    BuildingVersion ||--o{ Floor : "contains floors"
    BuildingVersion ||--o{ Parking : "contains parking slots"
    BuildingVersion ||--o{ Basement : "contains basements"
    Floor ||--o{ Unit : "contains units"
```

---

## 5. Permanent ID Strategy

1. **Decoupled Business ID**:
   - The permanent business ID (`buildingId`, `floorId`, `unitId`, `parkingId`, `basementId`) is stored separately from auto-generated database internal UUIDs (`id`).
2. **Stable 3D Mapping**:
   - `buildingId` matches the 3D GLB mesh object names directly (`BLDG-LODHA-WORLD-ONE`, `BLDG-LODHA-TRUMP`, etc.).
   - Blender object internal UUIDs are **not** used as permanent business identifiers.
3. **Reconstruction Resilience**:
   - When a building is reconstructed or modified, `buildingId` remains constant while new `BuildingVersion` records are created and linked.

---

## 6. Building Versioning Strategy & Historical Data Preservation

- **Immutability**: `BuildingVersion` records are non-destructive and historical versions are preserved indefinitely.
- **Active Pointer**: `Building.currentVersionId` points to the currently active version.
- **Version Escalation**: Replacing a building configuration creates a new `BuildingVersion` with `versionNumber = N + 1`, setting `effectiveTo = now()` on the previous version.
- **Cascade Control**: Child elements (`Floor`, `Unit`, `Parking`, `Basement`) belong to specific `BuildingVersion` instances, ensuring historical snapshot integrity for past building states.

---

## 7. Seed Data Configuration

Initial seed data is configured in `backend/prisma/seed.ts` for the 7 Lodha Park buildings using their exact permanent human-readable IDs:

| Permanent Building ID | Display Name | Version | Status | Floors | Basements |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `BLDG-LODHA-WORLD-ONE` | Lodha World One | 1 | `EXISTING` | `null` | `null` |
| `BLDG-LODHA-TRUMP` | Lodha Trump Tower | 1 | `EXISTING` | `null` | `null` |
| `BLDG-LODHA-MARQUISE` | Lodha Marquise | 1 | `EXISTING` | `null` | `null` |
| `BLDG-LODHA-KIARA` | Lodha Kiara | 1 | `EXISTING` | `null` | `null` |
| `BLDG-LODHA-ADRINA` | Lodha Adrina | 1 | `EXISTING` | `null` | `null` |
| `BLDG-LODHA-PARKSIDE` | Lodha Parkside | 1 | `EXISTING` | `null` | `null` |
| `BLDG-LODHA-ALLURA` | Lodha Allura | 1 | `EXISTING` | `null` | `null` |

*Note: Unconfirmed physical parameters use `null` placeholders rather than invented values.*

---

## 8. Environment Variables

- **`.env.example`** template:
```env
# Production / Local PostgreSQL Connection URI
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/geocad_db?schema=public"
```
- **Security Rule**: `.env` is listed in `backend/.gitignore` and must never be committed to source control with real passwords or credentials.

---

## 9. Local Database Setup Instructions

1. Install and start PostgreSQL (version 14+ recommended) on port `5432`.
2. Create the `geocad_db` database:
   ```sql
   CREATE DATABASE geocad_db;
   ```
3. Update `backend/.env` with your local PostgreSQL credentials:
   ```env
   DATABASE_URL="postgresql://<username>:<password>@localhost:5432/geocad_db?schema=public"
   ```

---

## 10. Database Commands

### Validation & Client Generation
```bash
cd backend
npx prisma validate
npx prisma generate
```

### Migration Execution
```bash
cd backend
npx prisma migrate dev --name init
```

### Database Seeding
```bash
cd backend
npm run prisma:seed
```

### Prisma Studio (GUI Inspection)
```bash
cd backend
npx prisma studio
```

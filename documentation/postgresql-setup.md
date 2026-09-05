# GEOCAD PostgreSQL Environment & Setup Documentation

## 1. PostgreSQL Overview & Status

| Setting / Property | Current Status / Value |
| :--- | :--- |
| **PostgreSQL Installation** | **NO** (Native PostgreSQL binary `postgres.exe` / `psql.exe` not installed on host OS) |
| **PostgreSQL Version** | **N/A** (Pending installation or engine startup) |
| **Windows Service Status** | **NOT INSTALLED** (No service registered matching `*postgres*`) |
| **Port 5432 Status** | **UNOCCUPIED** (Port 5432 open for PostgreSQL binding) |
| **Docker Desktop Status** | **INSTALLED BUT STOPPED** (`Docker Desktop v29.2.1` installed; engine daemon stopped) |
| **Target Database Name** | `geocad_db` |
| **Prisma Schema Provider** | `postgresql` |

---

## 2. Configuration & Connection Strings

The GEOCAD backend is configured to use environment variables for database connections.

### Environment File: `backend/.env`
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/geocad_db?schema=public"
```

*Note: Do not commit actual passwords or connection strings to source control. Use `backend/.env.example` as template.*

---

## 3. Options to Enable PostgreSQL Engine

To enable PostgreSQL for the GEOCAD project, choose one of the following two methods:

### Option A: Enable Docker Desktop Engine (Recommended if Docker Desktop is installed)
1. Launch **Docker Desktop** from the Windows Start menu or shortcut.
2. Wait for Docker Engine status to display **Running**.
3. Spin up a persistent PostgreSQL container bound to port `5432`:
   ```bash
   docker run --name geocad-postgres -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=geocad_db -p 5432:5432 -v geocad_pgdata:/var/lib/postgresql/data -d postgres:16
   ```

### Option B: Native Windows PostgreSQL Installation
1. Download the PostgreSQL Windows installer (v14+) from: https://www.postgresql.org/download/windows/
2. Install with default port `5432`, superuser `postgres`, password `postgres`.
3. Ensure the service `postgresql-x64-16` (or equivalent version) is set to Automatic / Running in Windows `services.msc`.
4. Create the target database `geocad_db`:
   ```sql
   CREATE DATABASE geocad_db;
   ```

---

## 4. Prisma Migration & Seeding Commands

Once PostgreSQL is active on port `5432`:

### 1. Validate Schema
```bash
cd backend
npx prisma validate
```

### 2. Generate Prisma Client
```bash
cd backend
npx prisma generate
```

### 3. Run Initial Migration
```bash
cd backend
npx prisma migrate dev --name init
```

### 4. Execute Seed Script
```bash
cd backend
npm run prisma:seed
```

---

## 5. Data Verification Commands

After migration and seeding succeed:

```bash
cd backend
npx prisma studio
```
Or execute verification via Node/TypeScript:
```bash
npx tsx -e "import { PrismaClient } from '@prisma/client'; const p = new PrismaClient(); p.building.findMany().then(b => console.log('Seeded Buildings:', b));"
```

### Expected Seeded Baseline
* Total Building Records: **7**
  * `BLDG-LODHA-WORLD-ONE`
  * `BLDG-LODHA-TRUMP`
  * `BLDG-LODHA-MARQUISE`
  * `BLDG-LODHA-KIARA`
  * `BLDG-LODHA-ADRINA`
  * `BLDG-LODHA-PARKSIDE`
  * `BLDG-LODHA-ALLURA`
* Initial Version: `versionNumber: 1`, `status: "EXISTING"`
* Unknown physical parameters: `totalFloors: null`, `totalBasements: null`

---

## 6. Project Rules Compliance
- **No SQLite / MongoDB Substitution**: PostgreSQL remains the single target database for GEOCAD.
- **GLB / Blender Protection**: `blender/lodha final.blend` and `frontend/public/models/lodha_final.glb` remain untouched.
- **Frontend Independence**: `frontend/src/data/buildings.ts` remains active until API layer connects.

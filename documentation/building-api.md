# GEOCAD Building API Specification & Documentation

## 1. Overview & Backend Technology
- **Framework**: Express.js (`v5.2.1`) on Node.js with TypeScript (`v5.7.2`).
- **ORM**: Prisma ORM (`v5.22.0`).
- **Database**: PostgreSQL 16 (`geocad_db` on `localhost:5432`).
- **Architecture**: Modular Controller & Service pattern isolated in `backend/src/`.

---

## 2. Environment & Database Connection
Environment variables are managed in `backend/.env`:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/geocad_db?schema=public"
PORT=4000
NODE_ENV="development"
```

---

## 3. Permanent Building Identifiers
Building endpoints operate strictly using human-readable permanent business IDs, matching the 3D GLB mesh node names:
- `BLDG-LODHA-WORLD-ONE`
- `BLDG-LODHA-TRUMP`
- `BLDG-LODHA-MARQUISE`
- `BLDG-LODHA-KIARA`
- `BLDG-LODHA-ADRINA`
- `BLDG-LODHA-PARKSIDE`
- `BLDG-LODHA-ALLURA`

Internal database UUIDs are kept internal and not required for API consumers.

---

## 4. API Endpoints

### A. Fetch All Buildings
- **Endpoint**: `GET /api/buildings`
- **Description**: Returns a JSON array of all 7 Lodha Park buildings with their active structural version details.
- **HTTP Status Codes**:
  - `200 OK`: Successful retrieval.
  - `500 Internal Server Error`: Unexpected database failure.

#### Example Response (`200 OK`)
```json
[
  {
    "buildingId": "BLDG-LODHA-WORLD-ONE",
    "buildingName": "Lodha World One",
    "assetType": "building",
    "status": "EXISTING",
    "currentVersion": {
      "versionNumber": 1,
      "status": "EXISTING",
      "totalFloors": null,
      "totalBasements": null,
      "description": "Initial structural baseline version 1",
      "effectiveFrom": "2026-09-04T20:17:45.489Z"
    },
    "createdAt": "2026-09-04T20:17:45.479Z",
    "updatedAt": "2026-09-04T20:17:54.212Z"
  }
]
```

---

### B. Fetch Building by Permanent ID
- **Endpoint**: `GET /api/buildings/:buildingId`
- **Description**: Returns details for a single building matching the provided permanent building ID.
- **URL Parameter**: `buildingId` (e.g., `BLDG-LODHA-WORLD-ONE`)
- **HTTP Status Codes**:
  - `200 OK`: Building found.
  - `404 Not Found`: Invalid building ID.
  - `500 Internal Server Error`: Unexpected server error.

#### Example Request
```http
GET /api/buildings/BLDG-LODHA-WORLD-ONE HTTP/1.1
Host: localhost:4000
```

#### Example Success Response (`200 OK`)
```json
{
  "buildingId": "BLDG-LODHA-WORLD-ONE",
  "buildingName": "Lodha World One",
  "assetType": "building",
  "status": "EXISTING",
  "currentVersion": {
    "versionNumber": 1,
    "status": "EXISTING",
    "totalFloors": null,
    "totalBasements": null,
    "description": "Initial structural baseline version 1",
    "effectiveFrom": "2026-09-04T20:17:45.489Z"
  },
  "createdAt": "2026-09-04T20:17:45.479Z",
  "updatedAt": "2026-09-04T20:17:54.212Z"
}
```

#### Example Not Found Response (`404 Not Found`)
```json
{
  "error": "Building 'BLDG-INVALID' not found"
}
```

---

## 5. Security & Privacy
1. **Sanitization**: Database error stack traces, internal connection URIs, and credentials are hidden from public error responses.
2. **Zero Sensitive Data**: No beneficiary, owner, or sensitive government allocation data is exposed or stored in this baseline stage.

---

## 6. Commands to Run & Test Backend API

### Start Backend API Server
```bash
cd backend
npm run dev
# Server starts on http://localhost:4000
```

### Run Automated API Verification Suite
```bash
cd backend
npx tsx test-api.ts
```

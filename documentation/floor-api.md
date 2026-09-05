# GEOCAD Floor API & Database Specification

## 1. Overview & Architecture
The GEOCAD Floor API layer establishes the database foundation for building levels within the 3D Digital Twin environment.

- **Relationship Architecture**:
  ```
  Building (permanent identity e.g. BLDG-LODHA-WORLD-ONE)
      ↓
  BuildingVersion (current active baseline version e.g. Version 1)
      ↓
  Floor (level entity e.g. FLR-LODHA-WORLD-ONE-L03)
      ↓
  [Future Unit/Apartment entities]
  ```
- **Source of Truth**: The database (`geocad_db`) remains the sole authority for floor configurations. The public 3D GLB model remains the visual representation.

---

## 2. Permanent `floorId` Strategy
- **Format**: Deterministic, human-readable identifier replacing building prefix `BLDG-` with `FLR-` and appending zero-padded level ordinal `L{NN}` (or `B{NN}` for basements).
- **Examples**:
  - `BLDG-LODHA-WORLD-ONE` + Floor `3` ──▶ `FLR-LODHA-WORLD-ONE-L03`
  - `BLDG-LODHA-WORLD-ONE` + Floor `15` ──▶ `FLR-LODHA-WORLD-ONE-L15`
  - `BLDG-LODHA-TRUMP` + Floor `-1` ──▶ `FLR-LODHA-TRUMP-B01`
- **Rule**: Internal database UUIDs are maintained as primary keys (`id`), while `floorId` is unique and deterministic (`@unique`).

---

## 3. Floor Vertical Bounds Metadata (`elevationMinM`, `elevationMaxM`)
- **`elevationMinM`** (Float?, Nullable): Floor base elevation in meters above GEOCAD world origin ($Z_{\text{min}}$).
- **`elevationMaxM`** (Float?, Nullable): Floor ceiling elevation in meters above GEOCAD world origin ($Z_{\text{max}}$).
- **Validation Rules**:
  - Optional until authorized BIM/cadastral elevation data is supplied.
  - If both `elevationMinM` and `elevationMaxM` are provided, `elevationMaxM` must be strictly greater than `elevationMinM` (`elevationMaxM > elevationMinM`).
  - Values can be cleared at any time by setting them explicitly to `null`.

---

## 4. Floor API Endpoints

### A. List Floors for a Building
- **Endpoint**: `GET /api/buildings/:buildingId/floors`
- **Description**: Returns the list of configured floors for a building's active `currentVersion`.
- **Response (`200 OK`)**:
  ```json
  {
    "buildingId": "BLDG-LODHA-WORLD-ONE",
    "buildingVersion": {
      "versionNumber": 1,
      "status": "EXISTING"
    },
    "floors": [
      {
        "floorId": "FLR-LODHA-WORLD-ONE-L03",
        "floorNumber": 3,
        "floorName": "Level 3",
        "elevationMinM": null,
        "elevationMaxM": null,
        "status": "EXISTING",
        "createdAt": "2026-09-04T21:04:13.873Z",
        "updatedAt": "2026-09-04T21:04:13.873Z"
      }
    ]
  }
  ```
- **Errors**:
  - `404 Not Found`: `{ "error": "Building 'BLDG-INVALID' not found" }`
  - `500 Internal Server Error`

---

### B. Fetch Single Floor Details
- **Endpoint**: `GET /api/floors/:floorId`
- **Description**: Returns details for a single floor along with parent building and version details.
- **Response (`200 OK`)**:
  ```json
  {
    "floorId": "FLR-LODHA-WORLD-ONE-L03",
    "floorNumber": 3,
    "floorName": "Level 3",
    "elevationMinM": 8.0,
    "elevationMaxM": 11.5,
    "status": "EXISTING",
    "buildingVersionId": "90b90da7-eeb3-4a48-9c14-61d3cf50d878",
    "buildingVersion": {
      "versionNumber": 1,
      "status": "EXISTING"
    },
    "buildingId": "BLDG-LODHA-WORLD-ONE",
    "buildingName": "Lodha World One",
    "createdAt": "2026-09-04T21:04:13.873Z",
    "updatedAt": "2026-09-04T21:04:13.873Z"
  }
  ```
- **Errors**:
  - `404 Not Found`: `{ "error": "Floor 'FLR-INVALID' not found" }`

---

### C. Create a New Floor
- **Endpoint**: `POST /api/buildings/:buildingId/floors`
- **Request Body**:
  ```json
  {
    "floorNumber": 4,
    "floorName": "Level 4",
    "status": "EXISTING",
    "elevationMinM": 12.0,
    "elevationMaxM": 15.5
  }
  ```
- **Validation Rules**:
  1. `floorNumber`: Must be an integer between `-10` and `300`. (HTTP 400 if invalid)
  2. `floorName`: Must be a non-empty string. (HTTP 400 if invalid)
  3. `elevationMinM` / `elevationMaxM`: Optional numbers. If both provided, `elevationMaxM > elevationMinM` required. (HTTP 400 if invalid)
  4. Building existence: Target building must exist and have an active `currentVersion`. (HTTP 404 if building not found)
  5. **Duplicate Protection**: Database compound constraint `@@unique([buildingVersionId, floorNumber])` prevents duplicate floor numbers for the same building version. (HTTP `409 Conflict`: `{ "error": "Floor 4 already exists for this building version" }`)
- **Response (`201 Created`)**:
  ```json
  {
    "floorId": "FLR-LODHA-WORLD-ONE-L04",
    "floorNumber": 4,
    "floorName": "Level 4",
    "elevationMinM": 12.0,
    "elevationMaxM": 15.5,
    "status": "EXISTING",
    "buildingVersionId": "90b90da7-eeb3-4a48-9c14-61d3cf50d878",
    "createdAt": "2026-09-04T21:04:13.892Z",
    "updatedAt": "2026-09-04T21:04:13.892Z"
  }
  ```

---

### D. Update an Existing Floor
- **Endpoint**: `PATCH /api/floors/:floorId`
- **Supported Fields**: `floorName`, `status`, `elevationMinM`, `elevationMaxM`
- **Immutable Fields**: `floorId`, `buildingId`, `buildingVersionId`, `floorNumber`. Attempting to alter any of these identity fields returns HTTP `400 Bad Request`.
- **Request Body Example**:
  ```json
  {
    "floorName": "Renamed Level 4",
    "elevationMinM": 12.5,
    "elevationMaxM": 16.0
  }
  ```
- **Response (`200 OK`)**:
  ```json
  {
    "floorId": "FLR-LODHA-WORLD-ONE-L04",
    "floorNumber": 4,
    "floorName": "Renamed Level 4",
    "elevationMinM": 12.5,
    "elevationMaxM": 16.0,
    "status": "EXISTING",
    "buildingVersionId": "90b90da7-eeb3-4a48-9c14-61d3cf50d878",
    "createdAt": "2026-09-04T21:04:13.892Z",
    "updatedAt": "2026-09-04T21:04:13.911Z"
  }
  ```

---

### E. Delete a Floor Record
- **Endpoint**: `DELETE /api/floors/:floorId`
- **Description**: Deletes a single `Floor` record. Parent `Building` and `BuildingVersion` records remain completely untouched.
- **Response (`200 OK`)**:
  ```json
  {
    "message": "Floor 'FLR-LODHA-WORLD-ONE-L04' deleted successfully"
  }
  ```
- **Errors**:
  - `404 Not Found`: `{ "error": "Floor 'FLR-INVALID' not found" }`

---

## 5. Architectural Preservation & Non-Invention Policy
- **No Invented Data**: Elevation metadata (`elevationMinM`, `elevationMaxM`) remains `null` until verified structural data is supplied through authorized floor API endpoints.
- **Historical Data Preservation**: Historical `BuildingVersion` records retain their child `Floor` entities without automatic deletion.

---

## 6. Automated Verification Results

- **Backend API Tests**: Run via `npx tsx test-api.ts` — **ALL 100% PASSED** (12 assertions: Building API, Floor GET, POST with/without elevations, validation failures, PATCH name/elevations, null clears, immutable checks, DELETE, 404 verification, and cleanup).
- **Frontend Build**: Run via `npm run build` in `frontend/` — **PASSED CLEANLY** (`built in 4.50s`).

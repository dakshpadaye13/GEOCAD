# GEOCAD 3D Floor Geometry Audit Report

## 1. Executive Summary
A comprehensive, read-only technical audit was conducted on the Blender master file (`blender/lodha final.blend`) and exported web model (`frontend/public/models/lodha_final.glb`).

The objective was to evaluate whether the existing seven permanent building objects (`BLDG-LODHA-WORLD-ONE`, `BLDG-LODHA-TRUMP`, `BLDG-LODHA-MARQUISE`, `BLDG-LODHA-KIARA`, `BLDG-LODHA-ADRINA`, `BLDG-LODHA-PARKSIDE`, `BLDG-LODHA-ALLURA`) contain sub-mesh geometry, disconnected floor slabs, or internal hierarchy that could support floor selection/isolation.

### Primary Audit Finding:
All seven building objects are **continuous, single-mesh geometric extrusions** extending vertically from ground level ($Z = 0$) to their respective roof heights. None of the seven buildings currently contain physical floor slabs, internal level cuts, or sub-mesh floor objects.

All 7 buildings are classified as **CATEGORY D: NO RELIABLE FLOOR GEOMETRY**.

---

## 2. Blender Master Object Structure (`blender/lodha final.blend`)

Audit script `scratch/audit_blender_floors.py` inspected all 7 building objects in Blender 5.2.1 LTS:

| Permanent Building ID | Object Name | Mesh Datablock | Vertices | Polygons | Z-Min (m) | Z-Max (m) | Height (m) | Disconnected Islands | Child Objects |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `BLDG-LODHA-WORLD-ONE` | `BLDG-LODHA-WORLD-ONE` | `Areas:building.077` | 48 | 25 | 0.0 | 277.6 | 277.6 | 1 | 0 |
| `BLDG-LODHA-TRUMP` | `BLDG-LODHA-TRUMP` | `Areas:building.043` | 42 | 22 | 0.0 | 222.5 | 222.5 | 1 | 0 |
| `BLDG-LODHA-MARQUISE` | `BLDG-LODHA-MARQUISE` | `Areas:building.076` | 64 | 33 | 0.0 | 280.0 | 280.0 | 1 | 0 |
| `BLDG-LODHA-KIARA` | `BLDG-LODHA-KIARA` | `Areas:building.080` | 8 | 5 | 0.0 | 243.0 | 243.0 | 1 | 0 |
| `BLDG-LODHA-ADRINA` | `BLDG-LODHA-ADRINA` | `Areas:building.079` | 24 | 13 | 0.0 | 267.0 | 267.0 | 1 | 0 |
| `BLDG-LODHA-PARKSIDE` | `BLDG-LODHA-PARKSIDE` | `Areas:building.081` | 18 | 10 | 0.0 | 268.0 | 268.0 | 1 | 0 |
| `BLDG-LODHA-ALLURA` | `BLDG-LODHA-ALLURA` | `Areas:building.078` | 18 | 10 | 0.0 | 268.0 | 268.0 | 1 | 0 |

### Key Observations:
1. **Single Connected Component**: Each building has `island_count = 1`. There are zero loose floor slabs or internal horizontal dividers inside the mesh data.
2. **Single Upward Face Cluster**: Each building possesses exactly 1 upward-pointing face ($N_z > 0.9$), located at the top roof plane.
3. **Prismatic Extrusions**: Models such as `BLDG-LODHA-KIARA` consist of only 8 vertices (a 4-sided vertical box prism).
4. **Material Slot**: All faces on each building are assigned to a single shared material slot (`Mat_Buildings`).

---

## 3. GLB Web Model Hierarchy (`frontend/public/models/lodha_final.glb`)

Audit script `scratch/audit_glb_floors.py` parsed the exported glTF/GLB structure:

- **Node Structure**: Each building is exported as 1 single glTF node and 1 mesh primitive.
- **Node Names & Extras**: Node names match permanent IDs (`BLDG-LODHA-WORLD-ONE`, etc.) and preserve custom properties `building_id`, `building_name`, `asset_type`.
- **Children**: 0 child nodes exist under any building node.
- **Sub-meshes**: 0 floor-level sub-meshes or primitives exist in the web GLB.

---

## 4. Per-Building Analysis & Classification

### Classification Categories:
- **A. TRUE FLOOR GEOMETRY**: Separate meshes/objects already represent individual floors.
- **B. SEPARABLE GEOMETRY**: Disconnected components exist that can be separated without altering transforms.
- **C. SEGMENTABLE BUT NOT CURRENTLY SEPARATED**: Usable horizontal loop cuts exist requiring segmentation.
- **D. NO RELIABLE FLOOR GEOMETRY**: Continuous contextual mesh with no physical floor geometry.

### Building Classifications:

1. **`BLDG-LODHA-WORLD-ONE`**: **CATEGORY D**
   - 48 vertices, 25 polygons, 1 mesh island. Single continuous vertical extrusion (0.0m to 277.6m). No internal floor geometry.
2. **`BLDG-LODHA-TRUMP`**: **CATEGORY D**
   - 42 vertices, 22 polygons, 1 mesh island. Single vertical extrusion (0.0m to 222.5m). No internal floor geometry.
3. **`BLDG-LODHA-MARQUISE`**: **CATEGORY D**
   - 64 vertices, 33 polygons, 1 mesh island. Single vertical extrusion (0.0m to 280.0m). No internal floor geometry.
4. **`BLDG-LODHA-KIARA`**: **CATEGORY D**
   - 8 vertices, 5 polygons, 1 mesh island. Basic 4-sided prism (0.0m to 243.0m). No internal floor geometry.
5. **`BLDG-LODHA-ADRINA`**: **CATEGORY D**
   - 24 vertices, 13 polygons, 1 mesh island. Single vertical extrusion (0.0m to 267.0m). No internal floor geometry.
6. **`BLDG-LODHA-PARKSIDE`**: **CATEGORY D**
   - 18 vertices, 10 polygons, 1 mesh island. Single vertical extrusion (0.0m to 268.0m). No internal floor geometry.
7. **`BLDG-LODHA-ALLURA`**: **CATEGORY D**
   - 18 vertices, 10 polygons, 1 mesh island. Single vertical extrusion (0.0m to 268.0m). No internal floor controversy.

---

## 5. Coordinate & Geometry Integrity Verification
- **Location**: `[0.0, 0.0, 0.0]` for all 7 buildings.
- **Rotation**: `[0.0, 0.0, 0.0]` for all 7 buildings.
- **Scale**: `[1.0, 1.0, 1.0]` for all 7 buildings.
- **Audit Verification**: Read-only inspection executed. `blender/lodha final.blend` and `frontend/public/models/lodha_final.glb` remain 100% untouched.

---

## 6. Database Cross-Check
- **PostgreSQL Database**: `geocad_db` (PostgreSQL 16) verified.
- **Building Records**: All 7 permanent Building records intact.
- **BuildingVersion Baseline**: Version 1 baseline records intact.
- **Floor Count Baseline**: `totalFloors = null` preserved across all 7 buildings. Zero fake floors seeded.
- **Floor API Layer**: Endpoints (`GET /api/buildings/:buildingId/floors`, `GET /api/floors/:floorId`, `POST /api/buildings/:buildingId/floors`) verified and operational.

---

## 7. Frontend Integration Observations
- **Current Viewer Architecture**: `App.tsx` passes `selectedBuildingId` to `CityCanvas.tsx` (3D selection highlight) and `BuildingInfoPanel.tsx` (fetches building specs from PostgreSQL API).
- **Extension Path for Floor Selection**:
  1. When a building is selected, trigger `GET /api/buildings/{selectedBuildingId}/floors`.
  2. If configured floor records exist in database, render a Floor Level Selector HUD.
  3. When a user selects a floor (e.g. `FLR-LODHA-WORLD-ONE-L03`), fetch `GET /api/floors/{selectedFloorId}`.
  4. Perform procedural 3D visual feedback in Three.js/R3F (e.g., dynamic GPU clipping planes or Z-bounding box slice highlighting shader) without altering the master GLB model.

---

## 8. Recommended Technical Approach for Real Floor Isolation

1. **Database-Driven Elevation Mapping**:
   - Store floor elevation bounds ($Z_{\text{min}}, Z_{\text{max}}$) in database floor metadata as actual BIM/cadastral data is authorized.
2. **Procedural WebGL Shader / Clipping Plane Isolation**:
   - In Three.js, apply dynamic GPU clipping planes (`renderer.localClippingEnabled = true`) or vertical slice highlight shaders over the building mesh using its bounding box range $[0, Z_{\text{max}}]$.
   - This isolates visual focus to specific vertical elevation slices dynamically **without modifying the GLB file**.
3. **Future BIM LOD Upgrade (If Authorized)**:
   - If full interior floor slab geometry is eventually authorized, export detailed floor sub-objects from CAD/BIM tools under strict permanent naming standards (`FLR-LODHA-WORLD-ONE-L01`, `FLR-LODHA-WORLD-ONE-L02`, ...).

---

## 9. Explicit Constraints & Non-Actions

### DO NOT:
1. Do NOT modify or re-export `blender/lodha final.blend`.
2. Do NOT modify or replace `frontend/public/models/lodha_final.glb`.
3. Do NOT invent arbitrary floor counts or force fake floor geometry cuts.
4. Do NOT alter geographic coordinates, scale, translation, or rotation of the 7 Lodha towers.
5. Do NOT store sensitive personal, beneficiary, or private allocation records inside public GLB models.

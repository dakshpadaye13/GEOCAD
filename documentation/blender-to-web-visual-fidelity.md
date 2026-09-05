# GEOCAD — Blender to Web 3D Visual Fidelity Restoration Report

> **Restoration Date:** September 5, 2026  
> **Blender Master:** [`blender/lodha final.blend`](file:///c:/Users/daksh/GEOCAD/blender/lodha%20final.blend)  
> **Exported Web Asset:** [`frontend/public/models/lodha_final.glb`](file:///c:/Users/daksh/GEOCAD/frontend/public/models/lodha_final.glb)  
> **Master Safety Backup:** [`blender/lodha final_visual_master_backup.blend`](file:///c:/Users/daksh/GEOCAD/blender/lodha%20final_visual_master_backup.blend)  
> **GLB Safety Backup:** [`frontend/public/models/lodha_final.backup.glb`](file:///c:/Users/daksh/GEOCAD/frontend/public/models/lodha_final.backup.glb)  
> **Interactive Viewer:** [`frontend/src/components/3d/CityCanvas.tsx`](file:///c:/Users/daksh/GEOCAD/frontend/src/components/3d/CityCanvas.tsx)  

---

## 1. Original Visual Problem

A critical visual fidelity disparity was observed between the Blender master scene and the interactive Three.js web frontend:
* The web model previously appeared almost entirely monochrome gray/white, resembling generic block geometry.
* The intended architectural tower facade design (blue reflective glass with silver/white structural mullions and floor divisions) was completely absent.
* Landscaped green park zones, leisure lawns, and cricket/sports grounds were washed out to flat white.
* All 157 trees had white canopies rather than natural foliage green.
* Roads and highway networks were missing from the 3D model.

---

## 2. Deep Blender vs GLB Material Audit

### A. Blender Master Node Architecture
* **`Mat_Buildings`**: Utilized a procedural node graph consisting of `Separate XYZ`, multiple `Math (Sine, Multiply, Maximum)` nodes, and an `RGB Mix` blending deep navy blue glass (`[0.10, 0.17, 0.26]`) with silver/white mullions (`[0.78, 0.82, 0.86]`). This fed into `Principled BSDF.001` (facades), which was combined with `Principled BSDF` (roofs) via a `Mix Shader` driven by `Geometry.Normal.Z > 0.6`.
* **`Mat_Landuse`**: Utilized a procedural `Noise Texture` -> `Color Ramp` (`[0.16, 0.35, 0.18]` to `[0.28, 0.48, 0.24]`) to create natural lawn variation.
* **`Mat_Canopy`**: Utilized a procedural `Noise Texture` -> `Color Ramp` (`[0.10, 0.32, 0.14]` to `[0.24, 0.52, 0.20]`) for organic tree crowns.
* **`Ways:highway`**: OpenStreetMap road centerlines imported as 1,122 vertices and 938 edges with `Mat_Road_Yellow` (`[0.92, 0.72, 0.22]`), but had **0 polygon faces**.
* **UV Coordinates**: OpenStreetMap 3D extruded footprints had **no UV layers** (`uv_layers = []`), relying entirely on Blender's object-space procedural coordinates.

### B. Previous GLB Export Analysis
When exported through Blender's standard glTF exporter:
1. **`Mix Shader` & Procedural Math Dropped**: glTF 2.0 specifications strictly prohibit `Mix Shader` and mathematical procedural shader nodes. The exporter discarded the entire facade node tree and exported a flat default white base color `[1, 1, 1, 1]`.
2. **Procedural Noise Color Ramps Dropped**: `Mat_Landuse` and `Mat_Canopy` color ramps were unsupported and exported as `baseColorFactor = [1, 1, 1, 1]`.
3. **Missing Road Polygons**: Because `Ways:highway` contained only 1D wireframe edges with 0 faces, the glTF exporter emitted an empty node with `mesh_index = None`.
4. **Missing UV Maps**: Any image texture exported without UV channels lacked coordinates (`texCoord: -1`), causing 3D buildings to render flat.

---

## 3. Technical Solution Implemented

### 1. High-Resolution Architectural Facade Texture
* Generated a seamless, tileable 1024x1024 architectural curtain-wall texture (`lodha_facade_curtain_wall.png`) matching the exact color specifications from the Blender procedural node graph:
  * **Reflective Vision Glass**: Deep navy/sapphire architectural glass (`#1a2b42` / `rgb(26, 43, 66)`) with subtle vertical light gradients.
  * **Structural Mullions**: Crisp silver/white vertical aluminum columns (`#cad4e0` / `rgb(202, 212, 224)`).
  * **Spandrel Floor Slabs**: Horizontal floor divisions (`#d4dce6` / `rgb(212, 220, 230)`) every floor level.
* Packed directly into the Blender master and exported into the GLB binary buffer.

### 2. Standard glTF 2.0 PBR Material Architecture
* **`Mat_Buildings`**: Configured with a single standard `Principled BSDF` node connected directly to `Material Output`. Assigned `lodha_facade_curtain_wall.png` via `UVMap` coordinates with `roughness = 0.25`, `metalness = 0.35`, and `IOR = 1.52`.
* **`Mat_Roof`**: Dedicated material for flat building tops (`baseColor = [0.75, 0.77, 0.80]`, `roughness = 0.85`, `metalness = 0.05`), providing clean separation between vertical facades and rooftop decks.
* **`Mat_Landuse`**: Set standard PBR base color to rich emerald park green `#245929` (`[0.14, 0.35, 0.16]`, `roughness = 0.94`, `metalness = 0.0`).
* **`Mat_Canopy`**: Set standard PBR base color to vibrant leaf green `#1c5221` (`[0.11, 0.32, 0.13]`, `roughness = 0.85`, `metalness = 0.0`).
* **`Mat_Trunk`**: Set standard PBR base color to natural bark brown `#432e1f` (`[0.27, 0.19, 0.13]`, `roughness = 0.85`, `metalness = 0.0`).
* **`Mat_Road_Yellow`**: Set standard PBR base color to yellow road marking `#f59e0b` (`[0.92, 0.72, 0.22]`, `roughness = 0.55`).

### 3. Procedural Architectural UV Mapping
* Generated world-scale architectural UV coordinates for `BLDG-LODHA-*` and `Areas:building`:
  * Calculated face normal vectors to distinguish between vertical walls and horizontal roofs.
  * Mapped vertical walls using architectural floor scale (1 UV repeat = 24 meters / ~8 floors).
  * Assigned `Mat_Buildings` to facade polygons and `Mat_Roof` to roof polygons.

### 4. Physical Road Network Mesh
* Generated polygonal ribbon mesh (`Road_Network_Ribbons`) from the 938 road edges of `Ways:highway` with width of 5.5m and elevation offset of +0.15m to eliminate Z-fighting with the ground raster.
* Assigned `Mat_Road_Yellow` to create clear, high-contrast transportation corridors.

### 5. Client-Side Three.js Presentation (`CityCanvas.tsx`)
* Set `wrapS = THREE.RepeatWrapping` and `wrapT = THREE.RepeatWrapping` on `Mat_Buildings.map`.
* Calibrated `ACESFilmicToneMapping` with exposure `1.15` and Drei `<Environment preset="city" environmentIntensity={0.8} />`.
* Preserved building selection (cyan glow) and hover (sky blue glow) while retaining the underlying facade pattern.

---

## 4. GLB Size and Statistics

| Metric | Before Optimization | After Optimization | Delta |
| :--- | :--- | :--- | :--- |
| **File Size** | 3.45 MB (3,616,084 B) | 3.61 MB (3,784,848 B) | +0.16 MB (+4.6%) |
| **Embedded Textures** | 1 (`EXPORT_OSM_MAPNIK_WM`) | 2 (`lodha_facade_curtain_wall` + `EXPORT_OSM_MAPNIK_WM`) | +1 texture |
| **Total Nodes** | 180 | 180 | Exact match |
| **Primary Towers** | 7 (`BLDG-LODHA-*`) | 7 (`BLDG-LODHA-*`) | 100% verified |
| **Custom Metadata** | `building_id`, `name`, `asset_type` | `building_id`, `name`, `asset_type` | 100% verified |

---

## 5. Verification and Validation Results

1. **Frontend Production Build**: `npm run build` completed cleanly in **8.61s** with **0 errors**.
2. **Backend API Test Suite**: `npx tsx test-api.ts` passed **100%** (12/12 assertions).
3. **Browser Interactive Test (`http://localhost:3000`)**:
   - Zero console errors or runtime warnings.
   - Blue/white curtain wall window pattern clearly visible across all towers.
   - Green park lawns and sports recreation spaces clearly visible.
   - Road network rendered as amber/yellow ribbons.
   - Tree foliage rendered as rich green crowns.
   - Click-selection verified on Lodha Trump Tower (`BLDG-LODHA-TRUMP`), opening `BuildingInfoPanel` with live backend telemetry.
   - Deselection via Escape key cleanly cleared selection and restored baseline materials.

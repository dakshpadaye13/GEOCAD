# GEOCAD - GLB Object Inventory & Structural Audit

> **Audit Date:** September 5, 2026  
> **Target GLB File:** `frontend/public/models/lodha_final.glb` (4.82 MB)  
> **Blender Source:** `blender/lodha final.blend`

---

## 1. Summary Statistics

* **Total GLB Scene Objects:** 167 objects
* **Total Mesh Geometries:** 161 mesh objects (8 site/building feature meshes + 153 tree instances)
* **Total Empty/Group Nodes:** 6 empty anchor nodes
* **Total Materials:** 9 materials (`Mat_Buildings`, `Mat_Landuse`, `Mat_Railways`, `Mat_Expanded_Base_Map`, `Mat_Focus_Frame`, `Mat_Trunk`, `Mat_Canopy`, `Material`, `rastMat`)
* **Object Name Preservation:** **YES.** Three.js / React Three Fiber reads exact node identifiers (e.g. `Areas:building`, `Focus_Boundary_Frame`, `Expanded_Base_Map`).

---

## 2. GLB Object Inventory

| Scene / Node Name | Object Type | Mesh / Vertices | Material | Function / Purpose | Individually Selectable? | Candidate Permanent ID | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`Areas:building`** | MESH | 4,827 verts | `Mat_Buildings` | Merged building footprints & 3D tower geometries for all Lodha towers & site structures | **NO** *(Merged)* | `COMP-BUILDINGS-ALL` | Currently a single combined mesh containing all 7 main Lodha towers. Needs separation in Blender. |
| **`Areas:landuse`** | MESH | 227 verts | `Mat_Landuse` | Landuse zoning polygons & park grounds | **NO** | `SITE-LANDUSE-PARK` | OpenStreetMap landuse area. |
| **`Areas:leisure`** | MESH | 168 verts | `Mat_Landuse` | Recreation, lawns, & open space areas | **NO** | `SITE-LEISURE-LAWNS` | OpenStreetMap leisure area. |
| **`Areas:railway`** | MESH | 364 verts | `Mat_Railways` | Surrounding railway lines & transit corridors | **NO** | `INFRA-RAILWAY` | Infrastructure element. |
| **`Focus_Boundary_Frame`** | MESH | 42,420 verts | `Mat_Focus_Frame` | Architectural boundary frame around Lodha Park | **YES** | `SITE-FOCUS-FRAME` | High-detail border outline geometry. |
| **`Expanded_Base_Map`** | MESH | 4 verts | `Mat_Expanded_Base_Map` | Extended satellite ground plane | **YES** | `SITE-BASEMAP-EXPANDED` | Ground terrain texturing plane. |
| **`EXPORT_OSM_MAPNIK_WM`** | MESH | 4 verts | `rastMat` | OpenStreetMap raster overlay ground quad | **YES** | `SITE-BASEMAP-OSM` | Aerial map raster alignment quad. |
| **`Cube`** | MESH | 24 verts | `Material` | Scene reference origin box | **NO** | `REF-ORIGIN-CUBE` | Utility box at origin. |
| **`Tree_Base.001` - `Tree_Base.156`** | MESH | 432 verts/ea | `Mat_Trunk`, `Mat_Canopy` | 156 vegetation instances distributed across Lodha Park grounds | **YES** *(Per tree)* | `VEG-TREE-001` to `VEG-TREE-156` | Individual tree models for landscape visualization. |
| **`Nodes:highway`** | EMPTY | 0 verts | None | Highway vector node parent anchor | **NO** | `ANCHOR-HIGHWAY` | OpenStreetMap spatial anchor. |
| **`Ways:highway`** | EMPTY | 0 verts | None | Roadway vector path parent anchor | **NO** | `ANCHOR-ROADWAY` | OpenStreetMap spatial anchor. |

---

## 3. Proposed Permanent Building ID Mapping

To prepare for future building selection, database linking, and metadata querying, the 7 main towers of Lodha Park are assigned the following stable, human-readable IDs:

| # | Tower Name | Proposed Permanent Building ID | Current GLB Status |
|---|------------|--------------------------------|--------------------|
| 1 | **Lodha World One** | `BLDG-LODHA-WORLD-ONE` | Combined inside `Areas:building` |
| 2 | **Lodha Trump Tower** | `BLDG-LODHA-TRUMP` | Combined inside `Areas:building` |
| 3 | **Lodha Marquise** | `BLDG-LODHA-MARQUISE` | Combined inside `Areas:building` |
| 4 | **Lodha Kiara** | `BLDG-LODHA-KIARA` | Combined inside `Areas:building` |
| 5 | **Lodha Adrina** | `BLDG-LODHA-ADRINA` | Combined inside `Areas:building` |
| 6 | **Lodha Parkside** | `BLDG-LODHA-PARKSIDE` | Combined inside `Areas:building` |
| 7 | **Lodha Allura** | `BLDG-LODHA-ALLURA` | Combined inside `Areas:building` |

---

## 4. Technical Findings & Required Future Blender Adjustments

### **Is Individual Building Selection Currently Possible?**
> ❌ **NO.** In the existing `lodha_final.glb`, all building geometries are merged into a single mesh named **`Areas:building`**. Clicking on any tower highlights/selects the entire combined city mesh rather than an individual building.

### **Required Future Blender Step (When Authorized)**
When authorized in a future step:
1. Open `blender/lodha final.blend`.
2. Separate the `Areas:building` mesh into individual building objects.
3. Assign each of the 7 main towers its explicit object name and custom property matching the Permanent Building IDs above (`BLDG-LODHA-WORLD-ONE`, `BLDG-LODHA-TRUMP`, etc.).
4. Re-export `lodha_final.glb` to `frontend/public/models/`.

---

## 5. Build Result

* **`npm run build` (`tsc && vite build`):** **PASSED** cleanly in 4.52s with 0 errors.

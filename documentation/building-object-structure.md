# GEOCAD - Building Object Structure & Separation Documentation

> **Separation Date:** September 5, 2026  
> **Master File:** `blender/lodha final.blend` (Backup created: `blender/lodha final_backup.blend`)  
> **Exported GLB:** `frontend/public/models/lodha_final.glb`

---

## 1. Safety Backup Created

* **Backup File:** [`blender/lodha final_backup.blend`](file:///C:/Users/daksh/GEOCAD/blender/lodha%20final_backup.blend) (1.53 MB)
* **Status:** Created prior to any Blender edit operations.
* **Original Backup:** `blender/lodha final.blend1` preserved intact.

---

## 2. Original `Areas:building` Mesh Structure

* **Original State:** `Areas:building` was a single combined OpenStreetMap mesh containing all 3D building geometries and footprints across the site.
* **Separation Method:** Separated mesh by loose parts (`type='LOOSE'`), evaluated bounding box heights (`max_z > 200m`) and spatial positions to isolate the 7 primary Lodha Park high-rise towers.
* **Surrounding Buildings:** All non-tower site structures were rejoined back into `Areas:building` to maintain contextual surrounding city geometry.

---

## 3. Final Object Names, Permanent IDs, and Custom Properties

| Object Name | Target Tower | Permanent Building ID (`building_id`) | Human-Readable Name (`building_name`) | Asset Type (`asset_type`) | Vertices |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`BLDG-LODHA-WORLD-ONE`** | Lodha World One | `BLDG-LODHA-WORLD-ONE` | Lodha World One | `building` | 120 |
| **`BLDG-LODHA-TRUMP`** | Lodha Trump Tower | `BLDG-LODHA-TRUMP` | Lodha Trump Tower | `building` | 105 |
| **`BLDG-LODHA-MARQUISE`** | Lodha Marquise | `BLDG-LODHA-MARQUISE` | Lodha Marquise | `building` | 160 |
| **`BLDG-LODHA-KIARA`** | Lodha Kiara | `BLDG-LODHA-KIARA` | Lodha Kiara | `building` | 20 |
| **`BLDG-LODHA-ADRINA`** | Lodha Adrina | `BLDG-LODHA-ADRINA` | Lodha Adrina | `building` | 60 |
| **`BLDG-LODHA-PARKSIDE`** | Lodha Parkside | `BLDG-LODHA-PARKSIDE` | Lodha Parkside | `building` | 45 |
| **`BLDG-LODHA-ALLURA`** | Lodha Allura | `BLDG-LODHA-ALLURA` | Lodha Allura | `building` | 45 |

---

## 4. Collection Structure

* **Parent Collection:** `Lodha_Park`
* **New Subcollection:** `LODHA_BUILDINGS` (Contains all 7 separated building objects).
* **Unmodified Site Assets:** `Ways:highway`, `Ways:railway`, `Ways:natural`, `Expanded_Base_Map`, `Focus_Boundary_Frame`, `Tree_Base.001` through `Tree_Base.156`, `Areas:landuse`, `Areas:leisure`, `Areas:railway`.

---

## 5. Geometric & Coordinate Preservation Verification

* **Geographic Coordinates:** **UNCHANGED.** 0 translation offset applied.
* **Scale:** **UNCHANGED.** 1.0 uniform scale preserved.
* **Rotation:** **UNCHANGED.** 0° rotation offset applied.
* **Elevation / Z-Axis:** **UNCHANGED.** Original heights (222m–280m) preserved.
* **Geometry Integrity:** Mesh vertices were split at connected boundaries without redrawing or altering original vertex data.

---

## 6. GLB Export Result

* **File Export Path:** `frontend/public/models/lodha_final.glb`
* **Export Setting:** `export_extras=True` (preserves `building_id`, `building_name`, `asset_type` custom properties).
* **GLB Verification Result:** `Found 7 out of 7 separated building towers in GLB!`
* **Three.js Access:** `scene.getObjectByName('BLDG-LODHA-WORLD-ONE')` directly returns the individual building mesh with `object.userData` populated with custom properties.

---

## 7. Build Result

* **Command:** `npm run build` (`tsc && vite build`)
* **Status:** **PASSED** cleanly in 4.59s with **0 errors**.

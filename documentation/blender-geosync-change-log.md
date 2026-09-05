# GEOCAD — Blender Geographic Synchronization Change Log

## 1. Audit Date & Status

- **Audit Date**: September 5, 2026
- **Blender Version**: Blender 5.2.1 LTS
- **Blender Master File**: `blender/lodha final.blend`
- **Result Summary**: **Blender master required no destructive modification.**

---

## 2. Pre-Geosync Backup Verification

Before performing the Blender MCP audit, a timestamped backup copy was created:
- Backup path: `blender/lodha final_pre_geosync_backup.blend`
- GLB backup path: `frontend/public/models/lodha_final_pre_geosync.glb`

---

## 3. Inspected Blender Custom Properties

Extracted directly via Blender MCP:

```text
Scene Name: Scene
SRID: EPSG:3857
crs x: 8107219.6571826935
crs y: 2155412.8900585175
longitude: 72.8283932976144
latitude: 19.00405125107094
scale: 1.0
zoom: 18
Unit System: METRIC (Meters), Unit Scale: 1.0
```

---

## 4. Object Geometry & Permanent IDs Verification

| Object Name | Object Type | Local Location | World Bounding Box Extent | Status |
| :--- | :--- | :--- | :--- | :--- |
| `BLDG-LODHA-WORLD-ONE` | MESH | `[0, 0, 0]` | $X \in [-223.65, -164.07]$, $Y \in [-119.59, -60.10]$, $Z \in [0, 277.60]$ | **UNTOUCHED** |
| `BLDG-LODHA-TRUMP` | MESH | `[0, 0, 0]` | $X \in [-119.21, -84.44]$, $Y \in [-224.19, -163.12]$, $Z \in [0, 222.50]$ | **UNTOUCHED** |
| `BLDG-LODHA-MARQUISE` | MESH | `[0, 0, 0]` | $X \in [-252.81, -181.29]$, $Y \in [-234.41, -165.30]$, $Z \in [0, 280.00]$ | **UNTOUCHED** |
| `BLDG-LODHA-KIARA` | MESH | `[0, 0, 0]` | $X \in [30.97, 97.47]$, $Y \in [-37.38, 14.99]$, $Z \in [0, 243.00]$ | **UNTOUCHED** |
| `BLDG-LODHA-ADRINA` | MESH | `[0, 0, 0]` | $X \in [122.06, 168.50]$, $Y \in [65.60, 125.55]$, $Z \in [0, 267.00]$ | **UNTOUCHED** |
| `BLDG-LODHA-PARKSIDE` | MESH | `[0, 0, 0]` | $X \in [-40.25, 11.08]$, $Y \in [36.43, 97.23]$, $Z \in [0, 268.00]$ | **UNTOUCHED** |
| `BLDG-LODHA-ALLURA` | MESH | `[0, 0, 0]` | $X \in [-4.74, 49.27]$, $Y \in [98.39, 155.84]$, $Z \in [0, 268.00]$ | **UNTOUCHED** |

---

## 5. Conclusion

Because the Blender master file `lodha final.blend` was already created with authoritative BlenderGIS Web Mercator metadata (`EPSG:3857`, origin `8107219.66, 2155412.89`), all 3D geometries, scales, orientations, heights, and building IDs in both `blender/lodha final.blend` and `frontend/public/models/lodha_final.glb` remain 100% authoritative and untouched.

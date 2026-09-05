# GEOCAD — Hybrid 2D + 3D Map Architecture Documentation

## 1. Executive Overview

GEOCAD implements a **hybrid 2D + 3D geographic digital-twin architecture**. The entire Mumbai metropolitan area is presented as an interactive 2D geographic map (supporting zoom, pan, tilt, roadmap, and satellite layer switching), while the 3D GEOCAD Lodha Park city model (`lodha_final.glb`) is anchored at its exact real-world geographic coordinates in **Worli, Mumbai** (`19.00405125° N, 72.82839330° E`).

```
                    ENTIRE MUMBAI
                          │
                          ▼
                     2D MAP LAYER (MapLibre GL JS)
                          │
          ┌───────────────┴───────────────┐
          │                               │
     OUTSIDE 3D AREA               LODHA PARK SITE BOUNDARY
    (Zoom < 13.5: 2D Map)         (Zoom >= 13.5: 3D GEOCAD City)
          │                               │
          ▼                               ▼
       2D MAP                    3D THREE.JS GLB MODEL
                                          │
                                     buildingId
                                          │
                                          ▼
                                   EXPRESS API → POSTGRESQL DB
```

---

## 2. Spatial Extent & Site Boundary

- **Center Coordinate**: `19.00405125107094° N, 72.8283932976144° E`
- **Site Bounding Box (Web Mercator EPSG:3857)**:
  - $X \in [8106605.47\text{ m}, 8107828.47\text{ m}]$
  - $Y \in [2155065.58\text{ m}, 2155677.07\text{ m}]$
- **Geographic Bounding Box**:
  - Min Lon: `72.822557° E`
  - Max Lon: `72.834229° E`
  - Min Lat: `19.000911° N`
  - Max Lat: `19.006711° N`

---

## 3. Zoom-Based Transition & Layer Synchronization

1. **Wide View (Zoom < 13.5)**:
   - Interactive 2D map covering all of Mumbai (Worli, Lower Parel, Dadar, Marine Drive, Bandra-Worli Sea Link).
   - Lightweight rendering with zero 3D WebGL overhead outside the site view.

2. **Detailed View (Zoom $\ge$ 13.5)**:
   - 3D GEOCAD city model (`lodha_final.glb`) seamlessly appears anchored at its exact geographic coordinate.
   - Closed-form matrix projection connects MapLibre's camera matrix with Three.js objects.
   - Zero drifting during pan, zoom, tilt, or rotation.

---

## 4. Map Style Options

- **MAP (Roadmap)**: Powered by CARTO Voyager vector roadmap tiles (clean daytime presentation showing roads, parks, railways, water, and landmark labels).
- **SATELLITE (Hybrid)**: Powered by Esri World Imagery high-resolution satellite tiles.
- Toggling between MAP and SATELLITE preserves the 3D city overlay without re-instantiating the WebGL context.

---

## 5. Building Interaction & Database Flow

```
Click 3D Tower → buildingId → GET /api/buildings/:id → PostgreSQL 16 DB → BuildingDetailCard
```

### Supported Permanent Building IDs
- `BLDG-LODHA-WORLD-ONE` (World One Tower, 10 cadastral floor records)
- `BLDG-LODHA-TRUMP` (Trump Tower, 10 cadastral floor records)
- `BLDG-LODHA-MARQUISE` (Marquise Tower, 9 cadastral floor records)
- `BLDG-LODHA-KIARA` (Kiara Tower, 8 cadastral floor records)
- `BLDG-LODHA-ADRINA` (Adrina Tower, 7 cadastral floor records)
- `BLDG-LODHA-PARKSIDE` (Parkside Tower, 6 cadastral floor records)
- `BLDG-LODHA-ALLURA` (Allura Tower, 6 cadastral floor records)

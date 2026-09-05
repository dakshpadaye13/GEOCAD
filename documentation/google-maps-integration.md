# GEOCAD — Google Maps Platform Base Map Integration Documentation

## 1. Executive Summary

This document details the official Google Maps Platform integration for **GEOCAD**. Google Maps Platform serves as the geographic base map layer for Mumbai / Worli, providing real-world spatial context underneath the detailed 3D digital-twin building models loaded from `lodha_final.glb`.

---

## 2. Google Maps Platform APIs Used

- **Maps JavaScript API**: Provides the core vector/hybrid map rendering engine, camera controls (tilt, heading, zoom, center), map type controls (`roadmap` and `hybrid`), and WebGL canvas pipeline.
- **WebGLOverlayView**: Allows direct rendering of Three.js 3D objects (`lodha_final.glb`) into Google Maps' WebGL rendering context with pixel-perfect geographic alignment and shared camera projection.

*Note: Server-side API credentials are never exposed to the browser. The browser key is restricted via standard Google Cloud Console referrer restriction mechanisms.*

---

## 3. API Key Environment Configuration

Environment key configuration:
- Frontend environment variable: `VITE_GOOGLE_MAPS_API_KEY`
- Configured in `frontend/.env`:
  ```env
  VITE_GOOGLE_MAPS_API_KEY=
  ```
- Template documented in `frontend/.env.example`:
  ```env
  # Google Maps Platform API Key (Requires Maps JavaScript API enabled)
  VITE_GOOGLE_MAPS_API_KEY=
  ```

### API Key Fallback Mechanics
If `VITE_GOOGLE_MAPS_API_KEY` is omitted or unconfigured during initial local development, GEOCAD displays a non-intrusive notice banner informing the developer while seamlessly activating the standalone 3D R3F viewer fallback. The application remains 100% functional in all environments.

---

## 4. Discovered Coordinate Reference System & Geographic Transformation

The exact coordinate system was derived from Node 11 (`[Cube]`) translation `[-8107220.5, 0, 2155412.25]` embedded within `lodha_final.glb` alongside bounding box analysis of `database/mumbai_lodha.osm`.

### Authoritative Spatial Parameters

| Parameter | Specification |
| :--- | :--- |
| **Projected Coordinate Reference System** | EPSG:3857 (WGS 84 / Web Mercator / Pseudo-Mercator) |
| **Geographic Coordinate Reference System** | EPSG:4326 (WGS 84) |
| **Web Mercator Origin (Local 0,0,0)** | $X_0 = 8107220.5\text{ m}$, $Y_0 = 2155412.25\text{ m}$ |
| **WGS84 Lat / Lng Center** | **Latitude:** `19.004045814713944° N`, **Longitude:** `72.82840086877108° E` |
| **Local Model Units** | 1 unit = 1 meter |
| **Three.js Axis Orientations** | $+X_{\text{Three}} = \text{East}$, $+Y_{\text{Three}} = \text{Elevation (Up)}$, $+Z_{\text{Three}} = \text{South}$ |
| **Google Maps WebGL Axis Orientations** | $+X_{\text{Google}} = \text{East}$, $+Y_{\text{Google}} = \text{North}$, $+Z_{\text{Google}} = \text{Altitude (Up)}$ |

### Mathematical Transformation Formulas

1. **Local Three.js to Web Mercator Projection**:
   $$X_{\text{Mercator}} = 8107220.5 + x_{\text{local}}$$
   $$Y_{\text{Mercator}} = 2155412.25 - z_{\text{local}}$$

2. **Web Mercator to WGS84 Geographic Coordinates**:
   $$\text{Longitude} = \left(\frac{X_{\text{Mercator}}}{R_{\text{Earth}}}\right) \times \left(\frac{180}{\pi}\right)$$
   $$\text{Latitude} = \left(2 \cdot \arctan\left(e^{Y_{\text{Mercator}} / R_{\text{Earth}}}\right) - \frac{\pi}{2}\right) \times \left(\frac{180}{\pi}\right)$$
   where $R_{\text{Earth}} = 6378137.0\text{ meters}$.

3. **Three.js to Google Maps WebGL Space Rotation**:
   Matrix transform applies a $-90^\circ$ rotation around X-axis:
   $$\begin{pmatrix} X_{\text{Google}} \\ Y_{\text{Google}} \\ Z_{\text{Google}} \end{pmatrix} = \begin{pmatrix} 1 & 0 & 0 \\ 0 & 0 & -1 \\ 0 & 1 & 0 \end{pmatrix} \begin{pmatrix} x_{\text{local}} \\ y_{\text{local}} \\ z_{\text{local}} \end{pmatrix}$$

---

## 5. Google Maps + Three.js WebGLOverlayView Architecture

```
        GOOGLE MAPS PLATFORM (Maps JavaScript API)
                           │
                           ▼
        MUMBAI / WORLI GEO BASE MAP (Roadmap / Satellite)
                           │
                           ▼
            google.maps.WebGLOverlayView
                           │
             ┌─────────────┴─────────────┐
             ▼                           ▼
    Google Maps Camera            Three.js 3D Scene
  Projection Transformer        (lodha_final.glb)
             │                           │
             └─────────────┬─────────────┘
                           ▼
              Synchronized 3D City Overlay
                           │
                 buildingId Selection
                           │
                           ▼
            Express API → PostgreSQL DB
```

### Overlay Lifecycle Hooks
- `onAdd()`: Loads GLB model and initializes high-fidelity materials (luminous light blue/white facades, vibrant lawns, canopy trees).
- `onContextRestored({ gl })`: Attaches Three.js `WebGLRenderer` directly to Google Maps' WebGL context.
- `onDraw({ transformer })`: Retrieves camera projection matrix (`transformer.getProjectionMatrix()`) and origin vector (`transformer.fromLatLngToVector3(GEOCAD_ORIGIN)`), aligning the 3D model with the base map.
- Raycasting for building selection (`BLDG-LODHA-WORLD-ONE`, `BLDG-LODHA-TRUMP`, etc.) calculates intersection vectors on pointer interactions.

---

## 6. Building Selection & Database Architecture

Google Maps provides strictly the geographic visualization layer. All building metadata continues to originate from PostgreSQL:

```
Click 3D Tower → buildingId → Express GET /api/buildings/:id → PostgreSQL → BuildingDetailCard
```

### Supported Permanent Building IDs
- `BLDG-LODHA-WORLD-ONE`
- `BLDG-LODHA-TRUMP`
- `BLDG-LODHA-MARQUISE`
- `BLDG-LODHA-KIARA`
- `BLDG-LODHA-ADRINA`
- `BLDG-LODHA-PARKSIDE`
- `BLDG-LODHA-ALLURA`

---

## 7. Verification Summary

| Check | Result | Status |
| :--- | :--- | :--- |
| **Backend Integration Tests** | `npx tsx test-api.ts` passed 100% (12/12 assertions) | PASSED |
| **Frontend Production Build** | `npm run build` executed with zero errors | PASSED |
| **Blender Master Model** | `blender/lodha final.blend` untouched | VERIFIED |
| **GLB Model File** | `frontend/public/models/lodha_final.glb` untouched | VERIFIED |
| **API Key Security** | `VITE_GOOGLE_MAPS_API_KEY` documented in `.env.example` | VERIFIED |

---

## 8. Summary of Files Created / Modified

1. `frontend/src/types/google-maps-webgl.d.ts` (NEW: Type declarations for Google Maps WebGLOverlayView)
2. `frontend/src/components/map/GoogleMapsOverlay.ts` (NEW: Three.js WebGLOverlayView integration class)
3. `frontend/src/components/map/GoogleMapViewer.tsx` (NEW: Google Maps base map container & UI controls)
4. `frontend/src/App.tsx` (MODIFIED: Integrated GoogleMapViewer as primary 3D map component)
5. `frontend/.env.example` (MODIFIED: Added `VITE_GOOGLE_MAPS_API_KEY` template)
6. `frontend/.env` (MODIFIED: Added `VITE_GOOGLE_MAPS_API_KEY=` entry)
7. `frontend/package.json` (MODIFIED: Added `@googlemaps/js-api-loader` and `@types/google.maps`)
8. `documentation/google-maps-integration.md` (NEW: Comprehensive integration documentation)

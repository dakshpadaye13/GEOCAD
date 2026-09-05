# GEOCAD Local Map & 3D Synchronization Architecture

## Overview

The GEOCAD application has successfully transitioned from relying on external, commercial map providers (like Google Maps and OpenStreetMap raster tiles) to a **fully offline-capable local 2D regional map**. This hybrid digital-twin interface smoothly synchronizes an optimized local vector base map of the Mumbai metropolitan region with the detailed, geographically accurate 3D Lodha Park model imported from Blender.

---

## 1. Geographic Region

The local 2D map encompasses the **Mumbai Metropolitan Region**, stretching from South Mumbai through Navi Mumbai and up to Palghar.
- **Bounding Box:** `[18.85, 72.70, 19.85, 73.15]` (Min Lat/Lon to Max Lat/Lon).

---

## 2. Local Map Data

### Source
Data is directly sourced from OpenStreetMap via the **Overpass API**, ensuring high-quality, up-to-date geographical features.

### Format
The raw OSM data is converted into **GeoJSON** format using the `osmtogeojson` library. The data is partitioned by feature type for optimized rendering and styling.

### Storage
The local map files reside in `frontend/public/map-data/`:
- `roads.geojson`: Major highways, primary, and secondary roads.
- `water.geojson`: Coastlines, rivers, and water bodies.
- `railways.geojson`: Local train lines and subway routes.
- `parks.geojson`: Major green spaces and recreation areas.
- `geocad-3d-zones.geojson`: Polygons defining active 3D model zones.

---

## 3. Coordinate Reference System (CRS)

The GEOCAD hybrid map uses **Web Mercator (EPSG:3857)** as its underlying projection for the 2D map via MapLibre GL JS, which operates seamlessly with WGS84 (EPSG:4326) longitude/latitude coordinates for feature placement.

### Blender Coordinate Reference
The Lodha Park Blender model (`lodha_final.blend`) has a definitive, immutable geographic origin defined by custom properties:
- **Anchor Longitude:** `72.8283932976144`
- **Anchor Latitude:** `19.00405125107094`

### Geographic-to-Three.js Conversion
Synchronization between MapLibre's geographic camera and Three.js's Cartesian coordinate system is handled natively by `MapLibreThreeLayer.ts`:
1. The Blender anchor (Lon/Lat) is converted into Web Mercator coordinates via MapLibre's `MercatorCoordinate.fromLngLat()`.
2. A `THREE.Matrix4` model-transformation matrix applies scaling (to match Mercator meters) and a 90-degree X-axis rotation to align Blender's Z-up coordinate system with WebGL's Y-up system.
3. On every render frame, MapLibre provides a `modelViewProjectionMatrix` which is multiplied against our model-transformation matrix to lock the 3D model to the exact map pixels.

---

## 4. 3D Zone Boundary

The application introduces the concept of **3D Zones** to manage the hybrid transition. 
The boundary is defined in `map-data/geocad-3d-zones.geojson` as a Polygon feature representing the exact footprint of the Lodha Park site. 

*Currently defined zone: `3D-ZONE-LODHA-PARK`*

### Future Extensibility
The architecture is inherently scalable. Future projects (e.g., `3D-ZONE-OTHER-PROJECT`) can be added by:
1. Adding a new GeoJSON Polygon to `geocad-3d-zones.geojson`.
2. Referencing the corresponding `.glb` asset in the feature properties.
3. Creating a new `MapLibreThreeLayer` instance passing the new coordinates and asset path.

---

## 5. Map & 3D Synchronization

The core integration uses a unified MapLibre camera. The UI does **not** rely on arbitrary CSS overlays (`top: 500px; left: 300px`).
- **Regional View (Zoom < 13.5):** The MapLibre 2D local vector layers dominate. The `THREE.Scene` visibility is explicitly disabled to save GPU resources.
- **Lodha Park View (Zoom >= 13.5):** The 2D map fades back, and the `THREE.Scene` becomes visible. As the user pans, pitches, and rotates the map, MapLibre recalculates the View-Projection matrix, perfectly anchoring the Lodha Park buildings to Worli.

---

## 6. Performance Strategy

To ensure a smooth 60 FPS experience:
- **Selective Data Querying:** The `generate-local-map-data.ts` script intentionally filters out minor residential streets and individual 2D building footprints for the metropolitan area.
- **Vector Tiling Engine:** MapLibre handles the GeoJSON parsing and vector rendering efficiently on the GPU.
- **Three.js Resource Management:** We explicitly bypass MapLibre's default `antialias` request on the shared WebGL context to prevent `Context Lost` crashes. The `autoClear` is set to false, and state is carefully managed during MapLibre's render pipeline.

---

## 7. Local Map Generation Workflow

To update or regenerate the local map data:
1. Navigate to the `frontend/` directory.
2. Run `npx tsx scripts/generate-local-map-data.ts`.
3. The script will ping the Overpass API, download the latest data for the bounded box, convert it to GeoJSON, and overwrite the files in `public/map-data/`.

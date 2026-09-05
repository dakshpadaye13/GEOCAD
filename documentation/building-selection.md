# GEOCAD - Building Click Selection & Info Panel Documentation

> **Implementation Date:** September 5, 2026  
> **Model Path:** `/models/lodha_final.glb`  
> **Metadata Module:** `frontend/src/data/buildings.ts`  
> **Viewer Component:** `frontend/src/components/3d/CityCanvas.tsx`  
> **UI Overlay:** `frontend/src/components/ui/BuildingInfoPanel.tsx`

---

## 1. Selection Architecture

The 3D building selection architecture cleanly decouples Three.js / React Three Fiber raycasting from UI metadata management:

```
[User Clicks Mesh in 3D Canvas]
           │
           ▼
[Extract object.userData.building_id or object.name]
           │
           ▼
[Validate ID against VALID_BUILDING_IDS Set]
  ├── Non-Building (road/tree/ground) ──► Ignore (No action)
  └── Valid Building ID ──────────────────► Trigger onSelectBuilding(buildingId)
                                                 │
                                                 ▼
                                  [App State Update & Highlighting]
                                  ├── Reversibly Highlight Selected Mesh (Cyan Glow)
                                  └── Render Floating BuildingInfoPanel Overlay
```

---

## 2. Permanent ID Handling

* **ID Extraction:** Primary lookup targets `object.userData.building_id`, falling back to `object.name`.
* **Validation Set:** `VALID_BUILDING_IDS` ensures non-building scene objects (trees `Tree_Base.*`, roads `Ways:highway`, ground `Expanded_Base_Map`, site frame `Focus_Boundary_Frame`) do not trigger selection.
* **Supported Permanent IDs:**
  1. `BLDG-LODHA-WORLD-ONE`
  2. `BLDG-LODHA-TRUMP`
  3. `BLDG-LODHA-MARQUISE`
  4. `BLDG-LODHA-KIARA`
  5. `BLDG-LODHA-ADRINA`
  6. `BLDG-LODHA-PARKSIDE`
  7. `BLDG-LODHA-ALLURA`

---

## 3. Metadata Structure (`frontend/src/data/buildings.ts`)

```typescript
export interface BuildingMetadata {
  buildingId: string;
  buildingName: string;
  floors: number | string;
  basements: number | string;
  parking: string;
  status: string;
  description: string;
}
```

* **Default Unconfigured Fields:** `floors`, `basements`, and `parking` default to `"Not configured"`.
* **Status Field:** Default set to `"Existing"`.

---

## 4. Reversible Highlighting Method

* **Original Material Cache:** On initial GLB load, original mesh materials are cloned and cached in a `Map<string, THREE.Material>` by mesh `uuid`.
* **Selected Highlight:** Selected building mesh is temporarily swapped to a high-contrast cyan standard material (`color: #06b6d4`, `emissive: #0891b2`, `emissiveIntensity: 0.8`).
* **Deselection / Reversibility:** When another building is clicked or the panel is closed (via `X` button, canvas background click, or `Escape` key), the mesh material is restored to its exact original cached material.

---

## 5. Hover Feedback & Cursor Behavior

* **Hover State:** Hovering over any of the 7 valid building objects changes the cursor to `pointer` and applies a subtle sky-blue emissive tint (`emissive: #0284c7`, `emissiveIntensity: 0.4`).
* **Non-Persistent:** Hovering does not mutate or override the active building selection.

---

## 6. Files Changed & Created

1. [`frontend/src/data/buildings.ts`](file:///C:/Users/daksh/GEOCAD/frontend/src/data/buildings.ts) *(New)*: Building metadata catalog and valid ID validation set.
2. [`frontend/src/components/ui/BuildingInfoPanel.tsx`](file:///C:/Users/daksh/GEOCAD/frontend/src/components/ui/BuildingInfoPanel.tsx) *(New)*: Floating HUD building information panel overlay.
3. [`frontend/src/components/3d/CityCanvas.tsx`](file:///C:/Users/daksh/GEOCAD/frontend/src/components/3d/CityCanvas.tsx) *(Modified)*: Integrated raycasting selection, hover handlers, and dynamic reversible highlighting.
4. [`frontend/src/App.tsx`](file:///C:/Users/daksh/GEOCAD/frontend/src/App.tsx) *(Modified)*: Managed `selectedBuildingId` state, `Escape` key deselect, and rendered `BuildingInfoPanel`.
5. [`documentation/building-selection.md`](file:///C:/Users/daksh/GEOCAD/documentation/building-selection.md) *(New)*: [This Report].

---

## 7. Build Result

* **Command:** `npm run build` (`tsc && vite build`)
* **Status:** **PASSED** cleanly in 4.24s with **0 errors**.

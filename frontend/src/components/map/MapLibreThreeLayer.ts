import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as maplibregl from 'maplibre-gl';
import { VALID_BUILDING_IDS, BUILDINGS_DATA } from '../../data/buildings';

// Authoritative georeferencing metadata from blender/lodha final.blend custom properties
export const GEOCAD_BLENDER_ANCHOR = {
  longitude: 72.8283932976144,
  latitude: 19.00405125107094,
  altitude: 0,
  srid: 'EPSG:3857',
  crsX: 8107219.6571826935,
  crsY: 2155412.8900585175,
};

// Lodha Park geographic bounding box extent for 2D/3D hybrid transitions
export const LODHA_PARK_BOUNDS = {
  minLon: 72.822557,
  maxLon: 72.834229,
  minLat: 19.000911,
  maxLat: 19.006711,
};

// Names of flat ground planes from Blender that must be hidden so the MapLibre base map shows through
const HIDDEN_GROUND_MESHES = new Set([
  'Expanded_Base_Map',
  'EXPORT_OSM_MAPNIK_WM',
  'Plane',
]);

export interface MapLibreThreeLayerOptions {
  selectedBuildingId: string | null;
  onSelectBuilding: (buildingId: string | null) => void;
  onLoadProgress?: (progress: number) => void;
  onLoadComplete?: () => void;
}

export class MapLibreThreeLayer implements maplibregl.CustomLayerInterface {
  public id = 'geocad-3d-layer';
  public type: 'custom' = 'custom';
  public renderingMode: '3d' = '3d';

  private map: maplibregl.Map | null = null;
  private camera = new THREE.PerspectiveCamera();
  private scene = new THREE.Scene();
  private renderer: THREE.WebGLRenderer | null = null;
  private glbModel: THREE.Group | null = null;

  private mercator = maplibregl.MercatorCoordinate.fromLngLat(
    [GEOCAD_BLENDER_ANCHOR.longitude, GEOCAD_BLENDER_ANCHOR.latitude],
    GEOCAD_BLENDER_ANCHOR.altitude
  );
  private scale = this.mercator.meterInMercatorCoordinateUnits();

  // Pre-compute the model transformation matrix once (it never changes)
  private modelMatrix: THREE.Matrix4;

  private selectedBuildingId: string | null = null;
  private hoveredBuildingId: string | null = null;
  private onSelectBuilding: (buildingId: string | null) => void;
  private onLoadProgress?: (progress: number) => void;
  private onLoadComplete?: () => void;

  // Store original materials for building highlight restore
  private originalMaterialsMap = new Map<string, THREE.Material | THREE.Material[]>();
  // Building meshes indexed by building ID for fast highlight updates
  private buildingMeshes = new Map<string, THREE.Mesh[]>();

  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private lightFacadeTexture: THREE.Texture | null = null;

  constructor(options: MapLibreThreeLayerOptions) {
    this.selectedBuildingId = options.selectedBuildingId;
    this.onSelectBuilding = options.onSelectBuilding;
    this.onLoadProgress = options.onLoadProgress;
    this.onLoadComplete = options.onLoadComplete;

    const tl = new THREE.TextureLoader();
    this.lightFacadeTexture = tl.load('/textures/lodha_facade_light_blue.png');
    this.lightFacadeTexture.wrapS = THREE.RepeatWrapping;
    this.lightFacadeTexture.wrapT = THREE.RepeatWrapping;
    this.lightFacadeTexture.colorSpace = THREE.SRGBColorSpace;

    // Pre-compute the model transform matrix:
    // Converts from Blender/GLTF local space (meters, Y-up) to MapLibre Mercator space
    // 1. Rotate 90° around X to convert Y-up → Z-up
    // 2. Scale meters → Mercator units, with -Y so north matches MapLibre (Y increases south)
    // 3. Translate to the geographic anchor position
    const rotationX = new THREE.Matrix4().makeRotationAxis(
      new THREE.Vector3(1, 0, 0),
      Math.PI / 2
    );
    this.modelMatrix = new THREE.Matrix4()
      .makeTranslation(this.mercator.x, this.mercator.y, this.mercator.z)
      .scale(new THREE.Vector3(this.scale, -this.scale, this.scale))
      .multiply(rotationX);

    this.setupLighting();
  }

  private setupLighting(): void {
    // Calibrated Mumbai Daytime Sun — warm key light from NW
    const sunLight = new THREE.DirectionalLight(0xfff8e7, 3.2);
    sunLight.position.set(200, 400, 150);
    sunLight.castShadow = false;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.bias = -0.0002;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 1200;
    sunLight.shadow.camera.left = -500;
    sunLight.shadow.camera.right = 500;
    sunLight.shadow.camera.top = 500;
    sunLight.shadow.camera.bottom = -500;
    this.scene.add(sunLight);

    // Cool sky fill light — soft blue from opposite direction
    const fillLight = new THREE.DirectionalLight(0x9ec5e8, 1.1);
    fillLight.position.set(-200, 250, -180);
    this.scene.add(fillLight);

    // Ambient base — prevents fully black shadow areas
    const ambient = new THREE.AmbientLight(0xdce8f5, 0.65);
    this.scene.add(ambient);

    // Hemisphere light — sky blue above, warm ground bounce below
    const hemiLight = new THREE.HemisphereLight(0x87CEEB, 0xd4c4a0, 0.5);
    this.scene.add(hemiLight);
  }

  public onAdd(map: maplibregl.Map, gl: WebGLRenderingContext): void {
    this.map = map;

    this.camera.matrixAutoUpdate = false;
    this.camera.matrixWorld.identity();
    this.camera.matrixWorldInverse.identity();

    this.renderer = new THREE.WebGLRenderer({
      canvas: map.getCanvas(),
      context: gl,
      antialias: false,
      alpha: true,
    });
    this.renderer.autoClear = false;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;
    this.renderer.shadowMap.enabled = false;
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(map.getCanvas().clientWidth, map.getCanvas().clientHeight, false);

    this.loadGLTFModel();
  }

  private loadGLTFModel(): void {
    const loader = new GLTFLoader();
    loader.load(
      '/models/lodha_final.glb',
      (gltf) => {
        this.glbModel = gltf.scene;
        this.processModel(this.glbModel);
        this.scene.add(this.glbModel);
        if (this.onLoadProgress) this.onLoadProgress(100);
        if (this.onLoadComplete) this.onLoadComplete();
        if (this.map) this.map.triggerRepaint();
        console.log('[GEOCAD] 3D city model loaded successfully');
      },
      (xhr) => {
        if (this.onLoadProgress) {
          const total = xhr.lengthComputable && xhr.total > 0 ? xhr.total : 4000000;
          const percent = Math.min(99, Math.round((xhr.loaded / total) * 100));
          this.onLoadProgress(percent);
        }
      },
      (err) => {
        console.error('[GEOCAD] GLTF Loading Error:', err);
        if (this.onLoadComplete) this.onLoadComplete();
      }
    );
  }

  /**
   * Process the loaded GLB model:
   * - Hide flat ground planes (so MapLibre base map shows through)
   * - Preserve original Blender PBR materials (DO NOT override)
   * - Enable shadow casting/receiving
   * - Index building meshes for fast highlight lookup
   * - Store original materials for highlight restore
   */
  private processModel(model: THREE.Group): void {
    model.traverse((child) => {
      if (!(child as THREE.Mesh).isMesh) return;
      const mesh = child as THREE.Mesh;

      // 1. Hide flat ground planes
      if (HIDDEN_GROUND_MESHES.has(mesh.name)) {
        mesh.visible = false;
        return;
      }

      // 2. Enable shadows
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      // 3. Resolve building ID from userData or name
      const bId = mesh.userData.building_id || mesh.name;
      const isBuilding = VALID_BUILDING_IDS.has(bId);

      // 4. Index building meshes
      if (isBuilding) {
        const existing = this.buildingMeshes.get(bId) || [];
        existing.push(mesh);
        this.buildingMeshes.set(bId, existing);
      }

      // 5. Enhance materials with light blue/white architectural facade
      if (mesh.material) {
        const enhanceMat = (mat: THREE.Material): THREE.Material => {
          const m = mat.clone() as THREE.MeshStandardMaterial;
          if (isBuilding || m.name === 'Mat_Buildings') {
            if (this.lightFacadeTexture) m.map = this.lightFacadeTexture;
            m.color = new THREE.Color('#ffffff');
            m.roughness = 0.15;
            m.metalness = 0.10;
            m.envMapIntensity = 1.35;
          } else if (m.name === 'Mat_Roof') {
            m.color = new THREE.Color('#e2e8f0');
            m.roughness = 0.82;
            m.metalness = 0.08;
          } else if (m.name === 'Mat_Landuse') {
            m.color = new THREE.Color('#225828');
          } else if (m.name === 'Mat_Canopy') {
            m.color = new THREE.Color('#1c5221');
          } else if (m.name === 'Mat_Road_Yellow' || mesh.name === 'Road_Network_Ribbons') {
            m.color = new THREE.Color('#f59e0b');
          } else if (m.map) {
            m.map.colorSpace = THREE.SRGBColorSpace;
          }
          m.needsUpdate = true;
          return m;
        };

        if (Array.isArray(mesh.material)) {
          const enhanced = mesh.material.map(enhanceMat);
          mesh.material = enhanced;
          this.originalMaterialsMap.set(mesh.uuid, enhanced.map((m) => m.clone()));
        } else {
          const enhanced = enhanceMat(mesh.material);
          mesh.material = enhanced;
          this.originalMaterialsMap.set(mesh.uuid, enhanced.clone());
        }
      }
    });

    this.updateBuildingHighlights();
  }

  public setSelectedBuildingId(buildingId: string | null): void {
    if (this.selectedBuildingId === buildingId) return;
    this.selectedBuildingId = buildingId;
    this.updateBuildingHighlights();
    if (this.map) this.map.triggerRepaint();
  }

  public setHoveredBuildingId(buildingId: string | null): void {
    if (this.hoveredBuildingId === buildingId) return;
    this.hoveredBuildingId = buildingId;
    this.updateBuildingHighlights();
    if (this.map) this.map.triggerRepaint();
  }

  /**
   * Apply highlight materials to selected/hovered buildings,
   * restore original materials for all others.
   */
  private updateBuildingHighlights(): void {
    if (!this.glbModel) return;

    for (const [bId, meshes] of this.buildingMeshes) {
      const isSelected = bId === this.selectedBuildingId;
      const isHovered = bId === this.hoveredBuildingId && !isSelected;

      for (const mesh of meshes) {
        if (isSelected) {
          mesh.material = this.createHighlightMaterial(mesh, '#06b6d4', '#0891b2', 0.8);
        } else if (isHovered) {
          mesh.material = this.createHighlightMaterial(mesh, '#67e8f9', '#0ea5e9', 0.35);
        } else {
          // Restore original material
          const orig = this.originalMaterialsMap.get(mesh.uuid);
          if (orig) {
            mesh.material = orig;
          }
        }
      }
    }
  }

  private createHighlightMaterial(
    mesh: THREE.Mesh,
    color: string,
    emissive: string,
    emissiveIntensity: number
  ): THREE.MeshStandardMaterial {
    const orig = this.originalMaterialsMap.get(mesh.uuid);
    const origMat = (Array.isArray(orig) ? orig[0] : orig) as THREE.MeshStandardMaterial | undefined;
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      emissive: new THREE.Color(emissive),
      emissiveIntensity,
      roughness: 0.2,
      metalness: 0.4,
      map: origMat?.map || null,
    });
  }

  /**
   * MapLibre GL JS v6 custom layer render method.
   * `options` is `CustomRenderMethodInput` containing:
   *   - modelViewProjectionMatrix: mat4 (Float64Array, 16 elements)
   *   - projectionMatrix: mat4
   *   - farZ, nearZ, fov
   */
  public render(gl: WebGLRenderingContext, args: any): void {
    if (!this.renderer || !this.map) return;

    const zoom = this.map.getZoom();
    this.scene.visible = zoom >= 13.5;
    if (!this.scene.visible) return;

    try {
      const canvas = this.map.getCanvas();
      this.renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);

      const raw =
        args?.defaultProjectionData?.mainMatrix ??
        args?.modelViewProjectionMatrix;
      if (!raw || raw.length < 16) return;

      // MapLibre mat4 and THREE.Matrix4.fromArray are both column-major — do not transpose.
      const pv = new THREE.Matrix4().fromArray(Array.from(raw) as number[]);
      this.camera.projectionMatrix.copy(pv.clone().multiply(this.modelMatrix));
      this.camera.projectionMatrixInverse.copy(this.camera.projectionMatrix).invert();
      this.camera.matrixWorld.identity();
      this.camera.matrixWorldInverse.identity();

      const fbo = gl.getParameter(gl.FRAMEBUFFER_BINDING);

      const gl2 = gl as WebGL2RenderingContext;
      if (typeof gl2.bindVertexArray === 'function') {
        gl2.bindVertexArray(null);
      }

      this.renderer.resetState();
      if (fbo) {
        this.renderer.state.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      }

      this.renderer.clearDepth();
      this.renderer.render(this.scene, this.camera);

      this.map.triggerRepaint();
    } catch (err) {
      if (!this._renderErrorLogged) {
        console.error('[GEOCAD] Custom layer render error:', err);
        console.log('[GEOCAD] args keys:', Object.keys(args || {}));
        this._renderErrorLogged = true;
      }
    }
  }

  private _renderErrorLogged = false;

  // ─── Raycasting / Pointer Interaction ─────────────────────────────

  private getCameraPositionLocal(): THREE.Vector3 | null {
    if (!this.map) return null;
    try {
      const freeCam = (this.map as any).getFreeCameraOptions?.();
      if (freeCam && freeCam.position) {
        const invModel = this.modelMatrix.clone().invert();
        const camMerc = new THREE.Vector3(freeCam.position.x, freeCam.position.y, freeCam.position.z);
        return camMerc.applyMatrix4(invModel);
      }
    } catch (_) { }
    return null;
  }

  private createRay(point: { x: number; y: number }, containerBounds: DOMRect): boolean {
    if (!this.map || !this.glbModel) return false;

    this.mouse.x = (point.x / containerBounds.width) * 2 - 1;
    this.mouse.y = -(point.y / containerBounds.height) * 2 + 1;

    // 1. Unproject far point in local coordinates (z = 1 in NDC)
    const pFar = new THREE.Vector3(this.mouse.x, this.mouse.y, 1).unproject(this.camera);

    // 2. Camera eye position in local coordinates
    const camLocal = this.getCameraPositionLocal();

    let origin: THREE.Vector3;
    let dir: THREE.Vector3;

    if (camLocal && isFinite(camLocal.x) && isFinite(camLocal.y) && isFinite(camLocal.z)) {
      origin = camLocal;
      dir = pFar.clone().sub(camLocal).normalize();
    } else {
      // Fallback: unproject near point at z = -0.99
      const pNear = new THREE.Vector3(this.mouse.x, this.mouse.y, -0.99).unproject(this.camera);
      origin = pNear;
      dir = pFar.clone().sub(pNear).normalize();
    }

    if (!isFinite(dir.x) || !isFinite(dir.y) || !isFinite(dir.z)) {
      return false;
    }

    this.raycaster.set(origin, dir);
    this.raycaster.near = 0.1;
    this.raycaster.far = 30000;
    return true;
  }

  private getAllBuildingMeshes(): THREE.Mesh[] {
    const list: THREE.Mesh[] = [];
    for (const meshes of this.buildingMeshes.values()) {
      list.push(...meshes);
    }
    return list;
  }

  public handlePointerMove(point: { x: number; y: number }, containerBounds: DOMRect): void {
    if (!this.glbModel || !this.scene.visible) return;

    if (!this.createRay(point, containerBounds)) return;

    const buildingMeshes = this.getAllBuildingMeshes();
    const intersects = this.raycaster.intersectObjects(
      buildingMeshes.length > 0 ? buildingMeshes : this.glbModel.children,
      true
    );

    let foundBuildingId = this.findBuildingIdFromIntersects(intersects);

    if (foundBuildingId !== this.hoveredBuildingId) {
      this.setHoveredBuildingId(foundBuildingId);
      if (this.map) {
        this.map.getCanvas().style.cursor = foundBuildingId ? 'pointer' : '';
      }
    }
  }

  public handleClick(point: { x: number; y: number }, containerBounds: DOMRect): void {
    if (!this.glbModel || !this.scene.visible) return;

    if (!this.createRay(point, containerBounds)) return;

    const buildingMeshes = this.getAllBuildingMeshes();
    const intersects = this.raycaster.intersectObjects(
      buildingMeshes.length > 0 ? buildingMeshes : this.glbModel.children,
      true
    );

    let foundBuildingId = this.findBuildingIdFromIntersects(intersects);

    // If no direct 3D mesh polygon was hit, check if user clicked on building footprint / foundation on 2D map
    if (!foundBuildingId && this.map) {
      try {
        const lngLat = this.map.unproject([point.x, point.y]);
        let closestId: string | null = null;
        let minDistanceSq = 0.00045 * 0.00045; // ~45m geographic tolerance

        for (const [bId, bMeta] of Object.entries(BUILDINGS_DATA)) {
          const dLon = lngLat.lng - bMeta.lon;
          const dLat = lngLat.lat - bMeta.lat;
          const distSq = dLon * dLon + dLat * dLat;
          if (distSq < minDistanceSq) {
            minDistanceSq = distSq;
            closestId = bId;
          }
        }
        if (closestId) {
          foundBuildingId = closestId;
        }
      } catch (_) { }
    }

    this.onSelectBuilding(foundBuildingId);
  }

  private findBuildingIdFromIntersects(intersects: THREE.Intersection[]): string | null {
    for (const hit of intersects) {
      let curr: THREE.Object3D | null = hit.object;
      while (curr && curr !== this.glbModel) {
        const bId = curr.userData.building_id || curr.name;
        if (VALID_BUILDING_IDS.has(bId)) {
          return bId;
        }
        curr = curr.parent;
      }
    }
    return null;
  }

  public onRemove(): void {
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }
    this.buildingMeshes.clear();
    this.originalMaterialsMap.clear();
  }
}

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VALID_BUILDING_IDS } from '../../data/buildings';

export interface GoogleMapsOverlayOptions {
  map: google.maps.Map;
  selectedBuildingId: string | null;
  onSelectBuilding: (buildingId: string | null) => void;
  onLoadProgress?: (progress: number) => void;
  onLoadComplete?: () => void;
}

// Authoritative Web Mercator (EPSG:3857) origin from BlenderGIS Node 11 [Cube]
export const GEOCAD_ORIGIN = {
  lat: 19.004045814713944,
  lng: 72.82840086877108,
  altitude: 0,
};

export class GEOCADGoogleMapsOverlay {
  private map: google.maps.Map;
  private overlay: google.maps.WebGLOverlayView;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer | null = null;
  private glbModel: THREE.Group | null = null;

  private selectedBuildingId: string | null = null;
  private hoveredBuildingId: string | null = null;
  private onSelectBuilding: (buildingId: string | null) => void;
  private onLoadProgress?: (progress: number) => void;
  private onLoadComplete?: () => void;

  private originalMaterialsMap = new Map<string, THREE.Material | THREE.Material[]>();
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private facadeTexture: THREE.Texture | null = null;

  constructor(options: GoogleMapsOverlayOptions) {
    this.map = options.map;
    this.selectedBuildingId = options.selectedBuildingId;
    this.onSelectBuilding = options.onSelectBuilding;
    this.onLoadProgress = options.onLoadProgress;
    this.onLoadComplete = options.onLoadComplete;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera();

    this.setupLighting();
    this.loadFacadeTexture();

    this.overlay = new google.maps.WebGLOverlayView();
    this.setupOverlayLifecycle();
    this.overlay.setMap(this.map);
  }

  private setupLighting() {
    // Calibrated Daytime Sun Key Light
    const sunLight = new THREE.DirectionalLight(0xfffbf0, 2.8);
    sunLight.position.set(220, 380, 180);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.bias = -0.0001;
    this.scene.add(sunLight);

    // Cool Sky Fill Light
    const fillLight = new THREE.DirectionalLight(0xa5d4f5, 0.9);
    fillLight.position.set(-180, 220, -150);
    this.scene.add(fillLight);

    // Ambient & Hemisphere Lighting
    const ambient = new THREE.AmbientLight(0xe2f0fc, 0.55);
    this.scene.add(ambient);

    const hemiLight = new THREE.HemisphereLight(0x8ec5f5, 0xcad9e8, 0.6);
    this.scene.add(hemiLight);
  }

  private loadFacadeTexture() {
    const loader = new THREE.TextureLoader();
    loader.load('/textures/lodha_facade_light_blue.png', (tex) => {
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.colorSpace = THREE.SRGBColorSpace;
      this.facadeTexture = tex;
      if (this.glbModel) {
        this.applyMaterials(this.glbModel);
      }
    });
  }

  private setupOverlayLifecycle() {
    this.overlay.onAdd = () => {
      this.loadGLTFModel();
    };

    this.overlay.onContextRestored = ({ gl }) => {
      this.renderer = new THREE.WebGLRenderer({
        canvas: gl.canvas,
        context: gl,
        antialias: true,
        alpha: true,
      });
      this.renderer.autoClear = false;
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.15;
    };

    this.overlay.onDraw = ({ transformer }) => {
      if (!this.renderer) return;

      // Update projection matrix directly from Google Maps transformer
      const projectionMatrix = transformer.getProjectionMatrix();
      this.camera.projectionMatrix.fromArray(projectionMatrix);
      this.camera.projectionMatrixInverse.copy(this.camera.projectionMatrix).invert();

      // Lock camera view matrices to Identity so Three.js renders with Google Maps combined matrix as-is
      this.camera.matrixAutoUpdate = false;
      this.camera.matrixWorld.identity();
      this.camera.matrixWorldInverse.identity();

      // Retrieve 3D vector position for GEOCAD origin in Google Maps WebGL space
      const pos = transformer.fromLatLngToVector3(GEOCAD_ORIGIN) as any;
      const posX = pos.x !== undefined ? pos.x : pos[0] || 0;
      const posY = pos.y !== undefined ? pos.y : pos[1] || 0;
      const posZ = pos.z !== undefined ? pos.z : pos[2] || 0;

      if ((window as any).__GEOCAD_DEBUG_COUNT === undefined) (window as any).__GEOCAD_DEBUG_COUNT = 0;
      if ((window as any).__GEOCAD_DEBUG_COUNT < 5) {
        (window as any).__GEOCAD_DEBUG_COUNT++;
        console.log('[GEOCAD DEBUG] pos raw:', pos, '-> posX, posY, posZ:', posX, posY, posZ);
        console.log('[GEOCAD DEBUG] glbModel loaded:', !!this.glbModel);
      }

      // Create model translation matrix using safely extracted position
      const modelMatrix = new THREE.Matrix4().makeTranslation(posX, posY, posZ);

      // Apply coordinate axis rotation: Three.js (+Y Up, +Z South) -> Google Maps (+Z Up, +Y North)
      const coordRotation = new THREE.Matrix4().makeRotationX(Math.PI / 2);
      modelMatrix.multiply(coordRotation);

      if (this.glbModel) {
        this.glbModel.matrixAutoUpdate = false;
        this.glbModel.matrix.copy(modelMatrix);
        this.glbModel.matrixWorldNeedsUpdate = true;
      }

      // Reset renderer GL state for Google Maps rendering pipeline
      this.renderer.resetState();
      this.renderer.render(this.scene, this.camera);
      this.overlay.requestRedraw();
    };

    this.overlay.onContextLost = () => {
      this.renderer = null;
    };

    this.overlay.onRemove = () => {
      if (this.renderer) {
        this.renderer.dispose();
        this.renderer = null;
      }
    };
  }

  private loadGLTFModel() {
    const loader = new GLTFLoader();
    loader.load(
      '/models/lodha_final.glb',
      (gltf) => {
        this.glbModel = gltf.scene;
        this.applyMaterials(this.glbModel);
        this.scene.add(this.glbModel);
        if (this.onLoadProgress) this.onLoadProgress(100);
        if (this.onLoadComplete) this.onLoadComplete();
        this.overlay.requestRedraw();
      },
      (xhr) => {
        if (this.onLoadProgress) {
          const total = xhr.lengthComputable && xhr.total > 0 ? xhr.total : 14500000;
          const percent = Math.min(99, Math.round((xhr.loaded / total) * 100));
          this.onLoadProgress(percent);
        }
      },
      (err) => {
        console.error('GEOCAD Overlay GLTF loading error:', err);
        if (this.onLoadComplete) this.onLoadComplete();
      }
    );
  }

  private applyMaterials(model: THREE.Group) {
    model.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        const bId = mesh.userData.building_id || mesh.name;
        const isBuilding = VALID_BUILDING_IDS.has(bId);

        // Hide flat background planes so Google Maps base map displays cleanly underneath
        if (mesh.name === 'Expanded_Base_Map' || mesh.name === 'EXPORT_OSM_MAPNIK_WM' || mesh.name === 'Plane') {
          mesh.visible = false;
          return;
        }

        if (mesh.material) {
          const tuneMat = (mat: THREE.Material) => {
            const m = mat.clone() as THREE.MeshStandardMaterial;
            if (isBuilding || m.name === 'Mat_Buildings') {
              if (this.facadeTexture) m.map = this.facadeTexture;
              m.color = new THREE.Color('#ffffff');
              m.roughness = 0.15;
              m.metalness = 0.10;
              m.envMapIntensity = 1.25;
            } else if (m.name === 'Mat_Landuse') {
              m.color = new THREE.Color('#225828');
              m.roughness = 0.94;
              m.metalness = 0.02;
            } else if (m.name === 'Mat_Canopy') {
              m.color = new THREE.Color('#1c4f21');
              m.roughness = 0.88;
            } else if (m.name === 'Mat_Trunk') {
              m.color = new THREE.Color('#432e1f');
            } else if (m.name === 'Mat_Road_Yellow' || mesh.name === 'Road_Network_Ribbons') {
              m.color = new THREE.Color('#f59e0b');
              m.roughness = 0.55;
            } else if (m.name === 'Mat_Roof') {
              m.color = new THREE.Color('#e2e8f0');
              m.roughness = 0.82;
            }
            m.needsUpdate = true;
            return m;
          };

          if (Array.isArray(mesh.material)) {
            const tuned = mesh.material.map(tuneMat);
            mesh.material = tuned;
            this.originalMaterialsMap.set(mesh.uuid, tuned.map((m) => m.clone()));
          } else {
            const tuned = tuneMat(mesh.material);
            mesh.material = tuned;
            this.originalMaterialsMap.set(mesh.uuid, tuned.clone());
          }
        }
      }
    });

    this.updateBuildingHighlights();
  }

  public setSelectedBuildingId(buildingId: string | null) {
    this.selectedBuildingId = buildingId;
    this.updateBuildingHighlights();
    this.overlay.requestRedraw();
  }

  public setHoveredBuildingId(buildingId: string | null) {
    this.hoveredBuildingId = buildingId;
    this.updateBuildingHighlights();
    this.overlay.requestRedraw();
  }

  private updateBuildingHighlights() {
    if (!this.glbModel) return;

    this.glbModel.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const bId = mesh.userData.building_id || mesh.name;

        if (VALID_BUILDING_IDS.has(bId)) {
          const isSelected = bId === this.selectedBuildingId;
          const isHovered = bId === this.hoveredBuildingId && !isSelected;
          const orig = this.originalMaterialsMap.get(mesh.uuid);
          const origMat = (Array.isArray(orig) ? orig[0] : orig) as THREE.MeshStandardMaterial | undefined;

          if (isSelected) {
            mesh.material = new THREE.MeshStandardMaterial({
              color: new THREE.Color('#06b6d4'),
              emissive: new THREE.Color('#0891b2'),
              emissiveIntensity: 0.85,
              roughness: 0.18,
              metalness: 0.45,
              map: origMat?.map || null,
            });
          } else if (isHovered) {
            mesh.material = new THREE.MeshStandardMaterial({
              color: new THREE.Color('#38bdf8'),
              emissive: new THREE.Color('#0284c7'),
              emissiveIntensity: 0.45,
              roughness: 0.24,
              metalness: 0.35,
              map: origMat?.map || null,
            });
          } else {
            if (orig) mesh.material = orig;
          }
        }
      }
    });
  }

  public handlePointerMove(event: MouseEvent, containerRect: DOMRect) {
    if (!this.glbModel) return;

    this.mouse.x = ((event.clientX - containerRect.left) / containerRect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - containerRect.top) / containerRect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.glbModel.children, true);

    let foundBuildingId: string | null = null;
    for (const hit of intersects) {
      let curr: THREE.Object3D | null = hit.object;
      while (curr && curr !== this.glbModel) {
        const bId = curr.userData.building_id || curr.name;
        if (VALID_BUILDING_IDS.has(bId)) {
          foundBuildingId = bId;
          break;
        }
        curr = curr.parent;
      }
      if (foundBuildingId) break;
    }

    if (foundBuildingId !== this.hoveredBuildingId) {
      this.setHoveredBuildingId(foundBuildingId);
    }
  }

  public handleClick(event: MouseEvent, containerRect: DOMRect) {
    if (!this.glbModel) return;

    this.mouse.x = ((event.clientX - containerRect.left) / containerRect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - containerRect.top) / containerRect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.glbModel.children, true);

    let foundBuildingId: string | null = null;
    for (const hit of intersects) {
      let curr: THREE.Object3D | null = hit.object;
      while (curr && curr !== this.glbModel) {
        const bId = curr.userData.building_id || curr.name;
        if (VALID_BUILDING_IDS.has(bId)) {
          foundBuildingId = bId;
          break;
        }
        curr = curr.parent;
      }
      if (foundBuildingId) break;
    }

    this.onSelectBuilding(foundBuildingId);
  }

  public destroy() {
    this.overlay.setMap(null);
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }
  }
}

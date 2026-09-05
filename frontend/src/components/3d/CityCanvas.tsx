import React, { Suspense, Component, ReactNode, useState, useEffect, useMemo, useRef } from 'react';
import { Canvas, ThreeEvent, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, useGLTF, useProgress, Html, PerspectiveCamera, Environment, Sky } from '@react-three/drei';
import * as THREE from 'three';
import { VALID_BUILDING_IDS, BUILDINGS_DATA } from '../../data/buildings';

// Pre-load GLB asset
useGLTF.preload('/models/lodha_final.glb');

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class City3DErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('3D Loading Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Html center>
          <div className="bg-slate-900/90 border border-red-500/50 p-6 rounded-xl backdrop-blur-md text-center max-w-md shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-1">Failed to Load 3D Model</h3>
            <p className="text-xs text-slate-400 mb-4">
              {this.state.error?.message || 'Unable to access /models/lodha_final.glb'}
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              Retry Loading
            </button>
          </div>
        </Html>
      );
    }
    return this.props.children;
  }
}

function Loader() {
  const { progress } = useProgress();
  return (
    <Html center>
      <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-slate-950/80 border border-cyan-500/20 backdrop-blur-xl shadow-2xl space-y-3 min-w-[220px]">
        <div className="relative w-12 h-12 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-2 border-cyan-500/20 border-t-cyan-400 animate-spin" />
          <span className="text-xs font-mono font-bold text-cyan-400">{progress.toFixed(0)}%</span>
        </div>
        <div className="text-center space-y-1">
          <div className="text-xs font-semibold text-slate-200 tracking-wide uppercase font-mono">
            Loading Lodha City Model
          </div>
          <div className="text-[10px] text-slate-400 font-mono">
            /models/lodha_final.glb
          </div>
        </div>
        <div className="w-full bg-slate-800 rounded-full h-1 overflow-hidden">
          <div
            className="bg-cyan-400 h-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </Html>
  );
}

// Names of flat ground planes from Blender that must be hidden when base map is visible
const HIDDEN_GROUND_MESHES = new Set([
  'Expanded_Base_Map',
  'EXPORT_OSM_MAPNIK_WM',
  'Plane',
]);

interface LodhaCityModelProps {
  selectedBuildingId: string | null;
  onSelectBuilding: (buildingId: string | null) => void;
  hideGroundMap?: boolean;
}

function LodhaCityModel({ selectedBuildingId, onSelectBuilding, hideGroundMap = false }: LodhaCityModelProps) {
  const { scene } = useGLTF('/models/lodha_final.glb');
  const [hoveredBuildingId, setHoveredBuildingId] = useState<string | null>(null);

  // Load high-fidelity architectural textures
  const textureLoader = useMemo(() => new THREE.TextureLoader(), []);

  const lightBlueFacadeTexture = useMemo(() => {
    const tex = textureLoader.load('/textures/lodha_facade_light_blue.png');
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [textureLoader]);

  const satelliteTexture = useMemo(() => {
    const tex = textureLoader.load('/textures/mumbai_regional_satellite.jpg');
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [textureLoader]);

  // Process model: preserve and enhance materials with light blue/white facade & satellite ground
  const originalMaterialsMap = useMemo(() => {
    const map = new Map<string, THREE.Material | THREE.Material[]>();
    scene.traverse((child) => {
      if (!(child as THREE.Mesh).isMesh) return;
      const mesh = child as THREE.Mesh;

      // Hide flat ground planes when overlaying on a map
      if (hideGroundMap && HIDDEN_GROUND_MESHES.has(mesh.name)) {
        mesh.visible = false;
        return;
      }

      // Enable shadows
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      const bId = mesh.userData.building_id || mesh.name;
      const isBuilding = VALID_BUILDING_IDS.has(bId);

      const applyEnhancement = (m: THREE.Material): THREE.Material => {
        const mat = m.clone() as THREE.MeshStandardMaterial;

        if (isBuilding || mat.name === 'Mat_Buildings') {
          // Luminous pure white framing + pale azure glass facade matching Blender master
          mat.map = lightBlueFacadeTexture;
          mat.color = new THREE.Color('#ffffff');
          mat.roughness = 0.15;
          mat.metalness = 0.10;
          mat.envMapIntensity = 1.35;
        } else if (mesh.name === 'Expanded_Base_Map' || mat.name === 'Mat_Expanded_Base_Map') {
          // Authentic 2D Mumbai satellite regional context map for the surrounding landscape
          mat.map = satelliteTexture;
          mat.color = new THREE.Color('#ffffff');
          mat.roughness = 0.95;
          mat.metalness = 0.02;
          mat.envMapIntensity = 0.15;
        } else if (mat.name === 'Mat_Landuse') {
          // Rich park lawns, sports grounds, and leisure gardens
          mat.color = new THREE.Color('#225828');
          mat.roughness = 0.94;
          mat.metalness = 0.0;
        } else if (mat.name === 'Mat_Canopy') {
          // Vibrant green tree foliage
          mat.color = new THREE.Color('#1c5221');
          mat.roughness = 0.85;
          mat.metalness = 0.0;
        } else if (mat.name === 'Mat_Trunk') {
          // Natural bark brown
          mat.color = new THREE.Color('#432e1f');
          mat.roughness = 0.85;
          mat.metalness = 0.0;
        } else if (mat.name === 'Mat_Road_Yellow' || mesh.name === 'Road_Network_Ribbons') {
          // High-visibility transportation corridors
          mat.color = new THREE.Color('#f59e0b');
          mat.roughness = 0.55;
          mat.metalness = 0.05;
        } else if (mat.name === 'Mat_Railways') {
          mat.color = new THREE.Color('#334155');
          mat.roughness = 0.65;
          mat.metalness = 0.35;
        } else if (mat.name === 'Mat_Roof') {
          // Crisp, clean architectural roof deck (no dark cavities)
          mat.color = new THREE.Color('#e2e8f0');
          mat.roughness = 0.82;
          mat.metalness = 0.08;
          mat.envMapIntensity = 0.4;
        } else if (mat.name === 'rastMat' || mesh.name === 'EXPORT_OSM_MAPNIK_WM') {
          // Site-level OSM Mapnik ground map directly beneath the towers
          mat.roughness = 0.94;
          mat.metalness = 0.04;
          mat.envMapIntensity = 0.25;
          if (mat.map) mat.map.colorSpace = THREE.SRGBColorSpace;
        } else {
          if (mat.map) mat.map.colorSpace = THREE.SRGBColorSpace;
          mat.envMapIntensity = mat.envMapIntensity || 0.8;
        }
        mat.needsUpdate = true;
        return mat;
      };

      if (mesh.material) {
        if (Array.isArray(mesh.material)) {
          const enhanced = mesh.material.map(applyEnhancement);
          mesh.material = enhanced;
          map.set(mesh.uuid, enhanced.map((m) => m.clone()));
        } else {
          const enhanced = applyEnhancement(mesh.material);
          mesh.material = enhanced;
          map.set(mesh.uuid, enhanced.clone());
        }
      }
    });
    return map;
  }, [scene, hideGroundMap, lightBlueFacadeTexture, satelliteTexture]);

  // Apply building highlight effects (selected / hovered)
  useEffect(() => {
    scene.traverse((child) => {
      if (!(child as THREE.Mesh).isMesh) return;
      const mesh = child as THREE.Mesh;
      const bId = mesh.userData.building_id || mesh.name;

      if (!VALID_BUILDING_IDS.has(bId)) return;

      const isSelected = bId === selectedBuildingId;
      const isHovered = bId === hoveredBuildingId && !isSelected;
      const orig = originalMaterialsMap.get(mesh.uuid);
      const origMat = (Array.isArray(orig) ? orig[0] : orig) as THREE.MeshStandardMaterial | undefined;

      if (isSelected) {
        mesh.material = new THREE.MeshStandardMaterial({
          color: new THREE.Color('#06b6d4'),
          emissive: new THREE.Color('#0891b2'),
          emissiveIntensity: 0.85,
          roughness: 0.15,
          metalness: 0.3,
          envMapIntensity: 1.5,
          map: origMat?.map || null,
        });
      } else if (isHovered) {
        mesh.material = new THREE.MeshStandardMaterial({
          color: new THREE.Color('#67e8f9'),
          emissive: new THREE.Color('#0ea5e9'),
          emissiveIntensity: 0.35,
          roughness: 0.2,
          metalness: 0.25,
          envMapIntensity: 1.3,
          map: origMat?.map || null,
        });
      } else {
        // Restore original enhanced Blender material
        if (orig) mesh.material = orig;
      }
    });
  }, [selectedBuildingId, hoveredBuildingId, scene, originalMaterialsMap]);

  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    let current: THREE.Object3D | null = e.object;
    while (current && current !== scene) {
      const bId = current.userData.building_id || current.name;
      if (VALID_BUILDING_IDS.has(bId)) {
        setHoveredBuildingId(bId);
        document.body.style.cursor = 'pointer';
        return;
      }
      current = current.parent;
    }
  };

  const handlePointerOut = () => {
    setHoveredBuildingId(null);
    document.body.style.cursor = 'auto';
  };

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    let current: THREE.Object3D | null = e.object;
    while (current && current !== scene) {
      const bId = current.userData.building_id || current.name;
      if (VALID_BUILDING_IDS.has(bId)) {
        onSelectBuilding(bId);
        return;
      }
      current = current.parent;
    }
  };

  return (
    <primitive
      object={scene}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      onClick={handleClick}
    />
  );
}

function CameraSyncHandler({
  controlsRef,
  onCameraChange,
}: {
  controlsRef: React.RefObject<any>;
  onCameraChange?: (cam: { lat: number; lon: number; zoom: number; heading: number; tilt: number }) => void;
}) {
  const { camera } = useThree();

  useFrame(() => {
    if (!onCameraChange || !controlsRef.current) return;
    const target = controlsRef.current.target;
    const mercX = 8107220.5 + target.x;
    const mercY = 2155412.25 - target.z;
    const R = 6378137.0;
    const lon = (mercX / R) * (180 / Math.PI);
    const lat = (2 * Math.atan(Math.exp(mercY / R)) - Math.PI / 2) * (180 / Math.PI);

    const dx = camera.position.x - target.x;
    const dy = camera.position.y - target.y;
    const dz = camera.position.z - target.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const heading = (Math.atan2(dx, -dz) * (180 / Math.PI) + 360) % 360;
    const horizDist = Math.sqrt(dx * dx + dz * dz);
    const tilt = Math.min(67.5, Math.atan2(horizDist, Math.max(0.1, dy)) * (180 / Math.PI));
    const zoom = Math.min(20, Math.max(14, 20 - Math.log2(dist / 15.0)));

    onCameraChange({ lat, lon, zoom, heading, tilt });
  });

  return null;
}

function CameraFocusHandler({
  selectedBuildingId,
  controlsRef,
}: {
  selectedBuildingId: string | null;
  controlsRef: React.RefObject<any>;
}) {
  const { camera } = useThree();
  const targetLookAt = useRef(new THREE.Vector3(40, 50, -20));
  const targetCamPos = useRef(new THREE.Vector3(360, 320, 420));
  const isAnimating = useRef(false);

  useEffect(() => {
    if (!selectedBuildingId) {
      targetLookAt.current.set(40, 50, -20);
      targetCamPos.current.set(360, 320, 420);
      isAnimating.current = true;
      return;
    }

    const b = BUILDINGS_DATA[selectedBuildingId];
    if (b) {
      targetLookAt.current.set(b.center[0], b.center[1] * 0.7, b.center[2]);
      targetCamPos.current.set(b.cameraPosition[0], b.cameraPosition[1], b.cameraPosition[2]);
      isAnimating.current = true;
    }
  }, [selectedBuildingId]);

  useFrame((_, delta) => {
    if (!isAnimating.current || !controlsRef.current) return;
    const speed = Math.min(1, delta * 3.5);
    controlsRef.current.target.lerp(targetLookAt.current, speed);
    camera.position.lerp(targetCamPos.current, speed);
    controlsRef.current.update();

    if (
      camera.position.distanceTo(targetCamPos.current) < 1 &&
      controlsRef.current.target.distanceTo(targetLookAt.current) < 1
    ) {
      isAnimating.current = false;
    }
  });

  return null;
}

export interface CityCanvasProps {
  selectedBuildingId: string | null;
  onSelectBuilding: (buildingId: string | null) => void;
  hideGroundMap?: boolean;
  transparentBackground?: boolean;
  onCameraChange?: (cam: { lat: number; lon: number; zoom: number; heading: number; tilt: number }) => void;
}

export default function CityCanvas({
  selectedBuildingId,
  onSelectBuilding,
  hideGroundMap = false,
  transparentBackground = false,
  onCameraChange,
}: CityCanvasProps) {
  const controlsRef = useRef<any>(null);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onSelectBuilding(null);
    }
  };

  return (
    <div
      className={`w-full h-full relative ${transparentBackground ? 'bg-transparent' : 'bg-[#b8d8f2]'}`}
      onPointerDown={handlePointerDown}
    >
      <Canvas
        shadows={{ type: THREE.PCFSoftShadowMap }}
        gl={{
          antialias: true,
          alpha: transparentBackground,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.2,
        }}
      >
        {!transparentBackground && <color attach="background" args={['#b8d8f2']} />}

        {/* Realistic Daytime Sky */}
        {!transparentBackground && (
          <Sky
            distance={450000}
            sunPosition={[200, 400, 150]}
            inclination={0.5}
            azimuth={0.25}
            mieCoefficient={0.005}
            mieDirectionalG={0.8}
            rayleigh={0.6}
            turbidity={4}
          />
        )}
        {!transparentBackground && <fog attach="fog" args={['#c8def2', 2500, 9500]} />}

        <PerspectiveCamera
          makeDefault
          position={[360, 320, 420]}
          fov={38}
          near={0.5}
          far={12000}
        />
        <OrbitControls
          ref={controlsRef}
          enableDamping
          dampingFactor={0.05}
          maxPolarAngle={Math.PI / 2 - 0.02}
          minDistance={10}
          maxDistance={4000}
          target={[40, 50, -20]}
        />

        <CameraFocusHandler selectedBuildingId={selectedBuildingId} controlsRef={controlsRef} />

        {onCameraChange && (
          <CameraSyncHandler controlsRef={controlsRef} onCameraChange={onCameraChange} />
        )}

        <Environment preset="city" environmentIntensity={0.65} />

        {/* Mumbai daytime sunlight — warm key */}
        <directionalLight
          position={[200, 400, 150]}
          intensity={3.2}
          color="#fff8e7"
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-near={10}
          shadow-camera-far={1200}
          shadow-camera-left={-500}
          shadow-camera-right={500}
          shadow-camera-top={500}
          shadow-camera-bottom={-500}
          shadow-bias={-0.0002}
          shadow-normalBias={0.02}
        />

        {/* Cool sky fill — illuminates shadow faces */}
        <directionalLight
          position={[-200, 250, -180]}
          intensity={1.1}
          color="#9ec5e8"
        />

        <ambientLight intensity={0.65} color="#dce8f5" />
        <hemisphereLight
          intensity={0.5}
          groundColor="#d4c4a0"
          color="#87CEEB"
        />

        <City3DErrorBoundary>
          <Suspense fallback={<Loader />}>
            <LodhaCityModel
              selectedBuildingId={selectedBuildingId}
              onSelectBuilding={onSelectBuilding}
              hideGroundMap={hideGroundMap}
            />
          </Suspense>
        </City3DErrorBoundary>
      </Canvas>
    </div>
  );
}

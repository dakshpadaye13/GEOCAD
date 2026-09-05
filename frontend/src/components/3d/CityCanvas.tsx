import React, { Suspense, Component, ReactNode, useState, useEffect, useMemo } from 'react';
import { Canvas, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, useGLTF, useProgress, Html, PerspectiveCamera, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { VALID_BUILDING_IDS } from '../../data/buildings';

// Pre-load GLB asset
useGLTF.preload('/models/lodha_final.glb');

// Error Boundary
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
              onClick=
{() => this.setState({ hasError: false, error: null })}
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

// 3D Progress Loader
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

interface LodhaCityModelProps {
  selectedBuildingId: string | null;
  onSelectBuilding: (buildingId: string | null) => void;
}

// Main 3D Model Renderer with Interactive Selection & Highlighting
function LodhaCityModel({ selectedBuildingId, onSelectBuilding }: LodhaCityModelProps) {
  const { scene } = useGLTF('/models/lodha_final.glb');
  const [hoveredBuildingId, setHoveredBuildingId] = useState<string | null>(null);

  // Store enhanced baseline material clones per mesh to allow clean reversible highlighting
  const originalMaterialsMap = useMemo(() => {
    const map = new Map<string, THREE.Material | THREE.Material[]>();
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        if (mesh.material) {
          const cloneAndTune = (mat: THREE.Material) => {
            const m = mat.clone() as THREE.MeshStandardMaterial;
            const bId = mesh.userData.building_id || mesh.name;
            const isBuilding = VALID_BUILDING_IDS.has(bId);

            if (isBuilding || m.name === 'Mat_Buildings') {
              // Ensure repeating texture wrapping for architectural facade
              if (m.map) {
                m.map.wrapS = THREE.RepeatWrapping;
                m.map.wrapT = THREE.RepeatWrapping;
                m.map.needsUpdate = true;
              }
              // Enhanced architectural curtain-wall & metal reflection response
              m.roughness = 0.22;
              m.metalness = 0.38;
              m.envMapIntensity = 1.3;
            } else if (m.name === 'Mat_Landuse') {
              // Rich park lawns, sports grounds, and leisure gardens
              m.color = new THREE.Color('#225828');
              m.roughness = 0.94;
              m.metalness = 0.02;
              m.envMapIntensity = 0.2;
            } else if (m.name === 'Mat_Canopy') {
              // Vibrant organic tree crowns
              m.color = new THREE.Color('#1c4f21');
              m.roughness = 0.88;
              m.metalness = 0.0;
              m.envMapIntensity = 0.3;
            } else if (m.name === 'Mat_Trunk') {
              // Natural tree trunk bark
              m.color = new THREE.Color('#432e1f');
              m.roughness = 0.85;
              m.metalness = 0.0;
            } else if (m.name === 'Mat_Road_Yellow') {
              // High-visibility road network
              m.color = new THREE.Color('#f59e0b');
              m.roughness = 0.55;
              m.metalness = 0.05;
              m.envMapIntensity = 0.35;
            } else if (m.name === 'Mat_Railways') {
              // Dark railway track ballast
              m.color = new THREE.Color('#38312b');
              m.roughness = 0.65;
              m.metalness = 0.35;
            } else if (m.name === 'Mat_Roof') {
              // Architectural roof deck
              m.color = new THREE.Color('#cbd5e1');
              m.roughness = 0.82;
              m.metalness = 0.08;
              m.envMapIntensity = 0.4;
            } else if (m.name === 'Mat_Expanded_Base_Map' || m.name === 'rastMat') {
              // Keep ground raster plane matte and non-reflective
              m.roughness = 0.94;
              m.metalness = 0.04;
              m.envMapIntensity = 0.25;
            } else {
              m.envMapIntensity = 1.0;
            }
            m.needsUpdate = true;
            return m;
          };

          if (Array.isArray(mesh.material)) {
            const tuned = mesh.material.map(cloneAndTune);
            mesh.material = tuned;
            map.set(mesh.uuid, tuned.map(m => m.clone()));
          } else {
            const tuned = cloneAndTune(mesh.material);
            mesh.material = tuned;
            map.set(mesh.uuid, tuned.clone());
          }
        }
      }
    });
    return map;
  }, [scene]);

  // Dynamic Highlight Effect based on Selection / Hover state
  useEffect(() => {
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const bId = mesh.userData.building_id || mesh.name;
        const isBuilding = VALID_BUILDING_IDS.has(bId);

        if (isBuilding) {
          const isSelected = bId === selectedBuildingId;
          const isHovered = bId === hoveredBuildingId && !isSelected;
          const orig = originalMaterialsMap.get(mesh.uuid);
          const origMat = (Array.isArray(orig) ? orig[0] : orig) as THREE.MeshStandardMaterial | undefined;

          if (isSelected) {
            // High-contrast cyan emissive glow preserving facade texture pattern
            const highlightMat = new THREE.MeshStandardMaterial({
              color: new THREE.Color('#06b6d4'),
              emissive: new THREE.Color('#0891b2'),
              emissiveIntensity: 0.85,
              roughness: 0.18,
              metalness: 0.45,
              envMapIntensity: 1.4,
              map: origMat?.map || null,
            });
            mesh.material = highlightMat;
          } else if (isHovered) {
            // Subtle sky-blue emissive hover glow preserving facade texture pattern
            const hoverMat = new THREE.MeshStandardMaterial({
              color: new THREE.Color('#38bdf8'),
              emissive: new THREE.Color('#0284c7'),
              emissiveIntensity: 0.45,
              roughness: 0.24,
              metalness: 0.35,
              envMapIntensity: 1.2,
              map: origMat?.map || null,
            });
            mesh.material = hoverMat;
          } else {
            // Restore enhanced original material
            if (orig) mesh.material = orig;
          }
        }
      }
    });
  }, [selectedBuildingId, hoveredBuildingId, scene, originalMaterialsMap]);

  // Pointer Interaction Handlers
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

interface CityCanvasProps {
  selectedBuildingId: string | null;
  onSelectBuilding: (buildingId: string | null) => void;
}

export default function CityCanvas({ selectedBuildingId, onSelectBuilding }: CityCanvasProps) {
  // Deselect on Canvas background click (when clicking empty space)
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onSelectBuilding(null);
    }
  };

  return (
    <div className="w-full h-full relative bg-[#070b14]" onPointerDown={handlePointerDown}>
      <Canvas
        shadows={{ type: THREE.PCFSoftShadowMap }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.15,
        }}
      >
        <color attach="background" args={['#070b14']} />
        <fog attach="fog" args={['#070b14', 600, 3500]} />

        <PerspectiveCamera
          makeDefault
          position={[240, 220, 320]}
          fov={42}
          near={0.5}
          far={5000}
        />
        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          maxPolarAngle={Math.PI / 2 - 0.02}
          minDistance={10}
          maxDistance={2500}
          target={[30, 15, 0]}
        />

        {/* Environment Lighting for realistic glass & metal reflections */}
        <Environment preset="city" environmentIntensity={0.8} />

        {/* Calibrated Sun Key Light with crisp soft shadows */}
        <directionalLight
          position={[190, 320, 140]}
          intensity={2.5}
          color="#fff7ec"
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-near={10}
          shadow-camera-far={1100}
          shadow-camera-left={-380}
          shadow-camera-right={380}
          shadow-camera-top={380}
          shadow-camera-bottom={-380}
          shadow-bias={-0.0001}
          shadow-normalBias={0.02}
        />

        {/* Secondary Cool Sky Fill Light (opposite sun) */}
        <directionalLight
          position={[-150, 180, -120]}
          intensity={0.45}
          color="#7dd3fc"
        />

        {/* Balanced Ambient & Hemisphere lighting (prevents shadow blowout) */}
        <ambientLight intensity={0.25} color="#e2e8f0" />
        <hemisphereLight
          intensity={0.22}
          groundColor="#070b14"
          color="#bae6fd"
        />

        {/* 3D Model Container with Suspense and Error Boundary */}
        <City3DErrorBoundary>
          <Suspense fallback={<Loader />}>
            <LodhaCityModel
              selectedBuildingId={selectedBuildingId}
              onSelectBuilding={onSelectBuilding}
            />
          </Suspense>
        </City3DErrorBoundary>
      </Canvas>
    </div>
  );
}

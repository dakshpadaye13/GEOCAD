import React, { Suspense, Component, ReactNode, useState, useEffect } from 'react';
import { Canvas, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, useGLTF, useProgress, Html, PerspectiveCamera } from '@react-three/drei';
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

  // Store original material clones per mesh to allow clean reversible highlighting
  const originalMaterialsMap = React.useMemo(() => {
    const map = new Map<string, THREE.Material | THREE.Material[]>();
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        if (mesh.material) {
          map.set(mesh.uuid, Array.isArray(mesh.material) ? mesh.material.map(m => m.clone()) : mesh.material.clone());
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

          if (isSelected) {
            // High-contrast cyan emissive glow for selected building
            const highlightMat = new THREE.MeshStandardMaterial({
              color: new THREE.Color('#06b6d4'),
              emissive: new THREE.Color('#0891b2'),
              emissiveIntensity: 0.8,
              roughness: 0.2,
              metalness: 0.5,
            });
            mesh.material = highlightMat;
          } else if (isHovered) {
            // Subtle sky-blue emissive hover glow
            const hoverMat = new THREE.MeshStandardMaterial({
              color: new THREE.Color('#38bdf8'),
              emissive: new THREE.Color('#0284c7'),
              emissiveIntensity: 0.4,
              roughness: 0.3,
            });
            mesh.material = hoverMat;
          } else {
            // Restore original material
            const orig = originalMaterialsMap.get(mesh.uuid);
            if (orig) mesh.material = orig;
          }
        }
      }
    });
  }, [scene, selectedBuildingId, hoveredBuildingId, originalMaterialsMap]);

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
    <div className="w-full h-full relative bg-[#060911]" onPointerDown={handlePointerDown}>
      <Canvas
        shadows
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      >
        <PerspectiveCamera
          makeDefault
          position={[250, 250, 350]}
          fov={45}
          near={0.1}
          far={5000}
        />
        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          maxPolarAngle={Math.PI / 2 - 0.02}
          minDistance={10}
          maxDistance={2500}
          target={[30, 10, 0]}
        />
        
        {/* Lighting Setup */}
        <ambientLight intensity={1.2} />
        <hemisphereLight intensity={0.6} groundColor="#060911" color="#bae6fd" />
        <directionalLight
          position={[200, 350, 150]}
          intensity={1.8}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-far={1200}
          shadow-camera-left={-400}
          shadow-camera-right={400}
          shadow-camera-top={400}
          shadow-camera-bottom={-400}
        />
        <directionalLight position={[-150, 200, -150]} intensity={0.5} color="#38bdf8" />

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

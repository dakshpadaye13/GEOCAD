import React, { useState, useEffect } from 'react';
import CityCanvas from './components/3d/CityCanvas';
import MapLibreViewer from './components/map/MapLibreViewer';
import SearchBar from './components/ui/SearchBar';
import BuildingDetailCard from './components/ui/BuildingDetailCard';
import { Box, Map, Compass } from 'lucide-react';

export function App() {
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'3d' | 'map'>('3d');

  // Handle Escape key to close selection panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedBuildingId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="w-screen h-screen relative overflow-hidden select-none font-sans bg-[#b8d8f2] text-zinc-900">
      {/* Primary 3D Scene / Map Container */}
      <div className="absolute inset-0 z-0">
        {viewMode === '3d' ? (
          <CityCanvas
            selectedBuildingId={selectedBuildingId}
            onSelectBuilding={setSelectedBuildingId}
          />
        ) : (
          <MapLibreViewer
            selectedBuildingId={selectedBuildingId}
            onSelectBuilding={setSelectedBuildingId}
          />
        )}
      </div>

      {/* Top Header Pill — Architectural Brand HUD */}
      <header className="fixed top-6 left-24 z-20 pointer-events-none hidden sm:flex items-center gap-3">
        <div className="bg-white/90 backdrop-blur-xl border border-white/70 px-4 py-2.5 rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.08)] flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 animate-pulse" />
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold tracking-wider uppercase text-zinc-900 font-mono">
                GEOCAD DIGITAL TWIN
              </span>
              <span className="px-1.5 py-0.5 rounded-full bg-cyan-50 border border-cyan-200/80 text-cyan-700 text-[9px] font-semibold">
                LODHA PARK
              </span>
            </div>
            <span className="text-[10px] text-zinc-500 font-medium">
              Worli, Mumbai · 7 Architectural Towers Synced
            </span>
          </div>
        </div>
      </header>

      {/* Top Right: View Mode Toggle Pill (3D Digital Twin vs GIS Map) */}
      <div className="fixed top-6 right-6 z-20 pointer-events-auto">
        <div className="bg-white/90 backdrop-blur-xl border border-white/80 p-1 rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.1)] flex items-center gap-1">
          <button
            onClick={() => setViewMode('3d')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
              viewMode === '3d'
                ? 'bg-cyan-500 text-white shadow-sm'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100/70'
            }`}
          >
            <Box size={14} />
            <span>3D Digital Twin</span>
          </button>
          <button
            onClick={() => setViewMode('map')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
              viewMode === 'map'
                ? 'bg-cyan-500 text-white shadow-sm'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100/70'
            }`}
          >
            <Map size={14} />
            <span>GIS Map</span>
          </button>
        </div>
      </div>

      {/* Top-left: circular glossy search bar — expands to building search */}
      <SearchBar
        onSelectBuilding={setSelectedBuildingId}
        selectedBuildingId={selectedBuildingId}
      />

      {/* Right side: building detail card */}
      <BuildingDetailCard
        selectedBuildingId={selectedBuildingId}
        onClose={() => setSelectedBuildingId(null)}
      />

      {/* Bottom Floating Navigation Guidance Overlay */}
      <footer className="fixed bottom-6 left-6 z-10 pointer-events-none hidden md:block">
        <div className="bg-white/85 backdrop-blur-xl border border-white/80 px-4 py-2 rounded-full shadow-[0_4px_20px_rgba(0,0,0,0.06)] text-[11px] text-zinc-600 flex items-center gap-3">
          <Compass size={13} className="text-cyan-600 shrink-0" />
          <span><strong className="text-zinc-900 font-semibold">Select:</strong> Left Click Tower</span>
          <span className="text-zinc-300">•</span>
          <span><strong className="text-zinc-900 font-semibold">Rotate:</strong> Left Drag</span>
          <span className="text-zinc-300">•</span>
          <span><strong className="text-zinc-900 font-semibold">Pan:</strong> Right Drag</span>
          <span className="text-zinc-300">•</span>
          <span><strong className="text-zinc-900 font-semibold">Zoom:</strong> Scroll</span>
        </div>
      </footer>
    </div>
  );
}

export default App;

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


    </div>
  );
}

export default App;

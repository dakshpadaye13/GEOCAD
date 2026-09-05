import React, { useState, useEffect } from 'react';
import CityCanvas from './components/3d/CityCanvas';
import MapLibreViewer from './components/map/MapLibreViewer';
import SearchBar from './components/ui/SearchBar';
import BuildingDetailCard from './components/ui/BuildingDetailCard';
import { Box, Map, Compass } from 'lucide-react';

export function App() {
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'3d' | 'map'>('3d');
  const [hasStarted, setHasStarted] = useState<boolean>(false);

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

  if (!hasStarted) {
    return (
      <div className="w-screen h-screen relative overflow-hidden bg-black flex items-center justify-center font-sans select-none">
        <video 
          autoPlay 
          loop 
          muted 
          playsInline 
          className="absolute inset-0 w-full h-full object-cover opacity-70"
        >
          <source src="/landing_page.mp4" type="video/mp4" />
        </video>
        
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-10">
          <button 
            onClick={() => setHasStarted(true)}
            className="group relative px-10 py-4 bg-cyan-600/80 hover:bg-cyan-500 text-white font-bold tracking-[0.2em] uppercase text-sm rounded-full overflow-hidden transition-all duration-500 shadow-[0_0_40px_rgba(6,182,212,0.3)] hover:shadow-[0_0_60px_rgba(6,182,212,0.5)] hover:scale-105 border border-cyan-400/50 backdrop-blur-md"
          >
            {/* The animated shine overlay */}
            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/50 to-transparent w-1/2 animate-shine" />
            <span className="relative z-10">ENTER PLATFORM</span>
          </button>
        </div>
      </div>
    );
  }

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

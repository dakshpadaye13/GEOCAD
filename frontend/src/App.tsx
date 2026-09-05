import React, { useState, useEffect } from 'react';
import CityCanvas from './components/3d/CityCanvas';
import BuildingInfoPanel from './components/ui/BuildingInfoPanel';

export function App() {
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);

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
    <div className="w-screen h-screen bg-[#b2d4f2] text-slate-100 relative overflow-hidden font-sans select-none">
      {/* 3D Scene Container */}
      <div className="absolute inset-0 z-0">
        <CityCanvas
          selectedBuildingId={selectedBuildingId}
          onSelectBuilding={setSelectedBuildingId}
        />
      </div>

      {/* Floating HUD Header Overlay */}
      <header className="absolute top-4 left-4 z-10 pointer-events-none">
        <div className="bg-slate-950/75 border border-slate-800/80 backdrop-blur-md p-4 rounded-xl shadow-2xl space-y-1 max-w-sm">
          <div className="inline-flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-[11px] font-mono font-semibold tracking-wider text-cyan-400 uppercase">
              GEOCAD 3D DIGITAL TWIN
            </span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            Lodha Park — Worli, Mumbai
          </h1>
          <p className="text-xs text-slate-400 font-mono">
            Click any of the 7 towers to view database info
          </p>
        </div>
      </header>

      {/* Building Information Panel Overlay */}
      <BuildingInfoPanel
        buildingId={selectedBuildingId}
        onClose={() => setSelectedBuildingId(null)}
      />

      {/* Floating Controls Guidance Overlay */}
      <footer className="absolute bottom-4 left-4 z-10 pointer-events-none hidden sm:block">
        <div className="bg-slate-950/75 border border-slate-800/80 backdrop-blur-md px-4 py-2.5 rounded-lg shadow-xl text-[11px] font-mono text-slate-300 space-x-4 flex items-center">
          <span><strong className="text-cyan-400">Select:</strong> Left Click Tower</span>
          <span className="text-slate-700">|</span>
          <span><strong className="text-cyan-400">Rotate:</strong> Left Click + Drag</span>
          <span className="text-slate-700">|</span>
          <span><strong className="text-cyan-400">Pan:</strong> Right Click + Drag</span>
          <span className="text-slate-700">|</span>
          <span><strong className="text-cyan-400">Zoom:</strong> Scroll Wheel</span>
        </div>
      </footer>
    </div>
  );
}

export default App;

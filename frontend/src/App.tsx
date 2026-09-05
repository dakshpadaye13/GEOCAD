import React, { useState } from 'react';
import CityCanvas from './components/3d/CityCanvas';
import TopHudPanel from './components/ui/TopHudPanel';
import ControlBar from './components/ui/ControlBar';

export function App() {
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);

  return (
    <div className="w-screen h-screen relative overflow-hidden select-none font-sans">
      {/* 3D Scene — fills entire viewport */}
      <div className="absolute inset-0 z-0">
        <CityCanvas
          selectedBuildingId={selectedBuildingId}
          onSelectBuilding={setSelectedBuildingId}
        />
      </div>

      {/*
        Top-left HUD panel.
        Compact by default; expands horizontally when a building is selected.
        TopHudPanel owns its own Escape / click-outside listeners.
      */}
      <TopHudPanel
        selectedBuildingId={selectedBuildingId}
        onClose={() => setSelectedBuildingId(null)}
      />

      {/*
        Centered floating control-bar pill, fixed bottom-6.
      */}
      <ControlBar />
    </div>
  );
}

export default App;

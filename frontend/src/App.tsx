import React, { useState } from 'react';
import CityCanvas from './components/3d/CityCanvas';
import SearchBar from './components/ui/SearchBar';
import BuildingDetailCard from './components/ui/BuildingDetailCard';

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

      {/* Top-left: circular glossy search bar — expands to building search */}
      <SearchBar
        onSelectBuilding={setSelectedBuildingId}
        selectedBuildingId={selectedBuildingId}
      />

      {/* Right side: building detail card (ExpandableCard mechanics) */}
      <BuildingDetailCard
        selectedBuildingId={selectedBuildingId}
        onClose={() => setSelectedBuildingId(null)}
      />
    </div>
  );
}

export default App;

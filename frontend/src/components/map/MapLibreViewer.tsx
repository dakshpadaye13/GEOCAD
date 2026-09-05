import React, { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MapLibreThreeLayer, GEOCAD_BLENDER_ANCHOR } from './MapLibreThreeLayer';
import { Map, Layers } from 'lucide-react';
import { BUILDINGS_DATA } from '../../data/buildings';

interface MapLibreViewerProps {
  selectedBuildingId: string | null;
  onSelectBuilding: (buildingId: string | null) => void;
}

import { LOCAL_MAP_SOURCES, LOCAL_MAP_LAYERS } from '../../data/map/mapLayers';

const LOCAL_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: LOCAL_MAP_SOURCES,
  layers: LOCAL_MAP_LAYERS,
  glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
};

export default function MapLibreViewer({
  selectedBuildingId,
  onSelectBuilding,
}: MapLibreViewerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const threeLayerRef = useRef<MapLibreThreeLayer | null>(null);

  const [loadProgress, setLoadProgress] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: LOCAL_STYLE,
      center: [GEOCAD_BLENDER_ANCHOR.longitude, GEOCAD_BLENDER_ANCHOR.latitude],
      zoom: 16.5,
      pitch: 60,
      bearing: 0,
      maxPitch: 85,
    });

    mapRef.current = map;

    const threeLayer = new MapLibreThreeLayer({
      selectedBuildingId,
      onSelectBuilding,
      onLoadProgress: (progress) => setLoadProgress(progress),
      onLoadComplete: () => setIsLoading(false),
    });
    threeLayerRef.current = threeLayer;

    map.on('style.load', () => {
      if (!map.getLayer(threeLayer.id)) {
        map.addLayer(threeLayer);
      }
    });

    map.on('mousemove', (e: maplibregl.MapMouseEvent) => {
      if (threeLayerRef.current && mapContainerRef.current) {
        const bounds = mapContainerRef.current.getBoundingClientRect();
        const x = e.originalEvent.clientX - bounds.left;
        const y = e.originalEvent.clientY - bounds.top;
        threeLayerRef.current.handlePointerMove({ x, y }, bounds);
      }
    });

    map.on('click', (e: maplibregl.MapMouseEvent) => {
      if (threeLayerRef.current && mapContainerRef.current) {
        const bounds = mapContainerRef.current.getBoundingClientRect();
        const x = e.originalEvent.clientX - bounds.left;
        const y = e.originalEvent.clientY - bounds.top;
        threeLayerRef.current.handleClick({ x, y }, bounds);
      }
    });

    return () => {
      map.remove();
    };
  }, []);

  // Sync building selection state changes and smooth camera flight
  useEffect(() => {
    if (threeLayerRef.current) {
      threeLayerRef.current.setSelectedBuildingId(selectedBuildingId);
    }
    if (mapRef.current && selectedBuildingId) {
      const bMeta = BUILDINGS_DATA[selectedBuildingId];
      if (bMeta) {
        mapRef.current.flyTo({
          center: [bMeta.lon, bMeta.lat],
          zoom: 17.5,
          pitch: 65,
          bearing: 15,
          duration: 1200,
          essential: true,
        });
      }
    }
  }, [selectedBuildingId]);

  return (
    <div className="w-full h-full relative overflow-hidden bg-[#b8d8f2]">
      {/* Loading Progress Indicator */}
      {isLoading && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/70 backdrop-blur-md">
          <div className="flex flex-col items-center justify-center p-6 rounded-3xl bg-white border border-gray-200/80 shadow-2xl space-y-3 min-w-[220px]">
            <div className="relative w-12 h-12 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-2 border-cyan-200 border-t-cyan-500 animate-spin" />
              <span className="text-xs font-mono font-bold text-cyan-600">
                {loadProgress.toFixed(0)}%
              </span>
            </div>
            <div className="text-center space-y-1">
              <div className="text-xs font-semibold text-zinc-900 tracking-wide uppercase font-mono">
                Synchronizing 3D City Model
              </div>
              <div className="text-[10px] text-zinc-500 font-mono">
                Lodha Park — Worli, Mumbai (EPSG:3857)
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MapLibre Container */}
      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
}

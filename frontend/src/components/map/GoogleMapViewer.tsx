import React, { useEffect, useRef, useState, useCallback } from 'react';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import CityCanvas from '../3d/CityCanvas';
import { Map, Layers, AlertCircle } from 'lucide-react';

interface GoogleMapViewerProps {
  selectedBuildingId: string | null;
  onSelectBuilding: (buildingId: string | null) => void;
}

export const GEOCAD_ORIGIN = {
  lat: 19.004045814713944,
  lng: 72.82840086877108,
};

export default function GoogleMapViewer({
  selectedBuildingId,
  onSelectBuilding,
}: GoogleMapViewerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [googleMap, setGoogleMap] = useState<google.maps.Map | null>(null);
  const [mapType, setMapType] = useState<'roadmap' | 'hybrid'>('roadmap');
  const [isApiKeyMissing, setIsApiKeyMissing] = useState<boolean>(false);
  const [isMapLoaded, setIsMapLoaded] = useState<boolean>(false);

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

  useEffect(() => {
    if (!apiKey || apiKey.trim() === '') {
      setIsApiKeyMissing(true);
      return;
    }

    setIsApiKeyMissing(false);
    setOptions({
      key: apiKey,
      v: 'beta',
    });

    importLibrary('maps')
      .then(() => {
        if (!mapRef.current) return;

        const map = new google.maps.Map(mapRef.current, {
          center: { lat: GEOCAD_ORIGIN.lat, lng: GEOCAD_ORIGIN.lng },
          zoom: 17.5,
          tilt: 60,
          heading: 0,
          mapTypeId: mapType,
          disableDefaultUI: true,
          zoomControl: false,
          gestureHandling: 'none', // Camera is controlled synchronously by Three.js OrbitControls
        });

        setGoogleMap(map);
        setIsMapLoaded(true);
      })
      .catch((err: Error) => {
        console.error('Failed to load Google Maps API:', err);
        setIsApiKeyMissing(true);
      });
  }, [apiKey]);

  // Sync map type (ROADMAP vs SATELLITE)
  useEffect(() => {
    if (googleMap) {
      googleMap.setMapTypeId(mapType);
    }
  }, [mapType, googleMap]);

  // Real-time Camera Sync from Three.js OrbitControls -> Google Map Base
  const lastUpdateRef = useRef<number>(0);
  const handleCameraChange = useCallback(
    (cam: { lat: number; lon: number; zoom: number; heading: number; tilt: number }) => {
      if (!googleMap) return;

      const now = performance.now();
      if (now - lastUpdateRef.current < 30) return; // Throttle to ~30fps for silky smooth sync
      lastUpdateRef.current = now;

      googleMap.setCenter({ lat: cam.lat, lng: cam.lon });
      googleMap.setZoom(cam.zoom);
      googleMap.setHeading(cam.heading);
      googleMap.setTilt(cam.tilt);
    },
    [googleMap]
  );

  if (isApiKeyMissing) {
    return (
      <div className="w-full h-full relative">
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 bg-slate-900/90 border border-amber-500/40 text-amber-200 px-4 py-2.5 rounded-xl shadow-xl backdrop-blur-md flex items-center space-x-3 text-xs max-w-lg">
          <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <div>
            <span className="font-semibold text-white">Google Maps Base Map:</span> Add your{' '}
            <code className="bg-slate-800 px-1 py-0.5 rounded text-cyan-300 font-mono">
              VITE_GOOGLE_MAPS_API_KEY
            </code>{' '}
            to <code className="bg-slate-800 px-1 py-0.5 rounded text-cyan-300 font-mono">frontend/.env</code> to enable live base map.
          </div>
        </div>

        <CityCanvas
          selectedBuildingId={selectedBuildingId}
          onSelectBuilding={onSelectBuilding}
          hideGroundMap={false}
          transparentBackground={false}
        />
      </div>
    );
  }

  return (
    <div className="w-full h-full relative overflow-hidden bg-slate-950">
      {/* Top Right: Map / Satellite Style Switcher */}
      <div className="absolute top-20 right-6 z-30 flex items-center bg-slate-950/80 backdrop-blur-xl border border-cyan-500/20 rounded-xl p-1 shadow-2xl space-x-1">
        <button
          onClick={() => setMapType('roadmap')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
            mapType === 'roadmap'
              ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Map className="w-3.5 h-3.5" />
          <span>MAP</span>
        </button>
        <button
          onClick={() => setMapType('hybrid')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
            mapType === 'hybrid'
              ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>SATELLITE</span>
        </button>
      </div>

      {/* Layer 1 (z-0): Live Google Map Base */}
      <div
        ref={mapRef}
        className="absolute inset-0 z-0 w-full h-full pointer-events-none"
      />

      {/* Layer 2 (z-10): 3D GEOCAD City Buildings Overlay with Full Interaction & Lighting */}
      <div className="absolute inset-0 z-10 w-full h-full">
        <CityCanvas
          selectedBuildingId={selectedBuildingId}
          onSelectBuilding={onSelectBuilding}
          hideGroundMap={isMapLoaded}
          transparentBackground={isMapLoaded}
          onCameraChange={handleCameraChange}
        />
      </div>
    </div>
  );
}

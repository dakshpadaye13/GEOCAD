import React, { useState, useEffect } from 'react';
import { fetchBuildingById, BuildingDTO } from '../../api/buildings';

interface BuildingInfoPanelProps {
  buildingId: string | null;
  onClose: () => void;
}

export const BuildingInfoPanel: React.FC<BuildingInfoPanelProps> = ({ buildingId, onClose }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [building, setBuilding] = useState<BuildingDTO | null>(null);

  useEffect(() => {
    if (!buildingId) {
      setBuilding(null);
      setError(null);
      setLoading(false);
      return;
    }

    let isSubscribed = true;

    async function loadBuildingData() {
      setLoading(true);
      setError(null);
      setBuilding(null);

      const response = await fetchBuildingById(buildingId!);

      if (!isSubscribed) return;

      if (response.error || !response.data) {
        setError(response.error || 'Unable to load building information.');
        setBuilding(null);
      } else {
        setBuilding(response.data);
        setError(null);
      }

      setLoading(false);
    }

    loadBuildingData();

    return () => {
      isSubscribed = false;
    };
  }, [buildingId]);

  if (!buildingId) return null;

  return (
    <div className="absolute top-4 right-4 z-20 w-80 sm:w-96 bg-slate-950/85 border border-cyan-500/30 backdrop-blur-xl rounded-2xl p-5 shadow-2xl space-y-4 text-slate-100 animate-in fade-in slide-in-from-right-4 duration-300">
      {/* Header with Title & Close Button */}
      <div className="flex items-start justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className={`inline-block w-2 h-2 rounded-full ${loading ? 'bg-amber-400 animate-ping' : error ? 'bg-rose-500' : 'bg-emerald-400 animate-pulse'}`} />
            <span className={`text-[10px] font-mono font-bold tracking-widest uppercase ${error ? 'text-rose-400' : 'text-emerald-400'}`}>
              {loading ? 'STATUS: FETCHING' : error ? 'STATUS: ERROR' : `STATUS: ${building?.status || 'EXISTING'}`}
            </span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white">
            {building ? building.buildingName : buildingId}
          </h2>
          <div className="mt-1 flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 font-mono text-[10px] font-semibold tracking-wider">
              {buildingId}
            </span>
            {building?.currentVersion && (
              <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700/60 text-slate-300 font-mono text-[10px] font-semibold tracking-wider">
                VERSION {building.currentVersion.versionNumber}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors border border-slate-700/50"
          title="Close building info"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="py-6 flex flex-col items-center justify-center space-y-2">
          <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-mono text-cyan-300 animate-pulse">Loading building information...</p>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="py-4 px-3 bg-rose-950/40 border border-rose-500/30 rounded-xl text-center space-y-2">
          <p className="text-xs font-mono text-rose-300">{error}</p>
        </div>
      )}

      {/* Database Loaded Content */}
      {!loading && !error && building && (
        <>
          {/* Description */}
          <p className="text-xs text-slate-300 leading-relaxed font-sans">
            {building.currentVersion?.description || 'No description configured in database baseline.'}
          </p>

          {/* Grid Specs Metadata */}
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <div className="bg-slate-900/60 border border-slate-800/60 rounded-xl p-3">
              <div className="text-[10px] font-mono uppercase text-slate-400 tracking-wider">
                Floors
              </div>
              <div className="text-sm font-semibold font-mono text-slate-200 mt-0.5">
                {building.currentVersion?.totalFloors !== null && building.currentVersion?.totalFloors !== undefined
                  ? building.currentVersion.totalFloors
                  : 'Not configured'}
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800/60 rounded-xl p-3">
              <div className="text-[10px] font-mono uppercase text-slate-400 tracking-wider">
                Basements
              </div>
              <div className="text-sm font-semibold font-mono text-slate-200 mt-0.5">
                {building.currentVersion?.totalBasements !== null && building.currentVersion?.totalBasements !== undefined
                  ? building.currentVersion.totalBasements
                  : 'Not configured'}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Footer Controls Action Hint */}
      <div className="pt-2 flex items-center justify-between border-t border-slate-800/80 text-[10px] font-mono text-slate-400">
        <span>Press Esc or click close to deselect</span>
        <button
          onClick={onClose}
          className="text-cyan-400 hover:underline font-semibold"
        >
          Deselect Building
        </button>
      </div>
    </div>
  );
};

export default BuildingInfoPanel;

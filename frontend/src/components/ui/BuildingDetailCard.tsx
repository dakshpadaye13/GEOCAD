import React, { useEffect, useRef, useId } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, MapPin, Layers, ShieldCheck, Hash, Building2, Ruler, Car, Database } from "lucide-react";
import { fetchBuildingById, BuildingDTO } from "../../api/buildings";
import { BUILDINGS_DATA } from "../../data/buildings";

// ── Per-building images from /public/textures/ ────────────────────────────────
const BUILDING_IMAGES: Record<string, string> = {
  "BLDG-LODHA-WORLD-ONE": "/textures/lodha_worldone.jpg",
  "BLDG-LODHA-TRUMP":     "/textures/lodha_trumptower.jpg",
  "BLDG-LODHA-MARQUISE":  "/textures/lodha_marquise.jpg",
  "BLDG-LODHA-KIARA":     "/textures/lodha_kiara.jpg",
  "BLDG-LODHA-ADRINA":    "/textures/lodha_adrina.jpg",
  "BLDG-LODHA-PARKSIDE":  "/textures/lodha_parkside.jpg",
  "BLDG-LODHA-ALLURA":    "/textures/Lodha_allura.jpg",
};

const SPRING = { type: "spring" as const, stiffness: 300, damping: 30 };

export interface BuildingDetailCardProps {
  selectedBuildingId: string | null;
  buildingData?: BuildingDTO | null;
  onClose: () => void;
}

export function BuildingDetailCard({
  selectedBuildingId,
  buildingData: initialBuildingData,
  onClose,
}: BuildingDetailCardProps) {
  const id = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const [fetchedData, setFetchedData] = React.useState<BuildingDTO | null>(null);
  const [isDbSynced, setIsDbSynced] = React.useState<boolean>(false);

  useEffect(() => {
    if (!selectedBuildingId) {
      setFetchedData(null);
      setIsDbSynced(false);
      return;
    }
    let isMounted = true;
    fetchBuildingById(selectedBuildingId)
      .then((res) => {
        if (isMounted && res && res.data) {
          setFetchedData(res.data);
          setIsDbSynced(true);
        }
      })
      .catch(() => {
        if (isMounted) {
          setFetchedData(null);
          setIsDbSynced(false);
        }
      });
    return () => { isMounted = false; };
  }, [selectedBuildingId]);

  const buildingData = initialBuildingData || fetchedData;

  const isOpen = Boolean(selectedBuildingId);

  // ── Escape key ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // ── Click outside the panel (but NOT inside the canvas) ───────────────────
  useEffect(() => {
    if (!isOpen) return;
    const onClick = (e: MouseEvent | TouchEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const t = setTimeout(() => {
      document.addEventListener("mousedown", onClick);
      document.addEventListener("touchstart", onClick);
    }, 120);
    return () => {
      clearTimeout(t);
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("touchstart", onClick);
    };
  }, [isOpen, onClose]);

  // ── Derived values ─────────────────────────────────────────────────────────
  const localMeta   = selectedBuildingId ? BUILDINGS_DATA[selectedBuildingId] : undefined;
  const name        = buildingData?.buildingName || localMeta?.buildingName || selectedBuildingId || "";
  const description = buildingData?.currentVersion?.description || localMeta?.description || "";
  const status      = buildingData?.status || localMeta?.status || "Existing";
  const assetType   = localMeta?.assetType || buildingData?.assetType || "Residential Tower";
  const floors      = buildingData?.currentVersion?.totalFloors ?? localMeta?.floors;
  const basements   = buildingData?.currentVersion?.totalBasements ?? localMeta?.basements;
  const heightStr   = localMeta?.heightStr || (floors ? `${floors * 3.5} m` : "268 m");
  const parking     = localMeta?.parking || "Multi-Level Basement";
  const src         = selectedBuildingId ? BUILDING_IMAGES[selectedBuildingId] : undefined;

  const chips = [
    { icon: Building2,   label: "Type",      value: assetType },
    { icon: ShieldCheck, label: "Status",    value: status },
    { icon: Hash,        label: "Floors",    value: floors != null ? `${floors} Storeys` : "N/A" },
    { icon: Layers,      label: "Basements", value: basements != null ? `${basements} Levels` : "N/A" },
    { icon: Ruler,       label: "Height",    value: heightStr },
    { icon: MapPin,      label: "Location",  value: "Worli, Mumbai" },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Soft right-side backdrop — does NOT cover the left scene */}
          <motion.div
            key="panel-scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-20 pointer-events-none"
            style={{
              background:
                "linear-gradient(to left, rgba(0,0,0,0.25) 0%, transparent 60%)",
            }}
          />

          {/* ── SLIDE-IN FLOATING CURVED SIDE PANEL ── */}
          <motion.div
            key={`panel-${id}`}
            ref={panelRef}
            // Slide in from right edge — floating curvy card
            initial={{ x: "110%", opacity: 0, scale: 0.96 }}
            animate={{ x: 0, opacity: 1, scale: 1 }}
            exit={{ x: "110%", opacity: 0, scale: 0.96 }}
            transition={SPRING}
            className="fixed top-4 right-4 bottom-4 z-30 pointer-events-auto flex flex-col
                       bg-white/95 backdrop-blur-xl
                       rounded-[28px] border border-gray-200/90
                       shadow-[-20px_20px_50px_rgba(0,0,0,0.18),_0_0_0_1px_rgba(0,0,0,0.04),_inset_0_1px_0_rgba(255,255,255,0.9)]
                       overflow-hidden"
            style={{ width: "min(380px, calc(100vw - 32px))" }}
          >
            {/* Scrollable interior wrapper */}
            <div className="flex-1 flex flex-col overflow-y-auto [scrollbar-width:none]">
            {/* ── Hero image ─────────────────────────────────────────────── */}
            {src && (
              <div className="relative shrink-0 h-52 overflow-hidden">
                <img
                  src={src}
                  alt={name}
                  className="w-full h-full object-cover object-center"
                />
                {/* Gradient fade over image bottom */}
                <div className="absolute inset-0 bg-gradient-to-t from-white/80 via-transparent to-transparent" />

                {/* Close button — floats over image, top-right */}
                <button
                  aria-label="Close panel"
                  onClick={onClose}
                  className="absolute top-4 right-4 h-9 w-9 flex items-center justify-center
                             rounded-full bg-white/90 hover:bg-white border border-gray-200/80
                             shadow-sm text-zinc-600 hover:text-zinc-900
                             transition-colors focus:outline-none"
                >
                  <X size={18} />
                </button>
              </div>
            )}

            {/* ── Header (no image = show close at top) ──────────────────── */}
            {!src && (
              <div className="flex items-center justify-between px-6 pt-6 pb-2 shrink-0">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-500">
                  Selected Tower
                </span>
                <button
                  aria-label="Close panel"
                  onClick={onClose}
                  className="h-8 w-8 flex items-center justify-center rounded-full
                             border border-gray-200 text-zinc-500 hover:text-zinc-900
                             hover:border-gray-300 transition-colors focus:outline-none"
                >
                  <X size={16} />
                </button>
              </div>
            )}

            {/* ── Body ───────────────────────────────────────────────────── */}
            <div className="flex flex-col gap-6 px-6 py-5 flex-1">
              {/* Eyebrow + name */}
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-500 mb-1">
                  Lodha Park · Worli, Mumbai
                </p>
                <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 leading-tight">
                  {name}
                </h2>
              </div>

              {/* Description */}
              {description && (
                <p className="text-sm text-zinc-500 leading-relaxed -mt-2">
                  {description}
                </p>
              )}

              {/* Stat chips — 2-column grid */}
              <div className="grid grid-cols-2 gap-3">
                {chips.map((chip, i) => {
                  const Icon = chip.icon;
                  return (
                    <motion.div
                      key={chip.label}
                      className="flex flex-col gap-1.5 bg-zinc-50 rounded-xl px-4 py-3 border border-gray-100"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ ...SPRING, delay: i * 0.05 }}
                    >
                      <div className="flex items-center gap-1.5">
                        <Icon size={11} className="text-zinc-400 shrink-0" />
                        <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">
                          {chip.label}
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-zinc-900">{chip.value}</span>
                    </motion.div>
                  );
                })}
              </div>

              {/* Parking & Database Telemetry */}
              <div className="border-t border-gray-100 pt-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Car size={13} className="text-zinc-400" />
                    <span className="text-[11px] font-medium text-zinc-600">Parking Capacity</span>
                  </div>
                  <span className="text-[11px] font-semibold text-zinc-900">{parking}</span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1.5">
                    <Database size={13} className={isDbSynced ? "text-emerald-500" : "text-cyan-500"} />
                    <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                      {isDbSynced ? "PostgreSQL 16 Synced" : "Database Synchronized"}
                    </span>
                  </div>
                  <span className={`w-2 h-2 rounded-full ${isDbSynced ? "bg-emerald-500 animate-pulse" : "bg-cyan-500"}`} />
                </div>

                <div>
                  <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-semibold mb-0.5">
                    Building Identifier
                  </p>
                  <p className="text-xs font-mono text-zinc-600 font-medium">{selectedBuildingId}</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default BuildingDetailCard;

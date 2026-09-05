import React, { useEffect, useRef, useId, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X, MapPin, Layers, ShieldCheck, Hash, Building2, Ruler, Car, Database,
  ChevronRight, ChevronLeft, Home, DoorOpen, Maximize2, User, Wrench,
  LayoutGrid, Tag
} from "lucide-react";
import {
  fetchBuildingById, BuildingDTO, FloorDTO, UnitDTO, UnitDetailDTO,
  fetchFloorsByBuilding, fetchUnitsByFloor, fetchUnitById,
} from "../../api/buildings";
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

// ── Navigation types ──────────────────────────────────────────────────────────

interface NavFrame {
  level: 0 | 1 | 2 | 3;
  floorId?: string;
  floorNumber?: number;
  floorName?: string;
  unitId?: string;
  unitNumber?: string;
}

// ── Skeleton Pulse ────────────────────────────────────────────────────────────

function SkeletonPulse({ rows = 5 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3 px-1">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-14 rounded-xl bg-zinc-100 animate-pulse"
          style={{ animationDelay: `${i * 80}ms` }}
        />
      ))}
    </div>
  );
}

// ── Drill Header (back + breadcrumb + close) ──────────────────────────────────

interface DrillHeaderProps {
  segments: string[];
  onBack: () => void;
  onClose: () => void;
}

function DrillHeader({ segments, onBack, onClose }: DrillHeaderProps) {
  return (
    <div className="flex items-center gap-2 px-5 pt-5 pb-3 shrink-0">
      {/* Back button */}
      <button
        aria-label="Go back"
        onClick={onBack}
        className="h-9 w-9 flex items-center justify-center shrink-0
                   rounded-full bg-white/90 hover:bg-white border border-gray-200/80
                   shadow-sm text-zinc-600 hover:text-zinc-900
                   transition-colors focus:outline-none"
      >
        <ChevronLeft size={18} />
      </button>

      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 min-w-0 overflow-hidden flex-1">
        {segments.map((seg, i) => {
          const isLast = i === segments.length - 1;
          return (
            <React.Fragment key={i}>
              {i > 0 && <span className="text-zinc-300 shrink-0">›</span>}
              <span
                className={`truncate ${isLast ? "text-zinc-900 font-semibold" : ""}`}
                title={seg}
              >
                {seg}
              </span>
            </React.Fragment>
          );
        })}
      </div>

      {/* Close button */}
      <button
        aria-label="Close panel"
        onClick={onClose}
        className="h-9 w-9 flex items-center justify-center shrink-0
                   rounded-full bg-white/90 hover:bg-white border border-gray-200/80
                   shadow-sm text-zinc-600 hover:text-zinc-900
                   transition-colors focus:outline-none"
      >
        <X size={18} />
      </button>
    </div>
  );
}

// ── Stat Chip (reusable across all levels) ────────────────────────────────────

interface StatChipProps {
  icon: React.ElementType;
  label: string;
  value: string;
  index: number;
  onClick?: () => void;
  tappable?: boolean;
}

function StatChip({ icon: Icon, label, value, index, onClick, tappable }: StatChipProps) {
  return (
    <motion.div
      className={`flex flex-col gap-1.5 bg-zinc-50 rounded-xl px-4 py-3 border border-gray-100
        ${tappable ? "cursor-pointer hover:bg-zinc-100 active:bg-zinc-200 transition-colors" : ""}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...SPRING, delay: index * 0.05 }}
      onClick={onClick}
    >
      <div className="flex items-center gap-1.5">
        <Icon size={11} className="text-zinc-400 shrink-0" />
        <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold flex-1">
          {label}
        </span>
        {tappable && <ChevronRight size={12} className="text-zinc-300 shrink-0" />}
      </div>
      <span className="text-sm font-semibold text-zinc-900">{value}</span>
    </motion.div>
  );
}

// ── LEVEL 0 — Building Info Screen ────────────────────────────────────────────

interface BuildingInfoScreenProps {
  selectedBuildingId: string;
  buildingData: BuildingDTO | null;
  isDbSynced: boolean;
  onClose: () => void;
  onDrillFloors: () => void;
}

function BuildingInfoScreen({
  selectedBuildingId,
  buildingData,
  isDbSynced,
  onClose,
  onDrillFloors,
}: BuildingInfoScreenProps) {
  const localMeta   = BUILDINGS_DATA[selectedBuildingId];
  const name        = buildingData?.buildingName || localMeta?.buildingName || selectedBuildingId;
  const description = buildingData?.currentVersion?.description || localMeta?.description || "";
  const status      = buildingData?.status || localMeta?.status || "Existing";
  const assetType   = localMeta?.assetType || buildingData?.assetType || "Residential Tower";
  const floors      = buildingData?.currentVersion?.totalFloors ?? localMeta?.floors;
  const basements   = buildingData?.currentVersion?.totalBasements ?? localMeta?.basements;
  const heightStr   = localMeta?.heightStr || (floors ? `${Number(floors) * 3.5} m` : "268 m");
  const parking     = localMeta?.parking || "Multi-Level Basement";
  const src         = BUILDING_IMAGES[selectedBuildingId];

  const chips = [
    { icon: Building2,   label: "Type",      value: assetType,                                                tappable: false },
    { icon: ShieldCheck, label: "Status",    value: status,                                                   tappable: false },
    { icon: Hash,        label: "Floors",    value: floors != null ? `${floors} Storeys` : "N/A",             tappable: true, onTap: onDrillFloors },
    { icon: Layers,      label: "Basements", value: basements != null ? `${basements} Levels` : "N/A",       tappable: false },
    { icon: Ruler,       label: "Height",    value: heightStr,                                                tappable: false },
    { icon: MapPin,      label: "Location",  value: "Worli, Mumbai",                                         tappable: false },
  ];

  return (
    <>
      {/* ── Hero image ───────────────────────────────────────────────── */}
      {src && (
        <div className="relative shrink-0 h-52 overflow-hidden">
          <img
            src={src}
            alt={name}
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-white/80 via-transparent to-transparent" />
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

      {/* ── Body ────────────────────────────────────────────────────── */}
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
          {chips.map((chip, i) => (
            <StatChip
              key={chip.label}
              icon={chip.icon}
              label={chip.label}
              value={chip.value}
              index={i}
              tappable={chip.tappable}
              onClick={chip.tappable && chip.onTap ? chip.onTap : undefined}
            />
          ))}
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
    </>
  );
}

// ── LEVEL 1 — Floor List Screen ───────────────────────────────────────────────

interface FloorListScreenProps {
  buildingId: string;
  buildingName: string;
  onBack: () => void;
  onClose: () => void;
  onSelectFloor: (floor: FloorDTO) => void;
}

function FloorListScreen({ buildingId, buildingName, onBack, onClose, onSelectFloor }: FloorListScreenProps) {
  const [floors, setFloors] = useState<FloorDTO[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    console.log(`[BuildingDetailCard Level 1] Opening Floors view for "${buildingName}" (${buildingId})`);
    fetchFloorsByBuilding(buildingId).then((res) => {
      if (!cancelled) {
        const floorList = res.data?.floors ?? [];
        console.log(`[BuildingDetailCard Level 1] Floors loaded for ${buildingId}: ${floorList.length} records.`, floorList);
        setFloors(floorList);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [buildingId, buildingName]);

  return (
    <>
      <DrillHeader
        segments={[buildingName, "Floors"]}
        onBack={onBack}
        onClose={onClose}
      />
      <div className="flex flex-col gap-4 px-6 pb-6 flex-1 overflow-y-auto [scrollbar-width:none]">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-cyan-600">
          Floors · {loading ? "…" : `${floors.length} Total`}
        </p>

        {loading ? (
          <SkeletonPulse rows={6} />
        ) : floors.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Layers size={32} className="text-zinc-200" />
            <p className="text-sm text-zinc-400 text-center">No floors configured yet.</p>
            <p className="text-xs text-zinc-300 text-center">Add floor data via the API to see it here.</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {floors.map((floor, i) => {
              const elevLabel = floor.elevationMinM != null && floor.elevationMaxM != null
                ? `Elevation: ${floor.elevationMinM.toFixed(1)}m – ${floor.elevationMaxM.toFixed(1)}m`
                : `Floor ${floor.floorNumber}`;
              return (
                <motion.button
                  key={floor.floorId}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...SPRING, delay: i * 0.03 }}
                  onClick={() => onSelectFloor(floor)}
                  className="flex items-center justify-between px-4 py-3.5 rounded-xl
                             hover:bg-zinc-50 active:bg-zinc-100 cursor-pointer transition-colors
                             border-b border-zinc-100 last:border-0 text-left"
                >
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="font-semibold text-zinc-900 text-sm truncate">
                      {floor.floorName}
                    </span>
                    <span className="text-xs text-zinc-400 truncate">
                      {elevLabel}
                    </span>
                  </div>
                  <ChevronRight size={16} className="text-zinc-300 shrink-0 ml-2" />
                </motion.button>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

// ── LEVEL 2 — Room Grid Screen ────────────────────────────────────────────────

function getUnitStatusStyle(status: string): string {
  const s = status.toUpperCase();
  if (s === "VACANT") return "border-zinc-200 bg-zinc-50 text-zinc-500";
  if (s.includes("MAINTENANCE")) return "border-amber-200 bg-amber-50 text-amber-700";
  // OCCUPIED, EXISTING, or default
  return "border-cyan-200 bg-cyan-50 text-cyan-700";
}

function getUnitDotColor(status: string): string {
  const s = status.toUpperCase();
  if (s === "VACANT") return "bg-zinc-400";
  if (s.includes("MAINTENANCE")) return "bg-amber-500";
  return "bg-cyan-500";
}

interface RoomGridScreenProps {
  buildingName: string;
  floorId: string;
  floorNumber: number;
  floorName: string;
  onBack: () => void;
  onClose: () => void;
  onSelectUnit: (unit: UnitDTO) => void;
}

function RoomGridScreen({ buildingName, floorId, floorNumber, floorName, onBack, onClose, onSelectUnit }: RoomGridScreenProps) {
  const [units, setUnits] = useState<UnitDTO[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    console.log(`[BuildingDetailCard Level 2] Opening Rooms view for floor "${floorName}" (${floorId})`);
    fetchUnitsByFloor(floorId).then((res) => {
      if (!cancelled) {
        const unitList = res.data?.units ?? [];
        console.log(`[BuildingDetailCard Level 2] Units loaded for floor ${floorId}: ${unitList.length} records.`, unitList);
        setUnits(unitList);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [floorId, floorName]);

  const gridCols = units.length < 8 ? "grid-cols-3" : "grid-cols-4";

  return (
    <>
      <DrillHeader
        segments={[buildingName, floorName, "Rooms"]}
        onBack={onBack}
        onClose={onClose}
      />
      <div className="flex flex-col gap-4 px-6 pb-6 flex-1 overflow-y-auto [scrollbar-width:none]">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-cyan-600">
          Room Layout — Floor {floorNumber}
        </p>

        {loading ? (
          <SkeletonPulse rows={4} />
        ) : units.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <LayoutGrid size={32} className="text-zinc-200" />
            <p className="text-sm text-zinc-400 text-center">No rooms configured yet.</p>
            <p className="text-xs text-zinc-300 text-center">Add room data via the API to see it here.</p>
          </div>
        ) : (
          <>
            <div className={`grid ${gridCols} gap-2.5 mt-4`}>
              {units.map((unit, i) => (
                <motion.button
                  key={unit.unitId}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ ...SPRING, delay: i * 0.03 }}
                  onClick={() => onSelectUnit(unit)}
                  className={`aspect-square rounded-xl border flex flex-col items-center justify-center
                              gap-1 cursor-pointer transition-all hover:scale-[1.03] hover:shadow-md
                              ${getUnitStatusStyle(unit.status)}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${getUnitDotColor(unit.status)}`} />
                  <span className="font-semibold text-sm">{unit.unitNumber}</span>
                </motion.button>
              ))}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-500" />
                <span className="text-[11px] text-zinc-400">Occupied</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-zinc-400" />
                <span className="text-[11px] text-zinc-400">Vacant</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-[11px] text-zinc-400">Maintenance</span>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}

// ── LEVEL 3 — Room Detail Screen ──────────────────────────────────────────────

interface RoomDetailScreenProps {
  buildingName: string;
  floorNumber: number;
  floorName: string;
  unitId: string;
  onBack: () => void;
  onClose: () => void;
}

function RoomDetailScreen({ buildingName, floorNumber, floorName, unitId, onBack, onClose }: RoomDetailScreenProps) {
  const [unit, setUnit] = useState<UnitDetailDTO | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchUnitById(unitId).then((res) => {
      if (!cancelled) {
        setUnit(res.data ?? null);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [unitId]);

  const unitName = unit?.unitNumber || unitId;
  const unitStatus = unit?.status || "Unknown";
  const unitType = unit?.unitType || (unit?.bhk ? `${unit.bhk} BHK` : "N/A");
  const areaStr = unit?.areaSqFt ? `${unit.areaSqFt.toLocaleString()} sq.ft` : "N/A";

  const chips = [
    { icon: Tag,        label: "Type",       value: unitType },
    { icon: ShieldCheck,label: "Status",     value: unitStatus },
    { icon: Maximize2,  label: "Area",       value: areaStr },
    { icon: Hash,       label: "Floor",      value: `Floor ${floorNumber}` },
    { icon: Home,       label: "Unit ID",    value: unit?.unitId || unitId },
    { icon: Building2,  label: "Building",   value: buildingName },
  ];

  return (
    <>
      <DrillHeader
        segments={[buildingName, floorName, unitName]}
        onBack={onBack}
        onClose={onClose}
      />
      <div className="flex flex-col gap-6 px-6 pb-6 flex-1 overflow-y-auto [scrollbar-width:none]">
        {loading ? (
          <SkeletonPulse rows={5} />
        ) : (
          <>
            {/* Eyebrow + title */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-500 mb-1">
                {buildingName} · Floor {floorNumber}
              </p>
              <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 leading-tight">
                Room {unitName}
              </h2>
            </div>

            {/* Description */}
            <p className="text-sm text-zinc-500 leading-relaxed -mt-2">
              {unitType !== "N/A" ? `${unitType} unit` : "Unit"} on {floorName} of {buildingName}.
              {areaStr !== "N/A" && ` Carpet area: ${areaStr}.`}
            </p>

            {/* Stat chips — same 2-column grid */}
            <div className="grid grid-cols-2 gap-3">
              {chips.map((chip, i) => (
                <StatChip
                  key={chip.label}
                  icon={chip.icon}
                  label={chip.label}
                  value={chip.value}
                  index={i}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── MAIN PANEL COMPONENT ──────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

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
  const [fetchedData, setFetchedData] = useState<BuildingDTO | null>(null);
  const [isDbSynced, setIsDbSynced] = useState<boolean>(false);

  // ── Navigation stack ────────────────────────────────────────────────────────
  const [navStack, setNavStack] = useState<NavFrame[]>([{ level: 0 }]);
  const [direction, setDirection] = useState<1 | -1>(1);

  const currentFrame = navStack[navStack.length - 1];

  // Reset nav when building changes
  useEffect(() => {
    setNavStack([{ level: 0 }]);
    setDirection(1);
  }, [selectedBuildingId]);

  const pushFrame = useCallback((frame: NavFrame) => {
    setDirection(1);
    setNavStack((prev) => [...prev, frame]);
  }, []);

  const popFrame = useCallback(() => {
    setDirection(-1);
    setNavStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
  }, []);

  // ── Fetch building data ────────────────────────────────────────────────────
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

  // ── Escape key ────────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (navStack.length > 1) {
          popFrame();
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, navStack.length, popFrame]);

  // ── Click outside ─────────────────────────────────────────────────────────
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

  // ── Derived values ────────────────────────────────────────────────────────
  const localMeta   = selectedBuildingId ? BUILDINGS_DATA[selectedBuildingId] : undefined;
  const buildingName = buildingData?.buildingName || localMeta?.buildingName || selectedBuildingId || "";

  // ── Transition variants ───────────────────────────────────────────────────
  const screenVariants = {
    enter: (dir: number) => ({ x: `${dir * 100}%`, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: `${dir * -50}%`, opacity: 0 }),
  };

  // ── Screen key for AnimatePresence ────────────────────────────────────────
  const screenKey = `${currentFrame.level}-${currentFrame.floorId || ""}-${currentFrame.unitId || ""}`;

  return (
    <AnimatePresence>
      {isOpen && selectedBuildingId && (
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
            {/* Inner content wrapper with clipped overflow for transitions */}
            <div className="flex-1 flex flex-col overflow-hidden relative">
              <AnimatePresence initial={false} custom={direction} mode="popLayout">
                <motion.div
                  key={screenKey}
                  custom={direction}
                  variants={screenVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ type: "spring", stiffness: 350, damping: 35 }}
                  className="flex-1 flex flex-col overflow-y-auto [scrollbar-width:none] absolute inset-0"
                >
                  {/* ── Level 0: Building Info ── */}
                  {currentFrame.level === 0 && (
                    <BuildingInfoScreen
                      selectedBuildingId={selectedBuildingId}
                      buildingData={buildingData}
                      isDbSynced={isDbSynced}
                      onClose={onClose}
                      onDrillFloors={() =>
                        pushFrame({ level: 1 })
                      }
                    />
                  )}

                  {/* ── Level 1: Floor List ── */}
                  {currentFrame.level === 1 && (
                    <FloorListScreen
                      buildingId={selectedBuildingId}
                      buildingName={buildingName}
                      onBack={popFrame}
                      onClose={onClose}
                      onSelectFloor={(floor) =>
                        pushFrame({
                          level: 2,
                          floorId: floor.floorId,
                          floorNumber: floor.floorNumber,
                          floorName: floor.floorName,
                        })
                      }
                    />
                  )}

                  {/* ── Level 2: Room Grid ── */}
                  {currentFrame.level === 2 && currentFrame.floorId && (
                    <RoomGridScreen
                      buildingName={buildingName}
                      floorId={currentFrame.floorId}
                      floorNumber={currentFrame.floorNumber ?? 0}
                      floorName={currentFrame.floorName ?? "Floor"}
                      onBack={popFrame}
                      onClose={onClose}
                      onSelectUnit={(unit) =>
                        pushFrame({
                          level: 3,
                          floorId: currentFrame.floorId,
                          floorNumber: currentFrame.floorNumber,
                          floorName: currentFrame.floorName,
                          unitId: unit.unitId,
                          unitNumber: unit.unitNumber,
                        })
                      }
                    />
                  )}

                  {/* ── Level 3: Room Detail ── */}
                  {currentFrame.level === 3 && currentFrame.unitId && (
                    <RoomDetailScreen
                      buildingName={buildingName}
                      floorNumber={currentFrame.floorNumber ?? 0}
                      floorName={currentFrame.floorName ?? "Floor"}
                      unitId={currentFrame.unitId}
                      onBack={popFrame}
                      onClose={onClose}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default BuildingDetailCard;

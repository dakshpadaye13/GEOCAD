import React, { useState, useEffect, useRef, useId } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";
import { fetchBuildingById, BuildingDTO } from "../../api/buildings";
import { BUILDINGS_DATA } from "../../data/buildings";

const SPRING = { type: "spring" as const, stiffness: 280, damping: 26 };

export interface TopHudPanelProps {
  selectedBuildingId: string | null;
  onClose: () => void;
}

export function TopHudPanel({ selectedBuildingId, onClose }: TopHudPanelProps) {
  const id = useId();
  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [buildingData, setBuildingData] = useState<BuildingDTO | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // ── When a building is selected from the 3D scene, auto-open the card ────
  useEffect(() => {
    if (selectedBuildingId) {
      setActive(true);
    } else {
      setActive(false);
    }
  }, [selectedBuildingId]);

  // ── Fetch building data ────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedBuildingId) {
      setBuildingData(null);
      return;
    }
    let live = true;
    setLoading(true);

    fetchBuildingById(selectedBuildingId).then((response) => {
      if (!live) return;
      if (response.data) {
        setBuildingData(response.data);
      } else {
        const local = BUILDINGS_DATA[selectedBuildingId];
        if (local) {
          setBuildingData({
            buildingId: local.buildingId,
            buildingName: local.buildingName,
            assetType: "Residential Tower",
            status: local.status || "Existing",
            currentVersion: {
              versionNumber: 1,
              status: "Active",
              totalFloors: typeof local.floors === "number" ? local.floors : null,
              totalBasements: typeof local.basements === "number" ? local.basements : null,
              description: local.description,
            },
          });
        }
      }
      setLoading(false);
    });

    return () => { live = false; };
  }, [selectedBuildingId]);

  // ── ExpandableCard exact: Escape + click-outside close ────────────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActive(false);
        onClose();
      }
    };
    const onClickOutside = (e: MouseEvent | TouchEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        setActive(false);
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("touchstart", onClickOutside);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("touchstart", onClickOutside);
    };
  }, [onClose]);

  // ── Derived values ─────────────────────────────────────────────────────────
  const localMeta = selectedBuildingId ? BUILDINGS_DATA[selectedBuildingId] : undefined;
  const buildingTitle =
    buildingData?.buildingName || localMeta?.buildingName || selectedBuildingId || "";

  const chips = [
    {
      label: "FLOORS",
      value:
        buildingData?.currentVersion?.totalFloors != null
          ? String(buildingData.currentVersion.totalFloors)
          : "—",
    },
    { label: "HEIGHT",    value: "N/A" },
    { label: "STATUS",    value: buildingData?.status || localMeta?.status || "Existing" },
    { label: "ASSET TYPE", value: buildingData?.assetType || "Residential" },
    { label: "LOCATION",  value: "Worli, Mumbai" },
  ];

  // ── Eyebrow / label strings (layoutId-tracked, same as ExpandableCard's
  //    `description` and `title` sub-element transitions) ────────────────────
  const eyebrowCompact  = "GEOCAD 3D DIGITAL TWIN";
  const eyebrowExpanded = selectedBuildingId ? "SELECTED TOWER" : "GEOCAD 3D DIGITAL TWIN";
  const titleCompact    = "Lodha Park — Worli, Mumbai";
  const subtitleText    = "Click any of the 7 towers to view database info";

  return (
    <>
      {/* ── BACKDROP — identical to ExpandableCard's overlay ──────────────── */}
      <AnimatePresence>
        {active && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            // same classes as ExpandableCard: bg-black/50 backdrop-blur-md
            className="fixed inset-0 bg-black/40 backdrop-blur-sm h-full w-full z-20 pointer-events-none"
          />
        )}
      </AnimatePresence>

      {/* ── EXPANDED STATE — top-left anchored (not centered) ─────────────── */}
      <AnimatePresence>
        {active && (
          <div className="fixed top-6 left-6 z-30 pointer-events-auto select-none">
            <motion.div
              layoutId={`card-hud-${id}`}
              ref={cardRef}
              // White card, same radius & shadow pattern as ExpandableCard
              className="bg-white rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.18)] border border-gray-200/70 overflow-hidden"
              style={{ width: "min(920px, calc(100vw - 3rem))" }}
              transition={SPRING}
            >
              <div className="flex items-start gap-6 p-6">

                {/* Left column: eyebrow + title — layoutId-tracked like ExpandableCard */}
                <div className="shrink-0 min-w-[200px]">
                  {/* Eyebrow — layoutId mirrors ExpandableCard's `description` element */}
                  <motion.div
                    layoutId={`hud-eyebrow-${id}`}
                    className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-500"
                  >
                    <motion.div
                      className="h-2 w-2 rounded-full bg-cyan-500 shrink-0"
                      animate={{ opacity: [1, 0.4, 1], scale: [1, 1.3, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                    {eyebrowExpanded}
                    {loading && <Loader2 className="w-3 h-3 animate-spin ml-1 text-cyan-500" />}
                  </motion.div>

                  {/* Building title — layoutId mirrors ExpandableCard's `title` element */}
                  <motion.h2
                    layoutId={`hud-title-${id}`}
                    className="text-2xl font-semibold tracking-tight text-zinc-900 mt-2 leading-tight"
                  >
                    {buildingTitle}
                  </motion.h2>
                </div>

                {/* Vertical divider */}
                <div className="self-stretch w-px bg-gray-200 shrink-0" />

                {/* Stat chips — staggered, same delay pattern as ImagesBadge reveal */}
                <div className="flex items-center gap-6 flex-wrap flex-1 overflow-hidden py-1">
                  {chips.map((chip, i) => (
                    <motion.div
                      key={chip.label}
                      className="flex flex-col gap-1 shrink-0"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ ...SPRING, delay: i * 0.05 }}
                    >
                      <span className="text-[10px] uppercase tracking-wide text-zinc-400 font-semibold">
                        {chip.label}
                      </span>
                      <span className="text-lg font-semibold text-zinc-900 leading-tight">
                        {chip.value}
                      </span>
                    </motion.div>
                  ))}
                </div>

                {/* Close button — exact ExpandableCard style, rotating + → × */}
                <motion.button
                  aria-label="Close card"
                  layoutId={`hud-button-${id}`}
                  className="h-10 w-10 shrink-0 self-start flex items-center justify-center rounded-full bg-white text-zinc-700 hover:bg-zinc-50 border border-gray-200/90 hover:border-gray-300/90 hover:text-zinc-900 transition-colors duration-300 focus:outline-none shadow-sm"
                  onClick={() => { setActive(false); onClose(); }}
                >
                  <motion.div
                    animate={{ rotate: active ? 45 : 0 }}
                    transition={{ duration: 0.4 }}
                  >
                    {/* Same + SVG from ExpandableCard — rotates to × */}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20" height="20"
                      viewBox="0 0 24 24"
                      fill="none" stroke="currentColor"
                      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    >
                      <path d="M5 12h14" />
                      <path d="M12 5v14" />
                    </svg>
                  </motion.div>
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── COMPACT CARD — always visible when not expanded ───────────────── */}
      {/* This is the "resting" card, same as ExpandableCard's collapsed state */}
      <AnimatePresence>
        {!active && (
          <div className="fixed top-6 left-6 z-30 pointer-events-auto select-none">
            <motion.div
              layoutId={`card-hud-${id}`}
              // White compact card — same bg/border/radius as ExpandableCard's
              // collapsed state: bg-zinc-50 border border-gray-200/70 rounded-2xl
              className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.10)] border border-gray-200/70 cursor-pointer p-6"
              style={{ width: "380px" }}
              onClick={() => setActive(true)}
              // Same whileHover lift as ImagesBadge
              whileHover={{ y: -2, scale: 1.01 }}
              transition={SPRING}
            >
              {/* Eyebrow — same layoutId so it morphs smoothly on expand */}
              <motion.div
                layoutId={`hud-eyebrow-${id}`}
                className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-500"
              >
                <motion.div
                  className="h-2 w-2 rounded-full bg-cyan-500 shrink-0"
                  animate={{ opacity: [1, 0.4, 1], scale: [1, 1.3, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                {eyebrowCompact}
              </motion.div>

              {/* Title */}
              <motion.h1
                layoutId={`hud-title-${id}`}
                className="text-3xl font-semibold tracking-tight text-zinc-900 mt-2"
              >
                {titleCompact}
              </motion.h1>

              {/* Subtitle + open button row — mirrors ExpandableCard's bottom row */}
              <div className="flex items-center justify-between mt-3">
                <p className="text-sm text-zinc-500">
                  {subtitleText}
                </p>

                {/* + button — layoutId tracks it, rotates when active */}
                <motion.button
                  aria-label="Open card"
                  layoutId={`hud-button-${id}`}
                  className="h-8 w-8 shrink-0 flex items-center justify-center rounded-full bg-white text-zinc-700 hover:bg-zinc-50 border border-gray-200/90 hover:border-gray-300/90 hover:text-zinc-900 transition-colors duration-300 focus:outline-none ml-3 shadow-sm"
                  onClick={(e) => { e.stopPropagation(); setActive(true); }}
                >
                  <motion.div animate={{ rotate: 0 }} transition={{ duration: 0.4 }}>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16" height="16"
                      viewBox="0 0 24 24"
                      fill="none" stroke="currentColor"
                      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    >
                      <path d="M5 12h14" />
                      <path d="M12 5v14" />
                    </svg>
                  </motion.div>
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

export default TopHudPanel;

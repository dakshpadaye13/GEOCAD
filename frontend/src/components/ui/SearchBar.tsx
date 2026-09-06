import React, { useState, useRef, useId, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Search } from "lucide-react";
import { BUILDINGS_DATA } from "../../data/buildings";

const SPRING = { type: "spring" as const, stiffness: 300, damping: 28 };

interface SearchBarProps {
  onSelectBuilding: (id: string) => void;
  selectedBuildingId: string | null;
}

export function SearchBar({ onSelectBuilding, selectedBuildingId }: SearchBarProps) {
  const id = useId();
  const [active, setActive] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const allBuildings = Object.values(BUILDINGS_DATA);

  const filtered = query.trim()
    ? allBuildings.filter((b) =>
        b.buildingName.toLowerCase().includes(query.toLowerCase()) ||
        b.buildingId.toLowerCase().includes(query.toLowerCase())
      )
    : allBuildings;

  // Escape + click-outside
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setActive(false); setQuery(""); }
    };
    const onClickOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setActive(false);
        setQuery("");
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
  }, []);

  // Auto-focus input when expanded
  useEffect(() => {
    if (active) setTimeout(() => inputRef.current?.focus(), 80);
  }, [active]);

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {active && (
          <motion.div
            key="sb-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-20 pointer-events-none"
          />
        )}
      </AnimatePresence>

      {/* Search container fixed top-left */}
      <div className="fixed top-6 left-6 z-30 pointer-events-auto select-none" ref={containerRef}>
        <AnimatePresence mode="popLayout">
          {active ? (
            /* ── EXPANDED search panel ── */
            <motion.div
              key="sb-expanded"
              layoutId={`search-${id}`}
              className="bg-white rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.9)] border border-gray-200/70 overflow-hidden origin-top-left"
              style={{ width: "min(360px, calc(100vw - 3rem))" }}
              transition={SPRING}
            >
              {/* Search input row */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
                <motion.div layoutId={`search-icon-${id}`}>
                  <Search size={18} className="text-zinc-400 shrink-0" />
                </motion.div>
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search towers or enter ULPIN No..."
                  className="flex-1 text-sm font-medium text-zinc-900 placeholder:text-zinc-400 bg-transparent outline-none"
                />
                {/* × close button */}
                <motion.button
                  layoutId={`search-btn-${id}`}
                  aria-label="Close search"
                  className="h-7 w-7 shrink-0 flex items-center justify-center rounded-full border border-gray-200 bg-white text-zinc-500 hover:text-zinc-900 hover:border-gray-300 transition-colors"
                  onClick={() => { setActive(false); setQuery(""); }}
                >
                  <motion.div animate={{ rotate: 45 }} transition={{ duration: 0.3 }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
                      fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14" /><path d="M12 5v14" />
                    </svg>
                  </motion.div>
                </motion.button>
              </div>

              {/* Results list */}
              <div className="overflow-y-auto max-h-[calc(100vh-180px)] py-1">
                {query.includes('-') && query.length > 5 ? (
                  <motion.button
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={SPRING}
                    className="w-full text-left px-4 py-3 flex flex-col gap-1 transition-colors hover:bg-zinc-50 border-l-2 border-indigo-500 bg-indigo-50/30"
                    onClick={async () => {
                      const { resolveIdentifier } = await import("../../api/buildings");
                      const res = await resolveIdentifier(query);
                      if (res.data?.valid) {
                        onSelectBuilding(res.data.spatialData.buildingId);
                        
                        if (res.data.recordType === 'Unit') {
                          setTimeout(() => {
                            window.dispatchEvent(new CustomEvent('geocad-open-unit', {
                              detail: {
                                floorId: res.data.spatialData.floorId,
                                floorNumber: parseInt(res.data.spatialData.floorId.split('-L')[1] || '1', 10),
                                floorName: `Floor ${parseInt(res.data.spatialData.floorId.split('-L')[1] || '1', 10)}`,
                                unitId: res.data.spatialData.unitId,
                                unitNumber: res.data.spatialData.name
                              }
                            }));
                          }, 350); // let the card mount and reset
                        }

                        setActive(false);
                        setQuery("");
                      } else {
                        alert("Invalid or unknown identifier.");
                      }
                    }}
                  >
                    <span className="text-sm font-semibold text-indigo-700">
                      Resolve Spatial Identifier
                    </span>
                    <span className="text-[11px] text-zinc-500 font-mono">
                      Query: {query.toUpperCase()}
                    </span>
                  </motion.button>
                ) : null}

                {filtered.length === 0 && !query.includes('-') ? (
                  <p className="text-xs text-zinc-400 px-4 py-3 text-center">No towers found</p>
                ) : (
                  filtered.map((b, i) => {
                    const isSelected = b.buildingId === selectedBuildingId;
                    return (
                      <motion.button
                        key={b.buildingId}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ ...SPRING, delay: i * 0.04 }}
                        className={`w-full text-left px-4 py-2.5 flex flex-col gap-0.5 transition-colors hover:bg-zinc-50
                          ${isSelected ? "bg-cyan-50 border-l-2 border-cyan-500" : "border-l-2 border-transparent"}`}
                        onClick={() => {
                          onSelectBuilding(b.buildingId);
                          setActive(false);
                          setQuery("");
                        }}
                      >
                        <span className={`text-sm font-semibold ${isSelected ? "text-cyan-700" : "text-zinc-900"}`}>
                          {b.buildingName}
                        </span>
                        <span className="text-[11px] text-zinc-400 font-mono">{b.buildingId}</span>
                      </motion.button>
                    );
                  })
                )}
              </div>
            </motion.div>
          ) : (
            /* ── COLLAPSED glossy circle ── */
            <motion.button
              key="sb-collapsed"
              layoutId={`search-${id}`}
              aria-label="Open building search"
              onClick={() => setActive(true)}
              className="h-14 w-14 rounded-full flex items-center justify-center cursor-pointer
                         bg-white border border-gray-200/80 origin-top-left
                         shadow-[0_4px_20px_rgba(0,0,0,0.14),inset_0_1.5px_0_rgba(255,255,255,0.95)]
                         hover:shadow-[0_8px_28px_rgba(0,0,0,0.18),inset_0_1.5px_0_rgba(255,255,255,0.95)]
                         transition-shadow duration-200"
              whileHover={{ scale: 1.07, y: -2 }}
              whileTap={{ scale: 0.95 }}
              transition={SPRING}
            >
              <motion.div layoutId={`search-icon-${id}`}>
                <Search size={22} className="text-zinc-500" />
              </motion.div>

              <motion.span
                layoutId={`search-btn-${id}`}
                className="sr-only"
                aria-hidden
              />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

export default SearchBar;

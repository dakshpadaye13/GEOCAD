import React, { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  MousePointerClick,
  RotateCw,
  Move,
  MousePointer,
  Keyboard,
} from "lucide-react";

// Same spring as ImagesBadge
const SPRING = { type: "spring" as const, stiffness: 280, damping: 24 };

const controls = [
  { icon: MousePointerClick, keyword: "Select", value: "Left Click Tower" },
  { icon: RotateCw,          keyword: "Rotate", value: "Left Click + Drag"  },
  { icon: Move,              keyword: "Pan",    value: "Right Click + Drag" },
  { icon: MousePointer,      keyword: "Zoom",   value: "Scroll Wheel"       },
];

// How wide the pill must be in each state.
// Collapsed = just the trigger icon + "Controls" label.
// Expanded  = all four groups + dividers (Framer measures from content).
const COLLAPSED_W = 128;   // px — trigger tab width
const EXPANDED_W  = 620;   // px — full bar width

export function ControlBar() {
  const [open, setOpen] = useState(false);
  const reduced = useReducedMotion();

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 pointer-events-auto select-none flex justify-center">
      <motion.div
        // ── Same container recipe as the spec / ImagesBadge pill ──────────
        className="relative flex items-center rounded-full border border-gray-200/70 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.10)] overflow-hidden cursor-pointer"
        // Animate WIDTH between collapsed and expanded, just like ImagesBadge
        // animates its inner strip width between collapsedW / spreadW
        animate={{ width: reduced ? EXPANDED_W : open ? EXPANDED_W : COLLAPSED_W }}
        transition={SPRING}
        onClick={() => setOpen((v) => !v)}
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") setOpen((v) => !v);
        }}
        // Subtle lift on hover — same as ImagesBadge whileHover
        whileHover={reduced ? undefined : { y: -2, scale: 1.015 }}
      >
        {/* ── COLLAPSED "tab" — always visible, acts as the click target ── */}
        {/* In ImagesBadge this is equivalent to the always-visible first card */}
        <div className="flex items-center gap-2 shrink-0 px-5 py-3 z-10">
          <Keyboard size={16} className="text-cyan-500 shrink-0" />
          <span className="text-xs font-semibold text-cyan-500 whitespace-nowrap">
            Controls
          </span>
        </div>

        {/* ── EXPANDED controls — revealed on click, same reveal stagger
            as ImagesBadge's isHidden images (delay: (i - maxVisible)*0.06) ─ */}
        <AnimatePresence>
          {open && (
            <motion.div
              key="expanded-controls"
              className="flex items-center gap-5 pr-6 py-3 overflow-hidden"
              // Fade+slide the whole row in
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
            >
              {controls.map((ctrl, i) => {
                const Icon = ctrl.icon;
                return (
                  <React.Fragment key={ctrl.keyword}>
                    {/* Divider between trigger and first item, and between each item */}
                    <div className="h-4 w-px bg-gray-200 shrink-0" aria-hidden="true" />

                    {/* Each group staggered exactly like ImagesBadge hidden avatar reveal */}
                    <motion.div
                      className="flex items-center gap-1.5 whitespace-nowrap"
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -6 }}
                      transition={{ ...SPRING, delay: i * 0.06 }}
                    >
                      <Icon size={16} className="text-cyan-500 shrink-0" />
                      <span className="text-xs font-semibold text-cyan-500">
                        {ctrl.keyword}:
                      </span>
                      <span className="text-xs font-medium text-zinc-500">
                        {ctrl.value}
                      </span>
                    </motion.div>
                  </React.Fragment>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

export default ControlBar;

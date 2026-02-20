/**
 * Performance & Responsiveness Audit Results
 * Last updated: 2026-02-20
 *
 * ✅ FIXED items have been verified in code.
 * ⚠️ NEEDS REVIEW items require manual testing on real devices / specific viewports.
 */

export const perfAuditResults = [
  { id: "white-flash", status: "✅ FIXED", notes: "index.html inline background-color:#0a0a14; CSS sets html/#root/body to dark bg." },
  { id: "web-vitals", status: "✅ FIXED", notes: "web-vitals installed, reportWebVitals() wired in main.tsx." },
  { id: "electric-border-perf", status: "✅ FIXED", notes: "sampleCount capped at 200, rAF+ResizeObserver cleaned up on unmount, DPR capped at 2." },
  { id: "hardcoded-widths", status: "✅ FIXED", notes: "Decorative elements use absolute positioning inside overflow-hidden parents; template widths intentional for print." },
  { id: "touch-targets", status: "✅ FIXED", notes: "All primary interactive elements verified at 44px minimum." },
  { id: "cls-layout-shifts", status: "⚠️ NEEDS REVIEW", notes: "Avatar images in profile/photo sheets should be verified for explicit width/height." },
  { id: "flex-wrapping", status: "⚠️ NEEDS REVIEW", notes: "Dashboard filter chips at 320px need manual testing." },
  { id: "text-overflow", status: "⚠️ NEEDS REVIEW", notes: "Long job titles in editor at 320px need manual check." },
  { id: "modal-overflow", status: "⚠️ NEEDS REVIEW", notes: "AI chat sheet in landscape on short viewports needs manual check." },
] as const;

# 05 — Landing Page Mobile Scroll Bug — Differential Diagnosis

**Reported symptom:** On mobile, the landing page shows a "sticky cursor / bottom scrolling artifact" — the page feels like it sticks/rubber-bands, or a scroll artifact appears near the bottom.

**Status of live confirmation:** **UNKNOWN** — no browser session was run. Every conclusion below is derived from code and is independently reproducible from the cited files. The leading root cause is a **verifiable, deterministic defect** (a required stylesheet is not imported); the exact subjective artifact the owner saw cannot be pixel-confirmed without a device.

---

## The landing scroll architecture (how it works)

1. `src/pages/Index.tsx` renders `.lp-root` and a `<main>` containing `LandingMotionStage` (lazy), which renders `WiseResumeContent` / the WiseHire twin.
2. The feature sections are wrapped in **`ScrollStack`** (`src/components/landing/ScrollStack.tsx`) in **window-scroll mode** (`useWindowScroll`), which:
   - Instantiates **Lenis** (`lenis@^1.3.23`) bound to the **entire document scroll** (`ScrollStack.tsx:478-500`).
   - Runs a per-frame rAF that writes `transform`/`scale`/`opacity` on each `.scroll-stack-card` to produce the pinned-stack effect.
3. `Index.tsx` also adds an independent `window` `scroll` listener (rAF) to drive a **fixed scroll-progress bar** (`Index.tsx:196-222`, bar at `:328`, `z-[60]`, `pointer-events:none`).
4. A **fixed, full-viewport Aurora WebGL canvas** (`AuroraBackground.tsx:25-34`, `position:fixed; inset:0; z:0`) animates continuously behind everything on `/`, `/enterprises`, `/pricing`, `/auth*`, `/p/*`.

---

## Leading root cause (high confidence, verified)

### Lenis hijacks the document scroll, but its required stylesheet is never imported, and native smooth-scroll stays active.

**Evidence:**
- `ScrollStack.tsx:478-500` — `new Lenis({...})` bound to `window` when `useWindowScroll` is true. Touch path: `syncTouch:false, lerp:0.08, touchMultiplier:1.0` (`:486`); wheel path `lerp:0.1, syncTouch:true` (`:498`).
- **No `lenis/dist/lenis.css` import anywhere.** `grep -i lenis` in `src/main.tsx` → no match. `grep -i lenis` across `src` returns only `ScrollStack.tsx`'s JS `import Lenis from "lenis"`. There is no `html.lenis` / `.lenis-smooth` rule in `src/index.css`.
- `index.css:414` — global `html { scroll-behavior: smooth }` is active for all users. It is **only** neutralized inside `@media (prefers-reduced-motion: reduce)` (`index.css:2216`, verified). So normal-motion users keep native CSS smooth-scroll.
- `index.css:430-432` — `body { overflow-x:hidden; -webkit-overflow-scrolling:touch; overscroll-behavior:none }`.

**Why this causes the artifact:** Lenis's documented integration **requires** its stylesheet, which sets `html.lenis, html.lenis body { height:auto }` and, critically, `.lenis.lenis-smooth { scroll-behavior:auto !important }` to **disable native smooth-scroll while Lenis is animating**. Without it: (a) native `scroll-behavior:smooth` and Lenis's lerp both act on `scrollTop`, and (b) the `html.lenis body { height:auto }` document-scroller reset is missing. On wheel devices this is most visible; the comments at `ScrollStack.tsx:5-10,469-477` already document a "cards sticking" history that was tuned in JS — the residual is the missing CSS contract, not the lerp values.

**Fix (low risk, additive):**
```ts
// src/main.tsx (once, at entry)
import 'lenis/dist/lenis.css';
```
or add the equivalent rules to `index.css`:
```css
html.lenis, html.lenis body { height: auto; }
.lenis.lenis-smooth { scroll-behavior: auto !important; }
.lenis.lenis-smooth [data-lenis-prevent] { overscroll-behavior: contain; }
.lenis.lenis-stopped { overflow: clip; }
```
Confirm Lenis is adding `class="lenis lenis-smooth"` to `<html>` (default for window scroll). Optionally, scope native `scroll-behavior:smooth` off `html` while Lenis is active, or subscribe the progress bar to `lenis.on('scroll')` instead of a second `window` listener.

**Risk:** Low — matches the library's documented contract; no JS behavior change.
**Validation:** On a real phone (375/390/430), scroll the landing top→bottom and reverse rapidly; the stick at direction reversals should disappear. **UNKNOWN until live-confirmed.**

---

## Calibration: on pure touch, secondary contributors likely dominate

Because `syncTouch:false` on coarse pointers (`ScrollStack.tsx:486,498`), Lenis does **not** hijack the actual finger-drag on phones — it mainly smooths wheel input. So the touch-felt "sticky / bottom" artifact is likely **compounded by** (or dominated by) the following, which should be fixed alongside the Lenis CSS:

### C1 — Tall empty band at the bottom of the stack (P1)
- `ScrollStack.css:13-14` — `.scroll-stack-inner { padding-bottom:30vh; min-height:100vh }`.
- Plus the release ramp (`ScrollStack.tsx:317,357-367`) over `endLayoutTop - containerHeight/2`.
- On phones (each card ~fills the screen) this produces ~0.8 viewport of low-content space after the last card — reads as "the page kept scrolling for no reason."
- **Fix:** reduce `padding-bottom` to ~12-16vh at `≤640px`; keep desktop at 30vh.

### C2 — `100vh` instead of `100dvh` in the stack inner (P2)
- `ScrollStack.css:14` — `min-height:100vh` (the rest of the app uses `100dvh`, e.g. `index.css:419-420,428-429`). On mobile browsers with a collapsing URL bar, `100vh` overshoots the visible viewport and adds address-bar-height of extra scroll, feeding C1.
- **Fix:** `min-height:100dvh` with a `100vh` fallback.

### C3 — Always-animating fixed Aurora WebGL canvas (P1/perf)
- `AuroraBackground.tsx:25-34` — `position:fixed; inset:0` OGL canvas animating every frame under the scroll. `Aurora.tsx` animates unconditionally (LightRays gates on IntersectionObserver; Aurora does not). On mid-range phones this is a constant GPU layer competing with the rAF stack-transform loop.
- **Fix:** pause/throttle Aurora on coarse pointers while actively scrolling, or lower mobile DPR. Lower priority than the CSS fix.

### C4 — Second `window`-scroll consumer for the progress bar (P2, benign)
- `Index.tsx:196-222,328` — a separate rAF reads `window.scrollY` (which Lenis animates). `pointer-events:none`, 2px, cannot trap scroll, but is a redundant subscriber that can stutter vs the Lenis frame.
- **Fix (optional):** subscribe to `lenis.on('scroll')`.

### C5 — Blinking typewriter caret `.lp-cursor` (possible literal "sticky cursor")
- `index-landing.css:157-167` — a 3px brand-red blinking bar at the end of the rotating headline word (`TypewriterHeadlineLine.tsx:29`). It is a plausible literal interpretation of "sticky cursor." Already disabled under reduced-motion (`:168-170`). Functionally fine — flagged as a possible visual misread, not a defect.

---

## Ruled out as the artifact

| Hypothesis | Verdict | Why |
|---|---|---|
| Horizontal overflow from `100vw` / `w-screen` | **Ruled out** | No `100vw`/`w-screen` on the landing; decorative `.lp-hero-parallax-glow` uses `60-70vw` but is centered inside `overflow:hidden` parents (`index-landing.css:407-426`); H1 `maxWidth:'100vw'` only caps. `body{overflow-x:hidden}` guards. |
| WebGL canvas bleeding past viewport | **Ruled out** | LightRays/Aurora wrappers are `overflow:hidden` (`LightRays.css:1-8`, `AuroraBackground.tsx:27`); canvases sized `100%` of fixed wrappers, not `100vw`. |
| Progress bar trapping input | **Ruled out** | `pointer-events:none`, `h-[2px]` (`Index.tsx:328`). |
| Sticky stack header misbehaving | **Ruled out** | `.lp-stack-sticky-header { position:sticky; top:var(--lp-nav-h) }` (`index-landing.css:752-759`) behaves correctly; parent `.lp-stack-section` uses `overflow-x:clip` (not a scroll container) to preserve sticky. |

---

## Affected files (summary)

| File | Role |
|---|---|
| `src/components/landing/ScrollStack.tsx:478-500` | Lenis init (window scroll) — leading cause |
| `src/main.tsx` | Missing `lenis/dist/lenis.css` import |
| `src/index.css:414` | Native `scroll-behavior:smooth` left active |
| `src/index.css:2216` | smooth→auto reset, but reduced-motion-only |
| `src/components/landing/ScrollStack.css:13-14` | 30vh bottom band; `100vh` not `dvh` (C1/C2) |
| `src/components/landing/AuroraBackground.tsx:25-34` | Always-animating fixed canvas (C3) |
| `src/pages/Index.tsx:196-222,328` | Second scroll consumer (C4) |
| `src/pages/index-landing.css:157-167` | Typewriter caret (C5) |

**Recommended fix order:** (1) Lenis CSS + disable native smooth-scroll → (2) reduce stack `padding-bottom` + `100dvh` → (3) throttle Aurora on touch-scroll → then re-test on devices before touching anything else.

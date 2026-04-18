# Scroll-stack flicker / "vibration" — diagnosis

_Date: 2026-04-18_
_Reporter symptom: cards in the WiseResume / WiseHire scroll-stack flash in
and out or appear to vibrate while scrolling._

## TL;DR (plain language)

The scroll-stack measures where each card is on the page using a method
that **includes the card's own transform** in the measurement. The
component then writes a new transform based on that measurement. On the
very next animation frame, the measurement has shifted because of the
transform we just wrote, so the next translate is computed against a
moving baseline, and we write a different value. The effect is a
two-frame ping-pong: the card (and the demo content inside it that uses
the inverse-parallax CSS variable) jitters by a few pixels every frame
once it starts to "stack". The faster the user scrolls, the more
visible the wobble.

This is a real correctness bug in `ScrollStack.tsx`, not a styling
issue.

---

## The bug

**File:** `src/components/landing/ScrollStack.tsx`
**Function:** `getElementOffset` (lines 196-201)

```ts
const getElementOffset = (el: HTMLElement) => {
  if (paramsRef.current.useWindowScroll) {
    return el.getBoundingClientRect().top + window.scrollY;
  }
  return el.offsetTop;
};
```

In window-scroll mode (which is what both landing stacks use), the card's
position is read with `getBoundingClientRect().top`. **`getBoundingClientRect`
returns the post-transform visual rect**, so once the card has any
`translateY` applied, this value is no longer the layout position — it is
the layout position **plus the current `translateY`**.

The pinned-card formula a few lines below reads:

```ts
translateY = scrollTop - cardTop + stackPositionPx + p.itemStackDistance * i;
```

Substitute `cardTop = layoutTop + currentTranslateY`. Then:

```
translateY_new = (scrollTop - layoutTop + stackPositionPx + i*stackDist)
                 - currentTranslateY
              = correctTranslateY - currentTranslateY
```

If on a given frame `currentTranslateY ≈ correctTranslateY` (the steady
state we want), the formula computes `translateY_new ≈ 0` and writes a
transform of zero. On the next frame `cardTop` reverts to `layoutTop`
(because the transform we just wrote is zero), and we recompute
`translateY ≈ correctTranslateY` and write that. Frame after that —
back to zero. **The card oscillates between two transform states every
frame**, which is exactly the "vibrating / flashing in and out"
sensation the user reported.

The same oscillation propagates to anything that reads
`--card-translate-y`, which is the "depth parallax" inner-content drift
(`.lp-stack-parallax` in `ScrollStack.css` line 45-48). The
inner screenshot inside each card has its own `translate3d` driven by
`var(--card-translate-y) * -0.15`, so the inner content wobbles in the
opposite direction at 15% magnitude — making the flicker doubly
visible.

### Why it happens only in window-scroll mode

In the non-window scroll branch, `getElementOffset` returns
`el.offsetTop`, which is a layout-only value and is **not affected by
transforms**. The bug therefore only manifests when `useWindowScroll` is
true, which is the case for both `WiseResumeContent` and
`WiseHireDemoSection`.

### Why it didn't show up in earlier phases

The same code path existed in Phases 1-3, but:

- Phase 4 added the `--card-translate-y` CSS variable + the
  `.lp-stack-parallax` inverse parallax. Before Phase 4, even if the
  outer card jittered by 1-2 px, there was no inner element amplifying
  or counter-translating, so the eye could not separate the wobble from
  Lenis's smooth-scroll easing.
- Phase 5 unified the inner-content max-w-6xl wrapper and increased the
  fidelity of the demo screenshots (sharper edges = jitter is now
  perceivable).

So the bug is old, but the conditions that make it visible to the user
are new.

---

## Secondary contributors

These don't cause the flicker on their own, but they make it more
noticeable:

1. **Lenis `lerp: 0.1` + `syncTouchLerp: 0.075`** — Lenis emits a `scroll`
   event on every smoothed-frame, so the buggy update runs ~60 times per
   second during a smooth scroll, not just per real wheel tick. Each
   tick is a fresh chance to write the oscillating transform.
2. **`will-change: transform, filter, opacity`** on `.scroll-stack-card`
   forces the card onto its own GPU layer, which means even a 1-2 px
   translate jitter is composited (not painted), so the browser does
   not "smooth it out" the way subpixel paint normally would. The
   wobble becomes pixel-clean and obvious.
3. **The change-detection threshold** in the transform writer is 0.1 px
   for translate (line 285). The oscillation amplitude is the steady-state
   `correctTranslateY` itself, which is far larger than 0.1 px, so the
   guard never suppresses the alternating writes.

---

## Fix sketch (for the next phase, not applied here)

The minimal correct fix is to compute each card's layout-only offset
**once at setup time** and cache it in a ref, instead of re-measuring
every frame with `getBoundingClientRect`. Pseudo-code:

```ts
// At setup:
const cardLayoutTops = cards.map((card) =>
  card.getBoundingClientRect().top + window.scrollY
);
// Re-measure on resize / fonts-loaded / data-changed only.

// In the loop:
const cardTop = cardLayoutTops[i];
```

Caveats to handle in the actual fix:

- Re-measure `cardLayoutTops` on `ResizeObserver` of the scroll-stack
  inner container, on `window` resize, and on font loading
  (`document.fonts.ready`), so that the cached values stay correct
  across responsive reflows.
- The `.scroll-stack-end` element used for `pinEnd` has the same
  problem and should be cached similarly.
- Keep the non-window-scroll branch as it is (it uses `offsetTop`,
  which is already correct).

A safer alternative (no caching needed) is to **subtract the current
transform before reading the rect**:

```ts
const t = card.style.transform;
card.style.transform = "";
const layoutTop = card.getBoundingClientRect().top + window.scrollY;
card.style.transform = t;
```

This works but forces a synchronous layout per card per frame and will
tank scroll perf on long stacks — not recommended.

---

## How to reproduce / verify the fix

1. Open `/` (WiseResume) in any browser.
2. Slowly scroll using a trackpad / mouse-wheel into the
   "Five tools" scroll-stack section.
3. Watch the inner screenshot of a card that has just begun to stack.
4. Before the fix: the screenshot wobbles by a few pixels each frame
   (visible as a rapid "shimmer" or "vibration" of the card content).
5. After the fix: the inner screenshot translates smoothly without
   high-frequency jitter, and the inverse-parallax drift is monotonic.

A regression test could attach a `MutationObserver` to one
`.scroll-stack-card`'s `style` attribute, drive a scroll programmatically,
and assert that consecutive `transform` values are monotonic in
`translateY` (i.e., never decrease then increase within a 100 ms window
during a forward scroll).

---

## Recommended next step

Open a focused fix task ("Fix scroll-stack card jitter caused by
transform-aware getBoundingClientRect") that:

1. Caches per-card layout offsets on setup + on
   resize/fonts-loaded/ResizeObserver.
2. Does the same for `.scroll-stack-end`.
3. Adds the regression assertion above.
4. Re-captures one mid-stack screenshot per product to confirm the
   visible flicker is gone.

This is a small, surgical change to `src/components/landing/ScrollStack.tsx`
only — no consumer-side or CSS changes required.

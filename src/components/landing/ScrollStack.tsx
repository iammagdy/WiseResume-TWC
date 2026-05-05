import { ReactNode, useEffect, useLayoutEffect, useRef } from "react";
import Lenis from "lenis";
import "./ScrollStack.css";

/* NOTE: When `useWindowScroll` is true, this component instantiates a
   Lenis instance bound to the entire document scroll. Do NOT instantiate
   a second Lenis elsewhere on the same page — it will fight this one.
   Phase 3: setup is split from per-frame transform updates so toggling
   theme/product/scale props no longer tears down + reinitialises Lenis
   (which previously caused a visible scroll snap). */

export interface ScrollStackItemProps {
  itemClassName?: string;
  children: ReactNode;
}

/* The card is wrapped in a non-clipping `.scroll-stack-card-wrap` so the
   inter-card hairline divider (rendered as a `::after` on the wrapper)
   can sit in the gap between cards without being clipped by the card's
   `overflow: hidden`. The wrapper carries the inter-card margin; the
   card itself has no margin and remains the transform target. */
export const ScrollStackItem = ({
  children,
  itemClassName = "",
}: ScrollStackItemProps) => (
  <div className="scroll-stack-card-wrap">
    <div className={`scroll-stack-card ${itemClassName}`.trim()}>{children}</div>
  </div>
);

interface ScrollStackProps {
  className?: string;
  children: ReactNode;
  itemDistance?: number;
  itemScale?: number;
  itemStackDistance?: number;
  stackPosition?: string;
  scaleEndPosition?: string;
  baseScale?: number;
  rotationAmount?: number;
  blurAmount?: number;
  useWindowScroll?: boolean;
  /* Phase 4: emits the index of the topmost (currently-active) card so a
     consumer can render an external step counter without scanning the DOM
     or attaching a second scroll listener. -1 when no card is active. */
  onActiveCardChange?: (index: number) => void;
}

interface CardTransform {
  translateY: number;
  scale: number;
  rotation: number;
  blur: number;
  opacity: number;
}

interface TransformParams {
  itemScale: number;
  itemStackDistance: number;
  stackPosition: string;
  scaleEndPosition: string;
  baseScale: number;
  rotationAmount: number;
  blurAmount: number;
  useWindowScroll: boolean;
  itemDistance: number;
}

const prefersReducedMotion = (): boolean => {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
};

/* Returns true when the primary pointer is coarse (touch screen).
   Used to choose calmer Lenis touch settings so a normal swipe
   advances ~one card rather than flying past several. */
const isCoarsePointer = (): boolean => {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(pointer: coarse)").matches;
};

/* Viewport-aware inter-card gap.
   On short viewports (landscape phones / small tablets) the fixed 480 px
   gap is a large fraction of the screen, so combined with Lenis touch
   momentum it causes cards to fly by before the user can read them.
   Cap at 50% of current viewport height on short screens so each card
   occupies a meaningful portion of the scroll range. Desktop (≥ 900 px
   tall) always gets the caller-provided base value unchanged. */
const effectiveItemDistance = (base: number): number => {
  if (typeof window === "undefined") return base;
  const vh = window.innerHeight;
  if (vh <= 600) return Math.min(base, Math.round(vh * 0.40));
  if (vh <= 800) return Math.min(base, Math.round(vh * 0.50));
  return base;
};

const ScrollStack = ({
  children,
  className = "",
  itemDistance = 100,
  itemScale = 0.03,
  itemStackDistance = 30,
  stackPosition = "20%",
  scaleEndPosition = "10%",
  baseScale = 0.85,
  rotationAmount = 0,
  blurAmount = 0,
  useWindowScroll = false,
  onActiveCardChange,
}: ScrollStackProps) => {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lenisRef = useRef<Lenis | null>(null);
  const cardsRef = useRef<HTMLElement[]>([]);
  const lastTransformsRef = useRef(new Map<number, CardTransform>());
  const isInViewRef = useRef(true);
  /* Cached layout-only offsets for each card and for the .scroll-stack-end
     sentinel. We measure once at setup and re-measure on resize / fonts-load
     / ResizeObserver, instead of calling getBoundingClientRect every frame.
     getBoundingClientRect returns the post-transform rect, so reading it
     each frame creates a feedback loop with our own transform writes that
     manifests as visible per-frame jitter ("vibration") on the cards. */
  const cardLayoutTopsRef = useRef<number[]>([]);
  const endLayoutTopRef = useRef<number>(0);
  /* Holds the current updateCardTransforms closure so the params-changed
     effect can trigger a one-shot recompute directly (no synthetic
     scroll-event dispatch needed). */
  const updateRef = useRef<(() => void) | null>(null);
  /* Always points at the latest onActiveCardChange callback so the loop
     never closes over a stale prop value. */
  const onActiveCardChangeRef = useRef<typeof onActiveCardChange>(onActiveCardChange);
  onActiveCardChangeRef.current = onActiveCardChange;

  /* Live params ref — read inside the RAF/scroll loop. Updating these
     does not require tearing down Lenis. */
  const paramsRef = useRef<TransformParams>({
    itemScale,
    itemStackDistance,
    stackPosition,
    scaleEndPosition,
    baseScale,
    rotationAmount,
    blurAmount,
    useWindowScroll,
    itemDistance,
  });
  paramsRef.current = {
    itemScale,
    itemStackDistance,
    stackPosition,
    scaleEndPosition,
    baseScale,
    rotationAmount,
    blurAmount,
    useWindowScroll,
    itemDistance,
  };

  /* === Update effect: reflows card spacing when itemDistance changes,
     does not touch Lenis. Uses viewport-aware effective distance so
     orientation changes (which trigger a remeasureLayout resize callback)
     automatically re-apply appropriate margins. === */
  useLayoutEffect(() => {
    const cards = cardsRef.current;
    const dist = effectiveItemDistance(itemDistance);
    cards.forEach((card, i) => {
      /* Margin lives on the wrapper so the inter-card divider (drawn on
         `.scroll-stack-card-wrap::after`) is not clipped by the card's
         overflow:hidden. Fall back to the card itself for safety. */
      const wrap = (card.parentElement as HTMLElement | null) ?? card;
      wrap.style.marginBottom = i < cards.length - 1 ? `${dist}px` : "0px";
      card.style.marginBottom = "0px";
    });
  }, [itemDistance]);

  /* === Setup effect: runs once per mount (and only when useWindowScroll
     flips, which is essentially never in practice). All transform-shaping
     props are read from paramsRef inside the loop, so changing them does
     not re-run this effect. === */
  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const reduceMotion = prefersReducedMotion();

    /* --- collect cards + apply layout-only styles --- */
    const cards = Array.from(
      useWindowScroll
        ? document.querySelectorAll<HTMLElement>(".scroll-stack-card")
        : scroller.querySelectorAll<HTMLElement>(".scroll-stack-card")
    );
    cardsRef.current = cards;
    const transformsCache = lastTransformsRef.current;

    cards.forEach((card, i) => {
      const wrap = (card.parentElement as HTMLElement | null) ?? card;
      if (i < cards.length - 1) {
        wrap.style.marginBottom = `${effectiveItemDistance(itemDistance)}px`;
      }
      card.style.willChange = "transform, filter";
      card.style.transformOrigin = "top center";
      card.style.backfaceVisibility = "hidden";
      card.style.transform = "translateZ(0)";
      (card.style as CSSStyleDeclaration & { webkitTransform: string }).webkitTransform =
        "translateZ(0)";
      card.style.perspective = "1000px";
      (card.style as CSSStyleDeclaration & { webkitPerspective: string }).webkitPerspective =
        "1000px";
    });

    /* --- helpers (pure; close over paramsRef) --- */
    const calculateProgress = (scrollTop: number, start: number, end: number) => {
      if (scrollTop < start) return 0;
      if (scrollTop > end) return 1;
      return (scrollTop - start) / (end - start);
    };

    const parsePercentage = (value: string | number, containerHeight: number) => {
      if (typeof value === "string" && value.includes("%")) {
        return (parseFloat(value) / 100) * containerHeight;
      }
      return parseFloat(value as string);
    };

    const getScrollData = () => {
      if (paramsRef.current.useWindowScroll) {
        return { scrollTop: window.scrollY, containerHeight: window.innerHeight };
      }
      const s = scrollerRef.current!;
      return { scrollTop: s.scrollTop, containerHeight: s.clientHeight };
    };

    /* Layout-only top offset for an element. In window-scroll mode we walk
       offsetTop up the offsetParent chain — this is immune to transforms
       applied by this component, unlike getBoundingClientRect which returns
       the post-transform rect and creates a per-frame feedback loop. */
    const measureLayoutTop = (el: HTMLElement | null): number => {
      if (!el) return 0;
      if (!paramsRef.current.useWindowScroll) return el.offsetTop;
      let top = 0;
      let cur: HTMLElement | null = el;
      while (cur) {
        top += cur.offsetTop;
        cur = cur.offsetParent as HTMLElement | null;
      }
      return top;
    };

    const remeasureLayout = () => {
      /* Re-apply viewport-aware margins before reading positions so that
         the cached layout tops reflect the correct margin (critical after
         orientation changes where viewport height flips). */
      const dist = effectiveItemDistance(paramsRef.current.itemDistance);
      cardsRef.current.forEach((card, i) => {
        const wrap = (card.parentElement as HTMLElement | null) ?? card;
        wrap.style.marginBottom = i < cardsRef.current.length - 1 ? `${dist}px` : "0px";
      });
      cardLayoutTopsRef.current = cardsRef.current.map((card) =>
        measureLayoutTop(card),
      );
      const endEl = paramsRef.current.useWindowScroll
        ? (document.querySelector(".scroll-stack-end") as HTMLElement | null)
        : (scrollerRef.current?.querySelector(".scroll-stack-end") as HTMLElement | null);
      endLayoutTopRef.current = measureLayoutTop(endEl);
      /* Invalidate the change-detection cache so the next pass forces a
         fresh transform write against the new layout values. */
      transformsCache.clear();
    };

    let lastActiveIndex = -2;

    const updateCardTransforms = () => {
      /* Skip per-frame style writes while a brand/theme view-transition is
         in flight. The flag is set in Index.tsx for ~600 ms around every
         startViewTransition call so our rAF loop doesn't contend with the
         ripple animation on the main thread. Lenis still ticks (its rAF
         loop is separate and must keep running for window-scroll mode). */
      if ((window as Window & { __lpTransition?: boolean }).__lpTransition) return;
      const cardList = cardsRef.current;
      if (!cardList.length) return;

      const p = paramsRef.current;
      const { scrollTop, containerHeight } = getScrollData();
      const stackPositionPx = parsePercentage(p.stackPosition, containerHeight);
      const scaleEndPositionPx = parsePercentage(p.scaleEndPosition, containerHeight);

      const endElementTop = endLayoutTopRef.current;

      /* Phase 4: pre-pass to compute every card's geometry once. We need
         the FINAL topmost active index before applying blur (depth-based
         blur for older cards in the stack), so we cannot derive it
         progressively inside the transform pass.

         cardTop reads from the cached layout-only offset, NOT from
         getBoundingClientRect — see the cardLayoutTopsRef comment for
         the per-frame jitter bug this avoids. */
      const cardGeo = cardList.map((card, i) => {
        if (!card) return null;
        const cardTop = cardLayoutTopsRef.current[i] ?? 0;
        return {
          cardTop,
          triggerStart: cardTop - stackPositionPx - p.itemStackDistance * i,
          triggerEnd: cardTop - scaleEndPositionPx,
          pinStart: cardTop - stackPositionPx - p.itemStackDistance * i,
        };
      });
      let activeIndex = -1;
      for (let i = 0; i < cardGeo.length; i++) {
        const g = cardGeo[i];
        if (g && scrollTop >= g.triggerStart) activeIndex = i;
      }

      cardList.forEach((card, i) => {
        const g = cardGeo[i];
        if (!card || !g) return;
        const { cardTop, triggerStart, triggerEnd, pinStart } = g;
        const pinEnd = endElementTop - containerHeight / 2;

        const scaleProgress = calculateProgress(scrollTop, triggerStart, triggerEnd);
        const targetScale = p.baseScale + i * p.itemScale;
        const scale = 1 - scaleProgress * (1 - targetScale);
        const rotation = p.rotationAmount ? i * p.rotationAmount * scaleProgress : 0;

        let blur = 0;
        if (p.blurAmount && activeIndex > i) {
          blur = Math.max(0, (activeIndex - i) * p.blurAmount);
        }

        /* Phase 4: fade-in below trigger. Card is invisible when the
           viewport is half a screen below its trigger, ramps to full
           opacity at triggerStart. Removes the "ghost" effect of cards
           sitting visible-but-scaled-down from the start. Honour
           prefers-reduced-motion: skip the interpolation entirely so
           cards remain fully opaque (static layout). */
        /* Root Cause B fix: use viewport-relative fade, not trigger-relative.
           The old formula used triggerStart as the upper bound, which caused
           cards to fade OUT on upward scroll even while still visible in the
           viewport (a card entering the viewport at opacity 0.66 looks like
           a ghost/flicker on every reversal cycle).
           New formula: the card fades in over the half-viewport range that
           precedes the card actually entering the viewport from below.
           viewportEntry = scrollTop at which the card's top edge first
           reaches the bottom of the viewport. Once scrollTop >= viewportEntry
           the card is in or above the viewport → calculateProgress clamps to
           1 → opacity = 1 always, regardless of scroll direction. */
        const viewportEntry = cardTop - containerHeight;
        const fadeStart = viewportEntry - containerHeight * 0.5;
        const opacity = reduceMotion
          ? 1
          : calculateProgress(scrollTop, fadeStart, viewportEntry);

        let translateY = 0;
        const isPinned = scrollTop >= pinStart && scrollTop <= pinEnd;
        if (isPinned) {
          translateY = scrollTop - cardTop + stackPositionPx + p.itemStackDistance * i;
        } else if (scrollTop > pinEnd) {
          /* Release ramp: after pinEnd, smoothly interpolate translateY
             back to 0 over the remaining `endElementTop - pinEnd` range
             (= containerHeight / 2 by construction). This ensures every
             card returns to its natural layout position by the time the
             user reaches the end of the stack section, so cards scroll
             off the top of the viewport naturally instead of staying
             frozen near the top and overlapping the next section. */
          const frozenY = pinEnd - cardTop + stackPositionPx + p.itemStackDistance * i;
          const releaseRange = Math.max(1, endElementTop - pinEnd);
          const releaseProgress = Math.min(1, (scrollTop - pinEnd) / releaseRange);
          translateY = frozenY * (1 - releaseProgress);
        }

        const newTransform: CardTransform = {
          translateY: Math.round(translateY * 100) / 100,
          scale: Math.round(scale * 1000) / 1000,
          rotation: Math.round(rotation * 100) / 100,
          blur: Math.round(blur * 100) / 100,
          opacity: Math.round(opacity * 1000) / 1000,
        };

        const last = transformsCache.get(i);
        const changed =
          !last ||
          Math.abs(last.translateY - newTransform.translateY) > 0.1 ||
          Math.abs(last.scale - newTransform.scale) > 0.001 ||
          Math.abs(last.rotation - newTransform.rotation) > 0.1 ||
          Math.abs(last.blur - newTransform.blur) > 0.1 ||
          Math.abs(last.opacity - newTransform.opacity) > 0.005;

        if (changed) {
          card.style.transform = `translate3d(0, ${newTransform.translateY}px, 0) scale(${newTransform.scale}) rotate(${newTransform.rotation}deg)`;
          card.style.filter = newTransform.blur > 0 ? `blur(${newTransform.blur}px)` : "";
          card.style.opacity = String(newTransform.opacity);
          /* Phase 4: expose the card's translateY as a CSS variable so
             children (e.g. inner demo screenshots) can apply a small
             counter-translate for a depth-parallax cue. */
          card.style.setProperty("--card-translate-y", `${newTransform.translateY}px`);
          transformsCache.set(i, newTransform);
        }
      });

      /* onActiveCardChange fires whenever the topmost stacked card
         changes. The trigger condition (scrollTop ≥ triggerStart) is
         purely position-based and does not depend on viewport size, so
         the step-chip stays in sync on phone/tablet/desktop equally.
         Mobile users reach triggerStart faster per-swipe (smaller
         effectiveItemDistance) which is intentional — the chip advances
         more frequently, matching the pacing of cards. */
      if (activeIndex !== lastActiveIndex) {
        lastActiveIndex = activeIndex;
        onActiveCardChangeRef.current?.(activeIndex);
      }
    };

    /* --- IntersectionObserver gate: skip the per-frame transform writes
       when the section is far from viewport. CRITICAL: in window-scroll
       mode Lenis controls the document scroll, so lenis.raf() must keep
       running unconditionally — only the card transform work is gated. --- */
    const ioTarget: HTMLElement = scroller;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) isInViewRef.current = e.isIntersecting;
      },
      { rootMargin: "200px 0px" },
    );
    io.observe(ioTarget);

    /* --- Initial layout measurement + re-measure triggers.
       The per-frame loop reads from cardLayoutTopsRef, so we must seed the
       cache before the first transform pass and refresh it whenever layout
       can shift (resize, fonts loaded, inner reflow). */
    remeasureLayout();

    const ro = new ResizeObserver(() => remeasureLayout());
    const innerEl = scroller.querySelector(".scroll-stack-inner") as HTMLElement | null;
    if (innerEl) ro.observe(innerEl);

    const onWindowResize = () => remeasureLayout();
    window.addEventListener("resize", onWindowResize, { passive: true });

    /* Web fonts loading after first paint shift card heights → re-measure. */
    if (typeof document !== "undefined" && document.fonts?.ready) {
      document.fonts.ready.then(() => remeasureLayout()).catch(() => {});
    }

    /* --- prefers-reduced-motion: skip Lenis entirely, attach a passive
       scroll listener. Cards still stack on scroll, no smoothing. --- */
    if (reduceMotion) {
      const onScroll = () => {
        if (isInViewRef.current) updateCardTransforms();
      };
      const target: Window | HTMLElement = useWindowScroll ? window : scroller;
      target.addEventListener("scroll", onScroll, { passive: true });
      updateCardTransforms();
      return () => {
        target.removeEventListener("scroll", onScroll);
        window.removeEventListener("resize", onWindowResize);
        io.disconnect();
        ro.disconnect();
        cardsRef.current = [];
        cardLayoutTopsRef.current = [];
        transformsCache.clear();
      };
    }

    /* --- Standard path: Lenis + RAF gated by IntersectionObserver ---
       On coarse-pointer (touch) devices we disable syncTouch and reduce
       touchMultiplier so that a normal finger swipe advances roughly one
       card rather than flying past several via native momentum. Desktop
       wheel feel is unchanged. */
    const touch = isCoarsePointer();
    /* Root Cause A fix: do NOT pass `duration` or `easing` alongside `lerp`.
       In Lenis v1.3.23 the Animate class prioritises the `duration+easing`
       branch over `lerp` — when all three are provided, lerp is silently
       discarded and the exponential ease-out runs instead. That easing covers
       97% of the scroll distance in the first half of the 1.2 s window, then
       barely moves for the remaining 0.6 s — cards appear frozen ("sticking")
       during that tail, and every fast direction-reversal re-triggers it.
       Using lerp only gives frame-rate-independent smooth damping with no
       frozen tail and no frozen-tail accumulation across down-up cycles. */
    const lenis = useWindowScroll
      ? new Lenis({
          smoothWheel: true,
          touchMultiplier: touch ? 1.0 : 2,
          infinite: false,
          gestureOrientation: "vertical",
          wheelMultiplier: 1,
          lerp: touch ? 0.08 : 0.1,
          syncTouch: touch ? false : true,
          syncTouchLerp: 0.075,
        })
      : new Lenis({
          wrapper: scroller,
          content: scroller.querySelector(".scroll-stack-inner") as HTMLElement,
          smoothWheel: true,
          touchMultiplier: touch ? 1.0 : 2,
          infinite: false,
          gestureOrientation: "vertical",
          wheelMultiplier: 1,
          lerp: touch ? 0.08 : 0.1,
          syncTouch: touch ? false : true,
          syncTouchLerp: 0.075,
        });

    lenis.on("scroll", () => {
      if (isInViewRef.current) updateCardTransforms();
    });

    /* lenis.raf MUST run every frame — in window-scroll mode this engine
       drives the entire document scroll; pausing it stalls the page.
       Transform writes are gated separately via isInViewRef inside the
       scroll handler. */
    const raf = (time: number) => {
      lenis.raf(time);
      animationFrameRef.current = requestAnimationFrame(raf);
    };
    animationFrameRef.current = requestAnimationFrame(raf);
    lenisRef.current = lenis;
    updateRef.current = updateCardTransforms;

    updateCardTransforms();

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      lenis.destroy();
      io.disconnect();
      ro.disconnect();
      window.removeEventListener("resize", onWindowResize);
      lenisRef.current = null;
      cardsRef.current = [];
      cardLayoutTopsRef.current = [];
      transformsCache.clear();
    };
  }, [useWindowScroll, itemDistance]);

  /* When transform-shaping params change, call the updater directly so
     the stack reflects the new values immediately (paramsRef has already
     been synced above the effect; updateRef points at the live closure). */
  useEffect(() => {
    updateRef.current?.();
  }, [
    itemScale,
    itemStackDistance,
    stackPosition,
    scaleEndPosition,
    baseScale,
    rotationAmount,
    blurAmount,
    useWindowScroll,
  ]);

  return (
    <div
      className={`scroll-stack-scroller ${className}`.trim()}
      ref={scrollerRef}
      style={{
        overflowY: useWindowScroll ? "visible" : "auto",
        overscrollBehavior: "contain",
        WebkitOverflowScrolling: "touch",
        WebkitTransform: "translateZ(0)",
        transform: "translateZ(0)",
      }}
    >
      <div className="scroll-stack-inner">
        {children}
        <div className="scroll-stack-end" />
      </div>
    </div>
  );
};

export { ScrollStack };
export default ScrollStack;

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

export const ScrollStackItem = ({
  children,
  itemClassName = "",
}: ScrollStackItemProps) => (
  <div className={`scroll-stack-card ${itemClassName}`.trim()}>{children}</div>
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
}

interface CardTransform {
  translateY: number;
  scale: number;
  rotation: number;
  blur: number;
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
}

const prefersReducedMotion = (): boolean => {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
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
}: ScrollStackProps) => {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lenisRef = useRef<Lenis | null>(null);
  const cardsRef = useRef<HTMLElement[]>([]);
  const lastTransformsRef = useRef(new Map<number, CardTransform>());
  const isInViewRef = useRef(true);

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
  };

  /* === Update effect: reflows card spacing when itemDistance changes,
     does not touch Lenis. === */
  useLayoutEffect(() => {
    const cards = cardsRef.current;
    cards.forEach((card, i) => {
      card.style.marginBottom = i < cards.length - 1 ? `${itemDistance}px` : "0px";
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
      if (i < cards.length - 1) {
        card.style.marginBottom = `${itemDistance}px`;
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

    const getElementOffset = (el: HTMLElement) => {
      if (paramsRef.current.useWindowScroll) {
        return el.getBoundingClientRect().top + window.scrollY;
      }
      return el.offsetTop;
    };

    const updateCardTransforms = () => {
      const cardList = cardsRef.current;
      if (!cardList.length) return;

      const p = paramsRef.current;
      const { scrollTop, containerHeight } = getScrollData();
      const stackPositionPx = parsePercentage(p.stackPosition, containerHeight);
      const scaleEndPositionPx = parsePercentage(p.scaleEndPosition, containerHeight);

      const endElement = p.useWindowScroll
        ? (document.querySelector(".scroll-stack-end") as HTMLElement | null)
        : (scrollerRef.current?.querySelector(".scroll-stack-end") as HTMLElement | null);
      const endElementTop = endElement ? getElementOffset(endElement) : 0;

      cardList.forEach((card, i) => {
        if (!card) return;
        const cardTop = getElementOffset(card);
        const triggerStart = cardTop - stackPositionPx - p.itemStackDistance * i;
        const triggerEnd = cardTop - scaleEndPositionPx;
        const pinStart = cardTop - stackPositionPx - p.itemStackDistance * i;
        const pinEnd = endElementTop - containerHeight / 2;

        const scaleProgress = calculateProgress(scrollTop, triggerStart, triggerEnd);
        const targetScale = p.baseScale + i * p.itemScale;
        const scale = 1 - scaleProgress * (1 - targetScale);
        const rotation = p.rotationAmount ? i * p.rotationAmount * scaleProgress : 0;

        let blur = 0;
        if (p.blurAmount) {
          let topCardIndex = 0;
          for (let j = 0; j < cardList.length; j++) {
            const jCardTop = getElementOffset(cardList[j]);
            const jTriggerStart = jCardTop - stackPositionPx - p.itemStackDistance * j;
            if (scrollTop >= jTriggerStart) topCardIndex = j;
          }
          if (i < topCardIndex) blur = Math.max(0, (topCardIndex - i) * p.blurAmount);
        }

        let translateY = 0;
        const isPinned = scrollTop >= pinStart && scrollTop <= pinEnd;
        if (isPinned) {
          translateY = scrollTop - cardTop + stackPositionPx + p.itemStackDistance * i;
        } else if (scrollTop > pinEnd) {
          translateY = pinEnd - cardTop + stackPositionPx + p.itemStackDistance * i;
        }

        const newTransform: CardTransform = {
          translateY: Math.round(translateY * 100) / 100,
          scale: Math.round(scale * 1000) / 1000,
          rotation: Math.round(rotation * 100) / 100,
          blur: Math.round(blur * 100) / 100,
        };

        const last = transformsCache.get(i);
        const changed =
          !last ||
          Math.abs(last.translateY - newTransform.translateY) > 0.1 ||
          Math.abs(last.scale - newTransform.scale) > 0.001 ||
          Math.abs(last.rotation - newTransform.rotation) > 0.1 ||
          Math.abs(last.blur - newTransform.blur) > 0.1;

        if (changed) {
          card.style.transform = `translate3d(0, ${newTransform.translateY}px, 0) scale(${newTransform.scale}) rotate(${newTransform.rotation}deg)`;
          card.style.filter = newTransform.blur > 0 ? `blur(${newTransform.blur}px)` : "";
          transformsCache.set(i, newTransform);
        }
      });
    };

    /* --- IntersectionObserver gate: only run the loop when section is
       in or near the viewport. Section root = the scroller wrapper. --- */
    const ioTarget: HTMLElement = useWindowScroll
      ? scroller
      : scroller;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) isInViewRef.current = e.isIntersecting;
      },
      { rootMargin: "200px 0px" },
    );
    io.observe(ioTarget);

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
        io.disconnect();
        cardsRef.current = [];
        transformsCache.clear();
      };
    }

    /* --- Standard path: Lenis + RAF gated by IntersectionObserver --- */
    const lenis = useWindowScroll
      ? new Lenis({
          duration: 1.2,
          easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
          smoothWheel: true,
          touchMultiplier: 2,
          infinite: false,
          gestureOrientation: "vertical",
          wheelMultiplier: 1,
          lerp: 0.1,
          syncTouch: true,
          syncTouchLerp: 0.075,
        })
      : new Lenis({
          wrapper: scroller,
          content: scroller.querySelector(".scroll-stack-inner") as HTMLElement,
          duration: 1.2,
          easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
          smoothWheel: true,
          touchMultiplier: 2,
          infinite: false,
          gestureOrientation: "vertical",
          wheelMultiplier: 1,
          lerp: 0.1,
          syncTouch: true,
          syncTouchLerp: 0.075,
        });

    lenis.on("scroll", () => {
      if (isInViewRef.current) updateCardTransforms();
    });

    /* RAF gated by viewport visibility — when the section is far above
       or below the viewport we skip the per-frame transform writes
       AND skip Lenis.raf for the duration (Lenis catches up on resume). */
    const raf = (time: number) => {
      if (isInViewRef.current) lenis.raf(time);
      animationFrameRef.current = requestAnimationFrame(raf);
    };
    animationFrameRef.current = requestAnimationFrame(raf);
    lenisRef.current = lenis;

    updateCardTransforms();

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      lenis.destroy();
      io.disconnect();
      lenisRef.current = null;
      cardsRef.current = [];
      transformsCache.clear();
    };
  }, [useWindowScroll, itemDistance]);

  /* When transform-shaping params change, do a one-shot recompute so the
     stack reflects the new values immediately (paramsRef is already
     synced; the loop will pick them up on the next scroll). */
  useEffect(() => {
    const cardList = cardsRef.current;
    if (!cardList.length) return;
    /* trigger by dispatching a no-op scroll: easiest cross-mode way. */
    if (useWindowScroll) window.dispatchEvent(new Event("scroll"));
    else scrollerRef.current?.dispatchEvent(new Event("scroll"));
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

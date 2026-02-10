import { useState, useEffect, useRef, useCallback } from 'react';

type ScrollDirection = 'up' | 'down' | null;

interface UseScrollBehaviorOptions {
  threshold?: number; // Minimum scroll to trigger direction change
  hideOnScrollDown?: boolean;
}

interface UseScrollBehaviorReturn {
  scrollDirection: ScrollDirection;
  isScrolled: boolean;
  scrollY: number;
  isAtTop: boolean;
  isAtBottom: boolean;
  shouldHideHeader: boolean;
  shouldHideFab: boolean;
}

/**
 * Hook for detecting scroll behavior and controlling UI visibility
 * Perfect for hiding/showing headers and FABs based on scroll
 */
export function useScrollBehavior({
  threshold = 10,
  hideOnScrollDown = true,
}: UseScrollBehaviorOptions = {}): UseScrollBehaviorReturn {
  const [scrollDirection, setScrollDirection] = useState<ScrollDirection>(null);
  const [scrollY, setScrollY] = useState(0);
  const [isAtTop, setIsAtTop] = useState(true);
  const [isAtBottom, setIsAtBottom] = useState(false);
  
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  const updateScrollState = useCallback(() => {
    const currentScrollY = window.scrollY;
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    
    // Update position states
    setScrollY(currentScrollY);
    setIsAtTop(currentScrollY < threshold);
    setIsAtBottom(currentScrollY + windowHeight >= documentHeight - threshold);
    
    // Determine direction only if moved enough
    const delta = currentScrollY - lastScrollY.current;
    if (Math.abs(delta) >= threshold) {
      setScrollDirection(delta > 0 ? 'down' : 'up');
      lastScrollY.current = currentScrollY;
    }
    
    ticking.current = false;
  }, [threshold]);

  useEffect(() => {
    const handleScroll = () => {
      if (!ticking.current) {
        window.requestAnimationFrame(updateScrollState);
        ticking.current = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    // Initial state
    updateScrollState();
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [updateScrollState]);

  const isScrolled = scrollY > threshold;
  const shouldHideHeader = hideOnScrollDown && scrollDirection === 'down' && isScrolled;
  const shouldHideFab = scrollDirection === 'down' && isScrolled;

  return {
    scrollDirection,
    isScrolled,
    scrollY,
    isAtTop,
    isAtBottom,
    shouldHideHeader,
    shouldHideFab,
  };
}

/**
 * Hook for infinite scroll / load more functionality
 */
interface UseInfiniteScrollOptions {
  threshold?: number; // Distance from bottom to trigger
  onLoadMore: () => Promise<void>;
  hasMore: boolean;
  isLoading: boolean;
}

export function useInfiniteScroll({
  threshold = 200,
  onLoadMore,
  hasMore,
  isLoading,
}: UseInfiniteScrollOptions) {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadingRef = useRef(isLoading);

  useEffect(() => {
    loadingRef.current = isLoading;
  }, [isLoading]);

  const setRef = useCallback((node: HTMLElement | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    if (node && hasMore) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && !loadingRef.current && hasMore) {
            onLoadMore();
          }
        },
        {
          rootMargin: `${threshold}px`,
        }
      );
      observerRef.current.observe(node);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, onLoadMore, threshold]);

  return { setRef };
}

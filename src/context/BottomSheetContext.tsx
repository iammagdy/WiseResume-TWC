import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

interface BottomSheetContextValue {
  openCount: number;
  increment: () => void;
  decrement: () => void;
  isAnySheetOpen: boolean;
}

const BottomSheetContext = createContext<BottomSheetContextValue>({
  openCount: 0,
  increment: () => {},
  decrement: () => {},
  isAnySheetOpen: false,
});

export function BottomSheetProvider({ children }: { children: ReactNode }) {
  const [openCount, setOpenCount] = useState(0);

  const increment = useCallback(() => setOpenCount((c) => c + 1), []);
  const decrement = useCallback(() => setOpenCount((c) => Math.max(0, c - 1)), []);

  return (
    <BottomSheetContext.Provider value={{ openCount, increment, decrement, isAnySheetOpen: openCount > 0 }}>
      {children}
    </BottomSheetContext.Provider>
  );
}

export function useBottomSheetOpen() {
  return useContext(BottomSheetContext);
}

/**
 * Register a sheet/dialog as open. Must be called with the actual `open` prop value.
 * Increments the global count when open=true, decrements when open becomes false or component unmounts.
 */
export function useBottomSheetRegistration(isOpen: boolean) {
  const { increment, decrement } = useContext(BottomSheetContext);

  useEffect(() => {
    if (isOpen) {
      increment();
      return () => {
        decrement();
      };
    }
  }, [isOpen, increment, decrement]);
}

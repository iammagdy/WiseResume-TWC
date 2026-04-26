import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

interface KeyboardState {
  isOpen: boolean;
  height: number;
}

type KeyboardDispatch = (isOpen: boolean, height: number) => void;

interface KeyboardStateContextValue extends KeyboardState {
  _hasProvider: boolean;
}

const DEFAULT_STATE: KeyboardStateContextValue = { isOpen: false, height: 0, _hasProvider: false };

const KeyboardStateContext = createContext<KeyboardStateContextValue>(DEFAULT_STATE);
const KeyboardDispatchContext = createContext<KeyboardDispatch>(() => {});

export function KeyboardProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<KeyboardState>({ isOpen: false, height: 0 });

  const dispatch = useCallback<KeyboardDispatch>((isOpen, height) => {
    setState({ isOpen, height });
    document.documentElement.classList.toggle('keyboard-open', isOpen);
  }, []);

  const stateValue: KeyboardStateContextValue = { ...state, _hasProvider: true };

  return (
    <KeyboardStateContext.Provider value={stateValue}>
      <KeyboardDispatchContext.Provider value={dispatch}>
        {children}
      </KeyboardDispatchContext.Provider>
    </KeyboardStateContext.Provider>
  );
}

/**
 * Read current keyboard state: `{ isOpen, height }`.
 * Must be used inside a KeyboardProvider.
 */
export function useKeyboard(): KeyboardState {
  const { _hasProvider, isOpen, height } = useContext(KeyboardStateContext);
  if (import.meta.env.DEV && !_hasProvider) {
    console.warn('[KeyboardContext] useKeyboard() called outside <KeyboardProvider>. State will always be { isOpen: false, height: 0 }.');
  }
  return { isOpen, height };
}

/**
 * Write keyboard state from within a KeyboardProvider subtree.
 * Used internally by useKeyboardAwareScroll.
 */
export function useKeyboardDispatch(): KeyboardDispatch {
  const dispatch = useContext(KeyboardDispatchContext);
  const { _hasProvider } = useContext(KeyboardStateContext);
  if (import.meta.env.DEV && !_hasProvider) {
    console.warn('[KeyboardContext] useKeyboardDispatch() called outside <KeyboardProvider>. Keyboard state will not be tracked.');
  }
  return dispatch;
}

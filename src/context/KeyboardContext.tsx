import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

interface KeyboardState {
  isOpen: boolean;
  height: number;
}

type KeyboardDispatch = (isOpen: boolean, height: number) => void;

const KeyboardStateContext = createContext<KeyboardState>({ isOpen: false, height: 0 });
const KeyboardDispatchContext = createContext<KeyboardDispatch>(() => {});

export function KeyboardProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<KeyboardState>({ isOpen: false, height: 0 });

  const dispatch = useCallback<KeyboardDispatch>((isOpen, height) => {
    setState({ isOpen, height });
    document.documentElement.classList.toggle('keyboard-open', isOpen);
  }, []);

  return (
    <KeyboardStateContext.Provider value={state}>
      <KeyboardDispatchContext.Provider value={dispatch}>
        {children}
      </KeyboardDispatchContext.Provider>
    </KeyboardStateContext.Provider>
  );
}

export function useKeyboard(): KeyboardState {
  return useContext(KeyboardStateContext);
}

export function useKeyboardDispatch(): KeyboardDispatch {
  return useContext(KeyboardDispatchContext);
}

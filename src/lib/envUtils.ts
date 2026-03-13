export const isBrowser = typeof window !== 'undefined';

export function getSafeMatchMedia(query: string = '(prefers-color-scheme: dark)') {
  if (isBrowser && typeof window.matchMedia === 'function') {
    return window.matchMedia(query);
  }
  return {
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {}, // Destructured/legacy listener
    removeListener: () => {}, 
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  } as unknown as MediaQueryList;
}

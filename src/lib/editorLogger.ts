const isDev = import.meta.env.DEV;

const editorLogger = {
  warn: (...args: unknown[]): void => {
    if (isDev) console.warn('[editor]', ...args);
  },
  error: (...args: unknown[]): void => {
    if (isDev) console.error('[editor]', ...args);
  },
};

export default editorLogger;

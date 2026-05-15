
declare global {
  interface PromiseConstructor {
    withResolvers?<T>(): {
      promise: Promise<T>;
      resolve: (value: T | PromiseLike<T>) => void;
      reject: (reason?: unknown) => void;
    };
  }

  interface Window {
    __wiseResumePdfJsWorker?: Worker;
  }
}

function ensurePromiseWithResolversPolyfill(): void {
  if (typeof Promise.withResolvers === 'function') return;

  (Promise as unknown as Record<string, unknown>).withResolvers = function <T>() {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}

function getOrCreateWorker(): Worker | null {
  if (typeof window === 'undefined' || typeof Worker === 'undefined') return null;
  if (window.__wiseResumePdfJsWorker) return window.__wiseResumePdfJsWorker;

  const worker = new Worker(new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url), {
    type: 'module',
  });
  window.__wiseResumePdfJsWorker = worker;
  return worker;
}

export async function configurePdfJsWorker(): Promise<void> {
  ensurePromiseWithResolversPolyfill();

  const worker = getOrCreateWorker();
  if (worker) {
    const pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerPort = worker;
  }
}

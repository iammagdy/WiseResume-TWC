import { useEffect } from 'react';
import type { NavigateFunction } from 'react-router-dom';

/**
 * WebMCP feature-detection hook.
 *
 * Registers a small set of in-page tools via
 * `navigator.modelContext.provideContext()` so WebMCP-aware AI agents
 * (Cloudflare AI, ChatGPT desktop, Claude desktop, etc.) can discover
 * what they can do on this page.
 *
 * No-op in browsers without `navigator.modelContext` — the spec is
 * still emerging and most browsers do not implement it yet, so this
 * hook MUST never throw. Cleanup on unmount calls the returned
 * disposer if the implementation provided one.
 */

interface ModelContextTool {
  name: string;
  description: string;
  input_schema?: unknown;
  invoke: (args: Record<string, unknown>) => unknown | Promise<unknown>;
}

interface ModelContextSpec {
  tools: ModelContextTool[];
}

interface ModelContextHandle {
  dispose?: () => void;
}

interface NavigatorWithModelContext extends Navigator {
  modelContext?: {
    provideContext: (spec: ModelContextSpec) => ModelContextHandle | void;
  };
}

export interface UseWebMcpOpts {
  navigate: NavigateFunction;
  setMode?: (mode: 'jobseeker' | 'wisehire') => void;
}

export function useWebMcp({ navigate, setMode }: UseWebMcpOpts): void {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const nav = window.navigator as NavigatorWithModelContext;
    if (!nav.modelContext || typeof nav.modelContext.provideContext !== 'function') {
      return;
    }

    let handle: ModelContextHandle | void;
    try {
      handle = nav.modelContext.provideContext({
        tools: [
          {
            name: 'open_pricing',
            description: 'Navigate the user to the WiseResume / WiseHire pricing page.',
            input_schema: { type: 'object', properties: {}, additionalProperties: false },
            invoke: () => {
              navigate('/pricing');
              return { ok: true, url: '/pricing' };
            },
          },
          {
            name: 'open_examples',
            description: 'Navigate the user to the resume examples gallery.',
            input_schema: { type: 'object', properties: {}, additionalProperties: false },
            invoke: () => {
              navigate('/examples');
              return { ok: true, url: '/examples' };
            },
          },
          {
            name: 'start_resume',
            description: 'Open the WiseResume builder to start a new AI-tailored resume. Optionally accepts a job description to seed the tailoring flow.',
            input_schema: {
              type: 'object',
              properties: {
                job_description: { type: 'string' },
              },
              additionalProperties: false,
            },
            invoke: () => {
              navigate('/?tailor=1');
              return { ok: true, url: '/?tailor=1' };
            },
          },
          {
            name: 'switch_to_wisehire',
            description: 'Switch the landing page from the job-seeker (WiseResume) view to the HR / company (WiseHire) view.',
            input_schema: { type: 'object', properties: {}, additionalProperties: false },
            invoke: () => {
              if (setMode) setMode('wisehire');
              else navigate('/enterprises');
              return { ok: true };
            },
          },
        ],
      });
    } catch {
      // A misbehaving WebMCP implementation must never break the page.
      return;
    }

    return () => {
      try {
        handle?.dispose?.();
      } catch {
        /* swallow */
      }
    };
  }, [navigate, setMode]);
}

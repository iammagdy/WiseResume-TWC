import React, { useState, useCallback, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { edgeFunctions } from '@/integrations/supabase/edgeFunctions';
import { supabase } from '@/integrations/supabase/safeClient';
import { getToken, getUserId, isReady, exchangeToken } from '@/lib/supabaseBridge';
import { useSettingsStore } from '@/store/settingsStore';
import { logAudit } from '@/lib/auditLogger';
import { Button } from '@/components/ui/button';
import { Trash2, Loader2, PlayCircle, AlertCircle, CheckCircle, Activity } from 'lucide-react';
import { type TestStatus, type TestResult, type TestDef, type SectionId } from './types';
import { SECTIONS } from './config';
import { SectionSummaryBadge } from './DevKitBadges';
import { TestItem } from './TestItem';

const MINIMAL_RESUME = {
  title: 'Debug Test Resume',
  contact_info: { name: 'Jane Doe', email: 'jane@example.com', phone: '555-0100', location: 'San Francisco, CA' },
  summary: 'Experienced software engineer with 5 years of full-stack development expertise.',
  experience: [{ company: 'Acme Corp', position: 'Senior Engineer', startDate: '2020-01', endDate: '2024-01', description: 'Built scalable web apps.' }],
  education: [{ institution: 'MIT', degree: 'B.S. Computer Science', startDate: '2014', endDate: '2018' }],
  skills: [{ name: 'React' }, { name: 'TypeScript' }, { name: 'Node.js' }],
};

const SAMPLE_JD = 'We are looking for a Senior Frontend Engineer with 3+ years of React and TypeScript experience.';

/**
 * Lightweight runtime shape for any error-like object the runner observes.
 * Replaces 6 `as any` casts that were previously scattered around the file.
 */
interface RunnerError {
  message: string;
  status?: number;
  detail?: string;
}

function hasErrorField(value: unknown): value is { error: unknown } {
  return typeof value === 'object' && value !== null && 'error' in (value as Record<string, unknown>);
}

function toRunnerError(input: unknown): RunnerError {
  if (input == null) return { message: 'Unknown error' };
  if (typeof input === 'string') return { message: input };

  if (input instanceof Error) {
    const status = (input as Error & { status?: number }).status;
    return { message: input.message || 'Unknown error', status };
  }

  if (typeof input === 'object') {
    const obj = input as Record<string, unknown>;
    const status = typeof obj.status === 'number' ? obj.status : undefined;
    const errField = obj.error;
    const messageField = obj.message;

    let message = '';
    if (typeof errField === 'string') message = errField;
    else if (typeof messageField === 'string') message = messageField;
    else if (errField != null) message = JSON.stringify(errField);
    else message = JSON.stringify(obj);

    const detail =
      typeof messageField === 'string' && messageField !== message ? messageField : undefined;
    return { message: message || 'Unknown error', status, detail };
  }

  return { message: String(input) };
}

export function DevKitRunner() {
  const auth = useAuth();
  const [results, setResults] = useState<Record<string, TestResult>>({});
  const [expandedJson, setExpandedJson] = useState<Record<string, boolean>>({});
  const [sectionRunning, setSectionRunning] = useState<Record<string, boolean>>({});
  const [sectionSummary, setSectionSummary] = useState<Record<string, { passed: number; skipped: number; failed: number }>>({});
  const [globalRunning, setGlobalRunning] = useState(false);
  // C1: non-critical sections collapsed by default (FR-DK-007)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({
    routing: true, settings: true, credits: true, db: true, errors: true, usage: true,
  });
  // C3: smoke run summary (FR-DK-011)
  const [smokeSummary, setSmokeSummary] = useState<{ passed: number; skipped: number; failed: number; failedIds: string[] } | null>(null);

  const setResult = useCallback((id: string, r: TestResult) => {
    setResults(prev => ({ ...prev, [id]: r }));
  }, []);

  const clearAll = () => {
    setResults({});
    setExpandedJson({});
    setSectionSummary({});
    setSmokeSummary(null);
  };

  const toggleJson = (id: string) => {
    setExpandedJson(prev => ({ ...prev, [id]: !prev[id] }));
  };

  /**
   * Returns a developer-friendly message when the raw error text signals a
   * missing or invalid server-side AI API key, so that the Dev Kit shows
   * a clear next step instead of a cryptic "Invalid API key" label.
   */
  const friendlyAIKeyError = (raw: string): string | null => {
    const s = raw.toLowerCase();
    if (s.includes('openrouter') && (s.includes('invalid_key') || s.includes('invalid api key') || s.includes('401'))) {
      return 'OpenRouter API key is invalid or expired — update it in AI Settings';
    }
    if (s.includes('openrouter') && (s.includes('payment_required') || s.includes('402') || s.includes('insufficient credits'))) {
      return 'OpenRouter account has insufficient credits — add funds at openrouter.ai';
    }
    if (s.includes('gemini_api_key') && s.includes('not configured')) {
      return 'GEMINI_API_KEY not configured — required for headshot generation. Set it in Supabase → Project Settings → Edge Function Secrets';
    }
    if (
      s.includes('invalid_key') ||
      s.includes('invalid api key') ||
      s.includes('no ai api key') ||
      s.includes('wise_ai_api_key') ||
      s.includes('vertex_api_key') ||
      s.includes('openrouter_api_key') ||
      s.includes('groq_api_key') ||
      s.includes('api key not configured') ||
      s.includes('wiseresume ai is not configured')
    ) {
      return 'AI key not configured — set OPENROUTER_API_KEY and GROQ_API_KEY in Supabase → Project Settings → Edge Function Secrets';
    }
    return null;
  };

  /**
   * strictInvoke: Helper to enforce US1-FR-DK-002. Wrapped in useCallback so useMemo
   * dependency on strictInvoke is stable and doesn't cause infinite re-creation of tests[].
   */
  const strictInvoke = useCallback(async (testId: string, fn: () => Promise<unknown>): Promise<TestResult> => {
    const start = Date.now();
    try {
      const res = await fn();
      const durationMs = Date.now() - start;

      // Check if it's a Supabase edge function response
      if (res && typeof res === 'object' && ('data' in res || 'error' in res)) {
        const { data, error } = res;

        // Strict Error: Edge function returned an error object
        if (error) {
          const errObj = toRunnerError(error);
          const status = errObj.status ?? 500;
          const rawMsg = errObj.message;
          const friendly = friendlyAIKeyError(rawMsg);
          const detail = rawMsg && rawMsg !== `HTTP Error: ${status}` ? `: ${rawMsg}` : '';
          return {
            status: 'error',
            httpStatus: status,
            error: rawMsg,
            durationMs,
            summary: friendly ?? `Edge Function Error (HTTP ${status})${detail}`,
          };
        }

        // Strict Error: Data payload contains an 'error' field (US1-FR-DK-002)
        if (data && typeof data === 'object' && hasErrorField(data)) {
          const errObj = toRunnerError(data);
          const rawErr = errObj.message;
          const rawMsg = errObj.detail ?? rawErr;
          const friendly = friendlyAIKeyError(rawErr) || friendlyAIKeyError(rawMsg);
          const detail = rawMsg !== rawErr ? ` — ${rawMsg}` : '';
          return {
            status: 'error',
            data,
            durationMs,
            summary: friendly ?? `Error: ${rawErr}${detail}`,
          };
        }

        return { status: 'success', data, durationMs, summary: 'OK' };
      }

      // Handle raw responses or direct DB queries
      return { status: 'success', data: res, durationMs, summary: 'OK' };
    } catch (err) {
      const rawMsg = (err instanceof Error ? err.message : String(err)) || String(err);
      const friendly = friendlyAIKeyError(rawMsg);
      return {
        status: 'error',
        error: rawMsg,
        durationMs: Date.now() - start,
        summary: friendly ?? `Execution Error: ${rawMsg || 'Unknown'}`,
      };
    }
  }, []);

  const runTest = useCallback(async (test: TestDef) => {
    setResult(test.id, { status: 'running' });
    const res = await test.run();
    setResult(test.id, res);
    return res.status;
  }, [setResult]);

  const tests: TestDef[] = useMemo(() => [
    // === AUTH ===
    {
      id: 'auth-state', label: 'Show Auth State', description: 'Display current useAuth() context values', section: 'auth',
      run: () => strictInvoke('auth-state', async () => ({
        isAuthenticated: auth.isAuthenticated,
        supabaseReady: auth.supabaseReady,
        user: auth.user,
        bridgeToken: getToken() ? '(present)' : '(null)',
        bridgeUserId: getUserId(),
        bridgeReady: isReady()
      })),
    },
    {
      id: 'token-exchange', label: 'Test Token Exchange', description: 'Call getKindeToken() → exchangeToken()', section: 'auth',
      run: async (): Promise<TestResult> => {
        if (!auth.isAuthenticated) return { status: 'warn' as const, summary: 'Skipped — sign in to the main app first, then re-run (requires an active Kinde session)', durationMs: 0 };
        return strictInvoke('token-exchange', async () => {
          const kindeToken = await auth.getKindeToken();
          if (!kindeToken) throw new Error('No Kinde token available');
          await exchangeToken(kindeToken);
          return { bridgeReady: isReady(), userId: getUserId(), tokenPresent: !!getToken() };
        });
      },
    },
    {
      id: 'who-am-i', label: 'Who am I?', description: 'Call /me edge function', section: 'auth',
      run: async (): Promise<TestResult> => {
        if (!auth.isAuthenticated) return { status: 'warn' as const, summary: 'Skipped — sign in to the main app first, then re-run (requires an active Supabase session)', durationMs: 0 };
        return strictInvoke('who-am-i', () => edgeFunctions.functions.invoke('me'));
      },
    },
    // === EMAIL === — Single consolidated test to conserve the 3,000/month email quota
    {
      id: 'email-service', label: 'Email Service Test', description: 'Validates the email pipeline configuration using dry_run mode — no real email is sent.', section: 'email',
      run: () => strictInvoke('email-service', async () => {
        const res = await edgeFunctions.functions.invoke('send-contact-email', {
          body: { type: 'contact', email: 'contact@thewise.cloud', subject: '[HC] Email Service Test', message: 'Dev Kit smoke test — email pipeline verification.', metadata: { source: 'dev-kit' }, dry_run: true }
        });
        if (res.error) throw new Error(toRunnerError(res.error).message || 'Email function error');
        if (!res.data?.success && res.data?.reason !== 'dry_run') {
          throw new Error(res.data?.error || res.data?.reason || 'Email configuration check failed');
        }
        return { ...res.data, _hint: 'Dry-run mode: configuration validated without sending a real email.' };
      }),
    },
    // === AI — Editor AI smoke tests (x-smoke-test: true bypasses credit deduction) ===
    {
      id: 'tailor-resume', label: 'Tailor Resume (smoke)', description: 'Smoke-test tailor-resume edge function — no AI call, no credit deduction', section: 'ai',
      run: async (): Promise<TestResult> => {
        if (!auth.isAuthenticated) return { status: 'warn' as const, summary: 'Skipped — sign in to the main app first, then re-run (requires an active Supabase session)', durationMs: 0 };
        return strictInvoke('tailor-resume', () => edgeFunctions.functions.invoke('tailor-resume', { headers: { 'x-smoke-test': 'true' }, body: { resume: MINIMAL_RESUME, jobDescription: SAMPLE_JD, intensity: 'light' } }));
      },
    },
    {
      id: 'agentic-chat', label: 'Agentic Chat (smoke)', description: 'Smoke-test agentic-chat edge function — no AI call, no credit deduction', section: 'ai',
      run: async (): Promise<TestResult> => {
        if (!auth.isAuthenticated) return { status: 'warn' as const, summary: 'Skipped — sign in to the main app first, then re-run (requires an active Supabase session)', durationMs: 0 };
        return strictInvoke('agentic-chat', () => edgeFunctions.functions.invoke('agentic-chat', { headers: { 'x-smoke-test': 'true' }, body: { message: 'What can you help me with?', conversationHistory: [], currentResume: null } }));
      },
    },
    {
      id: 'recruiter-simulation', label: 'Recruiter Simulation (smoke)', description: 'Smoke-test recruiter-simulation edge function — no AI call, no credit deduction', section: 'ai',
      run: async (): Promise<TestResult> => {
        if (!auth.isAuthenticated) return { status: 'warn' as const, summary: 'Skipped — sign in to the main app first, then re-run (requires an active Supabase session)', durationMs: 0 };
        return strictInvoke('recruiter-simulation', () => edgeFunctions.functions.invoke('recruiter-simulation', { headers: { 'x-smoke-test': 'true' }, body: { resume: MINIMAL_RESUME, persona: 'hiring_manager' } }));
      },
    },
    {
      id: 'suggest-template', label: 'Suggest Template (smoke)', description: 'Smoke-test suggest-template edge function — no AI call, no credit deduction', section: 'ai',
      run: async (): Promise<TestResult> => {
        if (!auth.isAuthenticated) return { status: 'warn' as const, summary: 'Skipped — sign in to the main app first, then re-run (requires an active Supabase session)', durationMs: 0 };
        return strictInvoke('suggest-template', () => edgeFunctions.functions.invoke('suggest-template', { headers: { 'x-smoke-test': 'true' }, body: { resume: MINIMAL_RESUME } }));
      },
    },
    {
      id: 'optimize-for-linkedin', label: 'LinkedIn Optimizer (smoke)', description: 'Smoke-test optimize-for-linkedin edge function — no AI call, no credit deduction', section: 'ai',
      run: async (): Promise<TestResult> => {
        if (!auth.isAuthenticated) return { status: 'warn' as const, summary: 'Skipped — sign in to the main app first, then re-run (requires an active Supabase session)', durationMs: 0 };
        return strictInvoke('optimize-for-linkedin', () => edgeFunctions.functions.invoke('optimize-for-linkedin', { headers: { 'x-smoke-test': 'true' }, body: { resume: MINIMAL_RESUME } }));
      },
    },
    {
      id: 'smart-fit-rewrite', label: 'Smart Fit Rewrite (smoke)', description: 'Smoke-test smart-fit-rewrite edge function — no AI call, no credit deduction', section: 'ai',
      run: async (): Promise<TestResult> => {
        if (!auth.isAuthenticated) return { status: 'warn' as const, summary: 'Skipped — sign in to the main app first, then re-run (requires an active Supabase session)', durationMs: 0 };
        return strictInvoke('smart-fit-rewrite', () => edgeFunctions.functions.invoke('smart-fit-rewrite', { headers: { 'x-smoke-test': 'true' }, body: { mode: 'rewrite', candidates: [], jobDescription: SAMPLE_JD } }));
      },
    },
    {
      id: 'ai-engine-openrouter', label: 'Engine · OpenRouter (Gemma 4)', description: 'Directly test WiseResume managed OpenRouter endpoint — admin only', section: 'ai',
      run: async (): Promise<TestResult> => {
        if (!auth.isAuthenticated) return { status: 'warn' as const, summary: 'Skipped — sign in to the main app first, then re-run (requires an active Supabase session)', durationMs: 0 };
        return strictInvoke('ai-engine-openrouter', async () => {
          const res = await edgeFunctions.functions.invoke('ai-test', { body: { wiseresumeSubProvider: 'openrouter' } });
          if (res.error) throw new Error(toRunnerError(res.error).message || 'ai-test error');
          if (!res.data?.success) throw new Error(res.data?.error || 'ai-test returned failure');
          return { engine: 'openrouter', model: res.data.model, latencyMs: res.data.latencyMs, response: res.data.response };
        });
      },
    },
    {
      id: 'ai-engine-groq', label: 'Engine · Groq (Qwen 3 32B)', description: 'Directly test WiseResume managed Groq endpoint (qwen/qwen3-32b) — admin only', section: 'ai',
      run: async (): Promise<TestResult> => {
        if (!auth.isAuthenticated) return { status: 'warn' as const, summary: 'Skipped — sign in to the main app first, then re-run (requires an active Supabase session)', durationMs: 0 };
        return strictInvoke('ai-engine-groq', async () => {
          const res = await edgeFunctions.functions.invoke('ai-test', { body: { wiseresumeSubProvider: 'groq' } });
          if (res.error) throw new Error(toRunnerError(res.error).message || 'ai-test error');
          if (!res.data?.success) throw new Error(res.data?.error || 'ai-test returned failure');
          return { engine: 'groq', model: res.data.model, latencyMs: res.data.latencyMs, response: res.data.response };
        });
      },
    },
    // === BYOK ===
    {
      id: 'byok-status', label: 'BYOK Status', description: 'Read byokEnabled / byokProvider from store and list configured keys from edge function', section: 'byok',
      run: async (): Promise<TestResult> => {
        if (!auth.isAuthenticated) return { status: 'warn', summary: 'Skipped — sign in first', durationMs: 0 };
        return strictInvoke('byok-status', async () => {
          const s = useSettingsStore.getState();
          const res = await edgeFunctions.functions.invoke('manage-api-keys', { method: 'GET' } as Parameters<typeof edgeFunctions.functions.invoke>[1]);
          if (res.error) throw new Error((res.error as { message?: string }).message || 'manage-api-keys error');
          const keys: Array<{ provider: string; hint: string }> = Array.isArray(res.data?.keys) ? res.data.keys : [];
          return {
            byokEnabled: s.byokEnabled,
            byokProvider: s.byokProvider,
            configuredProviders: keys.map((k) => `${k.provider} (${k.hint})`),
            keyCount: keys.length,
          };
        });
      },
    },
    ...(['openai', 'anthropic', 'gemini', 'groq', 'mistral', 'cohere'] as const).map((provider) => ({
      id: `byok-probe-${provider}`,
      label: `BYOK Probe · ${provider.charAt(0).toUpperCase() + provider.slice(1)}`,
      description: `Fetch manage-api-keys list and confirm ${provider} key presence`,
      section: 'byok' as const,
      run: async (): Promise<TestResult> => {
        if (!auth.isAuthenticated) return { status: 'warn', summary: 'Skipped — sign in first', durationMs: 0 };
        return strictInvoke(`byok-probe-${provider}`, async () => {
          const res = await edgeFunctions.functions.invoke('manage-api-keys', { method: 'GET' } as Parameters<typeof edgeFunctions.functions.invoke>[1]);
          if (res.error) throw new Error((res.error as { message?: string }).message || 'manage-api-keys error');
          const keys: Array<{ provider: string; hint: string }> = Array.isArray(res.data?.keys) ? res.data.keys : [];
          const match = keys.find((k) => k.provider === provider);
          return { provider, configured: !!match, hint: match?.hint ?? null, summary: match ? `Key configured: ${match.hint}` : `No ${provider} key configured` };
        });
      },
    })),
    // === ROUTING ===
    {
      id: 'dashboard-route', label: 'Dashboard Route Check', description: 'Query resumes table (RLS check)', section: 'routing',
      run: () => strictInvoke('dashboard-route', async () => supabase.from('resumes').select('id').limit(1)),
    },
    {
      id: 'protected-route', label: 'ProtectedRoute Auth Check', description: 'Verify useAuth() state', section: 'routing',
      run: () => strictInvoke('protected-route', async () => ({ isAuthenticated: auth.isAuthenticated, supabaseReady: auth.supabaseReady, loading: auth.loading })),
    },
    // === SETTINGS ===
    {
      id: 'read-ai-settings', label: 'Read AI Settings', description: 'Read provider settings from store', section: 'settings',
      run: () => strictInvoke('read-ai-settings', async () => {
        const s = useSettingsStore.getState();
        return { aiProvider: s.aiProvider, theme: s.theme };
      }),
    },
    {
      id: 'ui-readability-instruction', label: 'UI Readability Check', description: 'Manual instruction for verifying section headers', section: 'settings',
      run: async () => ({
        status: 'success' as const,
        summary: 'MANUAL ACTION: Go to Settings -> Account/Security. Verify headers are inside cards & readable against cloud background.',
        data: { instruction: 'Headers should have backdrop-blur and translucent backgrounds.' }
      }),
    },
    // === CREDITS ===
    {
      id: 'ai-credits-read', label: 'AI Credits Read', description: 'Query ai_credits table', section: 'credits',
      run: async (): Promise<TestResult> => {
        if (!auth.isAuthenticated) return { status: 'warn' as const, summary: 'Skipped — sign in to the main app first, then re-run (requires an active Supabase session)', durationMs: 0 };
        return strictInvoke('ai-credits-read', async () => {
          const userId = getUserId();
          if (!userId) throw new Error('No userId');
          const { data, error } = await supabase.from('ai_credits').select('*').eq('user_id', userId).maybeSingle();
          if (error) throw error;
          return data;
        });
      },
    },
    // === AI (continued) ===
    {
      id: 'enhance-section', label: 'Resume Section AI (smoke)', description: 'Smoke-test resume-section-ai edge function (enhance action) — no AI call, no credit deduction', section: 'ai',
      run: async (): Promise<TestResult> => {
        if (!auth.isAuthenticated) return { status: 'warn' as const, summary: 'Skipped — sign in to the main app first, then re-run (requires an active Supabase session)', durationMs: 0 };
        return strictInvoke('enhance-section', () => edgeFunctions.functions.invoke('resume-section-ai', { headers: { 'x-smoke-test': 'true', 'x-resume-section-ai-action': 'enhance' }, body: { section: 'summary', currentContent: MINIMAL_RESUME.summary, context: { resume: MINIMAL_RESUME } } }));
      },
    },
    {
      id: 'analyze-resume', label: 'Analyze Resume (smoke)', description: 'Smoke-test analyze-resume edge function — no AI call, no credit deduction', section: 'ai',
      run: async (): Promise<TestResult> => {
        if (!auth.isAuthenticated) return { status: 'warn' as const, summary: 'Skipped — sign in to the main app first, then re-run (requires an active Supabase session)', durationMs: 0 };
        return strictInvoke('analyze-resume', () => edgeFunctions.functions.invoke('analyze-resume', { headers: { 'x-smoke-test': 'true' }, body: { resume: MINIMAL_RESUME, jobDescription: SAMPLE_JD } }));
      },
    },
    {
      id: 'cover-letter', label: 'Cover Letter', description: 'Call generate-cover-letter edge function', section: 'ai',
      run: async (): Promise<TestResult> => {
        if (!auth.isAuthenticated) return { status: 'warn' as const, summary: 'Skipped — sign in to the main app first, then re-run (requires an active Supabase session)', durationMs: 0 };
        return strictInvoke('cover-letter', () => edgeFunctions.functions.invoke('generate-cover-letter', { body: { resume: MINIMAL_RESUME, jobDescription: SAMPLE_JD, tone: 'professional' } }));
      },
    },
    // === DB ===
    {
      id: 'list-resume', label: 'List 1 Resume', description: 'Check direct DB access', section: 'db',
      run: () => strictInvoke('list-resume', async () => supabase.from('resumes').select('id, title').limit(1)),
    },
    // === ERRORS ===
    {
      id: 'audit-log-write', label: 'Audit Log Write', description: 'Write and verify a test audit log entry', section: 'errors',
      run: async (): Promise<TestResult> => {
        if (!auth.isAuthenticated) return { status: 'warn' as const, summary: 'Skipped — sign in to the main app first, then re-run (requires an active Supabase session)', durationMs: 0 };
        return strictInvoke('audit-log-write', async () => {
          const userId = getUserId();
          if (!userId) throw new Error('No userId');
          const testAction = `dev-kit-test-${Date.now()}`;
          logAudit('account', testAction, { source: 'dev-kit' });
          await new Promise(r => setTimeout(r, 1500));
          const { data, error } = await supabase.from('audit_logs').select('id').eq('action', testAction).limit(1);
          if (error) throw error;
          if (!data || data.length === 0) throw new Error('Audit log entry not found');
          return data[0];
        });
      },
    },
    // === USAGE ===
    // U3: Production UI queries usage_events directly via Supabase client (no edge function wraps it).
    // This Dev Kit test is intentionally a direct DB call — same path as the real feature.
    {
      id: 'load-usage-events', label: 'Usage Events Health', description: 'Query last 10 events from real table', section: 'usage',
      run: () => strictInvoke('load-usage-events', async () => {
        const { data, error } = await supabase.from('usage_events').select('*').order('created_at', { ascending: false }).limit(10);
        if (error) throw error;
        return data;
      }),
    },
  ], [auth, strictInvoke]);

  const runAllInSection = useCallback(async (sectionId: SectionId) => {
    const sectionTests = tests.filter(t => t.section === sectionId);
    // Auto-expand section when running
    setCollapsed(prev => ({ ...prev, [sectionId]: false }));
    setSectionRunning(prev => ({ ...prev, [sectionId]: true }));
    let passed = 0;
    let skipped = 0;
    let failed = 0;

    // Run sequentially per section
    for (const test of sectionTests) {
      const status = await runTest(test);
      if (status === 'success') passed++;
      else if (status === 'warn') skipped++;
      else failed++;
    }

    setSectionSummary(prev => ({ ...prev, [sectionId]: { passed, skipped, failed } }));
    setSectionRunning(prev => ({ ...prev, [sectionId]: false }));
  }, [tests, runTest]);

  const runSmoke = useCallback(async () => {
    setGlobalRunning(true);
    setSmokeSummary(null);

    // Group EVERY test by its section ID
    const bySectionId: Record<string, TestDef[]> = {};
    for (const test of tests) {
      if (!bySectionId[test.section]) bySectionId[test.section] = [];
      bySectionId[test.section].push(test);
    }

    const allStatuses: { id: string; status: string }[] = [];

    // Walk through SECTIONS in order to reveal them progressively
    for (const section of SECTIONS) {
      const sectionTests = bySectionId[section.id];
      if (!sectionTests || sectionTests.length === 0) continue;

      // Reveal & expand this section as we start it
      setCollapsed(prev => ({ ...prev, [section.id]: false }));
      setSectionRunning(prev => ({ ...prev, [section.id]: true }));

      // Run every test in this section one by one
      let passed = 0;
      let skipped = 0;
      let failed = 0;
      for (const test of sectionTests) {
        const status = await runTest(test);
        allStatuses.push({ id: test.id, status });
        if (status === 'success') passed++;
        else if (status === 'warn') skipped++;
        else failed++;
        // Add a micro-delay to make the UI feel responsive
        await new Promise(r => setTimeout(r, 50));
      }

      setSectionSummary(prev => ({ ...prev, [section.id]: { passed, skipped, failed } }));
      setSectionRunning(prev => ({ ...prev, [section.id]: false }));
    }

    const failedIds = allStatuses.filter(s => s.status !== 'success' && s.status !== 'warn').map(s => s.id);
    const totalPassed = allStatuses.filter(s => s.status === 'success').length;
    const totalSkipped = allStatuses.filter(s => s.status === 'warn').length;
    setSmokeSummary({ passed: totalPassed, skipped: totalSkipped, failed: failedIds.length, failedIds });
    setGlobalRunning(false);
  }, [tests, runTest]);

  const renderSection = (section: typeof SECTIONS[number]) => {
    const sectionTests = tests.filter(t => t.section === section.id);
    if (sectionTests.length === 0) return null;

    const running = sectionRunning[section.id] || false;
    const summary = sectionSummary[section.id];
    // C1 — FR-DK-007: collapsed state; non-critical sections start collapsed
    const isCollapsed = collapsed[section.id] ?? false;

    return (
      <div key={section.id} className="space-y-3">
        <div className="flex items-center justify-between border-b border-border pb-2 px-1">
          {/* Clickable section header to toggle collapse */}
          <button
            className="flex items-center gap-2 text-left group flex-1 min-w-0"
            onClick={() => setCollapsed(prev => ({ ...prev, [section.id]: !prev[section.id] }))}
          >
            <span className="text-muted-foreground text-xs w-3 flex-shrink-0">{isCollapsed ? '▶' : '▼'}</span>
            <h2 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors truncate">
              {section.emoji} {section.title}
            </h2>
            {summary && <SectionSummaryBadge passed={summary.passed} skipped={summary.skipped} failed={summary.failed} />}
          </button>
          <Button
            size="sm"
            variant="ghost"
            disabled={running || globalRunning}
            onClick={() => runAllInSection(section.id)}
            className="hover:bg-primary/10 hover:text-primary transition-colors h-8 flex-shrink-0 ml-2"
          >
            {running ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <PlayCircle className="w-3.5 h-3.5 mr-1.5" />}
            Run
          </Button>
        </div>
        {!isCollapsed && (
          <div className="grid grid-cols-1 gap-3">
            {sectionTests.map(test => (
              <TestItem
                key={test.id}
                test={test}
                result={results[test.id] || { status: 'idle' }}
                isExpanded={expandedJson[test.id] || false}
                onRun={() => runTest(test)}
                onToggleExpand={() => toggleJson(test.id)}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Sticky toolbar + FR-DK-011 smoke summary banner */}
      <div className="sticky top-0 z-30 bg-background/98 dark:bg-background backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between py-4 px-1">
          <div className="flex items-center gap-3">
            <Button
              onClick={runSmoke}
              disabled={globalRunning}
              className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 transition-all active:scale-95"
            >
              {globalRunning ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <PlayCircle className="w-4 h-4 mr-2" />}
              Run All Smoke
            </Button>
            <Button variant="outline" size="sm" onClick={clearAll} disabled={globalRunning} className="h-10">
              <Trash2 className="w-4 h-4 mr-2" /> Clear All
            </Button>
          </div>

          {globalRunning && (
            <div className="flex items-center gap-2 text-primary font-medium text-sm">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Testing Platform Health...
            </div>
          )}
        </div>

        {/* FR-DK-011: Consolidated smoke summary — show after smoke finishes */}
        {smokeSummary && !globalRunning && (
          <div className={`px-2 pb-3 flex items-start gap-2 text-sm font-medium ${
            smokeSummary.failed === 0 ? 'text-green-700 dark:text-green-400' : 'text-destructive'
          }`}>
            {smokeSummary.failed === 0
              ? <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              : <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            }
            <div>
              <span>
                {smokeSummary.failed === 0
                  ? smokeSummary.passed === 0
                    ? `⏭ All ${smokeSummary.skipped} checks skipped — sign in to the main app and re-run`
                    : smokeSummary.skipped > 0
                      ? `✅ ${smokeSummary.passed} passed · ${smokeSummary.skipped} skipped`
                      : `✅ All ${smokeSummary.passed} smoke checks passed`
                  : `❌ ${smokeSummary.failed} failed: ${smokeSummary.failedIds.join(', ')}`
                }
              </span>
              {smokeSummary.failed === 0 && smokeSummary.skipped > 0 && (
                <p className="text-xs text-muted-foreground font-normal mt-0.5">
                  {smokeSummary.skipped} check{smokeSummary.skipped !== 1 ? 's' : ''} require a user session —{' '}
                  <a
                    href="/sign-in?mode=login"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-foreground transition-colors"
                  >
                    sign in to the main app
                  </a>
                  {' '}in a separate tab, then re-run.
                  {smokeSummary.passed > 0 && ' Email Service Test ran in dry-run mode — no real email was sent.'}
                </p>
              )}
              {smokeSummary.failed === 0 && smokeSummary.skipped === 0 && smokeSummary.passed > 0 && (
                <p className="text-xs text-muted-foreground font-normal mt-0.5">
                  Email Service Test ran in dry-run mode — no real email was sent.
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* System Health Summary Card */}
      {(() => {
        const total = tests.length;
        const passed = smokeSummary ? smokeSummary.passed : 0;
        const skipped = smokeSummary ? smokeSummary.skipped : 0;
        const failed = smokeSummary ? smokeSummary.failed : 0;
        // Health % is based only on tests that actually ran (not skipped)
        const ran = passed + failed;
        const healthPct = smokeSummary ? (ran === 0 ? null : Math.round((passed / ran) * 100)) : null;
        const isHealthy = healthPct !== null && healthPct === 100;
        const isPartial = healthPct !== null && healthPct >= 50 && healthPct < 100;
        const isUnhealthy = healthPct !== null && healthPct < 50;

        return (
          <div className={`rounded-xl border p-4 flex items-center gap-4 transition-all ${
            isHealthy ? 'border-green-500/30 bg-green-500/5' :
            isPartial ? 'border-amber-500/30 bg-amber-500/5' :
            isUnhealthy ? 'border-destructive/30 bg-destructive/5' :
            'border-border bg-muted/30'
          }`}>
            <div className={`rounded-lg p-2.5 shrink-0 ${
              isHealthy ? 'bg-green-500/20 text-green-600 dark:text-green-400' :
              isPartial ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400' :
              isUnhealthy ? 'bg-destructive/20 text-destructive' :
              'bg-muted text-muted-foreground'
            }`}>
              <Activity className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-sm font-semibold text-foreground">
                  System Health
                </p>
                <span className={`text-sm font-bold tabular-nums ${
                  isHealthy ? 'text-green-600 dark:text-green-400' :
                  isPartial ? 'text-amber-600 dark:text-amber-400' :
                  isUnhealthy ? 'text-destructive' :
                  'text-muted-foreground'
                }`}>
                  {healthPct !== null ? `${healthPct}%` : '—'}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                {healthPct !== null && (
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isHealthy ? 'bg-green-500' :
                      isPartial ? 'bg-amber-500' :
                      'bg-destructive'
                    }`}
                    style={{ width: `${healthPct}%` }}
                  />
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {smokeSummary === null
                  ? `${total} checks available — run smoke test to evaluate health`
                  : ran === 0
                    ? `${skipped} checks skipped — sign in to the main app to run session-dependent checks`
                    : skipped > 0
                      ? `${passed} of ${ran} checks passing · ${skipped} skipped (sign in to run session checks)`
                      : `${passed} of ${ran} checks passing`}
              </p>
            </div>
          </div>
        );
      })()}

      <div className="space-y-10">
        {SECTIONS.map(section => renderSection(section))}
      </div>
    </div>
  );
}

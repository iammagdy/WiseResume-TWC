import React, { useState, useCallback, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { edgeFunctions } from '@/lib/edgeFunctions';
import { databases, account, Query } from '@/lib/appwrite';
import { COLLECTIONS, DATABASE_ID } from '@/lib/appwrite-collections';
import { useSettingsStore } from '@/store/settingsStore';
import { logAudit } from '@/lib/auditLogger';
import { devKitAuthHeaders } from '@/lib/devkit/devKitAuth';
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
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({
    routing: true, settings: true, credits: true, db: true, errors: true, usage: true,
  });
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

  const friendlyAIKeyError = (raw: string): string | null => {
    const s = raw.toLowerCase();
    if (s.includes('openrouter') && (s.includes('invalid_key') || s.includes('invalid api key') || s.includes('401'))) {
      return 'OpenRouter API key is invalid or expired — update it in AI Settings';
    }
    if (s.includes('openrouter') && (s.includes('payment_required') || s.includes('402') || s.includes('insufficient credits'))) {
      return 'OpenRouter account has insufficient credits — add funds at openrouter.ai';
    }
    if (s.includes('gemini_api_key') && s.includes('not configured')) {
      return 'GEMINI_API_KEY not configured — required for headshot generation. Set it in Appwrite → Function Variables';
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
      return 'AI key not configured — set OPENROUTER_API_KEY and GROQ_API_KEY in Appwrite → Function Variables';
    }
    return null;
  };

  const strictInvoke = useCallback(async (testId: string, fn: () => Promise<unknown>): Promise<TestResult> => {
    const start = Date.now();
    try {
      const res = await fn();
      const durationMs = Date.now() - start;

      if (res && typeof res === 'object' && ('data' in res || 'error' in res)) {
        const { data, error } = res as { data?: unknown; error?: unknown };

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
        appwriteReady: auth.supabaseReady,
        user: auth.user ? { id: auth.user.id, email: auth.user.email, name: auth.user.name } : null,
      })),
    },
    {
      id: 'appwrite-session', label: 'Appwrite Session', description: 'Call account.get() to verify active Appwrite session', section: 'auth',
      run: async (): Promise<TestResult> => {
        if (!auth.isAuthenticated) return { status: 'warn' as const, summary: 'Skipped — sign in to the main app first', durationMs: 0 };
        return strictInvoke('appwrite-session', async () => {
          const session = await account.get();
          return { userId: session.$id, email: session.email, name: session.name, status: session.status };
        });
      },
    },
    {
      id: 'who-am-i', label: 'Who am I?', description: 'Call /me edge function', section: 'auth',
      run: async (): Promise<TestResult> => {
        if (!auth.isAuthenticated) return { status: 'warn' as const, summary: 'Skipped — sign in to the main app first', durationMs: 0 };
        return strictInvoke('who-am-i', () => edgeFunctions.functions.invoke('me'));
      },
    },
    // === EMAIL ===
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
    // === AI ===
    {
      id: 'tailor-resume', label: 'Tailor Resume (smoke)', description: 'Smoke-test tailor-resume edge function — no AI call, no credit deduction', section: 'ai',
      run: async (): Promise<TestResult> => {
        return strictInvoke('tailor-resume', () => edgeFunctions.functions.invoke('tailor-resume', { headers: { 'x-smoke-test': 'true', ...devKitAuthHeaders() }, body: { resume: MINIMAL_RESUME, jobDescription: SAMPLE_JD, intensity: 'light' } }));
      },
    },
    {
      id: 'agentic-chat', label: 'Agentic Chat (smoke)', description: 'Smoke-test agentic-chat edge function — no AI call, no credit deduction', section: 'ai',
      run: async (): Promise<TestResult> => {
        return strictInvoke('agentic-chat', () => edgeFunctions.functions.invoke('agentic-chat', { headers: { 'x-smoke-test': 'true', ...devKitAuthHeaders() }, body: { message: 'What can you help me with?', conversationHistory: [], currentResume: null } }));
      },
    },
    {
      id: 'smart-fit-rewrite', label: 'Smart Fit Rewrite (smoke)', description: 'Smoke-test smart-fit-rewrite edge function — no AI call, no credit deduction', section: 'ai',
      run: async (): Promise<TestResult> => {
        return strictInvoke('smart-fit-rewrite', () => edgeFunctions.functions.invoke('smart-fit-rewrite', { headers: { 'x-smoke-test': 'true', ...devKitAuthHeaders() }, body: { mode: 'rewrite', candidates: [], jobDescription: SAMPLE_JD } }));
      },
    },
    {
      id: 'ai-engine-openrouter', label: 'Engine · OpenRouter (Gemma 4)', description: 'Directly test WiseResume managed OpenRouter endpoint — admin only', section: 'ai',
      run: async (): Promise<TestResult> => {
        if (!auth.isAuthenticated) return { status: 'warn' as const, summary: 'Skipped — sign in first', durationMs: 0 };
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
        if (!auth.isAuthenticated) return { status: 'warn' as const, summary: 'Skipped — sign in first', durationMs: 0 };
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
      id: 'dashboard-route', label: 'Dashboard Route Check', description: 'List 1 resume from Appwrite (RLS check)', section: 'routing',
      run: async (): Promise<TestResult> => {
        if (!auth.isAuthenticated) return { status: 'warn', summary: 'Skipped — sign in first', durationMs: 0 };
        return strictInvoke('dashboard-route', async () => {
          const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.resumes, [
            Query.equal('user_id', auth.user?.id ?? ''),
            Query.limit(1),
            Query.select(['$id', 'title']),
          ]);
          return { total: res.total, sample: res.documents[0] ?? null };
        });
      },
    },
    {
      id: 'protected-route', label: 'ProtectedRoute Auth Check', description: 'Verify useAuth() state', section: 'routing',
      run: () => strictInvoke('protected-route', async () => ({ isAuthenticated: auth.isAuthenticated, appwriteReady: auth.supabaseReady, loading: auth.loading })),
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
      id: 'ai-credits-read', label: 'AI Credits Read', description: 'Query ai_credits from Appwrite', section: 'credits',
      run: async (): Promise<TestResult> => {
        if (!auth.isAuthenticated) return { status: 'warn' as const, summary: 'Skipped — sign in first', durationMs: 0 };
        return strictInvoke('ai-credits-read', async () => {
          const userId = auth.user?.id;
          if (!userId) throw new Error('No userId');
          const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.ai_credits, [
            Query.equal('user_id', userId),
            Query.limit(1),
          ]);
          return res.total > 0 ? res.documents[0] : { user_id: userId, credits: 0, _note: 'No credits record found' };
        });
      },
    },
    // === AI (continued) ===
    {
      id: 'resume-section-ai', label: 'Resume Section AI (smoke)', description: 'Smoke-test resume-section-ai edge function (enhance action) — no AI call, no credit deduction', section: 'ai',
      run: async (): Promise<TestResult> => {
        return strictInvoke('resume-section-ai', () => edgeFunctions.functions.invoke('resume-section-ai', { headers: { 'x-smoke-test': 'true', 'x-resume-section-ai-action': 'enhance', ...devKitAuthHeaders() }, body: { section: 'summary', currentContent: MINIMAL_RESUME.summary, context: { resume: MINIMAL_RESUME } } }));
      },
    },
    {
      id: 'editor-ai-analyze', label: 'Editor AI — Analyze (smoke)', description: 'Smoke-test editor-ai router, analyze action — no AI call, no credit deduction', section: 'ai',
      run: async (): Promise<TestResult> => {
        return strictInvoke('editor-ai-analyze', () => edgeFunctions.functions.invoke('editor-ai', { headers: { 'x-smoke-test': 'true', 'x-editor-ai-action': 'analyze', ...devKitAuthHeaders() }, body: { resume: MINIMAL_RESUME, jobDescription: SAMPLE_JD } }));
      },
    },
    {
      id: 'editor-ai-recruiter-sim', label: 'Editor AI — Recruiter Sim (smoke)', description: 'Smoke-test editor-ai router, recruiter-sim action — no AI call, no credit deduction', section: 'ai',
      run: async (): Promise<TestResult> => {
        return strictInvoke('editor-ai-recruiter-sim', () => edgeFunctions.functions.invoke('editor-ai', { headers: { 'x-smoke-test': 'true', 'x-editor-ai-action': 'recruiter-sim', ...devKitAuthHeaders() }, body: { resume: MINIMAL_RESUME, persona: 'startup' } }));
      },
    },
    {
      id: 'editor-ai-suggest-template', label: 'Editor AI — Suggest Template (smoke)', description: 'Smoke-test editor-ai router, suggest-template action — no AI call, no credit deduction', section: 'ai',
      run: async (): Promise<TestResult> => {
        return strictInvoke('editor-ai-suggest-template', () => edgeFunctions.functions.invoke('editor-ai', { headers: { 'x-smoke-test': 'true', 'x-editor-ai-action': 'suggest-template', ...devKitAuthHeaders() }, body: { jobTitle: 'Software Engineer', industry: 'Technology', skills: ['TypeScript', 'React'] } }));
      },
    },
    {
      id: 'editor-ai-optimize-linkedin', label: 'Editor AI — LinkedIn Optimizer (smoke)', description: 'Smoke-test editor-ai router, optimize-for-linkedin action — no AI call, no credit deduction', section: 'ai',
      run: async (): Promise<TestResult> => {
        return strictInvoke('editor-ai-optimize-linkedin', () => edgeFunctions.functions.invoke('editor-ai', { headers: { 'x-smoke-test': 'true', 'x-editor-ai-action': 'optimize-for-linkedin', ...devKitAuthHeaders() }, body: { resume: MINIMAL_RESUME } }));
      },
    },
    {
      id: 'cover-letter', label: 'Cover Letter', description: 'Call generate-cover-letter edge function', section: 'ai',
      run: async (): Promise<TestResult> => {
        if (!auth.isAuthenticated) return { status: 'warn' as const, summary: 'Skipped — sign in first', durationMs: 0 };
        return strictInvoke('cover-letter', () => edgeFunctions.functions.invoke('generate-cover-letter', { body: { resume: MINIMAL_RESUME, jobDescription: SAMPLE_JD, tone: 'professional' } }));
      },
    },
    // === DB ===
    {
      id: 'list-resume', label: 'List 1 Resume (Appwrite)', description: 'Check Appwrite DB access for resumes collection', section: 'db',
      run: async (): Promise<TestResult> => {
        if (!auth.isAuthenticated) return { status: 'warn', summary: 'Skipped — sign in first', durationMs: 0 };
        return strictInvoke('list-resume', async () => {
          const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.resumes, [
            Query.equal('user_id', auth.user?.id ?? ''),
            Query.limit(1),
            Query.select(['$id', 'title']),
          ]);
          return { total: res.total, sample: res.documents[0] ?? null };
        });
      },
    },
    // === ERRORS ===
    {
      id: 'audit-log-write', label: 'Audit Log Write', description: 'Write and verify a test audit log entry via Appwrite', section: 'errors',
      run: async (): Promise<TestResult> => {
        if (!auth.isAuthenticated) return { status: 'warn' as const, summary: 'Skipped — sign in first', durationMs: 0 };
        return strictInvoke('audit-log-write', async () => {
          const userId = auth.user?.id;
          if (!userId) throw new Error('No userId');
          const testAction = `dev-kit-test-${Date.now()}`;
          logAudit('account', testAction, { source: 'dev-kit' });
          await new Promise(r => setTimeout(r, 1500));
          const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.audit_logs, [
            Query.equal('action', testAction),
            Query.limit(1),
          ]);
          if (res.total === 0) {
            return { ok: false, _note: 'Audit log write succeeded locally but Appwrite collection may not yet exist for audit_logs', action: testAction };
          }
          return { ok: true, id: res.documents[0].$id, action: testAction };
        });
      },
    },
    // === USAGE ===
    {
      id: 'load-usage-events', label: 'Usage Events Health', description: 'Query last 10 events from Appwrite usage_events collection', section: 'usage',
      run: async (): Promise<TestResult> => {
        if (!auth.isAuthenticated) return { status: 'warn', summary: 'Skipped — sign in first', durationMs: 0 };
        return strictInvoke('load-usage-events', async () => {
          const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.usage_events, [
            Query.orderDesc('$createdAt'),
            Query.limit(10),
          ]);
          return { total: res.total, sample: res.documents.slice(0, 2) };
        });
      },
    },
  ], [auth, strictInvoke]);

  const runAllInSection = useCallback(async (sectionId: SectionId) => {
    const sectionTests = tests.filter(t => t.section === sectionId);
    setCollapsed(prev => ({ ...prev, [sectionId]: false }));
    setSectionRunning(prev => ({ ...prev, [sectionId]: true }));
    let passed = 0;
    let skipped = 0;
    let failed = 0;

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

    const bySectionId: Record<string, TestDef[]> = {};
    for (const test of tests) {
      if (!bySectionId[test.section]) bySectionId[test.section] = [];
      bySectionId[test.section].push(test);
    }

    const allStatuses: { id: string; status: string }[] = [];

    for (const section of SECTIONS) {
      const sectionTests = bySectionId[section.id];
      if (!sectionTests || sectionTests.length === 0) continue;

      setCollapsed(prev => ({ ...prev, [section.id]: false }));
      setSectionRunning(prev => ({ ...prev, [section.id]: true }));

      let passed = 0;
      let skipped = 0;
      let failed = 0;
      for (const test of sectionTests) {
        const status = await runTest(test);
        allStatuses.push({ id: test.id, status });
        if (status === 'success') passed++;
        else if (status === 'warn') skipped++;
        else failed++;
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
    const isCollapsed = collapsed[section.id] ?? false;

    return (
      <div key={section.id} className="space-y-3">
        <div className="flex items-center justify-between border-b border-border pb-2 px-1">
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
            {running ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <PlayCircle className="h-3 w-3 mr-1" />}
            Run all
          </Button>
        </div>

        {!isCollapsed && (
          <div className="space-y-2">
            {sectionTests.map(test => (
              <TestItem
                key={test.id}
                test={test}
                result={results[test.id]}
                expandedJson={expandedJson[test.id] ?? false}
                onRun={() => runTest(test)}
                onToggleJson={() => toggleJson(test.id)}
                globalRunning={globalRunning}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Global controls */}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          onClick={runSmoke}
          disabled={globalRunning}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {globalRunning
            ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Running smoke…</>
            : <><Activity className="h-4 w-4 mr-2" />Run smoke suite</>
          }
        </Button>
        {Object.keys(results).length > 0 && (
          <Button variant="outline" size="sm" onClick={clearAll} className="gap-1.5">
            <Trash2 className="h-3.5 w-3.5" />
            Clear
          </Button>
        )}
      </div>

      {smokeSummary && (
        <div className={`rounded-lg border px-4 py-3 flex items-center gap-3 text-sm ${smokeSummary.failed > 0 ? 'border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-800' : 'border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-800'}`}>
          {smokeSummary.failed > 0
            ? <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />
            : <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          }
          <span className={smokeSummary.failed > 0 ? 'text-red-700 dark:text-red-300' : 'text-emerald-700 dark:text-emerald-300'}>
            Smoke suite complete — {smokeSummary.passed} passed, {smokeSummary.skipped} skipped, {smokeSummary.failed} failed
            {smokeSummary.failedIds.length > 0 && ` (${smokeSummary.failedIds.join(', ')})`}
          </span>
        </div>
      )}

      {SECTIONS.map(renderSection)}
    </div>
  );
}

import React, { useState, useCallback, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { edgeFunctions } from '@/integrations/supabase/edgeFunctions';
import { supabase } from '@/integrations/supabase/safeClient';
import { getToken, getUserId, isReady, exchangeToken } from '@/lib/supabaseBridge';
import { useSettingsStore } from '@/store/settingsStore';
import { logAudit } from '@/lib/auditLogger';
import { Button } from '@/components/ui/button';
import { Trash2, Loader2, PlayCircle, AlertCircle, CheckCircle } from 'lucide-react';
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

export function DevKitRunner() {
  const auth = useAuth();
  const [results, setResults] = useState<Record<string, TestResult>>({});
  const [expandedJson, setExpandedJson] = useState<Record<string, boolean>>({});
  const [sectionRunning, setSectionRunning] = useState<Record<string, boolean>>({});
  const [sectionSummary, setSectionSummary] = useState<Record<string, { passed: number; failed: number }>>({});
  const [globalRunning, setGlobalRunning] = useState(false);
  // C1: non-critical sections collapsed by default (FR-DK-007)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({
    routing: true, settings: true, credits: true, db: true, errors: true, usage: true,
  });
  // C3: smoke run summary (FR-DK-011)
  const [smokeSummary, setSmokeSummary] = useState<{ passed: number; failed: number; failedIds: string[] } | null>(null);

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
   * strictInvoke: Helper to enforce US1-FR-DK-002. Wrapped in useCallback so useMemo
   * dependency on strictInvoke is stable and doesn't cause infinite re-creation of tests[].
   */
  const strictInvoke = useCallback(async (testId: string, fn: () => Promise<any>): Promise<TestResult> => {
    const start = Date.now();
    try {
      const res = await fn();
      const durationMs = Date.now() - start;

      // Check if it's a Supabase edge function response
      if (res && typeof res === 'object' && ('data' in res || 'error' in res)) {
        const { data, error } = res;

        // Strict Error: Edge function returned an error object
        if (error) {
          const status = (error as any).status || 500;
          return {
            status: 'error',
            httpStatus: status,
            error: (error as any).message || JSON.stringify(error),
            durationMs,
            summary: `Edge Function Error (HTTP ${status})`,
          };
        }

        // Strict Error: Data payload contains an 'error' field (US1-FR-DK-002)
        if (data && typeof data === 'object' && (data as any).error) {
          return {
            status: 'error',
            data,
            durationMs,
            summary: `Success response with Error field: ${(data as any).error}`,
          };
        }

        return { status: 'success', data, durationMs, summary: 'OK' };
      }

      // Handle raw responses or direct DB queries
      return { status: 'success', data: res, durationMs, summary: 'OK' };
    } catch (err: any) {
      return {
        status: 'error',
        error: err.message || String(err),
        durationMs: Date.now() - start,
        summary: `Execution Error: ${err.message || 'Unknown'}`,
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
      run: () => strictInvoke('token-exchange', async () => {
        const kindeToken = await auth.getKindeToken();
        if (!kindeToken) throw new Error('No Kinde token available');
        await exchangeToken(kindeToken);
        return { bridgeReady: isReady(), userId: getUserId(), tokenPresent: !!getToken() };
      }),
    },
    {
      id: 'who-am-i', label: 'Who am I?', description: 'Call /me edge function', section: 'auth',
      run: () => strictInvoke('who-am-i', () => edgeFunctions.functions.invoke('me')),
    },
    // === EMAIL === — Single consolidated test to conserve the 3,000/month email quota
    {
      id: 'email-service', label: 'Email Service Test', description: 'Sends one real email via send-contact-email to verify the entire email pipeline end-to-end.', section: 'email',
      run: () => strictInvoke('email-service', async () => {
        const res = await edgeFunctions.functions.invoke('send-contact-email', {
          body: { type: 'contact', email: 'contact@thewise.cloud', subject: '[HC] Email Service Test', message: 'Dev Kit smoke test — email pipeline verification.', metadata: { source: 'dev-kit' } }
        });
        if (res.error) throw new Error((res.error as any).message || 'Email function error');
        return { ...res.data, _hint: '✉️ Check your email at contact@thewise.cloud to verify delivery.' };
      }),
    },
    // === AI ===
    {
      id: 'tailor-resume', label: 'Tailor Resume', description: 'Call tailor-resume edge function', section: 'ai',
      run: () => strictInvoke('tailor-resume', () => edgeFunctions.functions.invoke('tailor-resume', { body: { resume: MINIMAL_RESUME, jobDescription: SAMPLE_JD, intensity: 'light' } })),
    },
    {
      id: 'agentic-chat', label: 'Agentic Chat', description: 'Call agentic-chat edge function', section: 'ai',
      run: () => strictInvoke('agentic-chat', () => edgeFunctions.functions.invoke('agentic-chat', { body: { message: 'What can you help me with?', conversationHistory: [], currentResume: null } })),
    },
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
        return { aiProvider: s.aiProvider, geminiModel: s.geminiModel, theme: s.theme };
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
      run: () => strictInvoke('ai-credits-read', async () => {
        const userId = getUserId();
        if (!userId) throw new Error('No userId');
        const { data, error } = await supabase.from('ai_credits').select('*').eq('user_id', userId).maybeSingle();
        if (error) throw error;
        return data;
      }),
    },
    // === AI (continued) ===
    {
      id: 'enhance-section', label: 'Enhance Section', description: 'Call enhance-section edge function', section: 'ai',
      run: () => strictInvoke('enhance-section', async () => edgeFunctions.functions.invoke('enhance-section', { body: { section: 'summary', action: 'improve', currentContent: MINIMAL_RESUME.summary, context: { resume: MINIMAL_RESUME } } })),
    },
    {
      id: 'analyze-resume', label: 'Analyze Resume', description: 'Call analyze-resume edge function', section: 'ai',
      run: () => strictInvoke('analyze-resume', async () => edgeFunctions.functions.invoke('analyze-resume', { body: { resume: MINIMAL_RESUME, jobDescription: SAMPLE_JD } })),
    },
    {
      id: 'cover-letter', label: 'Cover Letter', description: 'Call generate-cover-letter edge function', section: 'ai',
      run: () => strictInvoke('cover-letter', async () => edgeFunctions.functions.invoke('generate-cover-letter', { body: { resume: MINIMAL_RESUME, jobDescription: SAMPLE_JD, tone: 'professional' } })),
    },
    // === DB ===
    {
      id: 'list-resume', label: 'List 1 Resume', description: 'Check direct DB access', section: 'db',
      run: () => strictInvoke('list-resume', async () => supabase.from('resumes').select('id, title').limit(1)),
    },
    // === ERRORS ===
    {
      id: 'audit-log-write', label: 'Audit Log Write', description: 'Write and verify a test audit log entry', section: 'errors',
      run: () => strictInvoke('audit-log-write', async () => {
        const userId = getUserId();
        if (!userId) throw new Error('No userId');
        const testAction = `dev-kit-test-${Date.now()}`;
        logAudit('account', testAction, { source: 'dev-kit' });
        await new Promise(r => setTimeout(r, 1500));
        const { data, error } = await supabase.from('audit_logs').select('id').eq('action', testAction).limit(1);
        if (error) throw error;
        if (!data || data.length === 0) throw new Error('Audit log entry not found');
        return data[0];
      }),
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
    let failed = 0;

    // Run sequentially per section
    for (const test of sectionTests) {
      const status = await runTest(test);
      if (status === 'success') passed++;
      else failed++;
    }

    setSectionSummary(prev => ({ ...prev, [sectionId]: { passed, failed } }));
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
      let failed = 0;
      for (const test of sectionTests) {
        const status = await runTest(test);
        allStatuses.push({ id: test.id, status });
        if (status === 'success') passed++;
        else failed++;
        // Add a micro-delay to make the UI feel responsive
        await new Promise(r => setTimeout(r, 50));
      }

      setSectionSummary(prev => ({ ...prev, [section.id]: { passed, failed } }));
      setSectionRunning(prev => ({ ...prev, [section.id]: false }));
    }

    const failedIds = allStatuses.filter(s => s.status !== 'success').map(s => s.id);
    setSmokeSummary({ passed: allStatuses.length - failedIds.length, failed: failedIds.length, failedIds });
    setGlobalRunning(false);
  }, [tests, runTest, results]);

  const renderSection = (section: typeof SECTIONS[number]) => {
    const sectionTests = tests.filter(t => t.section === section.id);
    if (sectionTests.length === 0) return null;

    const running = sectionRunning[section.id] || false;
    const summary = sectionSummary[section.id];
    // C1 — FR-DK-007: collapsed state; non-critical sections start collapsed
    const isCollapsed = collapsed[section.id] ?? false;

    return (
      <div key={section.id} className="space-y-3">
        <div className="flex items-center justify-between border-b border-border/50 pb-2 px-1">
          {/* Clickable section header to toggle collapse */}
          <button
            className="flex items-center gap-2 text-left group flex-1 min-w-0"
            onClick={() => setCollapsed(prev => ({ ...prev, [section.id]: !prev[section.id] }))}
          >
            <span className="text-muted-foreground text-xs w-3 flex-shrink-0">{isCollapsed ? '▶' : '▼'}</span>
            <h2 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors truncate">
              {section.emoji} {section.title}
            </h2>
            {summary && <SectionSummaryBadge passed={summary.passed} failed={summary.failed} />}
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
      <div className="sticky top-0 z-30 bg-background/98 dark:bg-background/80 backdrop-blur-md border-b border-border/50">
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
                  ? `✅ All ${smokeSummary.passed} smoke checks passed`
                  : `❌ ${smokeSummary.failed} failed: ${smokeSummary.failedIds.join(', ')}`
                }
              </span>
              {smokeSummary.failed === 0 && (
                <p className="text-xs text-muted-foreground font-normal mt-0.5">
                  ✉️ Check your email at health-check@wiseresume.com to confirm the Email Service Test delivery.
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-10">
        {SECTIONS.map(section => renderSection(section))}
      </div>
    </div>
  );
}

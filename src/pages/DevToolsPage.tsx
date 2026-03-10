import React, { useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { edgeFunctions } from '@/integrations/supabase/edgeFunctions';
import { supabase } from '@/integrations/supabase/safeClient';
import { getToken, getUserId, isReady, exchangeToken } from '@/lib/supabaseBridge';
import { useSettingsStore } from '@/store/settingsStore';
import { logAudit } from '@/lib/auditLogger';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Copy, Check, Trash2, Play, Loader2, ChevronDown, ChevronRight, PlayCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PASSWORD = 'thewisedeveloper';

const MINIMAL_RESUME = {
  title: 'Debug Test Resume',
  contact_info: { name: 'Jane Doe', email: 'jane@example.com', phone: '555-0100', location: 'San Francisco, CA' },
  summary: 'Experienced software engineer with 5 years of full-stack development expertise.',
  experience: [{ company: 'Acme Corp', position: 'Senior Engineer', startDate: '2020-01', endDate: '2024-01', description: 'Built scalable web apps.' }],
  education: [{ institution: 'MIT', degree: 'B.S. Computer Science', startDate: '2014', endDate: '2018' }],
  skills: [{ name: 'React' }, { name: 'TypeScript' }, { name: 'Node.js' }],
};

const SAMPLE_JD = 'We are looking for a Senior Frontend Engineer with 3+ years of React and TypeScript experience. Must have experience with REST APIs, state management, and CI/CD pipelines.';

type TestStatus = 'idle' | 'running' | 'success' | 'error';
type SectionId = 'auth' | 'ai' | 'db' | 'routing' | 'settings' | 'credits' | 'errors';

interface TestResult {
  status: TestStatus;
  httpStatus?: number;
  data?: unknown;
  error?: string;
  durationMs?: number;
  summary?: string;
}

interface TestDef {
  id: string;
  label: string;
  description: string;
  section: SectionId;
  run: () => Promise<TestResult>;
}

const SECTIONS: { id: SectionId; title: string; emoji: string }[] = [
  { id: 'auth', title: 'Auth & Token Bridge', emoji: '🔑' },
  { id: 'routing', title: 'Routing & Protected Pages', emoji: '🛤️' },
  { id: 'settings', title: 'Settings & Preferences', emoji: '⚙️' },
  { id: 'credits', title: 'Credits & Usage', emoji: '💳' },
  { id: 'ai', title: 'AI Tools Smoke Test', emoji: '🤖' },
  { id: 'db', title: 'Resume & Data Checks', emoji: '🗄️' },
  { id: 'errors', title: 'Error Handling & Logging', emoji: '🔥' },
];

function StatusBadge({ status }: { status: TestStatus }) {
  const map: Record<TestStatus, { bg: string; text: string; label: string }> = {
    idle: { bg: 'bg-muted', text: 'text-muted-foreground', label: 'Idle' },
    running: { bg: 'bg-primary/20', text: 'text-primary', label: 'Running…' },
    success: { bg: 'bg-green-500/20', text: 'text-green-600 dark:text-green-400', label: 'Success' },
    error: { bg: 'bg-destructive/20', text: 'text-destructive', label: 'Error' },
  };
  const s = map[status];
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>{s.label}</span>;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="absolute top-2 right-2 p-1 rounded bg-muted hover:bg-muted/80 text-muted-foreground"
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function SectionSummaryBadge({ passed, failed }: { passed: number; failed: number }) {
  const total = passed + failed;
  if (total === 0) return null;
  const allPassed = failed === 0;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${allPassed ? 'bg-green-500/20 text-green-600 dark:text-green-400' : 'bg-destructive/20 text-destructive'}`}>
      {allPassed ? `${passed}/${total} passed` : `${failed}/${total} failed`}
    </span>
  );
}

export default function DevToolsPage() {
  const [unlocked, setUnlocked] = useState(false);
  const [pw, setPw] = useState('');
  const [pwError, setPwError] = useState(false);
  const auth = useAuth();
  const navigate = useNavigate();
  const [results, setResults] = useState<Record<string, TestResult>>({});
  const [expandedJson, setExpandedJson] = useState<Record<string, boolean>>({});
  const [sectionRunning, setSectionRunning] = useState<Record<string, boolean>>({});
  const [sectionSummary, setSectionSummary] = useState<Record<string, { passed: number; failed: number }>>({});

  const setResult = useCallback((id: string, r: TestResult) => {
    setResults(prev => ({ ...prev, [id]: r }));
  }, []);

  const clearAll = () => {
    setResults({});
    setExpandedJson({});
    setSectionSummary({});
  };

  const toggleJson = (id: string) => {
    setExpandedJson(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const runTest = useCallback(async (test: TestDef) => {
    setResult(test.id, { status: 'running' });
    const start = Date.now();
    try {
      const r = await test.run();
      setResult(test.id, { ...r, durationMs: Date.now() - start });
      return r.status;
    } catch (e) {
      const res: TestResult = { status: 'error', error: e instanceof Error ? e.message : String(e), durationMs: Date.now() - start, summary: `Error: ${e instanceof Error ? e.message : String(e)}` };
      setResult(test.id, res);
      return 'error' as TestStatus;
    }
  }, [setResult]);

  const runAllInSection = useCallback(async (sectionId: SectionId, sectionTests: TestDef[]) => {
    setSectionRunning(prev => ({ ...prev, [sectionId]: true }));
    setSectionSummary(prev => ({ ...prev, [sectionId]: { passed: 0, failed: 0 } }));
    let passed = 0;
    let failed = 0;
    for (const test of sectionTests) {
      const status = await runTest(test);
      if (status === 'success') passed++;
      else failed++;
    }
    setSectionSummary(prev => ({ ...prev, [sectionId]: { passed, failed } }));
    setSectionRunning(prev => ({ ...prev, [sectionId]: false }));
  }, [runTest]);

  const tests: TestDef[] = [
    // === AUTH ===
    {
      id: 'auth-state', label: 'Show Auth State', description: 'Display current useAuth() context values', section: 'auth',
      run: async () => {
        const data = { isAuthenticated: auth.isAuthenticated, supabaseReady: auth.supabaseReady, user: auth.user, bridgeToken: getToken() ? '(present)' : '(null)', bridgeUserId: getUserId(), bridgeReady: isReady() };
        const email = auth.user?.email || 'unknown';
        return { status: 'success', data, summary: `Authenticated as ${email} — bridge ${isReady() ? 'ready' : 'NOT ready'}` };
      },
    },
    {
      id: 'token-exchange', label: 'Test Token Exchange', description: 'Call getKindeToken() → exchangeToken() and show bridge state', section: 'auth',
      run: async () => {
        const kindeToken = await auth.getKindeToken();
        if (!kindeToken) return { status: 'error', error: 'No Kinde token available', summary: 'No Kinde token — user may not be authenticated' };
        await exchangeToken(kindeToken);
        const ready = isReady();
        return { status: ready ? 'success' : 'error', data: { bridgeReady: ready, userId: getUserId(), tokenPresent: !!getToken() }, summary: ready ? `Bridge ready — userId: ${getUserId()?.slice(0, 8)}…` : 'Bridge NOT ready after exchange' };
      },
    },
    // === ROUTING ===
    {
      id: 'dashboard-route', label: 'Dashboard Route Check', description: 'Verify dashboard data query succeeds (resumes table)', section: 'routing',
      run: async () => {
        const { data, error } = await supabase.from('resumes').select('id').limit(1);
        if (error) return { status: 'error', error: error.message, summary: `RLS/Auth error: ${error.message}` };
        return { status: 'success', data, summary: `OK — dashboard data accessible (${data?.length ?? 0} rows returned)` };
      },
    },
    {
      id: 'protected-route', label: 'ProtectedRoute Auth Check', description: 'Verify useAuth() returns authenticated state', section: 'routing',
      run: async () => {
        const data = { isAuthenticated: auth.isAuthenticated, supabaseReady: auth.supabaseReady, loading: auth.loading };
        if (!auth.isAuthenticated) return { status: 'error', data, summary: 'NOT authenticated — ProtectedRoute would redirect' };
        return { status: 'success', data, summary: `Authenticated = true, supabaseReady = ${auth.supabaseReady}` };
      },
    },
    // === SETTINGS ===
    {
      id: 'read-ai-settings', label: 'Read AI Settings', description: 'Read current AI provider settings from store', section: 'settings',
      run: async () => {
        const s = useSettingsStore.getState();
        const data = { aiProvider: s.aiProvider, geminiModel: s.geminiModel, geminiKeyValidated: s.geminiKeyValidated, ollamaModel: s.ollamaModel, ollamaKeyValidated: s.ollamaKeyValidated, defaultTemplate: s.defaultTemplate, theme: s.theme };
        return { status: 'success', data, summary: `Provider: ${s.aiProvider} | Model: ${s.aiProvider === 'gemini' ? s.geminiModel : s.aiProvider === 'ollama' ? s.ollamaModel : 'default'} | Template: ${s.defaultTemplate}` };
      },
    },
    {
      id: 'write-revert-setting', label: 'Write + Revert Setting', description: 'Toggle showAutoSaveToasts, verify, then revert', section: 'settings',
      run: async () => {
        const store = useSettingsStore.getState();
        const original = store.showAutoSaveToasts;
        store.setShowAutoSaveToasts(!original);
        const changed = useSettingsStore.getState().showAutoSaveToasts;
        store.setShowAutoSaveToasts(original);
        const reverted = useSettingsStore.getState().showAutoSaveToasts;
        if (changed !== !original) return { status: 'error', data: { original, changed, reverted }, summary: 'Setting did not change as expected' };
        if (reverted !== original) return { status: 'error', data: { original, changed, reverted }, summary: 'Setting did not revert correctly' };
        return { status: 'success', data: { original, changed, reverted }, summary: 'OK — setting changed and reverted successfully' };
      },
    },
    // === CREDITS ===
    {
      id: 'ai-credits-read', label: 'AI Credits Read', description: 'Query ai_credits table for current user', section: 'credits',
      run: async () => {
        const userId = getUserId();
        if (!userId) return { status: 'error', error: 'No userId from bridge', summary: 'Cannot read credits — no userId' };
        const { data, error } = await supabase.from('ai_credits').select('*').eq('user_id', userId).maybeSingle();
        if (error) return { status: 'error', error: error.message, summary: `Query error: ${error.message}` };
        if (!data) return { status: 'success', data: null, summary: 'No credits row yet — user has not used AI features' };
        return { status: 'success', data, summary: `Usage today: ${data.daily_usage}/${data.daily_limit} | Total: ${data.total_usage}` };
      },
    },
    {
      id: 'log-ai-usage', label: 'Log AI Usage (dev)', description: 'Call increment_ai_usage RPC — increments real counter by 1', section: 'credits',
      run: async () => {
        const userId = getUserId();
        if (!userId) return { status: 'error', error: 'No userId from bridge', summary: 'Cannot log usage — no userId' };
        const { error } = await supabase.rpc('increment_ai_usage', { p_user_id: userId });
        if (error) return { status: 'error', error: error.message, summary: `RPC error: ${error.message}` };
        return { status: 'success', data: { userId, action: 'increment_ai_usage' }, summary: 'OK — AI usage incremented by 1' };
      },
    },
    // === AI ===
    {
      id: 'tailor-resume', label: 'Tailor Resume', description: 'Edge: tailor-resume — minimal resume + sample JD', section: 'ai',
      run: async () => {
        const { data, error } = await edgeFunctions.functions.invoke('tailor-resume', { body: { resume: MINIMAL_RESUME, jobDescription: SAMPLE_JD, intensity: 'light' } });
        if (error) return { status: 'error', httpStatus: (error as any).status, error: (error as any).message || JSON.stringify(error), summary: `Error: ${(error as any).message || 'unknown'}` };
        return { status: 'success', data, summary: 'Tailoring completed successfully' };
      },
    },
    {
      id: 'enhance-section', label: 'Enhance Section', description: 'Edge: enhance-section — improve summary', section: 'ai',
      run: async () => {
        const { data, error } = await edgeFunctions.functions.invoke('enhance-section', { body: { section: 'summary', action: 'improve', currentContent: MINIMAL_RESUME.summary, context: { resume: MINIMAL_RESUME } } });
        if (error) return { status: 'error', httpStatus: (error as any).status, error: (error as any).message || JSON.stringify(error), summary: `Error: ${(error as any).message || 'unknown'}` };
        return { status: 'success', data, summary: 'Section enhanced successfully' };
      },
    },
    {
      id: 'analyze-resume', label: 'Analyze Resume', description: 'Edge: analyze-resume — resume + JD analysis', section: 'ai',
      run: async () => {
        const { data, error } = await edgeFunctions.functions.invoke('analyze-resume', { body: { resume: MINIMAL_RESUME, jobDescription: SAMPLE_JD } });
        if (error) return { status: 'error', httpStatus: (error as any).status, error: (error as any).message || JSON.stringify(error), summary: `Error: ${(error as any).message || 'unknown'}` };
        return { status: 'success', data, summary: 'Analysis completed' };
      },
    },
    {
      id: 'score-resume', label: 'Score Resume', description: 'Edge: score-resume — ATS health score', section: 'ai',
      run: async () => {
        const { data, error } = await edgeFunctions.functions.invoke('score-resume', { body: { resume: MINIMAL_RESUME } });
        if (error) return { status: 'error', httpStatus: (error as any).status, error: (error as any).message || JSON.stringify(error), summary: `Error: ${(error as any).message || 'unknown'}` };
        const score = (data as any)?.overallScore ?? (data as any)?.score ?? '?';
        return { status: 'success', data, summary: `ATS Score: ${score}` };
      },
    },
    {
      id: 'parse-resume', label: 'Parse Resume (text)', description: 'Edge: parse-resume — parse short text into structured data', section: 'ai',
      run: async () => {
        const { data, error } = await edgeFunctions.functions.invoke('parse-resume', { body: { text: 'John Doe\nSoftware Engineer\n5 years experience in React and Node.js\nMIT BS Computer Science 2018\nSkills: JavaScript, TypeScript, Python' } });
        if (error) return { status: 'error', httpStatus: (error as any).status, error: (error as any).message || JSON.stringify(error), summary: `Error: ${(error as any).message || 'unknown'}` };
        return { status: 'success', data, summary: 'Resume parsed successfully' };
      },
    },
    {
      id: 'cover-letter', label: 'Cover Letter', description: 'Edge: generate-cover-letter — generate from resume + JD', section: 'ai',
      run: async () => {
        const { data, error } = await edgeFunctions.functions.invoke('generate-cover-letter', { body: { resume: MINIMAL_RESUME, jobDescription: SAMPLE_JD, tone: 'professional' } });
        if (error) return { status: 'error', httpStatus: (error as any).status, error: (error as any).message || JSON.stringify(error), summary: `Error: ${(error as any).message || 'unknown'}` };
        return { status: 'success', data, summary: 'Cover letter generated' };
      },
    },
    {
      id: 'agentic-chat', label: 'Agentic Chat', description: 'Edge: agentic-chat — simple question, empty history', section: 'ai',
      run: async () => {
        const { data, error } = await edgeFunctions.functions.invoke('agentic-chat', { body: { message: 'What can you help me with?', conversationHistory: [], currentResume: null } });
        if (error) return { status: 'error', httpStatus: (error as any).status, error: (error as any).message || JSON.stringify(error), summary: `Error: ${(error as any).message || 'unknown'}` };
        return { status: 'success', data, summary: 'Chat responded successfully' };
      },
    },
    // === DB ===
    {
      id: 'list-resume', label: 'List 1 Resume', description: 'Direct Supabase query: resumes.select(id,title).limit(1)', section: 'db',
      run: async () => {
        const { data, error } = await supabase.from('resumes').select('id, title').limit(1);
        if (error) return { status: 'error', error: error.message, summary: `Query error: ${error.message}` };
        const title = data?.[0]?.title ?? 'none';
        return { status: 'success', data, summary: `Found: "${title}" (${data?.length ?? 0} rows)` };
      },
    },
    // === ERRORS ===
    {
      id: 'controlled-error', label: 'Trigger Controlled Error', description: 'Call enhance-section with invalid body to produce expected 4xx', section: 'errors',
      run: async () => {
        const { data, error } = await edgeFunctions.functions.invoke('enhance-section', { body: {} });
        if (error) {
          const status = (error as any).status || 0;
          const msg = (error as any).message || JSON.stringify(error);
          return { status: 'success', httpStatus: status, data: { expectedError: true, rawError: error }, summary: `Expected ERROR — HTTP ${status}: ${msg}` };
        }
        return { status: 'error', data, summary: 'Unexpected: no error returned for invalid input' };
      },
    },
    {
      id: 'audit-log-write', label: 'Audit Log Write (dev)', description: 'Write a test audit log entry and verify it exists', section: 'errors',
      run: async () => {
        const userId = getUserId();
        if (!userId) return { status: 'error', error: 'No userId from bridge', summary: 'Cannot write audit log — no userId' };
        logAudit('account', 'dev-kit-test', { source: 'dev-kit', timestamp: Date.now() });
        // Small delay to let fire-and-forget complete
        await new Promise(r => setTimeout(r, 1500));
        const { data, error } = await supabase.from('audit_logs').select('id, created_at').eq('action', 'dev-kit-test').order('created_at', { ascending: false }).limit(1);
        if (error) return { status: 'error', error: error.message, summary: `Verify query error: ${error.message}` };
        if (!data || data.length === 0) return { status: 'error', data: null, summary: 'Audit log entry not found after write' };
        return { status: 'success', data: data[0], summary: `OK — audit log write verified (id: ${data[0].id.slice(0, 8)}…)` };
      },
    },
  ];

  if (!unlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative z-10">
        <div className="w-full max-w-sm space-y-4 bg-card border border-border rounded-2xl p-6 shadow-lg">
          <h1 className="text-xl font-bold text-foreground text-center">Dev-Kit</h1>
          <p className="text-sm text-muted-foreground text-center">Enter the developer password to continue.</p>
          <form onSubmit={(e) => { e.preventDefault(); if (pw === PASSWORD) { setUnlocked(true); setPwError(false); } else { setPwError(true); } }}>
            <Input type="password" placeholder="Password" value={pw} onChange={e => { setPw(e.target.value); setPwError(false); }} className={pwError ? 'border-destructive' : ''} />
            {pwError && <p className="text-xs text-destructive mt-1">Incorrect password.</p>}
            <Button type="submit" className="w-full mt-3">Unlock</Button>
          </form>
        </div>
      </div>
    );
  }

  const renderSection = (section: typeof SECTIONS[number]) => {
    const sectionTests = tests.filter(t => t.section === section.id);
    const running = sectionRunning[section.id] || false;
    const summary = sectionSummary[section.id];

    return (
      <div key={section.id} className="space-y-3">
        <div className="flex items-center justify-between border-b border-border pb-1 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="text-base font-semibold text-foreground">
              {section.emoji} {section.title}
            </h2>
            {summary && <SectionSummaryBadge passed={summary.passed} failed={summary.failed} />}
          </div>
          <Button
            size="sm"
            variant="outline"
            disabled={running}
            onClick={() => runAllInSection(section.id, sectionTests)}
            className="shrink-0"
          >
            {running ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <PlayCircle className="w-3.5 h-3.5 mr-1" />}
            Run All
          </Button>
        </div>
        {sectionTests.map(test => {
          const r = results[test.id] || { status: 'idle' as TestStatus };
          const resultText = r.data ? JSON.stringify(r.data, null, 2) : r.error || '';
          const isExpanded = expandedJson[test.id] || false;

          return (
            <div key={test.id} className="rounded-lg border border-border bg-card p-3 space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm text-foreground">{test.label}</span>
                    <StatusBadge status={r.status} />
                    {r.httpStatus && <span className="text-xs text-muted-foreground">HTTP {r.httpStatus}</span>}
                    {r.durationMs != null && <span className="text-xs text-muted-foreground">{r.durationMs}ms</span>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{test.description}</p>
                </div>
                <Button size="sm" variant="outline" disabled={r.status === 'running'} onClick={() => runTest(test)}>
                  {r.status === 'running' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                  <span className="ml-1">Run</span>
                </Button>
              </div>
              {/* Human-readable summary */}
              {r.summary && r.status !== 'idle' && r.status !== 'running' && (
                <p className={`text-xs font-medium px-2 py-1 rounded ${r.status === 'success' ? 'bg-green-500/10 text-green-700 dark:text-green-400' : 'bg-destructive/10 text-destructive'}`}>
                  {r.summary}
                </p>
              )}
              {/* Collapsible JSON */}
              {resultText && r.status !== 'running' && (
                <div>
                  <button
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => toggleJson(test.id)}
                  >
                    {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                    {isExpanded ? 'Hide JSON' : 'Show JSON'}
                  </button>
                  {isExpanded && (
                    <div className="relative mt-1">
                      <pre className="text-xs bg-muted rounded p-2 overflow-auto max-h-64 whitespace-pre-wrap break-all text-foreground">
                        {resultText}
                      </pre>
                      <CopyButton text={resultText} />
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background/95 backdrop-blur-sm p-4 pb-24 max-w-2xl mx-auto space-y-6 relative z-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-bold text-foreground">Dev-Kit</h1>
        </div>
        <Button variant="outline" size="sm" onClick={clearAll}>
          <Trash2 className="w-3.5 h-3.5 mr-1" /> Clear All
        </Button>
      </div>

      {SECTIONS.map(section => renderSection(section))}
    </div>
  );
}

import React, { useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { edgeFunctions } from '@/integrations/supabase/edgeFunctions';
import { supabase } from '@/integrations/supabase/safeClient';
import { getToken, getUserId, isReady, exchangeToken } from '@/lib/supabaseBridge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Copy, Check, Trash2, Play, Loader2 } from 'lucide-react';
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

interface TestResult {
  status: TestStatus;
  httpStatus?: number;
  data?: unknown;
  error?: string;
  durationMs?: number;
}

interface TestDef {
  id: string;
  label: string;
  description: string;
  section: 'auth' | 'ai' | 'db';
  run: () => Promise<TestResult>;
}

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

export default function DevToolsPage() {
  const [unlocked, setUnlocked] = useState(false);
  const [pw, setPw] = useState('');
  const [pwError, setPwError] = useState(false);
  const auth = useAuth();
  const navigate = useNavigate();
  const [results, setResults] = useState<Record<string, TestResult>>({});

  const setResult = useCallback((id: string, r: TestResult) => {
    setResults(prev => ({ ...prev, [id]: r }));
  }, []);

  const clearAll = () => setResults({});

  const runTest = useCallback(async (test: TestDef) => {
    setResult(test.id, { status: 'running' });
    const start = Date.now();
    try {
      const r = await test.run();
      setResult(test.id, { ...r, durationMs: Date.now() - start });
    } catch (e) {
      setResult(test.id, { status: 'error', error: e instanceof Error ? e.message : String(e), durationMs: Date.now() - start });
    }
  }, [setResult]);

  const tests: TestDef[] = [
    // Auth section
    {
      id: 'auth-state', label: 'Show Auth State', description: 'Display current useAuth() context values', section: 'auth',
      run: async () => ({
        status: 'success',
        data: { isAuthenticated: auth.isAuthenticated, supabaseReady: auth.supabaseReady, user: auth.user, bridgeToken: getToken() ? '(present)' : '(null)', bridgeUserId: getUserId(), bridgeReady: isReady() },
      }),
    },
    {
      id: 'token-exchange', label: 'Test Token Exchange', description: 'Call getKindeToken() → exchangeToken() and show bridge state', section: 'auth',
      run: async () => {
        const kindeToken = await auth.getKindeToken();
        if (!kindeToken) return { status: 'error', error: 'No Kinde token available — user may not be authenticated with Kinde' };
        await exchangeToken(kindeToken);
        return { status: isReady() ? 'success' : 'error', data: { bridgeReady: isReady(), userId: getUserId(), tokenPresent: !!getToken() } };
      },
    },
    // AI section
    {
      id: 'tailor-resume', label: 'Tailor Resume', description: 'Edge: tailor-resume — minimal resume + sample JD', section: 'ai',
      run: async () => {
        const { data, error } = await edgeFunctions.functions.invoke('tailor-resume', { body: { resume: MINIMAL_RESUME, jobDescription: SAMPLE_JD, intensity: 'light' } });
        if (error) return { status: 'error', httpStatus: (error as any).status, error: (error as any).message || JSON.stringify(error) };
        return { status: 'success', data };
      },
    },
    {
      id: 'enhance-section', label: 'Enhance Section', description: 'Edge: enhance-section — improve summary', section: 'ai',
      run: async () => {
        const { data, error } = await edgeFunctions.functions.invoke('enhance-section', { body: { section: 'summary', action: 'improve', currentContent: MINIMAL_RESUME.summary, context: { resume: MINIMAL_RESUME } } });
        if (error) return { status: 'error', httpStatus: (error as any).status, error: (error as any).message || JSON.stringify(error) };
        return { status: 'success', data };
      },
    },
    {
      id: 'analyze-resume', label: 'Analyze Resume', description: 'Edge: analyze-resume — resume + JD analysis', section: 'ai',
      run: async () => {
        const { data, error } = await edgeFunctions.functions.invoke('analyze-resume', { body: { resume: MINIMAL_RESUME, jobDescription: SAMPLE_JD } });
        if (error) return { status: 'error', httpStatus: (error as any).status, error: (error as any).message || JSON.stringify(error) };
        return { status: 'success', data };
      },
    },
    {
      id: 'score-resume', label: 'Score Resume', description: 'Edge: score-resume — ATS health score', section: 'ai',
      run: async () => {
        const { data, error } = await edgeFunctions.functions.invoke('score-resume', { body: { resume: MINIMAL_RESUME } });
        if (error) return { status: 'error', httpStatus: (error as any).status, error: (error as any).message || JSON.stringify(error) };
        return { status: 'success', data };
      },
    },
    {
      id: 'parse-resume', label: 'Parse Resume (text)', description: 'Edge: parse-resume — parse short text into structured data', section: 'ai',
      run: async () => {
        const { data, error } = await edgeFunctions.functions.invoke('parse-resume', { body: { text: 'John Doe\nSoftware Engineer\n5 years experience in React and Node.js\nMIT BS Computer Science 2018\nSkills: JavaScript, TypeScript, Python' } });
        if (error) return { status: 'error', httpStatus: (error as any).status, error: (error as any).message || JSON.stringify(error) };
        return { status: 'success', data };
      },
    },
    {
      id: 'cover-letter', label: 'Cover Letter', description: 'Edge: generate-cover-letter — generate from resume + JD', section: 'ai',
      run: async () => {
        const { data, error } = await edgeFunctions.functions.invoke('generate-cover-letter', { body: { resume: MINIMAL_RESUME, jobDescription: SAMPLE_JD, tone: 'professional' } });
        if (error) return { status: 'error', httpStatus: (error as any).status, error: (error as any).message || JSON.stringify(error) };
        return { status: 'success', data };
      },
    },
    {
      id: 'agentic-chat', label: 'Agentic Chat', description: 'Edge: agentic-chat — simple question, empty history', section: 'ai',
      run: async () => {
        const { data, error } = await edgeFunctions.functions.invoke('agentic-chat', { body: { message: 'What can you help me with?', conversationHistory: [], currentResume: null } });
        if (error) return { status: 'error', httpStatus: (error as any).status, error: (error as any).message || JSON.stringify(error) };
        return { status: 'success', data };
      },
    },
    // DB section
    {
      id: 'list-resume', label: 'List 1 Resume', description: 'Direct Supabase query: resumes.select(id,title).limit(1)', section: 'db',
      run: async () => {
        const { data, error } = await supabase.from('resumes').select('id, title').limit(1);
        if (error) return { status: 'error', error: error.message };
        return { status: 'success', data };
      },
    },
  ];

  if (!unlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative z-10">
        <div className="w-full max-w-sm space-y-4 bg-card border border-border rounded-2xl p-6 shadow-lg">
          <h1 className="text-xl font-bold text-foreground text-center">Developer Tools</h1>
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

  const renderSection = (sectionId: 'auth' | 'ai' | 'db', title: string) => {
    const sectionTests = tests.filter(t => t.section === sectionId);
    return (
      <div key={sectionId} className="space-y-3">
        <h2 className="text-base font-semibold text-foreground border-b border-border pb-1">
          {title}
        </h2>
        {sectionTests.map(test => {
          const r = results[test.id] || { status: 'idle' as TestStatus };
          const resultText = r.data ? JSON.stringify(r.data, null, 2) : r.error || '';
          return (
            <div key={test.id} className="rounded-lg border border-border bg-card p-3 space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
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
              {resultText && (
                <div className="relative">
                  <pre className="text-xs bg-muted rounded p-2 overflow-auto max-h-64 whitespace-pre-wrap break-all text-foreground">
                    {resultText}
                  </pre>
                  <CopyButton text={resultText} />
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
          <h1 className="text-lg font-bold text-foreground">Developer Debug Tools</h1>
        </div>
        <Button variant="outline" size="sm" onClick={clearAll}>
          <Trash2 className="w-3.5 h-3.5 mr-1" /> Clear All
        </Button>
      </div>

      {renderSection('auth', '🔑 Auth & Token Bridge')}
      {renderSection('ai', '🤖 AI Tools Smoke Test')}
      {renderSection('db', '🗄️ Edge Functions & Supabase')}
    </div>
  );
}

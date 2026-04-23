export type TestStatus = 'idle' | 'running' | 'success' | 'warn' | 'error';
export type SectionId = 'auth' | 'ai' | 'db' | 'routing' | 'settings' | 'credits' | 'errors' | 'usage' | 'email' | 'byok';

export interface TestResult {
  status: TestStatus;
  httpStatus?: number;
  data?: unknown;
  error?: string;
  durationMs?: number;
  summary?: string;
}

export interface TestDef {
  id: string;
  label: string;
  description: string;
  section: SectionId;
  run: () => Promise<TestResult>;
}

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { importResumes } from '../dataExport';
import { supabase } from '@/integrations/supabase/safeClient';

vi.mock('@/integrations/supabase/safeClient', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('importResumes Benchmark', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('measures import performance', async () => {
    // Generate 100 mock resumes
    const mockResumes = Array.from({ length: 100 }).map((_, i) => ({
      id: `resume-${i}`,
      title: `Resume ${i}`,
      contactInfo: { fullName: `User ${i}` },
      summary: `Summary ${i}`,
      experience: [],
      education: [],
      skills: [],
      certifications: [],
    }));

    const mockFileContent = JSON.stringify({ exportVersion: '1.0', resumes: mockResumes });

    // Create a mock File object that has a text() method
    const mockFile = {
      text: async () => mockFileContent,
    } as any;

    // Mock supabase.from().upsert() to simulate 5ms network latency per call
    const upsertMock = vi.fn().mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 5));
      return { error: null };
    });

    (supabase.from as any).mockReturnValue({
      upsert: upsertMock,
    });

    const startTime = performance.now();
    const importedCount = await importResumes(mockFile, 'user-123');
    const endTime = performance.now();

    const duration = endTime - startTime;
    console.log(`\n\n==== BENCHMARK ====`);
    console.log(`Time taken to import 100 resumes: ${duration.toFixed(2)} ms`);
    console.log(`Upsert calls made: ${upsertMock.mock.calls.length}`);
    console.log(`===================\n\n`);

    expect(importedCount).toBe(100);
  });
});

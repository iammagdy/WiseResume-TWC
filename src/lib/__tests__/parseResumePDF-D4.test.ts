/**
 * D4 - parseResumePDF integration tests
 * Tests the full PDF -> parse pipeline using mocked pdfjs and Appwrite AI.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ResumeData } from '@/types/resume';

vi.mock('pdfjs-dist', () => ({
  getDocument: vi.fn(),
  GlobalWorkerOptions: { workerSrc: '' },
}));

vi.mock('pdfjs-dist/build/pdf.worker.min.mjs?url', () => ({
  default: 'mock-worker.js',
}));

vi.mock('@/lib/pdf/ocrExtractor', () => ({
  extractTextWithOCR: vi.fn().mockResolvedValue('John Doe\njohn@example.com\nSUMMARY\nEngineer'),
  estimateOCRTime: vi.fn().mockReturnValue(10),
}));

const { invokeMock } = vi.hoisted(() => ({
  invokeMock: vi.fn(),
}));
vi.mock('@/lib/appwrite-functions', () => ({
  appwriteFunctions: {
    invoke: invokeMock,
  },
}));

import { parseResumePDF, parseResumePDFWithOCR, regenerateResumeIds } from '@/lib/pdfParser';
import { getDocument } from 'pdfjs-dist';

const mockGetDocument = vi.mocked(getDocument);

function makePdfFile(name = 'resume.pdf'): File {
  const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46]);
  const file = new File([bytes], name, { type: 'application/pdf' });
  if (!file.arrayBuffer) {
    Object.defineProperty(file, 'arrayBuffer', {
      value: () => Promise.resolve(bytes.buffer),
    });
  }
  return file;
}

function richPdfMock() {
  const items = Array.from({ length: 20 }, (_, i) => ({
    str: i === 0 ? 'John' : i === 1 ? 'Doe' : `word${i}`,
    transform: [1, 0, 0, 1, 50, 700 - i * 20],
    hasEOL: i % 3 === 0,
  }));

  return {
    promise: Promise.resolve({
      numPages: 1,
      getPage: vi.fn().mockResolvedValue({
        getTextContent: vi.fn().mockResolvedValue({ items }),
      }),
    }),
  };
}

const mockAIResult: Partial<ResumeData> = {
  contactInfo: { fullName: 'John Doe', email: 'john@example.com', phone: '555-0000', location: 'NY' },
  summary: 'AI-parsed summary',
  experience: [],
  education: [],
  skills: ['React', 'TypeScript'],
  certifications: [],
  templateId: 'modern',
};

describe('parseResumePDF (D4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns success:true with data when extraction and AI succeed', async () => {
    mockGetDocument.mockReturnValueOnce(richPdfMock() as any);
    invokeMock.mockResolvedValueOnce({ data: mockAIResult, error: null });

    const result = await parseResumePDF(makePdfFile());
    expect(result.success).toBe(true);
    expect(result.data?.contactInfo.fullName).toBe('John Doe');
    expect(result.needsOCR).toBe(false);
  });

  it('returns needsOCR:true when extracted text is too short', async () => {
    mockGetDocument.mockReturnValueOnce({
      promise: Promise.resolve({
        numPages: 1,
        getPage: vi.fn().mockResolvedValue({
          getTextContent: vi.fn().mockResolvedValue({
            items: [{ str: 'a', transform: [1, 0, 0, 1, 0, 0], hasEOL: false }],
          }),
        }),
      }),
    } as any);

    const result = await parseResumePDF(makePdfFile());
    expect(result.needsOCR).toBe(true);
    expect(result.success).toBe(false);
    expect(result.parseStatus).toBe('failed');
  });

  it('falls back cleanly when the AI response is malformed', async () => {
    mockGetDocument.mockReturnValueOnce(richPdfMock() as any);
    invokeMock.mockResolvedValueOnce({
      data: { content: '{"not":"resume"}', providerUsed: 'openrouter' },
      error: null,
    });

    const result = await parseResumePDF(makePdfFile());
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
  });
});

describe('regenerateResumeIds (D4)', () => {
  it('generates new IDs for all sections', () => {
    const data: ResumeData = {
      contactInfo: { fullName: 'Test', email: 't@t.com', phone: '', location: '' },
      summary: '',
      experience: [{ id: 'old-exp-1', company: 'Co', position: 'Dev', startDate: '', endDate: '', current: false, description: '', achievements: [] }],
      education: [{ id: 'old-edu-1', institution: 'Uni', degree: 'BS', field: 'CS', startDate: '', endDate: '' }],
      skills: [],
      certifications: [{ id: 'old-cert-1', name: 'AWS', issuer: '', date: '' }],
      templateId: 'modern',
    };

    const result = regenerateResumeIds(data);
    expect(result.experience[0].id).not.toBe('old-exp-1');
    expect(result.education[0].id).not.toBe('old-edu-1');
    expect(result.certifications[0].id).not.toBe('old-cert-1');
  });
});

describe('parseResumePDFWithOCR (D4)', () => {
  it('returns structured data from OCR text', async () => {
    invokeMock.mockResolvedValueOnce({ data: mockAIResult, error: null });

    const result = await parseResumePDFWithOCR(makePdfFile('scanned.pdf'));
    expect(result.data).toBeDefined();
    expect(['success', 'partial', 'failed']).toContain(result.parseStatus);
  });
});

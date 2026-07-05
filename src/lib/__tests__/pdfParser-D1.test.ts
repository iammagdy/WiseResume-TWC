/**
 * D1 - PDF parsing unit tests
 * Tests parseResumeText, extractDateRange, extractTextFromPDF, and parseTextWithAI.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('pdfjs-dist', () => ({
  getDocument: vi.fn().mockReturnValue({
    promise: Promise.resolve({
      numPages: 1,
      getPage: vi.fn().mockResolvedValue({
        getTextContent: vi.fn().mockResolvedValue({
          items: [
            { str: 'John Doe', transform: [1, 0, 0, 1, 50, 700], hasEOL: true },
            { str: 'Software Engineer', transform: [1, 0, 0, 1, 50, 680], hasEOL: true },
            { str: 'john@example.com', transform: [1, 0, 0, 1, 50, 660], hasEOL: true },
          ],
        }),
      }),
    }),
  }),
  GlobalWorkerOptions: { workerSrc: '' },
}));

vi.mock('pdfjs-dist/build/pdf.worker.min.mjs?url', () => ({
  default: 'mock-worker.js',
}));

const { invokeMock } = vi.hoisted(() => ({
  invokeMock: vi.fn(),
}));
vi.mock('@/lib/appwrite-functions', () => ({
  appwriteFunctions: {
    invoke: invokeMock,
  },
}));

import { parseResumeText, extractDateRange } from '@/lib/pdf/sectionParsers';
import { extractTextFromPDF, PDFParseError } from '@/lib/pdf/textExtractor';
import { parseTextWithAI } from '@/lib/pdfParser';

describe('parseResumeText (D1)', () => {
  const sampleResume = `Jane Doe
jane@example.com | 555-1234 | San Francisco, CA

SUMMARY
Results-driven software engineer with 5+ years building React and TypeScript applications.

EXPERIENCE
Senior Software Engineer
Tech Corp | 2020-01 - Present
Led development of core React components. Improved performance by 40%.
- Mentored 3 junior engineers
- Reduced load time by 500ms

EDUCATION
B.S. Computer Science
State University | 2015-2019

SKILLS
React, TypeScript, Node.js, PostgreSQL, AWS`;

  it('returns a ResumeData object from plain text', () => {
    const result = parseResumeText(sampleResume);
    expect(result).toHaveProperty('contactInfo');
    expect(result).toHaveProperty('summary');
    expect(result).toHaveProperty('experience');
    expect(result).toHaveProperty('education');
    expect(result).toHaveProperty('skills');
  });

  it('extracts contact info name and email', () => {
    const result = parseResumeText(sampleResume);
    expect(result.contactInfo.fullName).toContain('Jane');
    expect(result.contactInfo.email).toBe('jane@example.com');
  });

  it('extracts contact info from multi-column text where contact details appear after section headers', () => {
    const multiColumnResume = `Jane Doe
EXPERIENCE
Senior Software Engineer | Tech Corp | 2020-01 - Present
Led development of core React components.

jane@example.com | 555-111-2222 | San Francisco, CA
`;
    const result = parseResumeText(multiColumnResume);
    expect(result.contactInfo.fullName).toContain('Jane');
    expect(result.contactInfo.email).toBe('jane@example.com');
    expect(result.contactInfo.phone).toBe('555-111-2222');
  });

  it('preserves header values and does not overwrite them with weaker full-document matches', () => {
    const resumeWithBoth = `Jane Doe
jane.doe@header.com | 555-222-3333

EXPERIENCE
Senior Software Engineer | Tech Corp | 2020-01 - Present
Another email: jane.doe@body.com
Another phone: 555-444-5555
`;
    const result = parseResumeText(resumeWithBoth);
    expect(result.contactInfo.email).toBe('jane.doe@header.com');
    expect(result.contactInfo.phone).toBe('555-222-3333');
  });

  it('handles empty string without throwing', () => {
    const result = parseResumeText('');
    expect(result).toHaveProperty('contactInfo');
    expect(result.experience).toEqual([]);
    expect(result.education).toEqual([]);
  });
});

describe('extractDateRange (D1)', () => {
  it('parses standard date ranges', () => {
    const result = extractDateRange('Jan 2020 - Mar 2023');
    expect(result.startDate).toBeTruthy();
    expect(result.endDate).toBeTruthy();
    expect(result.current).toBe(false);
  });

  it("detects 'Present' as current position", () => {
    const result = extractDateRange('2021 - Present');
    expect(result.current).toBe(true);
  });
});

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

describe('extractTextFromPDF (D1)', () => {
  it('returns ExtractionResult with pageCount from mocked pdfjs', async () => {
    const file = makePdfFile();
    const { getDocument } = await import('pdfjs-dist');
    (getDocument as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      promise: Promise.resolve({
        numPages: 1,
        getPage: vi.fn().mockResolvedValue({
          getTextContent: vi.fn().mockResolvedValue({
            items: Array.from({ length: 15 }, (_, i) => ({
              str: `Word${i}`,
              transform: [1, 0, 0, 1, 50, 700 - i * 20],
              hasEOL: i % 3 === 0,
            })),
          }),
        }),
      }),
    });

    const result = await extractTextFromPDF(file);
    expect(result.pageCount).toBe(1);
  });

  it('throws PDFParseError with PASSWORD_PROTECTED code on PasswordException', async () => {
    const { getDocument } = await import('pdfjs-dist');
    (getDocument as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      promise: Promise.reject(Object.assign(new Error('Password required'), { name: 'PasswordException' })),
    });

    await expect(extractTextFromPDF(makePdfFile('locked.pdf'))).rejects.toMatchObject({
      code: 'PASSWORD_PROTECTED',
      name: 'PDFParseError',
    });
  });

  it('throws PDFParseError with CORRUPTED code on invalid PDF error', async () => {
    const { getDocument } = await import('pdfjs-dist');
    (getDocument as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      promise: Promise.reject(new Error('Invalid PDF structure')),
    });

    await expect(extractTextFromPDF(makePdfFile('bad.pdf'))).rejects.toMatchObject({
      code: 'CORRUPTED',
    });
  });
});

describe('PDFParseError (D1)', () => {
  it('has the correct code and name', () => {
    const err = new PDFParseError('File is locked', 'PASSWORD_PROTECTED');
    expect(err.code).toBe('PASSWORD_PROTECTED');
    expect(err.name).toBe('PDFParseError');
  });
});

describe('parseTextWithAI (D1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns AI-parsed resume data on success', async () => {
    invokeMock.mockResolvedValueOnce({
      data: {
        contactInfo: { fullName: 'Jane Doe', email: 'jane@example.com', phone: '', location: '' },
        summary: 'AI-parsed summary',
        experience: [],
        education: [],
        skills: ['React'],
        certifications: [],
        templateId: 'modern',
      },
      error: null,
    });

    const result = await parseTextWithAI('Jane Doe, Software Engineer...');
    expect(result.summary).toBe('AI-parsed summary');
    expect(result.contactInfo.fullName).toBe('Jane Doe');
    expect(result.templateId).toBe('wiseresume-classic');
  });

  it('falls back to local parser when the AI payload is malformed', async () => {
    invokeMock.mockResolvedValueOnce({
      data: {
        content: '{"not":"resume data"}',
        providerUsed: 'openrouter',
      },
      error: null,
    });

    const result = await parseTextWithAI('Jane Doe\njane@example.com\n\nSUMMARY\nExperienced engineer.');
    expect(result.contactInfo.fullName).toContain('Jane');
    expect(result).toHaveProperty('experience');
  });

  it('falls back to local parser when the AI result is empty', async () => {
    invokeMock.mockResolvedValueOnce({
      data: {
        contactInfo: { fullName: '', email: '', phone: '', location: '' },
        summary: '',
        experience: [],
        education: [],
        skills: [],
        certifications: [],
        templateId: 'modern',
      },
      error: null,
    });

    const result = await parseTextWithAI('Jane Doe\njane@example.com\nReact TypeScript');
    expect(result.contactInfo.email).toBe('jane@example.com');
  });
});

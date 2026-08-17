import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ONBOARDING_CV_MAX_BYTES,
  classifyOnboardingCvFile,
  parseOnboardingCvFile,
} from './onboardingCvFile';
import type { ResumeData } from '@/types/resume';

const parserMocks = vi.hoisted(() => ({
  parseResumePDF: vi.fn(),
  parseResumePDFWithOCR: vi.fn(),
  parseTextWithAI: vi.fn(),
  extractTextFromImage: vi.fn(),
  extractRawText: vi.fn(),
}));

vi.mock('@/lib/pdfParser', () => ({
  parseResumePDF: parserMocks.parseResumePDF,
  parseResumePDFWithOCR: parserMocks.parseResumePDFWithOCR,
  parseTextWithAI: parserMocks.parseTextWithAI,
}));

vi.mock('@/lib/pdf/ocrExtractor', () => ({
  extractTextFromImage: parserMocks.extractTextFromImage,
}));

vi.mock('mammoth/mammoth.browser', () => ({
  extractRawText: parserMocks.extractRawText,
}));

const parsedResume = { contactInfo: { fullName: 'Test User' } } as ResumeData;

function fileStub({
  name,
  type,
  size = 1,
  text = vi.fn().mockResolvedValue('plain resume text'),
  arrayBuffer = vi.fn().mockResolvedValue(new ArrayBuffer(8)),
}: {
  name: string;
  type: string;
  size?: number;
  text?: ReturnType<typeof vi.fn>;
  arrayBuffer?: ReturnType<typeof vi.fn>;
}): File {
  return { name, type, size, text, arrayBuffer } as unknown as File;
}

describe('onboarding CV file validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    parserMocks.parseTextWithAI.mockResolvedValue(parsedResume);
    parserMocks.parseResumePDF.mockResolvedValue({ needsOCR: false, data: parsedResume });
    parserMocks.parseResumePDFWithOCR.mockResolvedValue({ needsOCR: false, data: parsedResume });
    parserMocks.extractTextFromImage.mockResolvedValue('image resume text');
    parserMocks.extractRawText.mockResolvedValue({ value: 'docx resume text' });
  });

  it('accepts a supported file exactly at the advertised 10 MB boundary', () => {
    expect(classifyOnboardingCvFile(fileStub({
      name: 'resume.pdf',
      type: 'application/pdf',
      size: ONBOARDING_CV_MAX_BYTES,
    }))).toBe('pdf');
  });

  it('rejects one byte over 10 MB before invoking a parser', async () => {
    const file = fileStub({
      name: 'resume.pdf',
      type: 'application/pdf',
      size: ONBOARDING_CV_MAX_BYTES + 1,
    });

    await expect(parseOnboardingCvFile(file)).rejects.toThrow('larger than 10 MB');
    expect(parserMocks.parseResumePDF).not.toHaveBeenCalled();
    expect(parserMocks.parseResumePDFWithOCR).not.toHaveBeenCalled();
    expect(parserMocks.parseTextWithAI).not.toHaveBeenCalled();
  });

  it('reads TXT uploads with file.text() and never sends them through Mammoth', async () => {
    const text = vi.fn().mockResolvedValue('text-method resume');
    const arrayBuffer = vi.fn().mockResolvedValue(new ArrayBuffer(8));
    const file = fileStub({ name: 'resume.txt', type: '', text, arrayBuffer });

    await expect(parseOnboardingCvFile(file)).resolves.toBe(parsedResume);
    expect(text).toHaveBeenCalledOnce();
    expect(arrayBuffer).not.toHaveBeenCalled();
    expect(parserMocks.extractRawText).not.toHaveBeenCalled();
    expect(parserMocks.parseTextWithAI).toHaveBeenCalledWith('text-method resume');
  });

  it('recognizes text/plain uploads even without a .txt extension', async () => {
    const text = vi.fn().mockResolvedValue('mime-type resume');
    const file = fileStub({ name: 'resume', type: 'text/plain', text });

    await parseOnboardingCvFile(file);

    expect(text).toHaveBeenCalledOnce();
    expect(parserMocks.parseTextWithAI).toHaveBeenCalledWith('mime-type resume');
  });

  it.each([
    ['resume.doc', 'application/octet-stream'],
    ['resume', 'application/msword'],
  ])('rejects legacy Word uploads (%s, %s)', async (name, type) => {
    const file = fileStub({ name, type });

    await expect(parseOnboardingCvFile(file)).rejects.toThrow('Legacy .doc files are not supported');
    expect(parserMocks.extractRawText).not.toHaveBeenCalled();
    expect(parserMocks.parseTextWithAI).not.toHaveBeenCalled();
  });

  it('preserves PDF parsing and its OCR fallback', async () => {
    const file = fileStub({ name: 'resume.pdf', type: 'application/pdf' });
    parserMocks.parseResumePDF.mockResolvedValueOnce({ needsOCR: true });

    await expect(parseOnboardingCvFile(file)).resolves.toBe(parsedResume);
    expect(parserMocks.parseResumePDF).toHaveBeenCalledWith(file);
    expect(parserMocks.parseResumePDFWithOCR).toHaveBeenCalledWith(file);
  });

  it('preserves DOCX extraction through Mammoth', async () => {
    const arrayBuffer = vi.fn().mockResolvedValue(new ArrayBuffer(16));
    const file = fileStub({
      name: 'resume.docx',
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      arrayBuffer,
    });

    await expect(parseOnboardingCvFile(file)).resolves.toBe(parsedResume);
    expect(arrayBuffer).toHaveBeenCalledOnce();
    expect(parserMocks.extractRawText).toHaveBeenCalledWith({ arrayBuffer: expect.any(ArrayBuffer) });
    expect(parserMocks.parseTextWithAI).toHaveBeenCalledWith('docx resume text');
  });

  it('preserves a DOCX file when the browser reports the legacy Word MIME', () => {
    expect(classifyOnboardingCvFile(fileStub({
      name: 'resume.docx',
      type: 'application/msword',
    }))).toBe('docx');
  });

  it('preserves image OCR parsing', async () => {
    const file = fileStub({ name: 'resume.png', type: 'image/png' });

    await expect(parseOnboardingCvFile(file)).resolves.toBe(parsedResume);
    expect(parserMocks.extractTextFromImage).toHaveBeenCalledWith(file);
    expect(parserMocks.parseTextWithAI).toHaveBeenCalledWith('image resume text');
  });
});

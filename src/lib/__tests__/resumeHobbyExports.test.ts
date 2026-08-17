import { beforeEach, describe, expect, it, vi } from 'vitest';
import JSZip from 'jszip';
import type { ResumeData } from '@/types/resume';
import { generatePlainText } from '@/lib/shareUtils';
import { generateAndDownloadDOCX } from '@/lib/docxGenerator';

const downloadFileMock = vi.hoisted(() => vi.fn().mockResolvedValue({
  success: true,
  outcome: 'triggered',
  method: 'anchor',
}));

vi.mock('@/lib/downloadUtils', async () => {
  const actual = await vi.importActual<typeof import('@/lib/downloadUtils')>('@/lib/downloadUtils');
  return { ...actual, downloadFile: downloadFileMock };
});

function makeResume(hobbies: ResumeData['hobbies']): ResumeData {
  return {
    contactInfo: {
      fullName: 'Export Tester',
      email: 'tester@example.com',
      phone: '',
      location: '',
    },
    summary: '',
    experience: [],
    education: [],
    skills: [],
    certifications: [],
    hobbies,
    templateId: 'modern',
  };
}

describe('resume hobby exports', () => {
  beforeEach(() => {
    downloadFileMock.mockClear();
  });

  it('writes only visible hobby names to plain text', () => {
    const text = generatePlainText(makeResume([
      { id: 'visible-1', name: 'Hiking', visible: true },
      { id: 'hidden', name: 'Gaming', visible: false },
      { id: 'visible-2', name: 'Photography', visible: true },
    ]));

    expect(text).toContain('HOBBIES & INTERESTS');
    expect(text).toContain('Hiking, Photography');
    expect(text).not.toContain('Gaming');
    expect(text).not.toContain('[object Object]');
  });

  it('omits the plain-text hobbies section when every hobby is hidden', () => {
    const text = generatePlainText(makeResume([
      { id: 'hidden', name: 'Gaming', visible: false },
    ]));

    expect(text).not.toContain('HOBBIES & INTERESTS');
    expect(text).not.toContain('Gaming');
  });

  it('writes only visible hobby names into the generated DOCX XML', async () => {
    await generateAndDownloadDOCX(makeResume([
      { id: 'visible-1', name: 'Hiking', visible: true },
      { id: 'hidden', name: 'Gaming', visible: false },
      { id: 'visible-2', name: 'Photography', visible: true },
    ]));

    expect(downloadFileMock).toHaveBeenCalledOnce();
    const { blob } = downloadFileMock.mock.calls[0][0] as { blob: Blob };
    const zip = await JSZip.loadAsync(blob);
    const documentXml = await zip.file('word/document.xml')?.async('string');

    expect(documentXml).toContain('HOBBIES &amp; INTERESTS');
    expect(documentXml).toContain('Hiking • Photography');
    expect(documentXml).not.toContain('Gaming');
    expect(documentXml).not.toContain('[object Object]');
  });
});

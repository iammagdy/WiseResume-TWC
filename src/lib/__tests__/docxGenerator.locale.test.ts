import { describe, expect, it } from 'vitest';
import type { ResumeData } from '@/types/resume';
import { getDocxLocaleOptions } from '../docxGenerator';

describe('DOCX locale options', () => {
  it('uses Noto Sans Arabic and RTL document properties for Arabic CVs', () => {
    const resume = {
      customization: { documentLocale: 'ar' },
    } as ResumeData;
    expect(getDocxLocaleOptions(resume)).toEqual({
      locale: 'ar',
      font: 'Noto Sans Arabic',
      bidirectional: true,
      rightToLeft: true,
      alignment: 'right',
    });
  });

  it('preserves English defaults for existing CVs', () => {
    expect(getDocxLocaleOptions({} as ResumeData)).toEqual({
      locale: 'en',
      font: 'Arial',
      bidirectional: false,
      rightToLeft: false,
      alignment: 'left',
    });
  });
});

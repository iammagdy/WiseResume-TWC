import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { translate } from '../core';

const ARABIC_SCRIPT = /[\u0600-\u06ff]/;

const criticalEnglishKeys = [
  'app.uploadPage.title',
  'app.uploadPage.eyebrow',
  'app.uploadPage.description',
  'app.uploadPage.heroTitle',
  'app.uploadPage.dropTitle',
  'app.uploadPage.browse',
  'app.uploadPage.maxSize',
  'app.uploadPage.urlImport.title',
  'app.uploadPage.urlImport.submit',
  'app.uploadPage.urlImport.description',
  'app.uploadPage.tips.title',
  'app.portfolioEditor.strength.live',
  'app.portfolioEditor.statusBar.strengthTitle',
  'app.profile',
  'app.templatesPage.title',
  'app.workspaceNavigation',
] as const;

describe('critical English UI surfaces', () => {
  it.each(criticalEnglishKeys)('%s resolves to owned English copy', (key) => {
    const value = translate(key, 'en');
    expect(value).not.toBe(key);
    expect(value).not.toMatch(ARABIC_SCRIPT);
  });

  it('keeps raw Arabic UI copy out of the upload page implementation', () => {
    const source = readFileSync(resolve('src/pages/UploadPage.tsx'), 'utf8');
    expect(source).not.toMatch(ARABIC_SCRIPT);
  });

  it('keeps known unguarded Arabic copy out of application and job-import UI', () => {
    const applications = readFileSync(resolve('src/pages/ApplicationsPage.tsx'), 'utf8');
    const importJob = readFileSync(resolve('src/components/jobs/ImportJobSheet.tsx'), 'utf8');

    expect(applications).not.toContain("'عرض المسار: تم التقديم ← الفرز ← العرض'");
    expect(importJob).not.toContain("error: 'الصق رابط إعلان الوظيفة للمتابعة.'");
    expect(importJob).not.toContain('>جارٍ استيراد الوظيفة...</p>');
    expect(importJob).not.toContain('aria-label="تفعيل اكتشاف روابط الوظائف من الحافظة"');
  });
});

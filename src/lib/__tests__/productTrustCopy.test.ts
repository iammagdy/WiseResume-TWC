import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const TRUST_COPY_FILES = [
  'locales/en/landing.json',
  'locales/ar/landing.json',
  'locales/en/app.json',
  'locales/ar/app.json',
  'locales/en/wisehire.json',
  'locales/ar/wisehire.json',
  'src/pages/HelpPage.tsx',
  'src/pages/wisehire/WiseHirePrivacyPage.tsx',
  'src/pages/wisehire/WiseHireTermsPage.tsx',
  'src/pages/wisehire/EnterprisePage.tsx',
  'src/pages/wisehire/WiseHireOnboardingPage.tsx',
  'src/pages/wisehire/WiseHireSubscriptionPage.tsx',
  'src/pages/WhatsNewPage.tsx',
  'src/components/interview/CompanyBriefingSheet.tsx',
  'src/components/editor/ai/AIDetectorSheet.tsx',
  'src/components/editor/ai/RecruiterSimSheet.tsx',
  'src/components/editor/CareerPathSheet.tsx',
  'src/pages/CareerPage.tsx',
  'src/components/career/CareerMindmap.tsx',
  'src/components/career/CareerRoadmap.tsx',
  'src/components/editor/JobAnalysisSheet.tsx',
  'src/components/ai-studio/ResumeABCompareSheet.tsx',
  'src/components/ai-studio/SalaryNegotiationSheet.tsx',
  'src/components/ai-studio/JobRejectionSheet.tsx',
  'src/components/ai-studio/SkillsGapSheet.tsx',
  'src/components/ai-studio/ReferenceLetterSheet.tsx',
  'src/components/dashboard/WhatsNextCard.tsx',
  'src/components/dashboard/FeatureDiscoveryCard.tsx',
  'src/lib/aiStudioTools.ts',
  'src/components/ui/AITrustBadge.tsx',
  'src/components/landing/TrustSection.tsx',
  'src/components/landing/wisehire/WiseHireHero.tsx',
  'src/components/landing/wisehire/WiseHireFeatures.tsx',
  'src/components/landing/wisehire/WiseHireTrustSection.tsx',
  'src/components/landing/wisehire/WiseHireDemoSection.tsx',
  'src/components/landing/wisehire/WiseHirePricing.tsx',
  'src/components/landing/wisehire/WiseHireClosingCTA.tsx',
  'src/components/landing/wisehire/BriefDemo.tsx',
  'src/components/landing/wisehire/BulkScreeningDemo.tsx',
  'src/components/landing/wisehire/TalentPoolDemo.tsx',
  'src/components/landing/wisehire/PipelineDemo.tsx',
].map((file) => ({ file, source: readFileSync(resolve(process.cwd(), file), 'utf8') }));

const FORBIDDEN_ABSOLUTES = [
  /lands your next job/i,
  /match in 30 seconds/i,
  /in under 10 seconds/i,
  /never shared with third parties/i,
  /never leaves your session/i,
  /nothing is retained/i,
  /all data is encrypted with AES-256/i,
  /all connections use TLS 1\.3/i,
  /SOC 2-ready infrastructure/i,
  /SLA (?:& |\+ )?uptime guarantee/i,
  /locked in for life/i,
  /custom AI training/i,
  /unlimited everything/i,
  /ranked by AI/i,
  /scores and ranks every applicant/i,
  /no manual reading required/i,
  /surfaces your best hires/i,
  /reduce unconscious bias/i,
  /from job brief to shortlist in under an hour/i,
  /within one business day/i,
  /message sent!/i,
  /write bias-free/i,
  /bring your own AI key/i,
  /research any company/i,
  /deep research report/i,
  /complete overview of any company/i,
  /desc:\s*["']Company research["']/i,
  /bypass AI detection/i,
  /AI Detection Score/i,
  /Hireability Score/i,
  /thinking like a real recruiter/i,
  /Real YouTube courses/i,
  /Ready in:/i,
  /Simulate existing skills/i,
  /(?:higher|similar|lower) pay/i,
  /performs better for this role/i,
  /ATS Keywords/i,
  /Likely Reason/i,
  /real, anonymized resumes/i,
  /anonymous usage data/i,
];

describe('product trust copy', () => {
  it('does not promise unverifiable outcomes, privacy absolutes, or enterprise controls', () => {
    for (const { file, source } of TRUST_COPY_FILES) {
      for (const forbidden of FORBIDDEN_ABSOLUTES) {
        expect(source, `${file} contains ${forbidden}`).not.toMatch(forbidden);
      }
    }
  });

  it('explains the real AI disclosure and human-review boundary', () => {
    const landing = TRUST_COPY_FILES.find(({ file }) => file === 'locales/en/landing.json')!.source;
    const help = TRUST_COPY_FILES.find(({ file }) => file === 'src/pages/HelpPage.tsx')!.source;
    const wiseHirePrivacy = TRUST_COPY_FILES.find(({ file }) => file.endsWith('WiseHirePrivacyPage.tsx'))!.source;

    expect(landing).toContain('explicitly request AI help');
    expect(landing).toContain('configured AI provider');
    expect(help).toContain('does not use your resume content to train its own models');
    expect(wiseHirePrivacy).toContain('review all AI outputs before making hiring decisions');
    expect(wiseHirePrivacy).toContain('Provider processing and retention');
  });
});

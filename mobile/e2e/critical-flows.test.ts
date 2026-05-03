/**
 * Critical-flow Detox suite. Each describe block covers one of the
 * six P1 flows from `mobile/QA.md`. Tests are intentionally written
 * to be **independent** so the suite can be re-ordered or sharded
 * across CI machines without coupling.
 *
 * Selectors use `testID` props attached on the relevant components
 * (Button, Input, Screen). When you add new screens, attach a stable
 * testID and extend the suite — never assert on translated copy.
 */
import { device, element, by, expect } from 'detox';

beforeAll(async () => {
  await device.launchApp({
    newInstance: true,
    permissions: { notifications: 'YES', camera: 'YES', microphone: 'YES', faceid: 'YES' },
  });
});

beforeEach(async () => {
  await device.reloadReactNative();
});

describe('1. Cold start + onboarding', () => {
  it('shows onboarding on first launch', async () => {
    await expect(element(by.id('onboarding-slide-0'))).toBeVisible();
  });

  it('advances onboarding and lands on sign-in', async () => {
    await element(by.id('onboarding-next')).tap();
    await element(by.id('onboarding-next')).tap();
    await element(by.id('onboarding-finish')).tap();
    await expect(element(by.id('sign-in-button'))).toBeVisible();
  });
});

describe('2. Auth (Kinde bridge)', () => {
  it('opens Kinde sign-in and returns to dashboard', async () => {
    await element(by.id('sign-in-button')).tap();
    // External browser flow — assert we land on dashboard within 30s of return.
    await waitFor(element(by.id('tab-dashboard'))).toBeVisible().withTimeout(30_000);
  });
});

describe('3. Resumes list + detail', () => {
  it('opens the first resume row', async () => {
    await element(by.id('tab-resumes')).tap();
    await waitFor(element(by.id('resume-row-0'))).toBeVisible().withTimeout(10_000);
    await element(by.id('resume-row-0')).tap();
    await expect(element(by.id('resume-title-input'))).toBeVisible();
  });
});

describe('4. Job tracker', () => {
  it('creates a new job from the tracker tab', async () => {
    await element(by.id('tab-tracker')).tap();
    await element(by.id('new-job-button')).tap();
    await element(by.id('job-title-input')).typeText('Senior Engineer');
    await element(by.id('job-company-input')).typeText('Acme');
    await element(by.id('job-save-button')).tap();
    await waitFor(element(by.text('Senior Engineer'))).toBeVisible().withTimeout(5_000);
  });
});

describe('5. Interview practice', () => {
  it('loads a behavioral question', async () => {
    await element(by.id('tab-interview')).tap();
    await element(by.id('interview-track-behavioral')).tap();
    await waitFor(element(by.id('interview-question-prompt'))).toBeVisible().withTimeout(15_000);
  });
});

describe('6. PDF export', () => {
  it('generates a signed URL for the first resume', async () => {
    await element(by.id('tab-resumes')).tap();
    await element(by.id('resume-row-0')).tap();
    await element(by.id('resume-export-pdf')).tap();
    await waitFor(element(by.id('resume-export-success'))).toBeVisible().withTimeout(20_000);
  });
});

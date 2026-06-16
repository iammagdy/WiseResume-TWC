/**
 * F-1 — TailoringHubResultPage UI state tests
 * Verifies warning vs success state detection for unchanged tailoring results
 */
import { describe, it, expect } from 'vitest';
import type { ChangeSummary } from '@/lib/tailorMerge';

// Test the UI state detection logic without rendering the component
// This tests the same logic used in the component's isUnchangedWarning calculation
function calculateUIState(
  changeSummary: ChangeSummary | undefined,
  scoreBeforeAfter: { before: number; after: number } | undefined
): { isUnchangedWarning: boolean; headerText: string; shouldShowWarning: boolean } {
  const hasChanges = changeSummary?.hasChanges ?? true; // default true for backwards compatibility
  const isZeroScore = scoreBeforeAfter?.before === 0 && scoreBeforeAfter?.after === 0;
  const isEqualScore = scoreBeforeAfter ? scoreBeforeAfter.before === scoreBeforeAfter.after : false;
  const isUnchangedWarning = !hasChanges || isZeroScore || (isEqualScore && !hasChanges);

  return {
    isUnchangedWarning,
    headerText: isUnchangedWarning ? 'Changes Not Verified' : 'Tailored CV Ready',
    shouldShowWarning: isUnchangedWarning,
  };
}

describe('TailoringHubResultPage F-1: Warning/Success UI states', () => {
  const unchangedSummary: ChangeSummary = {
    hasChanges: false,
    summaryChanged: false,
    skillsChanged: false,
    experienceChanged: false,
    educationChanged: false,
    projectsChanged: false,
    certificationsChanged: false,
    awardsChanged: false,
    changedSections: [],
    description: 'No meaningful changes detected',
  };

  const changedSummary: ChangeSummary = {
    hasChanges: true,
    summaryChanged: true,
    skillsChanged: true,
    experienceChanged: false,
    educationChanged: false,
    projectsChanged: false,
    certificationsChanged: false,
    awardsChanged: false,
    changedSections: ['summary', 'skills'],
    description: 'professional summary updated, skills optimized',
  };

  it('shows warning state when content is unchanged (primary guard failed)', () => {
    const uiState = calculateUIState(unchangedSummary, { before: 50, after: 50 });

    expect(uiState.isUnchangedWarning).toBe(true);
    expect(uiState.headerText).toBe('Changes Not Verified');
    expect(uiState.shouldShowWarning).toBe(true);
  });

  it('shows warning state with 0/0 scores', () => {
    const uiState = calculateUIState(unchangedSummary, { before: 0, after: 0 });

    expect(uiState.isUnchangedWarning).toBe(true);
    expect(uiState.headerText).toBe('Changes Not Verified');
    expect(uiState.shouldShowWarning).toBe(true);
  });

  it('shows warning state when scores improved but content unchanged (suspicious)', () => {
    // AI fabricated scores without actual changes
    const uiState = calculateUIState(unchangedSummary, { before: 50, after: 80 });

    expect(uiState.isUnchangedWarning).toBe(true);
    expect(uiState.headerText).toBe('Changes Not Verified');
  });

  it('shows success state when content has meaningful changes', () => {
    const uiState = calculateUIState(changedSummary, { before: 45, after: 78 });

    expect(uiState.isUnchangedWarning).toBe(false);
    expect(uiState.headerText).toBe('Tailored CV Ready');
    expect(uiState.shouldShowWarning).toBe(false);
  });

  it('shows success state when scores equal but content changed (score calc bug)', () => {
    // Edge case: score calculation may have bugs, but content actually changed
    const uiState = calculateUIState(changedSummary, { before: 50, after: 50 });

    // Because content changed, this should NOT show warning
    expect(uiState.isUnchangedWarning).toBe(false);
    expect(uiState.headerText).toBe('Tailored CV Ready');
  });

  it('defaults to success when changeSummary is missing (backwards compatibility)', () => {
    // For old entries in history that don't have changeSummary
    const uiState = calculateUIState(undefined, { before: 50, after: 75 });

    expect(uiState.isUnchangedWarning).toBe(false);
    expect(uiState.headerText).toBe('Tailored CV Ready');
  });

  it('shows warning for zero scores even if changeSummary missing', () => {
    // 0/0 is strong signal of failure regardless of changeSummary presence
    const uiState = calculateUIState(undefined, { before: 0, after: 0 });

    expect(uiState.isUnchangedWarning).toBe(true);
    expect(uiState.headerText).toBe('Changes Not Verified');
  });

  it('change summary description is visible for successful tailoring', () => {
    expect(changedSummary.description).toBe('professional summary updated, skills optimized');
    expect(changedSummary.changedSections).toContain('summary');
    expect(changedSummary.changedSections).toContain('skills');
  });

  it('warning description explains no changes detected', () => {
    expect(unchangedSummary.description).toBe('No meaningful changes detected');
    expect(unchangedSummary.changedSections).toHaveLength(0);
  });
});

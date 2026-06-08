import { describe, expect, it } from 'vitest';

import {
  getCompanyBriefingSchemaHelpMessage,
  toCompanyBriefingSaveErrorMessage,
} from '@/hooks/useCompanyBriefingLibrary';

describe('Company Briefing library save errors', () => {
  it('maps Appwrite invalid-structure errors to a clear schema action message', () => {
    expect(
      toCompanyBriefingSaveErrorMessage(
        new Error('Invalid document structure: Unknown attribute: "briefing"'),
      ),
    ).toBe(getCompanyBriefingSchemaHelpMessage());

    expect(
      toCompanyBriefingSaveErrorMessage(
        new Error('Unknown attribute: company_name'),
      ),
    ).toBe(getCompanyBriefingSchemaHelpMessage());
  });

  it('keeps a generic message for unrelated save failures', () => {
    expect(
      toCompanyBriefingSaveErrorMessage(
        new Error('Network request failed'),
      ),
    ).toBe('Failed to save briefing');
  });
});

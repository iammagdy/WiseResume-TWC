# Feature Specification: 012-branding-cleanup

**Title**: Branding Cleanup and Foreign App Removal
**Status**: Draft
**Priority**: P1
**Owner**: WiseResume AI

## User Scenarios & Testing

### Scenario 1: Clean Sample Data
**GIVEN** a new user loads the Portfolio Editor
**WHEN** they see the sample data
**THEN** there are no references to "Wise Universe"
**AND** all branding is "The Wise Cloud" or "WiseResume"

### Scenario 2: Professional AI Settings
**GIVEN** a user opens the AI Settings Sheet
**WHEN** they check the health status of the built-in AI
**THEN** the internal provider key is not "lovable"
**AND** it displays as "WiseResume AI"

## Requirements

### R1: Prohibited Word Removal
- **FR-001**: "Lovable" must be removed from all user-facing UI and internal mapping keys.
- **FR-002**: "Bolt" must be removed (if any found).
- **FR-003**: "Wise Universe" must be replaced with "The Wise Cloud" or "Wise AI".

### R2: Safety Protcol
- **FR-004**: External endpoints (e.g., `lovable.dev`) must be preserved to maintain functionality but can be abstracted behind generic names.
- **FR-005**: Infrastructure-level env vars (e.g. `LOVABLE_API_KEY`) and internal backend implementation detail strings MUST NOT be changed if it risks breaking the live app. 
- **FR-006**: Create `FUTURE_ISSUES.md` to track these deferred technical debt items.

## Success Criteria
- [ ] `git grep -i lovable src/` returns 0 results.
- [ ] `git grep -i wiseuniverse src/` returns 0 results.
- [ ] Application builds and runs without breaking AI functionality.
- [ ] Sample data reflects "The Wise Cloud".

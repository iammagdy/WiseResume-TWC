# Research: 012-branding-cleanup

## Findings

### Branding Prohibitions
- **Decision**: All "Wise Universe" references must be purged from `src/`.
- **Rationale**: Explicitly forbidden by `BRANDING.md`.
- **Alternatives**: None considered.

### Backend Infrastructure Risks
- **Decision**: Defer renaming `LOVABLE_API_KEY` and internal `providerUsed` keys in Edge Functions.
- **Rationale**: Changing these would break connectivity between the frontend store and backend response unless dashboard variables are updated simultaneously.
- **Alternatives**: Create an alias layer in the frontend to map `lovable` -> `Wise AI` for display purposes.

### Allowed Exceptions
- **Legacy Docs**: `legacy-docs/enhancements-for-vibe-coding/` is allowed to keep old names.
- **Decision**: No changes will be made to files in `legacy-docs/`.

## Resolved Clarifications
- Generic email to use: `contact@thewise.cloud`.
- Main app URL: `resume.thewise.cloud`.

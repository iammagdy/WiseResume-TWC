# Skill: Feature Implementation Workflow

**Skill ID:** `feature-implementation`
**Location:** `Project Atlas/skills/feature-implementation.md`

---

## Feature Development Process

1. **Check Living Specs**: Read the feature spec under `Project Atlas/features/<feature-name>.md`.
2. **Frontend Layer**: Modify React components in `src/components/` or pages in `src/pages/`.
3. **Backend Layer**: Cross-user operations must run through serverless functions under `appwrite-hubs/` (e.g. `admin-devkit-data`).
4. **Localization (i18n)**: Every UI string must use `t('key')` from `locales/en/app.json` and `locales/ar/app.json`. Default language is English.
5. **Validation**: Run `npx tsc --noEmit` and `npm run build`.

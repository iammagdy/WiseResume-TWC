# Route Inventory

Source: `src/AppInterior.tsx`.

## Public/marketing/auth

`/`, `/enterprises`, `/ar`, `/ar/enterprises`, `/auth`, `/sign-in`, `/auth/callback`, `/auth/verify-email`, `/auth/reset-password`, Arabic auth equivalents, `/pricing`, `/whats-new`, `/waitlist`, `/enterprise`, Arabic equivalents, `/guides`, `/guides/:slug`, `/examples`, Arabic equivalents, `/privacy-policy`, `/terms-of-service`, Arabic equivalents.

## WiseHire

`/wisehire/signup`, `/wisehire/signup-early-access/:code`, terms/privacy, dashboard, onboarding, subscription, settings, JD writer, briefs/list/detail, pipeline, bulk screen, scorecards, talent pool, analytics, mask CVs, clients, scorecard templates, roles.

## Protected WiseResume workspace

`/dashboard`, `/editor`, `/preview`, `/upload`, `/settings`, `/interview`, `/applications`, `/onboarding`, `/profile`, `/templates`, `/resume/:id`, `/job/:id`, `/application/:id`, `/notifications`, `/portfolio`, `/cover-letters`, `/cover-letter/new`, `/cover-letter/edit/:id`, `/career`, resignation-letter routes, `/ai-studio`, `/ai-studio/:tool`, `/help`, `/analytics`, `/subscription`, `/referral`, `/achievements`, QR routes, `/search`, tailoring routes, and `/jobs`.

## Public share/content

`/invite/:code`, `/share/:token`, `/share/brief/:shareToken`, `/share/scorecard/:shareToken`, `/interview/report/:token`, `/p/:username`, `/l/:linkId`, plus Arabic share/report/portfolio/short-link equivalents.

## Restricted/admin

`/store-screenshots`, `/screenshots-gallery` are protected. `/devkit` and `/devkit2` are protected and admin-gated. `*` maps to NotFound.

## Route drift requiring decision

- Atlas `/portfolio/editor` vs code `/portfolio`.
- Atlas `/preview/:resumeId` vs code `/preview`.
- Deprecated `/tailor` paths remain live alongside `/tailoring-hub`.
- `/jobs` is present and protected, not absent/hidden in source.
- Most workspace routes have no explicit Arabic-path alias.


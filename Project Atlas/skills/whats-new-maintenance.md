# Skill: What's New Product Updates Hub Maintenance

**Requirement Level:** MANDATORY FOR CUSTOMER-FACING RELEASES & TASK CLOSEOUTS  
**Skill ID:** `whats-new-maintenance`  
**Location:** `Project Atlas/skills/whats-new-maintenance.md`  

---

## 1. Purpose

This skill establishes the canonical operational workflow for maintaining the WiseResume Product Updates Hub (`/whats-new` and `/ar/whats-new`). It ensures every public release entry remains:
* **Evidence-Backed**: Tied strictly to verified production deployments, commit history, and living Atlas records.
* **Customer-Facing**: Focused on user outcomes rather than internal engineering or schema mechanics.
* **Bilingual**: Fully paired with natural English LTR and Arabic RTL copy.
* **Chronologically Accurate**: Governed by dynamic date derivation without fabricated or inferred release dates.
* **Architecturally Compliant**: Bound to the canonical public locale routing contract.

---

## 2. When to Use

Invoke this skill whenever:
* Closing a customer-impacting feature or user-visible capability;
* Closing a meaningful user-facing bug fix where communicating the fix benefits customers;
* Adding, modifying, or reconciling release entries in `src/data/whatsNewData.ts`;
* Auditing historical release data and evidence matrices;
* Modifying public locale routing or What's New page UI/UX;
* Executing task closeout to record the mandatory What's New eligibility decision.

---

## 3. Required Inputs

Before evaluating release updates, inspect:
1. **Current Release Dataset**: `src/data/whatsNewData.ts` (inspect only; this skill does NOT authorize product code modifications unless explicitly tasked);
2. **Atlas Living Specifications**: Relevant documents under `Project Atlas/features/`, `product/`, and `architecture/`;
3. **Changelog & Handover Records**: `Project Atlas/CHANGELOG.md` and `Project Atlas/WHERE_WE_STOPPED.md`;
4. **Production Deployment Records**: Verified Vercel deployment status, deployment ID, and live URL checks;
5. **Git Commit History**: Verified commit hashes, PR numbers, and merge SHAs;
6. **QA & Browser Evidence**: Executable test results and real browser/runtime verification logs.

> [!IMPORTANT]
> This skill is an operational governance guide. It does NOT grant authorization to edit product code or deploy to production unless the user explicitly assigns an implementation or deployment task.

---

## 4. Eligibility Decision Contract

Every completed task must receive a What's New decision during closeout using this standardized template:

```text
WHATS_NEW_DECISION

Status:
WHATS_NEW_REQUIRED | WHATS_NEW_NOT_REQUIRED | WHATS_NEW_DEFER_UNTIL_PRODUCTION

Reason:
<short factual reason explaining why the change qualifies, is excluded, or is deferred>

Evidence:
- PR: #<number> (or N/A)
- Merge SHA: <sha> (or N/A)
- Production Deployment: <deployment-id> (or PENDING)
- Browser/Runtime Verification: <PASS | PENDING | N/A>

Public Release Title:
<Customer-facing title in English and Arabic — only when REQUIRED>

Public Release Summary:
<Outcome-focused summary in English and Arabic — only when REQUIRED>

Release Month:
YYYY-MM (or UNVERIFIED_DATE)
```

### Allowed Status Values
* **`WHATS_NEW_REQUIRED`**: The work creates or materially alters a user-facing capability, UX workflow, export format, localization, or fixes a significant user-visible problem. Production deployment and live verification are complete.
* **`WHATS_NEW_NOT_REQUIRED`**: The work is internal-only (backend refactors, schema migrations, CI/CD, dependency updates, internal DevKit tooling, secret rotation, documentation updates).
* **`WHATS_NEW_DEFER_UNTIL_PRODUCTION`**: The change qualifies for What's New, but production deployment and live browser verification have not yet occurred. The entry remains queued until deployed.

---

## 5. Release Content Rules

All public What's New entries must adhere strictly to these content guidelines:
* **Customer Outcome First**: Frame descriptions around what the user can now do, see, or achieve.
* **Short, Factual Title**: Concise, descriptive titles matching the actual shipped functionality.
* **No Developer Jargon**: Omit internal terms like "state hydration", "REST endpoints", "indexes", "Appwrite collections", "middleware", or "table migration" unless directly relevant to technical users.
* **No Provider Implementation Mechanics**: Do not mention internal infrastructure details (e.g., specific cloud database instances or internal serverless routes) in customer release notes.
* **No Fabricated Claims**: Never use unsubstantiated superlatives or absolute claims ("instant", "fully", "perfect", "100% secure", "fastest") unless proven by verified benchmark data.
* **No Duplicate Entries**: Each distinct capability must appear only once in the release catalog.
* **Bilingual Copy**: Every release entry must provide natural, culturally appropriate English LTR and Arabic RTL copy for title, description, and highlights.

---

## 6. Timeline & Dataset Rules

The What's New dataset and component must obey these permanent timeline rules:
* **Dynamic Month Derivation**: The visible month navigation bar must be dynamically derived from the release items present in the dataset (`getAvailableMonthGroups`). Never maintain a hardcoded, static list of month buttons.
* **Normalized Month Keys**: Month identifiers must strictly use `YYYY-MM` format (e.g., `2026-08`).
* **Newest to Oldest Ordering**: Month groups and release items within each group must always be sorted chronologically from newest to oldest.
* **No Current-Year Hiding**: Releases from the current calendar year must NEVER be collapsed into a generic "Older" bucket if their release month is known.
* **Historical Progressive Disclosure**: Releases from prior calendar years (e.g., 2025) may be collapsed under an explicit progressive disclosure toggle (e.g., "Show Older Updates from 2025") to preserve page hierarchy.
* **No Empty Months**: Every month pill displayed in the navigation bar must contain at least one real, verified release card.
* **Filter Compatibility**: Category filter tabs (Features, AI, Resume, Jobs, Security, Improvements) and month selector pills must remain mutually compatible and compose cleanly.

---

## 7. Public Locale Routing Contract

What's New is a primary public localized route and must strictly uphold the WiseResume public locale contract:
* **Canonical URL Authority**:
  * `/whats-new` strictly enforces `locale = 'en'`, `dir = 'ltr'`.
  * `/ar/whats-new` strictly enforces `locale = 'ar'`, `dir = 'rtl'`.
* **URL Trumps Persisted Storage**: A user's `localStorage` preference (e.g., `wiseresume-locale = 'ar'`) must NEVER force an unprefixed canonical English public route into Arabic. The public URL is authoritative.
* **Authenticated Preference Preserved**: Private authenticated routes (`/dashboard`, `/editor`, `/settings`) continue to respect the user's stored language preference.
* **Internal Arabic Links**: On `/ar/whats-new`, header and footer links must point to `/ar` prefixed routes:
  * Header Logo $\rightarrow$ `/ar`
  * Pricing $\rightarrow$ `/ar/pricing`
  * Privacy Policy $\rightarrow$ `/ar/privacy`
  * Terms of Service $\rightarrow$ `/ar/terms`
  * Refund Policy $\rightarrow$ `/ar/refund-policy`
* **Intentional Switching**: The header `<LanguageSwitcher />` is the explicit control for user-driven language switches and updates both the canonical URL and locale state synchronously.

---

## 8. Validation Suite Checklist

When What's New dataset (`src/data/whatsNewData.ts`), page components, or locale routing files are modified, run the full validation suite:

```bash
# 1. Focused Unit & Invariant Tests
npx vitest run \
  src/i18n/__tests__/publicLocaleRouting.test.ts \
  src/i18n/__tests__/LocaleProvider.test.tsx \
  src/i18n/__tests__/LanguageSwitcher.test.tsx \
  src/pages/__tests__/WhatsNewPage.test.tsx \
  src/pages/__tests__/landingRouteContract.test.ts \
  src/pages/__tests__/ArabicPublicContentPages.test.tsx \
  src/lib/__tests__/productTrustCopy.test.ts

# 2. i18n Catalog & Coverage Verification
npm run test:i18n
npm run test:i18n:coverage

# 3. TypeScript Typecheck
npx tsc --noEmit

# 4. Clean Git Diff Check
git diff --check

# 5. Production Build Verification
npm run build
```

> [!CAUTION]
> Never report that validation checks passed without running the exact commands and verifying exit code 0.

---

## 9. Browser QA Matrix

Whenever What's New UI or dataset changes materially, perform browser verification on both desktop and mobile viewports:

| Dimension | Desktop Target | Mobile Target |
| --- | --- | --- |
| **Viewport** | ~1440x900 | ~390x844 |
| **Routes** | `/whats-new` & `/ar/whats-new` | `/whats-new` & `/ar/whats-new` |
| **Horizontal Overflow** | `scrollWidth === clientWidth` | `scrollWidth === clientWidth` (0px overflow) |
| **Directionality** | English LTR & Arabic RTL | English LTR & Arabic RTL |
| **Theming** | Light Mode & Dark Mode | Light Mode & Dark Mode |
| **Interactions** | Month pills, Category tabs, Copy anchor | Horizontal scroll on pills, touch targets |
| **Disclosures** | 2025 progressive toggle reveals cards | 2025 progressive toggle reveals cards |
| **Links** | Canonical EN / AR header & footer links | Canonical EN / AR header & footer links |
| **Console Errors** | 0 JavaScript / React / router errors | 0 JavaScript / React / router errors |

---

## 10. Production Deployment Verification

A release item moves to **Published & Verified** status only when all three conditions are satisfied:
1. **Merge to Main**: The PR containing the implementation is merged into `main`.
2. **Production Deployment Ready**: Vercel production deployment succeeds (`status: READY`).
3. **Live Production Smoke Verification**: The live URL (`https://wiseresume.app/whats-new`) is verified to render correctly in production.

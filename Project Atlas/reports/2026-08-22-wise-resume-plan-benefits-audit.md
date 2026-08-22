# WiseResume Plan Rename and Benefits Audit

**Date:** 2026-08-22
**Author:** Manus AI
**Status:** `PASS_WITH_WARNINGS` — local implementation tested; Paddle Sandbox rename verified; RevenueCat Sandbox display-label editing is unsupported from the inspected control; no production, Appwrite, webhook, checkout, gate, limit, or backend activation was performed.

## 1. Verdict

The owner-authorized display rename is implemented in the isolated branch `feat/ultimate-plan-display-rename` and validated locally. Public plan copy now presents **Free**, **Pro — $5/month**, and **Ultimate — $10/month**. The canonical internal keys remain `free`, `pro`, and `premium`; RevenueCat entitlement identifiers remain `pro` and `premium`. The Paddle Sandbox product rename was completed in place, preserving the existing product and price identifiers and the recurring $10 monthly price.

The benefits audit finds that **Pro has meaningful functional gates**, while **Ultimate’s strongest verified differentiators are unlimited AI usage, Analytics, and verified branding removal**. Several additional benefits shown in the pricing configuration are advertised but not proven to be enforced. They are recommendations only and were not implemented. Billing remains disabled/Coming Soon, so these visible prices must not be read as live checkout availability.

## 2. Current plan naming architecture

The application resolves only the internal plan values `free | pro | premium`. `premium` implies Pro access and is exposed to UI code through `isPremium`; it is not renamed to `ultimate`.[1] RevenueCat continues to use entitlement IDs `pro` and `premium`, and the imported Paddle products remain mapped to those existing entitlements. The new word **Ultimate** is display-only and must never be persisted as a plan key, entitlement ID, coupon value, webhook value, or Appwrite subscription state.

The current frontend price configuration is `$0`, `$5`, and `$10`; the server AI gateway and coupon resolver remain unchanged.[2] [3] [4]

## 3. Display-name changes completed

The scoped source changes update public and authenticated plan surfaces, including Pricing, Subscription, upgrade walls and dialogs, plan badges, dashboard and workspace chrome, settings, export-related plan copy, analytics, onboarding, English locale values, and Arabic locale values. The remaining `Premium` strings found by the final sweep are intentional internal/admin or generic uses: `isPremium`, the `premium` key, DevKit coupon controls, the unlimited-credit comment, and generic premium-theme language. These were not blindly renamed.

The remaining settings and authentication capitalization leaks were corrected so an internal `premium` value displays as **Ultimate** in the Settings hero CTA, Account plan badge, AI Engine usage badge, signup notice, and post-signup toast. All navigation targets, gate checks, subscription resolver behavior, and stored values remain unchanged.[5] [6]

## 4. Paddle Sandbox rename result

The existing Sandbox product was edited in place from **WiseResume Premium** to **WiseResume Ultimate**. The verified product is:

| Field | Verified value |
|---|---|
| Environment | Paddle Sandbox/Test |
| Product name after edit | WiseResume Ultimate |
| Product ID | `pro_01m0fnm7000501f67z1bmhzaff` |
| Price ID | `pri_01m0fnq9hetwdwm9e1sa49n08s` |
| Amount | $10 USD |
| Interval | Monthly |
| Billing type | Recurring subscription |
| Catalog change | Display name only |

The existing Pro product remains **WiseResume Pro**, $5/month recurring, with product ID `pro_01m0fn08h7tmzm5cphvcvd30g6` and price ID `pri_01m0fnjspex6yqqf6w9v9apaxg`. No product, price, annual plan, trial, coupon, add-on, webhook, API key, or Production catalog change was made.

## 5. RevenueCat Sandbox display/config result

The authenticated project is `TheWiseCloud` in Sandbox. The Paddle app and imported product mappings were preserved. The Sandbox Products page showed the two imported Paddle products, with Pro attached to entitlement `pro` and the $10 product attached to entitlement `premium`; the `default` offering retained its two active Paddle packages.

The imported Paddle Premium row’s actions menu exposed only **Make Inactive**. No independent display-label edit control was available. Making the product inactive would change configuration rather than presentation, so no RevenueCat mutation was made. The safe result is therefore:

| Item | Result |
|---|---|
| Entitlement `premium` | Preserved |
| Pro entitlement `pro` | Preserved |
| Paddle price mapping | Preserved |
| Offering/package structure | Preserved |
| Stripe Web Billing app | Untouched |
| Production RevenueCat | Untouched |
| RevenueCat label edit | `NOT CURRENTLY SUPPORTED` by inspected control |
| Propagation of the Paddle rename into the imported RC label | `UNVERIFIED` |

No duplicate product or entitlement was created, and no webhook/backend configuration was changed. The non-secret external evidence was recorded in the migration evidence file and Paddle inspection record.

## 6. Current verified Free benefits

Free users receive a real product experience rather than an empty shell. The verified behavior includes one non-trial resume under the current creation rule, a possible one-time 24-hour trial resume when no trial is already active, standard editor access, standard templates, the currently available export formats with WiseResume branding, readiness/ATS-oriented scoring, portfolio core features, deterministic/local job-match scoring, and five daily AI credits subject to server enforcement. Free users do not pass the Pro gates for AI Studio, Cover Letters, Interview Coaching, Applications, or the Pro-gated Smart Tailoring entry points. They cannot remove WiseResume branding from server-rendered exports.[7] [8] [9]

## 7. Current verified Pro benefits

Pro users receive the Free experience plus unlimited resumes under the current creation dialog, 50 daily AI credits, higher per-minute AI allowance, Pro-gated access to the AI Studio workspace, Smart Tailoring entry surfaces, Cover Letters, Interview Coaching, and Application Tracker/saved jobs. Pro does not pass the Ultimate-only Analytics gate and cannot remove WiseResume branding from exports. The strongest Pro value is therefore workspace access and materially higher usage, not a distinct model/provider tier; no tier-specific model availability was proven.[10] [11]

## 8. Current verified Ultimate (`premium`) benefits

Ultimate is the display name for internal `premium`. It receives Pro access, unlimited daily AI credits in the server configuration, the highest per-minute AI allowance, unlimited portfolio public-AI allowance, Analytics with CSV output, and verified branding removal when the subscription is both premium and server-verified. It also receives the same current unlimited-resume treatment as Pro. No separate Ultimate model family, priority support operation, early-access system, or dedicated-support workflow was proven in the inspected code.[12] [13]

## 9. Full current benefits comparison table

The table distinguishes actual code behavior from claims that are not independently enforced. `NOT CURRENTLY GATED` means the audit did not find a plan entitlement gate for that capability; it does not mean every underlying operation is unlimited or guaranteed.

| Capability | Free | Pro | Ultimate (`premium`) |
|---|---|---|---|
| Daily AI usage | 5/day, server-enforced | 50/day, server-enforced | Unlimited sentinel, server-enforced |
| Per-minute AI allowance | 3/minute | 10/minute | 20/minute |
| Resume creation/storage | One non-trial resume; one possible 24-hour trial resume | Unlimited in current creation dialog | Unlimited in current creation dialog |
| Resume Editor | Available | Available | Available |
| Basic editor AI / enhancement | No distinct plan gate found | No distinct plan gate found | No distinct plan gate found |
| Smart Tailoring / Tailoring Hub | Editor/nav entry is Pro-gated; direct Tailoring Hub route has no uniform page gate | Pro access | Pro access |
| Readiness / ATS-oriented scoring | Available; score operation costs 0 | Available | Available |
| Cover Letters | Workspace Pro-gated | Available | Available |
| AI Studio tools | Pro gate blocks access | Available | Available |
| Interview Prep | Workspace Pro-gated | Available | Available |
| Company Briefing | No separate operation gate proven; available through Pro-gated AI workspace path | Available through AI Studio | Available through AI Studio |
| LinkedIn optimization | No separate operation gate proven; available through Pro-gated AI workspace path | Available through AI Studio | Available through AI Studio |
| Portfolio core | Available | Available | Available |
| Portfolio AI | No separate plan gate; 50 public-AI actions/day cap | No separate plan gate; 200/day cap | No separate plan gate; unlimited cap |
| Resume templates | `NOT CURRENTLY GATED` | `NOT CURRENTLY GATED` | `NOT CURRENTLY GATED` |
| PDF export | Available with branding | Available with branding | Available; branding removal is verified |
| ATS PDF export | Available; parser-friendly output, not a universal ATS guarantee | Available | Available |
| DOCX export | `NOT CURRENTLY GATED` | `NOT CURRENTLY GATED` | `NOT CURRENTLY GATED` |
| Other exports | LinkedIn text, plain text, image, share link, JSON, LaTeX, cover-letter/combined flows where prerequisites exist; no tier format gate found | Same | Same, plus branding removal where supported |
| Application Tracker | Pro-gated | Available | Available |
| Remote Jobs / local job match | Local/deterministic scoring is available | Same; Fast Tailor entry is Pro-gated | Same |
| Analytics | Ultimate-only gate | Blocked by Ultimate gate | Available, including CSV output |
| Version history / restore | No feature-specific entitlement gate proven | No feature-specific entitlement gate proven | No feature-specific entitlement gate proven |
| Priority/dedicated support | Advertised in plan labels but not operationally proven | Advertised priority support but not operationally proven | Advertised dedicated support but not operationally proven |
| Custom branding / watermark | Branding remains on | Branding remains on | Verified server-side branding removal when entitlement is verified |
| Custom domain | Coming Soon/disabled; not a current tier benefit | Coming Soon/disabled | Coming Soon/disabled |

## 10. Current AI limits

The server `ai-gateway` is authoritative. Current daily limits are Free **5**, Pro **50**, and internal `premium`/Ultimate **unlimited**. Current per-minute limits are **3 / 10 / 20** respectively. Portfolio public-AI caps are **50 / 200 / unlimited**. The frontend mirrors these values for display and soft feedback, but changing visible prices did not change any limit. The cost map covers operations such as analysis, tailoring, cover letters, recruiter simulation, Smart Fit, career assessment, portfolio AI, parsing, LinkedIn optimization, and company briefing; readiness scoring is zero-cost in the current configuration.[12]

## 11. Every plan-related feature gate found

The audit found the following explicit gates or plan-dependent enforcement points:

| Gate or enforcement point | Required plan | Evidence and qualification |
|---|---|---|
| Free resume cap | Pro to exceed cap | `CreateResumeDialog` blocks additional non-trial resumes for non-Pro users and implements the current 24-hour trial exception. |
| AI Studio workspace | Pro | Whole page is Pro-gated. |
| Interview Coaching | Pro | Page-level Pro gate. |
| Cover Letters workspace | Pro | List/new workspace is Pro-gated. |
| Applications / saved jobs | Pro | Application Tracker page is Pro-gated. |
| Analytics | Ultimate (`premium`) | Page-level premium/Ultimate gate. |
| Smart Tailoring entry points | Pro | Editor and workspace navigation use Pro gating; the Tailoring Hub page itself lacks a uniform direct gate. |
| Export branding removal | Ultimate (`premium`) plus verified subscription | Server and matching UI controls require verified premium; Free and Pro retain branding. |
| Workspace navigation markers | Pro | AI Studio/Tailoring Hub and Applications navigation entries are marked `proGated`. |

No direct `gate('premium')` call-site inventory beyond Analytics and the branding entitlement path was found. No separate tier-specific AI model/provider gate was proven.

## 12. Benefits advertised but not enforced

The current `PLAN_FEATURE_LABELS` advertises Pro **Priority support** and Ultimate **Custom branding**, **White-label exports**, **Early access features**, and **Dedicated support**.[2] Code evidence proves only the Ultimate branding-removal behavior, not a general white-label system, support SLA, early-access flag, or dedicated-support workflow. The pricing/subscription feature lists also imply broad “everything in Pro” access, which should be checked against any future changes to the Pro gate inventory.

Version history/restore is referenced in commercial discussions and related UI expectations, but a feature-specific tier gate was not proven in this audit. It should not be presented as a guaranteed paid benefit until enforcement and persistence behavior are verified.

## 13. Benefits implemented but not advertised

The current pricing copy under-represents several real behaviors: Pro’s multiple Pro-gated workspaces; server-side 3/10/20 per-minute protection; portfolio public-AI caps of 50/200/unlimited; the one-time 24-hour second-resume trial rule; broad export format availability; deterministic local job matching; and Analytics CSV output. Custom domains are implemented as a paid-oriented code path but are visibly disabled/Coming Soon and therefore should not be advertised as available.

## 14. Problems with current tier differentiation

Pro and Ultimate are materially different in AI allowance and Analytics, but their resume-cap treatment and most export formats are currently the same. The current Ultimate commercial list overclaims operational benefits that have no enforcement. The current Free experience is valuable, yet its main upgrade triggers are concentrated in workspace gates and the daily AI quota rather than in templates or basic export formats.

The AI credit difference alone is a meaningful upgrade driver for heavy users, but it is not a sufficient explanation for a $5-to-$10 jump unless Analytics, clean exports, or another high-value power-user capability is made explicit and reliable. The Tailoring Hub route caveat also creates inconsistent entitlement behavior that should be resolved only through a separately approved gate-hardening task.

## 15. Recommended Free benefits

Keep Free generous enough to demonstrate product value: one resume, readiness scoring, all standard templates and standard export formats with WiseResume branding, portfolio core functionality, deterministic local job matching, and five daily AI credits. Preserve strong server guardrails and be explicit that portfolio AI is capped. This approach gives users a useful free product while keeping Pro workspace access and higher AI usage as clear upgrade reasons.

## 16. Recommended Pro benefits

Position Pro at $5/month as the affordable regular-job-seeker plan: unlimited resumes, 50 daily AI credits, Pro workspace access for Smart Tailoring, AI Studio, Cover Letters, Interview Coaching, and Application Tracker, plus the existing 10/minute AI allowance. Add resume version history/restore only if it is actually implemented and tested. Keep branded exports unless clean exports are deliberately reserved for Ultimate.

## 17. Recommended Ultimate benefits

Position Ultimate at $10/month around power-user outcomes: unlimited AI subject to abuse protection, Analytics and CSV output, verified removable WiseResume branding/clean exports, and a high-value feature such as custom domains only if that capability is re-enabled and server-secured. Do not advertise priority or dedicated support, early access, custom branding, or white-label exports as operational benefits until the product and support processes exist.

## 18. Proposed final comparison table

This is a recommendation, not current behavior and not implemented.

| Capability | Recommended Free | Recommended Pro — $5/month | Recommended Ultimate — $10/month |
|---|---|---|---|
| Resumes | 1 active resume plus clearly bounded trial exception | Unlimited | Unlimited |
| AI usage | 5/day with server guardrails | 50/day with server guardrails | Unlimited subject to abuse/rate protections |
| Core editor/templates/standard exports | Available with WiseResume branding | Available with branding | Available with clean exports if verified |
| Smart Tailoring, AI Studio, Cover Letters, Interview, Tracker | Preview/upgrade gate | Included | Included |
| Portfolio | Core publishing and standard AI caps | Higher public-AI allowance | Higher/unlimited allowance only if cost is accepted |
| Analytics | Not included | Optional limited view only if implemented | Included with CSV |
| Version history | Basic current state | Included if implemented | Included |
| Branding | WiseResume branding | WiseResume branding | Removable only through verified server entitlement |
| Custom domain | Not included | Not included | Only if re-enabled and secured |
| Support/early access | Standard support | Standard support | Do not promise premium SLA until operationally implemented |

## 19. Expected AI/cost impact

No AI or infrastructure cost changed in this task. The display rename and price updates are copy/configuration changes only. Keeping current limits has no expected usage-cost change. If Ultimate unlimited AI is marketed more prominently, abuse and concurrency protections must remain server-authoritative; usage can materially increase even without a code change.

A lower Free portfolio-AI cap would reduce cost but may reduce activation and portfolio adoption. Version history creates storage, retention, and restore-testing cost. Custom domains create DNS, certificate, routing, abuse, and support cost. Analytics is comparatively low-cost when computed from existing data, but any new event collection or aggregation must be privacy-reviewed. Clean exports are primarily an entitlement and export-path verification cost, not a new model cost.

## 20. Required code changes if recommendations are approved

Recommendations require a separate owner-approved implementation task. That task should first define a canonical server/client entitlement matrix, then add server-side enforcement for every newly promised gate, reconcile client upgrade UI, update English and Arabic copy, add persistence and export tests, and document Appwrite schema/function/permission impact before any deployment. Version history requires data-model and restore tests. Custom domains require a security and deployment review. Support and early access require operational systems, not only UI labels.

The separate task must preserve `free | pro | premium`, RevenueCat `pro | premium`, server-side AI limits, coupon/trial semantics, webhook architecture, and the billing-disabled/Coming Soon state until payments are explicitly activated in a future approved release.

## 21. Risks

The main risks are commercial copy outrunning enforcement, inconsistent Smart Tailoring route protection, and a possible delay or unsupported propagation of the Paddle product rename into RevenueCat’s imported display label. RevenueCat’s inspected control did not permit a safe label-only edit. Production remains unchanged, and the current branch is uncommitted; therefore the source rename is not live.

There is also a product-risk distinction between “available” and “unlimited”: templates and export formats are broadly available, while AI operations remain subject to daily, per-minute, portfolio, cost, and prerequisite limits. No browser verification against a newly deployed frontend was performed, because deployment was not authorized.

## 22. Owner decisions required

The owner should decide whether to approve the proposed Free/Pro/Ultimate benefits matrix as a future implementation target; whether Smart Tailoring’s direct route must receive uniform Pro enforcement; whether version history/restore should become a real Pro benefit; whether custom domains should be re-enabled for Ultimate; whether Free portfolio public-AI usage should remain at 50/day; and whether support, early access, custom branding, or white-label language should be removed or backed by real operational systems.

The owner should also decide whether a future RevenueCat/Paddle synchronization check is required after Paddle label propagation. Any such check must remain Sandbox-only until separately authorized.

## 23. Recommended next action

Create a separate approved implementation task for **benefit truthfulness and entitlement hardening**. Start with the owner-approved target matrix, implement only the selected gates and benefits, add server-authoritative tests, update pricing copy, and perform persistence/export/browser QA. Do not combine that work with production payment activation or Appwrite deployment unless explicitly authorized.

## Validation and Git state

The isolated branch is `feat/ultimate-plan-display-rename`, based on `58e198626844b9213e1621ecf31d5627fe1c1a97`, equal to `origin/main` at the audit point. The working tree contains only the scoped uncommitted display/localization changes; no commit, push, merge, deployment, environment-variable change, Appwrite change, or production payment action was performed.

The following checks passed after the final source edits: `git diff --check`; `npm run test:i18n`; `npm run test:i18n:coverage`; `npm run lint`; `npm run test` with **221 test files passed, 1 skipped; 1,228 tests passed, 8 skipped, 1 todo**; `npx tsc --noEmit`; and `npm run build`. The production build completed with existing advisory large-chunk warnings and the no-sourcemap check passed. A first build attempt was terminated during gzip computation under temporary memory pressure; the clean retry passed.

Browser status is limited to authenticated Sandbox dashboard verification. Paddle Sandbox rename: verified. RevenueCat Sandbox label-only edit: unsupported by inspected control; no mutation made. Frontend browser QA against a deployed rename: not run because no deployment was authorized.

## References

[1]: ../../src/hooks/usePlan.ts "Canonical internal plan resolution and isPremium mapping"
[2]: ../../src/lib/planConfig.ts "Frontend plan prices, AI display limits, and advertised feature labels"
[3]: ../../appwrite-hubs/ai-gateway/src/main.js "Server-authoritative AI limits, costs, and rate limits"
[4]: ../../appwrite-hubs/coupons/src/main.js "Coupon, trial, and subscription resolution behavior"
[5]: ../../src/pages/PricingPage.tsx "Public pricing cards and internal premium CTA target"
[6]: ../../src/pages/SubscriptionPage.tsx "Subscription display labels, prices, and internal plan mapping"
[7]: ../../src/components/dashboard/CreateResumeDialog.tsx "Resume cap and trial-resume enforcement"
[8]: ../../src/components/editor/ExportOptionsSheet.tsx "Export formats and branding-removal control"
[9]: ../../src/pages/PortfolioEditorPage.tsx "Portfolio core, AI, and custom-domain behavior"
[10]: ../../src/lib/wiseWorkspace/workspaceNavConfig.ts "Pro-gated workspace navigation"
[11]: ../../src/pages/AIStudioPage.tsx "AI Studio page-level Pro gate"
[12]: ../../src/pages/AnalyticsPage.tsx "Ultimate-only Analytics gate and CSV behavior"
[13]: ../../src/pages/SettingsPage.tsx "Settings display-only plan mapping"

PLAN_BENEFITS_REVIEW_COMPLETE

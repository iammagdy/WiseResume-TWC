# Branding Rules

## 1. Approved Branding

The repository, app UI, generated content, docs, metadata, and product language MUST use ONLY the following exact approved branding names:

* **WiseResume** — the job seeker product (resume builder, portfolio, interview coach, AI career tools)
* **WiseHire** — the HR/recruiter product (candidate briefs, JD writer, pipeline, talent pool)
* **Wise AI** — the AI capability layer referenced in AI-related UI copy
* **The Wise Cloud** — the platform umbrella and infrastructure brand

**WiseResume and WiseHire are sub-brands under The Wise Cloud platform umbrella.**

**Legacy Branding Constraint**: Treat "WiseUniverse" and other old branding as legacy references. They MUST be replaced or avoided.

---

## 2. WiseHire Brand Identity

WiseHire is the HR-facing product. Its brand identity is distinct from WiseResume to signal a different audience and purpose.

* **Primary color**: Professional blue — `#1D4ED8` (Tailwind `blue-700`) as the base. Accent: `#3B82F6` (Tailwind `blue-500`).
* **Contrast requirement**: All WiseHire color choices MUST pass WCAG AA contrast ratio (4.5:1 for normal text, 3:1 for large text).
* **CSS variables**: WiseHire landing mode uses the existing `--lp-*` CSS variable system with a `wisehire` data attribute. The variable `--lp-brand` switches from crimson (`#9E1B22`) to blue (`#1D4ED8`) in WiseHire mode.
* **Tone**: Professional, efficient, confident. WiseHire copy speaks to HR managers and recruiters — not to job seekers.
* **Landing page toggle language**: The canonical public-facing labels are **"For Job Seekers"** and **"For Companies."** The brand name "WiseHire" appears in the WiseHire landing page hero, dashboard header, and marketing materials — not in the toggle itself.
* **Relationship**: Visitors see the toggle. HR users inside the product see "WiseHire" as the product name.

---

## 3. WiseResume Brand Identity

* **Primary color**: Crimson — `#9E1B22` (brand red). Used in all WiseResume landing page, UI accents, and branding.
* **CSS variable**: `--lp-brand: #9E1B22` in job seeker landing mode.
* **Tone**: Empowering, career-forward, accessible to non-technical users.

---

## 4. Platform UI Details and Visuals

* **SkyWallpaper**: `SkyWallpaper` acts as the global fixed background (`fixed z-0`).
  * All page content must sit at `z-10` or higher.
  * You MUST NEVER add `bg-background` or an overriding solid background to `AppShell`.
  * WiseHire dashboard uses the same `AppShell` and `SkyWallpaper` — no custom background overrides.
* **Design Guidelines**:
  * Maintain a clean, minimal, professional look. No playful, childish, or loud styles.
  * Readability first — use good spacing, consistent typography, and a clear hierarchy.
  * Forms must have clear labels, helpful placeholders, and understandable validation messages.
* **Dark/Light Mode**: Both WiseResume and WiseHire support light and dark mode via the `data-lp-scheme` attribute and system theme detection.

---

## 5. External Branding Prohibition and Removal

* You MUST NOT leave Lovable, Bolt, or any other vibe-coding platform branding anywhere in the project.
* **Safety Protocol**: If removing legacy branding may break functionality, you MUST stop and ask before changing it.
* You MUST remove old branding safely without damaging working features.

---

## 6. Brand Usage Summary

| Context | Use |
|---------|-----|
| Landing page toggle | "For Job Seekers" / "For Companies" |
| Job seeker product | WiseResume |
| HR/recruiter product | WiseHire |
| AI capability layer | Wise AI |
| Platform / infrastructure | The Wise Cloud |
| Old branding (forbidden) | WiseUniverse, Lovable, Bolt |

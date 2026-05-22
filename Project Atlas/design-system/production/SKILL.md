---
name: wiseresume-design
description: Use this skill to generate well-branded interfaces and assets for WiseResume / WiseHire (thewise.cloud), either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping. WiseResume = job-seeker product (Crimson Red brand). WiseHire = recruiter product (Royal Blue brand).
user-invocable: true
---

Read the README.md file within this skill, and explore the other available files.

If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and create static HTML files for the user to view. If working on production code, you can copy assets and read the rules here to become an expert in designing with this brand.

If the user invokes this skill without any other guidance, ask them what they want to build or design (and which product — WiseResume or WiseHire), ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.

Key things to remember:
- **Two brands, one system.** WiseResume = Crimson `#9E1B22`. WiseHire = Royal Blue `#1D4ED8`. Never mix in a single product surface.
- **Inter** is the only typeface. 400/500/600/700/800.
- **Lucide icons** via `https://unpkg.com/lucide@latest`. No emoji in product UI.
- **Tokens** live in `colors_and_type.css` — import this in every HTML mock.
- **UI kits** live in `ui_kits/wiseresume/` and `ui_kits/wisehire/` — use the components there rather than re-deriving from scratch.
- Hero headlines: extrabold, `letter-spacing: -0.035em`, sentence case with full stops, typewriter on one word, eyebrow above.
- Cards: `rounded-2xl`, `border + shadow-soft`, hover lift `translateY(-3px)`.
- Buttons: `rounded-xl`, `active:scale-[0.97]`, primary uses brand color, min `h-11 / 44px`.

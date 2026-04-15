# Trust & Security Messaging

## What & Why
Users need to feel their data is safe — not just be told it in legal language. Add a focused trust section to the landing page and a small reassuring note inside the portfolio editor. The language must be plain, specific, and human — no generic "bank-level encryption" filler. Every claim should map directly to a real protection already implemented in the app.

## Done looks like
- The landing page has a new "Your privacy is protected" section (positioned after the main feature sections, before the footer CTA) with 4 specific, plain-language callouts:
  1. "Your email stays hidden from bots" — contact info on your portfolio is shielded from automated scrapers; only real visitors can reach you.
  2. "You control who sees your portfolio" — one toggle to make it public or private, no hoops.
  3. "AI can't be spammed on your behalf" — the AI chat on your portfolio page uses session tokens so nobody can run up costs using your page.
  4. "Your resume data is yours" — stored securely, never shared with third parties or used to train AI models.
- The section does NOT use generic security badges, padlock stock-photo vibes, or vague corporate copy. It is conversational and specific.
- Inside the portfolio editor (Setup tab), a small inline notice appears near the "Contact Email" field explaining in one sentence that the email is hidden from bots while remaining clickable for real visitors.
- Both additions match the existing app's visual style (dark/light mode aware, consistent with the current Tailwind design system).

## Out of scope
- Changing any actual security behaviour (covered in bot-protection task)
- Privacy policy or legal page updates
- Changes to the public portfolio page itself
- Any backend changes

## Tasks
1. **Landing page trust section** — Create a new React section component (inline in `Index.tsx` or as a small component in `src/components/landing/`) that renders 4 trust callouts using Lucide icons (Shield, EyeOff, Lock, Database or similar). Each callout has a short bold headline and a 1–2 sentence plain explanation. Position the section between the last feature section and the final CTA block. Make it dark/light mode aware using the existing `isDark` pattern in `Index.tsx`.

2. **Portfolio editor security note** — In the Setup tab of the portfolio editor (`src/components/portfolio/editor/SetupTab.tsx` or wherever the contact email field lives), add a small helper text line beneath the contact email input: something like "Your email is hidden from bots — only real visitors clicking the button can see it." Use a small `ShieldCheck` Lucide icon and muted text styling consistent with the editor's existing helper text pattern.

## Relevant files
- `src/pages/Index.tsx:33-114`
- `src/components/landing/FeatureSection.tsx`
- `src/components/portfolio/editor/SetupTab.tsx`

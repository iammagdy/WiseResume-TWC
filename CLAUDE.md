# WiseResume — Agent Context

This file is loaded automatically by AI agents (Claude Code, Windsurf Cascade, Copilot, etc.) at session start. Read it before touching any code.

## Required reading before any UI work

Every agent working on this codebase **must** read the following two files before making any design, layout, styling, animation, or component decision:

- **[`DESIGN.md`](./DESIGN.md)** — The visual design system: color tokens, typography scale, component specs, elevation strategy, motion rules, Do's and Don'ts. Normative. The frontmatter is machine-readable; the markdown body is the authoritative prose spec.
- **[`PRODUCT.md`](./PRODUCT.md)** — The strategic context: register (product UI), target users, brand personality, anti-references, design principles, accessibility requirements.

If you skip these files, you will produce work that conflicts with the established system and will need to be reverted.

## Quick reference: the hard rules

These are the most commonly violated constraints. Memorize them.

### Color
- WiseResume primary: `#9E1B22` (crimson). WiseHire primary: `#1D4ED8` (blue).
- On the landing page, always use `var(--lp-eyebrow)` / `var(--lp-brand)` tokens — never hardcode the hex. The token resolves to the correct value for the active product mode.
- Neutrals are **cool-gray**, not warm. `#F7F7F8` is correct. `#FAF7F2` is prohibited.
- No gradient text (`background-clip: text` + gradient). Prohibited.
- No warm/beige/cream/sand backgrounds. Prohibited.

### Motion
- No `type: 'spring'` anywhere — not on inline `transition` props, not inside Framer Motion variant objects. **Ease-out only.**
- Canonical ease-out-quart curve: `[0.22, 1, 0.36, 1]`. In variant objects: `ease: [0.22, 1, 0.36, 1] as [number, number, number, number]` (tuple cast required for TS).
- Button transitions: `duration: 0.18`. Section-level entrance reveals: `duration: 0.45`.
- Every `setInterval` / `setTimeout` / `requestAnimationFrame` animation loop **must** be gated on `useReducedMotion()` from `framer-motion`. Never use `window.matchMedia('(prefers-reduced-motion)')` directly — it is not SSR-safe.
- When reduced motion is preferred: stop the loop, skip to final static state, use `initial={false}` (not `initial={{}}`) on motion elements.

### Focus & Accessibility
- Every interactive element needs a `focus-visible` ring. Never suppress focus styles.
- App shell: `focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-2`
- Landing page (WiseResume): `focus-visible:ring-[#9E1B22]`
- Landing page (WiseHire): `focus-visible:ring-[var(--lp-eyebrow)]`
- Minimum touch target: 44px height/width on all interactive elements.
- Font size floor: 0.72rem for semantic text, 0.68rem for purely decorative text.

### Anti-patterns (instant reject)
- `border-left` > 1px as a colored stripe on cards/callouts → replace with background tint or full border
- `z-index: 999` or `9999` → use the semantic scale: `editor-shell(40)` `editor-header(50)` `tooltip(55)` `keyboard-toolbar(60)` `ai-dialog(65)` `toast(70)`
- Identical card grids (same icon + heading + text, repeated 3–6 times) → find a structural differentiator
- Content hidden behind animation class triggers → reveals must enhance already-visible content

## Design detector (automated)

A `PostToolUse` hook in `.claude/settings.json` runs the design detector after every file edit. If it fires, you will see a system reminder with findings. Address them before continuing — do not ignore or dismiss detector output.

To run the detector manually:
```
node .claude/skills/impeccable/scripts/detect.mjs --json <file1> <file2> ...
```

## Impeccable skill commands

This project uses the `/impeccable` skill for design work. Key commands:

| Intent | Command |
|---|---|
| Full audit (a11y, perf, responsive) | `/impeccable audit <target>` |
| Pre-ship quality pass | `/impeccable polish <target>` |
| UX design review | `/impeccable critique <target>` |
| Update DESIGN.md from code | `/impeccable document` |
| In-browser visual iteration | `/impeccable live` |

## Tech stack
- **Framework**: React + Vite (SPA)
- **Styling**: Tailwind CSS v4 + CSS custom properties (`--lp-*`, `--wh-*` for landing; shadcn tokens for app shell)
- **Animation**: Framer Motion (`motion`, `useReducedMotion`, `useScroll`, `useTransform`)
- **Routing**: React Router v6
- **Icons**: Lucide React
- **Components**: shadcn/ui (Radix primitives)
- **Auth / DB**: Supabase


# Upgrade og-image Edge Function: Top 3 Skill Pills + Wordmark + Per-Theme Backgrounds

## What Already Exists (Do Not Rebuild)

The `supabase/functions/og-image/index.ts` function already has:
- A WiseResume wordmark at line 148 (`<text x="1128" y="56"…>✦ WiseResume</text>`)
- Skill pills — but showing top 5 at a smaller size (font-size 18, height 34)
- Basic style-to-bg mapping (`styleToBg`, `styleToFg`, etc.)

## What Is Actually Missing / Needs Upgrading

After reading the full SVG builder:

1. **Top 3 skills, not 5** — The current code uses `top5 = skills.slice(0, 5)` with small pills. The request wants 3 **featured** pills that are larger and more prominent (bigger font, taller, better visual weight).

2. **Wordmark quality** — The existing wordmark is a plain `<text>` element at accent color. It needs to become a proper branded unit: a pill/badge background behind the text so it reads clearly on all four theme backgrounds (especially `classic-clean` where the accent may be a light color on a white background).

3. **Per-theme visual identity** — All four dark themes (`minimal`, `bold-dark`, `glass-pro`) currently render almost identically — same near-black background with a radial glow. The themes need distinct SVG treatments:
   - **minimal**: current dark + single subtle glow (keep, refine)
   - **bold-dark**: add a sharp horizontal gradient stripe at the top third, stronger accent saturation
   - **glass-pro**: add a frosted-glass panel rectangle (semi-transparent white border) behind the content area, second inner glow
   - **classic-clean**: white/near-white background, dark text, colored left-edge accent bar replacing the top bar, a subtle horizontal rule in the middle

## Architecture of Changes — One File Only

Only `supabase/functions/og-image/index.ts` changes. No database, no new functions, no config changes.

The changes are all inside `buildSVG()`:

### 1. Skills: Top 3 with Larger Pill Badges

Change `const top5 = skills.slice(0, 5)` → `const top3 = skills.slice(0, 3)`.

Resize pills: height `34 → 42`, font-size `18 → 22`, padding `16 → 20`. This gives each pill more visual weight. With only 3 pills the horizontal space is comfortable even for long skill names (budget ~350px each).

Add per-theme pill styling:
- `classic-clean`: white background, border in accent color, text in accent
- `bold-dark`: solid accent fill, white text (high contrast on dark)
- `glass-pro`: semi-transparent white fill (`rgba(255,255,255,0.12)`), white border, white text
- `minimal`: existing accent-tinted fill (keep)

New pill generator function `buildSkillPills(skills, style, accent, fg)` replaces the inline loop.

### 2. WiseResume Wordmark — Badged Treatment

Replace the bare `<text>` wordmark with a pill-shaped badge:

```svg
<!-- Wordmark pill background -->
<rect x="980" y="28" width="192" height="38" rx="19" fill="${wordmarkBg}"/>
<!-- Wordmark text -->
<text x="1076" y="52" font-family="system-ui,sans-serif" font-size="20" font-weight="700" fill="${wordmarkFg}" text-anchor="middle">✦ WiseResume</text>
```

Where:
- `classic-clean`: `wordmarkBg = accentColor`, `wordmarkFg = '#ffffff'`
- dark themes: `wordmarkBg = 'rgba(255,255,255,0.1)'`, `wordmarkFg = accentColor`

This ensures the wordmark is always legible regardless of background theme.

### 3. Per-Theme SVG Background Treatment

Add a new helper `styleToDecoLayer(style, accent): string` that returns theme-specific SVG decoration inserted after the base background rect:

**minimal** (current — keep, minor refinement):
```svg
<radialGradient id="glow1" cx="12%" cy="18%" r="45%"> … accent 0.28 opacity … </radialGradient>
<radialGradient id="glow2" cx="88%" cy="82%" r="35%"> … accent 0.12 … </radialGradient>
```
(already exists, no change)

**bold-dark** (new):
```svg
<!-- Vivid horizontal gradient band across top 200px -->
<linearGradient id="boldStripe" x1="0%" y1="0%" x2="100%" y2="0%">
  <stop offset="0%" stop-color="${accent}" stop-opacity="0.35"/>
  <stop offset="50%" stop-color="${accent}" stop-opacity="0.15"/>
  <stop offset="100%" stop-color="${accent}" stop-opacity="0.05"/>
</linearGradient>
<rect x="0" y="0" width="1200" height="220" fill="url(#boldStripe)"/>
<!-- Bright top accent bar (thicker: 8px instead of 5px) -->
<rect x="0" y="0" width="1200" height="8" fill="${accent}"/>
<!-- Bottom-right corner accent triangle/shape -->
<polygon points="1200,630 900,630 1200,380" fill="${accent}" fill-opacity="0.06"/>
```

**glass-pro** (new):
```svg
<!-- Frosted glass panel behind content -->
<rect x="48" y="100" width="1104" height="440" rx="24" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.12)" stroke-width="1"/>
<!-- Inner shimmer line at top of panel -->
<rect x="48" y="100" width="1104" height="1" rx="0" fill="rgba(255,255,255,0.2)"/>
<!-- Two-tone radial glows -->
<radialGradient id="glassGlow1" cx="20%" cy="10%" r="50%"> … accent 0.22 … </radialGradient>
<radialGradient id="glassGlow2" cx="80%" cy="90%" r="40%"> … accent 0.10 … </radialGradient>
```

**classic-clean** (updated):
```svg
<!-- Pure white background (already done via styleToBg) -->
<!-- Subtle grid dot pattern (light gray) -->
<pattern id="dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
  <circle cx="12" cy="12" r="1" fill="#e5e7eb"/>
</pattern>
<rect width="1200" height="630" fill="url(#dots)"/>
<!-- Left vertical accent stripe (replaces the top bar) -->
<rect x="0" y="0" width="6" height="630" fill="${accent}"/>
<!-- Soft tinted hero band at top -->
<rect x="0" y="0" width="1200" height="200" fill="${accent}" fill-opacity="0.04"/>
```

The top accent bar (`<rect x="0" y="0" width="1200" height="5"/>`) is kept for all dark themes but replaced with the left stripe for `classic-clean`.

## Layout Refinements

After adding the per-theme decoration layers, minor layout adjustments:

- **Skills section label** ("TOP SKILLS") moves to y=430 and pills to y=460 (slightly higher to account for larger pill height of 42px)
- **Bio lines** sit between name/role and the divider (y=370–410), matching existing positions
- Dividers stay at y=320 (top) and y=520 (bottom) — sufficient space for 3 taller pills between 520 and 460+42=502

Final vertical layout from top to bottom:
```text
0-8    │ Top accent bar (dark themes) / left stripe (classic-clean)
28-66  │ Wordmark pill badge (top-right)
100    │ Avatar circle (cx=132, cy=180)
132    │ Name text
182    │ Role text  
220    │ Location
250    │ Open-to-Work badge
320    │ Divider line
350    │ "TOP SKILLS" label
390    │ Bio line 1
420    │ Bio line 2
460    │ Skills pills (height 42 each) ← enlarged from 490/34
520    │ Divider line
580    │ Bottom URL + watermark
```

## Files Changed

| File | Change |
|---|---|
| `supabase/functions/og-image/index.ts` | Full rewrite of `buildSVG()` helper only — HTTP handler and `buildFallbackSVG` unchanged |

## Why This Is Better Than the Current State

| Feature | Before | After |
|---|---|---|
| Skills pills | 5 small pills (h=34, fs=18) | 3 featured pills (h=42, fs=22), theme-styled |
| WiseResume wordmark | Bare `<text>` in accent color | Badged pill, always legible |
| `bold-dark` bg | Same as `minimal` | Vivid gradient band + corner shape |
| `glass-pro` bg | Same as `minimal` | Frosted glass panel + dual glow |
| `classic-clean` bg | Flat `#f8faff` | Dot grid + left accent stripe + tinted header |
| `minimal` bg | Current — fine | Keep unchanged |
| Pill color | Same style for all themes | Per-theme: filled/glass/bordered/tinted |

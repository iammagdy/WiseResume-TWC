
# Fix Duplicate WiseResume Text & Improve Logo Design

## Problem Analysis

Based on the screenshot, there are two issues:

### Issue 1: Duplicate "WiseResume" Text
The `HomeHeroSection` component is rendering:
1. `<AppLogo size="lg" />` - which already shows "WiseResume" + "Your AI Career Partner"
2. A separate `<h1>WiseResume</h1>` below it (lines 91-98)

This creates the duplicate text you're seeing.

### Issue 2: Logo Design Problems
The current logo looks cluttered with:
- Purple gradient background square
- White document shape inside
- "W" lettermark that's hard to see
- Cyan sparkle that looks out of place
- Overall too many elements competing for attention

---

## Solution

### Fix 1: Remove Duplicate Text from HomeHeroSection

Update `HomeHeroSection.tsx` to:
- Pass `showTagline={false}` to AppLogo (we want to show custom greeting instead)
- Remove the duplicate `<h1>WiseResume</h1>` block entirely
- Keep only the personalized greeting

```text
Before:                              After:
┌─────────────────────┐              ┌─────────────────────┐
│      [Logo]         │              │      [Logo]         │
│    WiseResume       │ ← From       │    WiseResume       │
│ Your AI Career...   │   AppLogo    ├─────────────────────┤
├─────────────────────┤              │   Good morning!     │ ← Greeting only
│    WiseResume       │ ← Duplicate  └─────────────────────┘
│   Good morning!     │
└─────────────────────┘
```

### Fix 2: Redesign App Logo Icon

Create a cleaner, more modern logo design:

**Current Problems:**
- Document shape inside gradient square is busy
- "W" lettermark competes with other elements
- Cyan sparkle looks tacked on

**New Design - Clean "W" with Gradient:**
- Simple rounded square with gradient
- Clean, bold "W" lettermark as the main focus
- Subtle AI sparkle that complements rather than competes
- Removed the document shape for a cleaner look

```text
Current:                    New:
┌──────────────┐           ┌──────────────┐
│ ╭──────────╮ │           │              │
│ │ [doc] W  │ │           │    ╲ ╲╱ ╱   │
│ │ ═══════  │ │           │     ╲╱ ╱    │  ← Bold gradient "W"
│ │ ═════    │ │           │      ╳      │
│ ╰──────────╯ │           │              │
│           ✦  │           │           ✨  │ ← Refined sparkle
└──────────────┘           └──────────────┘
```

---

## Technical Changes

### File 1: `src/components/home/HomeHeroSection.tsx`
- Change `<AppLogo size="lg" />` to `<AppLogo size="lg" showTagline={false} />`
- Remove duplicate h1 "WiseResume" text block (lines 90-98)

### File 2: `src/components/brand/AppIcon.tsx`
Redesign to a cleaner icon:
- Remove the document shape
- Make the "W" lettermark bolder and centered
- Keep the gradient background
- Refine the sparkle to be smaller and more subtle
- Better proportions for the rounded square

### File 3: `src/components/brand/AppLogo.tsx`
- Keep existing logic but ensure proper spacing when tagline is hidden

---

## Visual Comparison

**Before (Cluttered):**
```text
╔═══════════════════════════════╗
║   ┌─────────────────────┐     ║
║   │ ╭─────────────────╮ │     ║
║   │ │ [Document icon] │ │ ✦   ║
║   │ │     W           │ │     ║
║   │ │ ───────────     │ │     ║
║   │ │ ────────        │ │     ║
║   │ ╰─────────────────╯ │     ║
║   └─────────────────────┘     ║
╚═══════════════════════════════╝
       WiseResume
  Your AI Career Partner
       WiseResume         ← DUPLICATE
     Good morning!
```

**After (Clean):**
```text
╔═══════════════════════════════╗
║                               ║
║        ╲     ╲ ╱     ╱        ║
║         ╲   ╲╱ ╱    ╱         ║
║          ╲  ╱ ╲    ╱          ║  ✨
║           ╱   ╲  ╱            ║
║                               ║
╚═══════════════════════════════╝
       WiseResume
     Good morning!        ← Single greeting
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/home/HomeHeroSection.tsx` | Remove duplicate h1, add showTagline={false} |
| `src/components/brand/AppIcon.tsx` | Redesign to cleaner bold "W" focused icon |
| `src/components/brand/AppLogo.tsx` | Adjust spacing when tagline hidden |

---

## Benefits

1. **No more duplicate text** - Clean single "WiseResume" heading
2. **Cleaner logo** - Bold, recognizable "W" mark without visual clutter
3. **Better hierarchy** - Logo → Name → Greeting flows naturally
4. **Modern aesthetic** - Matches premium apps like Linear, Notion, Raycast
5. **Better scalability** - Simpler icon works at all sizes (favicons, app icons)

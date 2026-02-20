
# Redesign the WiseResume Version/About Card

## What changes
Restyle the "Branded Footer" section (lines 924-947 in `SettingsPage.tsx`) to be a polished, centered card with proper visual hierarchy. No logic or data changes.

## Visual result
- Centered app icon with purple glow/shadow, larger (48px)
- App name bold on its own line, version as a purple pill badge below
- Tagline with Egypt flag emoji inline ("Crafted with vision in **Egypt** flag-emoji"), no awkward floating text
- Changelog as a styled pill button with ScrollText icon and chevron
- Card with more padding, vertical spacing, and subtle border

## Technical changes

### 1. `src/pages/SettingsPage.tsx` -- Add `ScrollText` to lucide-react imports (line 46)

Add `ScrollText` to the existing lucide-react import block.

### 2. `src/pages/SettingsPage.tsx` -- Replace the Branded Footer block (lines 924-947)

Replace the current card markup with:

```tsx
{/* Branded Footer */}
<div className="pt-2 pb-10">
  <div className="flex flex-col items-center gap-4 px-6 py-8 rounded-3xl glass-elevated border border-white/[0.08] shadow-xl w-full max-w-xs mx-auto">
    {/* App icon with glow */}
    <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-lg shadow-purple-500/30 ring-1 ring-white/10">
      <AppIcon size={56} showSparkle={false} className="w-full h-full" />
    </div>

    {/* Name + version badge */}
    <div className="flex flex-col items-center gap-1.5">
      <h2 className="text-lg font-bold text-foreground tracking-tight">WiseResume</h2>
      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/25 text-purple-300 text-xs font-mono font-medium">
        {appVersion}
      </span>
    </div>

    {/* Tagline */}
    <p className="text-sm text-muted-foreground text-center">
      Crafted with vision in{" "}
      <span className="text-foreground font-medium">Egypt 🇪🇬</span>
    </p>

    {/* Changelog pill button */}
    <button
      type="button"
      onClick={() => setChangelogOpen(true)}
      className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 active:scale-95 transition text-sm text-muted-foreground font-medium touch-manipulation min-h-[44px]"
    >
      <ScrollText className="w-4 h-4 text-purple-400" />
      <span>Changelog</span>
      <ChevronRight className="w-3 h-3 text-muted-foreground/60 ml-1" />
    </button>
  </div>
</div>
```

## Files modified
- `src/pages/SettingsPage.tsx` -- add ScrollText import, restyle footer card



# Polish Developer Card: Tone Down Icon Glow, Boost Name Highlight

## What Changes

### 1. Reduce icon glow on buttons
The Contact and GitHub buttons currently have three layers of glow:
- A pulsing `box-shadow` animation (`dev-btn-glow`)
- A sweeping shine overlay (`::before` with `dev-btn-shine`)
- The icons themselves inheriting the bright primary color

**Fix:** Reduce the `dev-btn-glow` shadow intensity by ~50% and lower the `::before` shine opacity from 0.3 to 0.1. This keeps the premium feel but stops the icons from looking like they're on fire.

### 2. Make the name stand out more
The shimmer gradient currently transitions through `foreground -> primary -> blue -> purple -> foreground`. Since `foreground` occupies 0% and 100% of the gradient, the name spends a lot of time looking like plain text.

**Fix:**
- Replace `foreground` stops with brighter, more vibrant colors so the name always looks highlighted
- Increase font-size from `1.25rem` to `1.375rem`
- Add a subtle text-shadow glow behind the name for extra pop

## Technical Details

### File: `src/components/settings/DeveloperCreditCard.css`

**Button glow (lines 430-436)** -- reduce shadow values:
```
Before:
  box-shadow: 0 0 10px hsl(var(--primary) / 0.2);
  ...
  box-shadow: 0 0 25px hsl(var(--primary) / 0.4), 0 0 40px hsl(var(--primary) / 0.2);

After:
  box-shadow: 0 0 6px hsl(var(--primary) / 0.1);
  ...
  box-shadow: 0 0 12px hsl(var(--primary) / 0.2), 0 0 20px hsl(var(--primary) / 0.1);
```

**Button shine overlay (line 446)** -- reduce opacity:
```
Before: hsl(var(--primary) / 0.3)
After:  hsl(var(--primary) / 0.1)
```

**Name gradient (lines 365-383)** -- make it always vibrant:
```
Before:
  background: linear-gradient(
    90deg,
    hsl(var(--foreground)) 0%,
    hsl(var(--primary)) 25%,
    hsl(210, 100%, 70%) 50%,
    hsl(280, 80%, 70%) 75%,
    hsl(var(--foreground)) 100%
  );
  font-size: 1.25rem;

After:
  background: linear-gradient(
    90deg,
    hsl(var(--primary)) 0%,
    hsl(210, 100%, 75%) 33%,
    hsl(280, 80%, 75%) 66%,
    hsl(var(--primary)) 100%
  );
  font-size: 1.375rem;
  filter: drop-shadow(0 0 6px hsl(var(--primary) / 0.4));
```

This keeps the shimmer animation but ensures the name is always bright and eye-catching, never fading to plain foreground color.

### No changes to:
- Any functionality (haptics, click handlers, external links)
- Component props or structure
- Animations like sparkles, particles, orbit, 3D tilt, or holographic sweep
- Avatar, buttons layout, or website link

| File | Lines | Change |
|---|---|---|
| `DeveloperCreditCard.css` | 365-383 | Brighter name gradient, larger font, add drop-shadow |
| `DeveloperCreditCard.css` | 430-436 | Reduce button glow intensity |
| `DeveloperCreditCard.css` | 443-447 | Reduce shine overlay opacity |


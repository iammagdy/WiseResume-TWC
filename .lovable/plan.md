

# Enlarge App Icon Inside Planet Logo

## Problem

The app icon inside the planet appears too small relative to the planet size. Currently, the icon sizes are:

| Size | Planet | Icon | Ratio |
|------|--------|------|-------|
| sm   | 100px  | 48px | 48%   |
| md   | 140px  | 64px | 46%   |
| lg   | 180px  | 80px | 44%   |

Based on the reference image, the icon should occupy approximately **60-65%** of the planet diameter for a more prominent, visually balanced appearance.

---

## Solution

Update the `sizeConfig` object in `PlanetLogo.tsx` to increase the icon sizes:

### New Size Configuration

| Size | Planet | Icon (New) | Ratio (New) |
|------|--------|------------|-------------|
| sm   | 100px  | 64px       | 64%         |
| md   | 140px  | 90px       | 64%         |
| lg   | 180px  | 115px      | 64%         |

---

## Technical Details

### File to Modify
`src/components/landing/PlanetLogo.tsx`

### Change
Update lines 8-12 with new icon sizes:

```typescript
const sizeConfig = {
  sm: { planet: 100, icon: 64, orbit: 130, moon: 8 },
  md: { planet: 140, icon: 90, orbit: 175, moon: 10 },
  lg: { planet: 180, icon: 115, orbit: 220, moon: 14 },
};
```

---

## Visual Impact

- The app icon will be more prominent and immediately recognizable
- Better matches the reference image proportions
- The icon's gradient and details (W lettermark, document shape, sparkle) will be more visible
- Maintains the overall planet aesthetic with proper spacing around the icon


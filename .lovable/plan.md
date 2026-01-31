

# Custom App Icon Design for WiseResume

## Current State

- **Favicon**: Generic `favicon.ico` file exists but doesn't match the WiseResume brand
- **App Logo Component**: Uses Lucide's `FileText` icon with a gradient background and sparkle overlay
- **Brand Colors**: Electric Purple (#8B5CF6), Hot Pink (#FF4D8D), Cyan (#00E5FF)
- **Capacitor Config**: App name shows "AI Resume Editor" instead of "WiseResume"

## Icon Design Concept

The new app icon will feature a stylized document with an AI-inspired design that matches the brand identity:

```
┌──────────────────────┐
│    ╭─────────────╮   │
│    │  ┌───┐      │   │
│    │  │ W │  ✦   │   │
│    │  └───┘      │   │
│    │  ─────────  │   │
│    │  ─────────  │   │
│    │  ─────      │   │
│    ╰─────────────╯   │
│  Purple→Pink Gradient │
└──────────────────────┘
```

**Icon Elements:**
- Rounded document shape with folded corner
- Stylized "W" or abstract letter mark
- AI sparkle/star accent in top-right
- Gradient from Electric Purple to Hot Pink
- Subtle glow effect

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `public/icon-192.png` | Create | Android/PWA icon (192x192) |
| `public/icon-512.png` | Create | High-res PWA/splash icon (512x512) |
| `public/apple-touch-icon.png` | Create | iOS home screen icon (180x180) |
| `public/favicon.svg` | Create | Scalable favicon for modern browsers |
| `src/components/brand/AppIcon.tsx` | Create | Reusable SVG icon component |
| `index.html` | Modify | Add proper icon link tags |
| `capacitor.config.ts` | Modify | Update appName to "WiseResume" |

## Implementation Details

### 1. SVG App Icon Component
Create a reusable React component that renders the app icon as SVG:
- Document shape with rounded corners and folded corner detail
- "W" lettermark or abstract resume lines
- Gradient fill matching brand colors
- AI sparkle overlay
- Multiple size variants (sm, md, lg, xl)

### 2. Static Icon Files
Generate PNG exports for different platforms:
- **favicon.svg**: 32x32 scalable for browser tabs
- **icon-192.png**: Android adaptive icon / PWA manifest
- **icon-512.png**: PWA splash / high-DPI displays
- **apple-touch-icon.png**: iOS home screen

### 3. HTML Meta Tags
Update `index.html` with proper icon references:
```html
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
```

### 4. Capacitor App Name
Update `capacitor.config.ts`:
```typescript
appName: 'WiseResume',
```

### 5. Update AppLogo Component
Refactor `AppLogo.tsx` to use the new `AppIcon` component instead of Lucide's generic `FileText` icon for visual consistency.

## Technical Approach

Since we cannot generate actual PNG files, the implementation will:

1. **Create SVG icon as React component** - Fully customizable and scalable
2. **Create inline SVG favicon** - Works in modern browsers
3. **Provide data URLs** - For PNG fallbacks using base64-encoded SVG
4. **Document icon generation** - Instructions for generating proper PNG icons using the SVG as source

## Visual Specifications

### Colors
- Gradient Start: `#8B5CF6` (Electric Purple)
- Gradient End: `#FF4D8D` (Hot Pink)
- Sparkle: `#00E5FF` (Cyan) with glow
- Background: Transparent

### Shapes
- Main shape: Rounded rectangle with 20% corner radius
- Document fold: Top-right corner triangle
- Letter "W": Stylized with rounded strokes
- Sparkle: 4-point star with soft edges

### Sizing
- Safe zone: 10% padding from edges
- Icon content: Centered within safe zone
- Adaptive icon (Android): Content in center 72%


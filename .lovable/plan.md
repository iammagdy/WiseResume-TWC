

# Replace Current Panda with Reference-Matching Design

## What Changes

Completely rewrite `src/components/auth/AuthPanda.tsx` to match the exact panda design from your reference images.

## Design (matching your images exactly)

The panda from your references has a very specific style:
- **Dark green/black** color scheme (not pure black -- it's `#1A3A2A` dark forest green)
- **Clean outlines** with minimal detail -- clipart/sticker style
- **Large round head** with white face
- **Round ears** sitting directly on top of the head with small leaf/sprig detail
- **Large oval eye patches** -- tilted inward, cute not scary
- **Simple dot eyes** with small highlight -- NOT big bug eyes
- **Small nose** with a gentle smile line
- **Sitting body** with white belly showing
- **Feet splayed outward** showing round paw pads with 3 toe dots each
- **Short stubby arms** on the sides

The second image shows the "covering eyes" pose -- paws come up to the face with fingers slightly spread, which is the password-focused state.

## Animation Behaviors (same interactions)

| State | What Happens |
|-------|-------------|
| Idle | Panda sits looking at user, eyes open, gentle smile |
| Email/Phone focused | Eyes look slightly downward, pupils track text |
| Password focused | Paws come up to cover eyes (matching second reference image) |
| Show password | One paw drops, peeks with one eye |
| Error | Head shakes side-to-side |
| Success | Happy bounce with sparkles |

## Files Changed

| File | Change |
|------|--------|
| `src/components/auth/AuthPanda.tsx` | Complete SVG rewrite to match reference images exactly. Same props interface. |

No changes to `AuthPage.tsx` since the component interface stays identical.

## Technical Details

### Color Palette (from reference images)
- Main body color: `#1A3A2A` (dark forest green, matching the clipart)
- Face/belly: `white`
- Paw pads: `#1A3A2A` with slightly lighter inner pads
- Outlines: `#1A3A2A`
- Eye highlights: `white`

### SVG Structure (200x220 viewBox)
1. Body -- rounded shape with dark sides and white belly center
2. Feet -- oval paws splayed outward with pad details and 3 toe dots
3. Arms/Paws -- dark paths that animate upward to cover face on password
4. Head -- large white circle with dark outline
5. Ears -- dark circles on top of head with small leaf sprigs
6. Eye patches -- large tilted dark ovals (matching clipart proportions)
7. Eyes -- small white circles with tiny dark pupils (NOT big bug eyes)
8. Nose -- small inverted triangle/oval
9. Mouth -- simple curved smile line
10. Success sparkles -- conditional

### Key Design Differences from Current
- Uses dark green (`#1A3A2A`) instead of near-black (`#1A1A2E`)
- Eyes are MUCH smaller -- just small dots inside the patches, not large circles
- Eye patches are larger and more rounded, tilted inward slightly
- Body is wider and rounder with visible white belly
- Feet are more prominent, splayed outward
- Overall simpler, cleaner lines -- clipart style, not detailed SVG
- Hair tuft replaced with small leaf/sprig on top (matching reference)


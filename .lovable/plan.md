

# Fix the Ugly Monkey -- Complete SVG Redesign

## The Problem

The current monkey looks bad because:
- Eyes are oversized and bug-eyed (looks startled/creepy)
- Ears are floating far from the head, disconnected
- Body is a tiny disconnected ellipse below a giant head
- Arms look like weird floating tendrils
- No neck connecting head to body
- Overall proportions feel like a flat alien face, not a cute monkey

## The Fix

Complete rewrite of the SVG paths in `src/components/auth/AuthMonkey.tsx` while keeping the exact same props interface and animation logic. The new design will be:

### New Proportions (200x220 viewBox for more room)
- **Bigger body** with a visible belly and rounded shape
- **Smaller, rounder head** properly proportioned (not 80% of the character)
- **Ears attached to the head** -- overlapping the head circle, not floating in space
- **Smaller, cuter eyes** -- round but not giant, with proper eyelids
- **Visible neck/shoulders** connecting head to body
- **Stubbier, cuter arms** that look like actual monkey arms
- **Hands with simple round paw shapes** instead of weird finger circles
- **A tuft of hair on top** for personality
- **Tail curling out from behind** for monkey identity

### Design Reference
Think of a chibi-style cartoon monkey -- big head relative to body (but not 90%), round features, warm friendly expression. Similar to emoji monkeys or children's book illustrations.

### Key SVG Improvements
- Head radius reduced from 42 to ~35, centered higher
- Ears: semicircles overlapping the head edge (not 50px away)
- Eyes: rx=8, ry=9 instead of rx=11, ry=12 -- much less bug-eyed
- Pupils: r=3.5 instead of r=5
- Body: proper rounded rectangle/ellipse with visible belly patch
- Arms: curved paths that start from the body/shoulders, not from thin air
- Hands: simple oval paws
- Add a cute curly tail on one side
- Add hair tuft (3 small arcs on top of head)

### Animation Logic (unchanged)
All the existing animation logic stays exactly the same:
- `pupilOffsetX/Y` for eye tracking
- `handY`/`leftHandY`/`rightHandY` for covering eyes
- `eyesClosed` and `leftEyeScaleY` for peeking
- `smilePath` for expressions
- Shake and success animations via `controls`

Only the SVG drawing coordinates and shapes change.

## Files Changed

| File | Change |
|------|--------|
| `src/components/auth/AuthMonkey.tsx` | Complete rewrite of SVG paths and shapes. Same component interface, same animation logic, new better-looking monkey design. |

No other files need changes since the props interface remains identical.


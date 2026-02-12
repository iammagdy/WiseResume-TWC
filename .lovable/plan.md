

# 3D Holographic Developer Credit Card

## What Changes
The developer credit card will get a dramatic 3D floating effect applied to the card itself (not the buttons or other elements). The card will appear to hover above the page with depth, perspective tilt, and ambient lighting effects.

## Visual Effects (Card Only)

- **3D Perspective Tilt**: The card will have a continuous slow auto-tilt animation that rotates the card on the X and Y axes, making it look like it's floating in 3D space
- **Elevated Shadow**: A large, colored drop shadow beneath the card that shifts with the tilt to sell the 3D illusion
- **Holographic Light Sweep**: A reflective light beam that sweeps across the card surface, simulating a holographic foil effect
- **Depth Layers**: The card background gets a layered gradient that shifts with the tilt to create parallax depth
- **Glow Underlight**: A soft colored glow underneath the card that pulses, making it look like it's lit from below

## What Stays the Same
- Contact button styling (no 3D on buttons)
- Website link below the card
- Avatar with orbit ring
- Name shimmer and sparkle effects
- All existing content layout

## Technical Details

### Files Modified

**`src/components/settings/DeveloperCreditCard.css`** -- Add 3D card effects:

- Add `perspective: 800px` on `.dev-card-wrapper` to enable 3D context
- Add `transform-style: preserve-3d` on `.dev-card`
- New `dev-3d-tilt` keyframe animation: slow continuous rotation on X/Y axes (subtle, around 3-5 degrees)
- New `dev-holographic-sweep` overlay: a diagonal light beam that sweeps across the card every few seconds
- Enhanced box-shadow that animates in sync with the tilt for realistic depth
- A `::after` pseudo-element on `.dev-card` for the holographic light reflection
- Animated underside glow shadow using `filter: drop-shadow`

**`src/components/settings/DeveloperCreditCard.tsx`** -- Add a holographic sweep overlay div inside `.dev-card`:

- Add a new `<div className="dev-holo-sweep" />` element inside the card for the light sweep effect
- No changes to buttons or links

### Key CSS Additions

```css
/* 3D perspective context */
.dev-card-wrapper {
  perspective: 800px;
}

/* 3D card with auto-tilt */
.dev-card {
  transform-style: preserve-3d;
  animation: dev-3d-tilt 8s ease-in-out infinite;
}

/* Slow floating 3D tilt */
@keyframes dev-3d-tilt {
  0%   { transform: rotateX(2deg) rotateY(-2deg) translateZ(0); }
  25%  { transform: rotateX(-3deg) rotateY(3deg) translateZ(10px); }
  50%  { transform: rotateX(2deg) rotateY(2deg) translateZ(5px); }
  75%  { transform: rotateX(-2deg) rotateY(-3deg) translateZ(10px); }
  100% { transform: rotateX(2deg) rotateY(-2deg) translateZ(0); }
}

/* Holographic light sweep across card */
.dev-holo-sweep {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    105deg,
    transparent 40%,
    rgba(255,255,255,0.12) 45%,
    rgba(255,255,255,0.06) 55%,
    transparent 60%
  );
  background-size: 250% 100%;
  animation: dev-sweep 5s ease-in-out infinite;
  pointer-events: none;
  border-radius: inherit;
}

/* Animated depth shadow synced with tilt */
.dev-card {
  box-shadow:
    0 20px 60px -15px hsl(var(--primary) / 0.3),
    0 10px 30px -10px rgba(0,0,0,0.4);
}
```

This creates a premium, eye-catching 3D holographic card that floats and reflects light -- all purely CSS, no JavaScript mouse tracking needed, works great on mobile.

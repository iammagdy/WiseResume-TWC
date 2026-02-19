

# Add Staggered Animation to Developer Card Content

## What It Does

The avatar, name/title, and buttons will animate in one after another with a slight delay between each, creating a cascading reveal effect as the card scrolls into view. When scrolling away, they fade out together.

## Approach

Use framer-motion's `staggerChildren` on the content container, and wrap each content group (avatar, info text, buttons) in a `motion.div` with shared animation variants.

## Technical Details

### File: `src/components/settings/DeveloperCreditCard.tsx`

Define animation variants at the top of the component:

```tsx
const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.15 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" }
  }
};
```

Then apply them to the content:

1. Change `<div className="dev-card-content">` to a `motion.div` with `variants={containerVariants}`, `initial="hidden"`, and `whileInView="visible"` (with `viewport={{ once: false, amount: 0.3 }}`)

2. Wrap these three groups in `motion.div` with `variants={itemVariants}`:
   - **Avatar container** (`dev-avatar-container`) -- animates in first
   - **Name + title** (`dev-name` and `dev-title`) -- animates in second
   - **Buttons + website link** (`dev-btn-row` and `dev-website-link`) -- animates in third

### Stagger Timeline

```text
0.0s  --> Avatar fades in + slides up
0.15s --> Name & title fade in + slide up
0.30s --> Buttons & website link fade in + slide up
```

### No changes to:
- CSS file
- Any existing animations (sparkles, particles, orbit, holographic sweep, 3D tilt)
- Component props or functionality (haptics, click handlers, links)
- The outer `motion.div` wrapper scroll animation (keeps working as the card-level entrance)

| File | Change |
|---|---|
| `DeveloperCreditCard.tsx` | Add stagger variants, wrap avatar/info/buttons in `motion.div` children |


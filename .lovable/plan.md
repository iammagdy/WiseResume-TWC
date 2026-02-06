

# Fix Double Container Issue - ProfileCard Button

## Problem Identified

The current structure shows two containers:
1. **Outer container** (`.pc-user-info`) - Has background, border, border-radius, and padding
2. **Inner button** (`.pc-contact-btn`) - Has its own pill shape with glow

This creates an awkward nested appearance where a small pill button sits inside a larger rounded container.

---

## Solution: Make the Container Invisible

Instead of removing the container (which helps with positioning), make it invisible and let the button fill it entirely:

### Option: Transparent Container with Full-Width Button

Remove the visible styling from `.pc-user-info` and make the button fill the container width:

```css
/* Container becomes invisible positioning wrapper */
.pc-user-info {
  background: transparent;      /* Remove background */
  backdrop-filter: none;        /* Remove blur */
  border: none;                 /* Remove border */
  padding: 0;                   /* Remove padding */
}

/* Button takes full width with proper styling */
.pc-contact-btn {
  width: 100%;
  padding: 12px 24px;           /* Larger padding */
  font-size: 12px;              /* Slightly larger text */
}
```

---

## Visual Result

**Before (current - two containers):**
```
┌─────────────────────────────┐  ← Outer container with bg
│    ╭──────────────────╮     │
│    │   Contact Me     │     │  ← Inner pill button
│    ╰──────────────────╯     │
└─────────────────────────────┘
```

**After (single full-width button):**
```
╭───────────────────────────────╮
│         Contact Me            │  ← One clean button
╰───────────────────────────────╯
```

---

## File Changes

### src/components/settings/ProfileCard.css

| Location | Change |
|----------|--------|
| Lines 293-310 (`.pc-user-info`) | Remove background, border, backdrop-filter, padding |
| Lines 333-350 (`.pc-contact-btn`) | Add `width: 100%`, increase padding and font-size |

### Specific CSS Changes:

**`.pc-user-info` (lines 293-310):**
```css
.pc-user-info {
  position: absolute;
  --ui-inset: 16px;
  bottom: var(--ui-inset);
  left: var(--ui-inset);
  right: var(--ui-inset);
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  /* Remove these: */
  /* background: rgba(255, 255, 255, 0.1); */
  /* backdrop-filter: blur(30px); */
  /* border: 1px solid rgba(255, 255, 255, 0.1); */
  /* border-radius: calc(...); */
  /* padding: 10px 12px; */
  pointer-events: auto;
}
```

**`.pc-contact-btn` (lines 333-350):**
```css
.pc-contact-btn {
  width: 100%;                    /* Full width of container */
  border: 1px solid rgba(255, 255, 255, 0.35);
  border-radius: 14px;            /* Match card radius style */
  padding: 12px 24px;             /* Larger touch target */
  font-size: 12px;                /* Slightly larger text */
  font-weight: 600;
  color: #fff;
  cursor: pointer;
  transition: all 0.2s ease;
  backdrop-filter: blur(30px);    /* Move blur to button */
  background: linear-gradient(135deg, rgba(125, 190, 255, 0.25) 0%, rgba(125, 190, 255, 0.1) 100%);
  box-shadow: 
    0 0 15px rgba(125, 190, 255, 0.3),
    0 0 30px rgba(125, 190, 255, 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  pointer-events: auto !important;
  animation: pc-btn-glow 2s ease-in-out infinite;
}
```

---

## Summary

This approach:
- Keeps the positioning container but makes it invisible
- Creates a single, clean full-width button
- Maintains the glow and animation effects
- Looks more professional and intentional
- Better touch target on mobile


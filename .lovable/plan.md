
## Fix Template Preview Cards - Remove Heavy Borders

### Overview
The template preview cards on the landing page currently use `border border-border/30 bg-white` which creates heavy black frames/borders, especially visible in the dark theme. The cards should have subtle depth and look like floating cards, not framed pictures.

### Root Cause Analysis
- **Current styling** (line 197): `className="aspect-[612/792] rounded-lg overflow-hidden border border-border/30 bg-white mb-1.5 transition-shadow hover:shadow-lg"`
- **Issue**: 
  - `bg-white` creates a harsh contrast in dark mode
  - `border border-border/30` creates a visible frame effect
  - The combination makes cards look clipped or heavily framed
  - No shadow on non-hover state creates flat appearance

### Solution Approach
Replace heavy borders with subtle shadow and transparency styling that matches the design system.

### File Changes

**File: `src/pages/Index.tsx` (line 197)**

**Current:**
```typescript
<div className="aspect-[612/792] rounded-lg overflow-hidden border border-border/30 bg-white mb-1.5 transition-shadow hover:shadow-lg">
```

**Updated:**
```typescript
<div className="aspect-[612/792] rounded-lg overflow-hidden bg-white/90 shadow-md mb-1.5 transition-all hover:shadow-xl hover:scale-105">
```

### Technical Details

**Changes:**
1. **Remove border**: Remove `border border-border/30` - eliminates the heavy frame effect
2. **Adjust background**: Change `bg-white` to `bg-white/90` - adds subtle transparency so the card blends better while maintaining white preview content
3. **Add shadow**: Add `shadow-md` for subtle depth at rest state
4. **Enhance hover**: Change `hover:shadow-lg` to `hover:shadow-xl` for more pronounced depth on interaction
5. **Add scale animation**: Change `transition-shadow` to `transition-all` and leverage the existing `whileHover={{ scale: 1.05 }}` framer-motion hook (already on parent)

### Why This Works
- **No borders**: Removes the "framed picture" aesthetic
- **Transparency**: `bg-white/90` ensures the card is readable while appearing lighter and less heavy
- **Shadow depth**: Shadows create floating effect rather than frames
- **Consistency**: Matches the design system's "cosmic glass UI" approach with subtle depth
- **Accessibility**: Better contrast without looking harsh
- **Performance**: Only uses CSS transforms (GPU-accelerated), no DOM changes

### Result
Cards will appear as floating, lightweight elements with subtle depth and smooth hover interactions. The preview content remains clear and readable while the overall appearance feels modern and clean.


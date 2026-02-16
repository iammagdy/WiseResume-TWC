

## Add Wise AI Logo to Landing Page

### What will change
Replace the current `AppIcon` component in the landing page hero section with the uploaded Wise AI logo image.

### Steps
1. Copy the uploaded image `user-uploads://Wise_Ai_2.png` to `src/assets/wise-ai-logo.png`
2. Update `src/pages/Index.tsx`:
   - Import the new logo image
   - Replace the `<AppIcon size={120} />` in the hero section with an `<img>` tag using the new logo
   - Keep the existing glow effect and animations around it
   - Size it appropriately (around 120-140px) to match the current hero layout

### Technical Details
- The image will be imported as an ES6 module from `src/assets/` for proper bundling
- The existing `motion.div` wrapper with the glow pulse effect will be preserved
- The `AppIcon` import can be removed if no longer used elsewhere in this file

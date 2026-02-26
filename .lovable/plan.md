

## Replace App Logo with New WebP Image

### What will change
The current app logo (`wise-ai-logo.png`) renders incorrectly and is heavy. I will replace it with the new uploaded WebP logo across all components and the splash screen.

### Steps

1. **Copy the new logo** into `src/assets/wise-ai-logo.webp` (replacing the existing webp file)

2. **Update `AppIcon.tsx`** -- the central logo component used by the splash screen, home hero, loading spinner, and more:
   - Change the import from `wise-ai-logo.png` to `wise-ai-logo.webp`

3. **Update `Footer.tsx`** -- uses its own direct PNG import:
   - Change the import from `wise-ai-logo.png` to `wise-ai-logo.webp`

4. **Update `Index.tsx` (landing page)** -- imports `wise-ai-logo-small.png`:
   - Change the import to `wise-ai-logo.webp`

5. **Update `QRGeneratorSheet.tsx`** -- imports `wise-ai-logo.png`:
   - Change the import to `wise-ai-logo.webp`

6. **Update `JobMatchScore.tsx`** -- imports `wise-ai-logo.png`:
   - Change the import to `wise-ai-logo.webp`

### Why this fixes the splash screen
The `AnimatedSplash` component renders `<AppIcon>` which imports `wise-ai-logo.png`. By switching `AppIcon` to the new WebP file, the splash screen will automatically display the correct, lighter logo without any other changes needed.

### Technical details
- All 5 files importing the old PNG will be updated to import the single new WebP asset
- WebP is significantly lighter than PNG, improving load time
- No component logic changes needed -- only import paths change
- The `AppIcon` component already handles load transitions (`opacity` fade-in on `onLoad`), so the new image will render smoothly


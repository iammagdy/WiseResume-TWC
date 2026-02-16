

## Generate a Professional "Wise AI" Logo

### Concept
Using AI image generation (Gemini image model), I will create a minimal, professional logo that combines:
- **Half brain / half circuit board** motif (as in your reference)
- **"Wise AI" text** integrated into the design
- **App theme colors**: Red (hue 355) primary with dark background compatibility
- **Minimal style**: Clean lines, no excessive detail, works at small sizes (bottom tab bar) and large sizes (AI Studio header)

### Approach
1. **Generate the logo** using the `google/gemini-2.5-flash-image` model via a backend function, providing a detailed prompt describing: minimal brain-circuit hybrid, "Wise AI" text, red primary color with cyan/white accents matching the app icon's sparkle, transparent-friendly design
2. **Save the generated image** as `src/assets/wise-ai-icon.png` (replacing the current one)
3. **Verify it renders** in the bottom tab bar and AI Studio page

### Design Direction
- Symmetrical brain split: left side = organic brain curves, right side = geometric circuit traces
- "WISE AI" centered text with a small sparkle on the "i" (matching your reference)
- Red (#E53E3E matching primary hue 355) for the brain, with subtle gray/silver circuit lines
- Clean edges so it reads well at 40x40px in the tab bar
- No background fill (works on both dark and light surfaces)

### Technical Steps
1. Call AI image generation with the design prompt
2. Save the result to `src/assets/wise-ai-icon.png`
3. No code changes needed -- the existing BottomTabBar and AI Studio already reference this file

### What I Will Ask You After
- If the first generation needs adjustments (color, proportions, text placement), I can regenerate with refined prompts
- Whether you want additional sizes/variants (e.g., a text-free version for very small contexts)


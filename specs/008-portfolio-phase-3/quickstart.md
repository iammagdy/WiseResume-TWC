# Quickstart: Portfolio Phase 3

## Setup
1. Ensure you are on the `008-portfolio-phase-3` branch.
2. Run `npm install` if you haven't already.

## Verification Steps

### 1. Social Link Normalization
1. Open the Portfolio Editor (`/portfolio`).
2. Go to the **More** tab.
3. Enter a LinkedIn URL like `linkedin.com/in/testuser` (without `https://`).
4. Click outside the input (blur) or click **Save**.
5. Verify that the URL automatically updates to `https://linkedin.com/in/testuser`.
6. Open the public portfolio and click the LinkedIn icon; it should open the correct external link.

### 2. Portfolio Summary Rendering
1. Open the Portfolio Editor.
2. Go to the **Content** tab.
3. Enter a high-impact phrase in the **Portfolio Summary** field (e.g., "Transforming complex data into actionable insights for Fortune 500 companies.").
4. Save the portfolio.
5. View the public portfolio (`/p/[username]`).
6. Verify the summary appears prominently below the Hero section and above the Stats/Experience sections.

### 3. PDF Export Fidelity
1. Open the public portfolio.
2. Click **Save as PDF** in the footer.
3. Inspect the generated PDF:
   - Verify that all text is readable.
   - Verify no "scanline" or "glow" effects from the `neon-cyber` theme obscure the text (these should be flattened/simplified in the PDF).
   - Verify that the layout remains single-column and centered as expected.

### 4. Design Preview Isolation
1. Select a theme with dark background and vibrant colors (e.g., `neon-cyber`).
2. Go to the **Design** tab.
3. Observe the mini-previews in the **Theme** list.
4. Verify that the previews look exactly as intended (mini-versions of the themes) and are not getting "polluted" by the active page's theme styles (e.g., text color bleeding).

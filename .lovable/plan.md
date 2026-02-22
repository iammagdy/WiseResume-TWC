

# Fix Logo Progressive Loading in Spinner

## Problem
The logo image (`/favicon.png`) in the HTML fallback spinner loads progressively over the network, appearing in stages (25% -> 50% -> 100%). This creates an unprofessional "building up" effect instead of the logo appearing all at once.

## Root Cause
The browser renders PNG images as data arrives. Since the spinner displays immediately but the image takes time to download, the user sees partial rendering.

## Solution

### 1. Hide the logo until fully loaded (`index.html`)

Make the `<img>` invisible by default (`opacity: 0`), then reveal it instantly once fully loaded using an inline `onload` handler with a smooth CSS transition:

```html
<img src="/favicon.png" alt="" width="40" height="40"
  style="position:relative; opacity:0; transition:opacity 0.2s ease-in;
         filter:drop-shadow(0 0 24px rgba(220,38,38,0.7));"
  onload="this.style.opacity='1'" />
```

This ensures the logo is completely downloaded and decoded before it becomes visible -- no partial rendering.

### 2. Preload the favicon image (`index.html` head)

Add a `<link rel="preload">` tag in the `<head>` so the browser starts fetching the image early, before it even encounters the `<img>` tag:

```html
<link rel="preload" href="/favicon.png" as="image" />
```

This reduces the delay between spinner appearing and logo appearing.

### 3. Fix the React `PageLoadingSpinner` too (`PageLoadingSpinner.tsx`)

The React spinner uses `AppIcon` which loads `wise-ai-logo.png` -- same progressive loading issue. Update `AppIcon` to hide the image until loaded:

- Add an `onLoad` callback to set visibility
- Use React state (`useState`) to track loaded status
- Render with `opacity: 0` until loaded, then transition to `opacity: 1`

## Result
- Logo appears instantly and fully rendered (no partial/progressive stages)
- Preloading ensures minimal delay between spinner and logo appearing
- Both the HTML fallback and React spinner are fixed
- No changes to the actual logo image file


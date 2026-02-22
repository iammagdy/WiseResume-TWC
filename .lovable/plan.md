

# Mobile APK Comprehensive Analysis -- Issues and Fixes

After analyzing the full codebase for native APK (Capacitor Android WebView) compatibility, here are the issues categorized by severity.

---

## CRITICAL -- Functional Breakage on Real Devices

### 1. Capacitor Config Missing Hot-Reload Server URL
**File**: `capacitor.config.ts`
The config lacks the `server.url` field for development. While fine for production builds, this means developers building the APK locally can't hot-reload from the Lovable sandbox. The `server.cleartext` flag is also missing, which blocks HTTP connections on Android 9+ (API 28+).

**Fix**: Add `server` block with the sandbox URL for development and `cleartext: true` for mixed content. For production builds, remove the `server.url` so the app loads from the bundled `dist/` folder.

### 2. `backdrop-filter` / `backdrop-blur` Performance on Android WebView
**288 occurrences across 35 files** use `backdrop-blur-sm`, `backdrop-blur-md`, `backdrop-blur-xl`. On mid/low-end Android devices (Snapdragon 400/600 series), `backdrop-filter: blur()` is extremely expensive in WebView, causing:
- Janky scrolling (dropped frames)
- Visible lag when opening sheets/modals
- Battery drain

**Files affected**: `BottomTabBar.tsx`, `AppShell.tsx`, `InterviewPage.tsx` (header, controls, transcript bubbles), all `glass-*` utility classes in `index.css`, every sheet overlay, popover, and tooltip.

**Fix**: Add a CSS media query or JS-based detector to disable `backdrop-filter` on low-end devices:
```css
@media (prefers-reduced-transparency: reduce), (max-device-memory: 4) {
  .glass, .glass-card, .glass-surface, .glass-elevated, .glass-header {
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
    background: hsl(var(--card) / 0.95); /* opaque fallback */
  }
}
```
Also add a Capacitor-specific override in `index.css` using a body class set in `main.tsx`:
```typescript
if (Capacitor.isNativePlatform()) document.body.classList.add('native-app');
```
```css
body.native-app .glass, body.native-app .glass-surface { backdrop-filter: none; background: hsl(var(--card) / 0.95); }
```

### 3. OAuth Redirect URL Mismatch on APK
**File**: `src/lib/socialAuth.ts`
The OAuth redirect URL for native is hardcoded to `https://localhost/auth/callback` (line 13). This only works if the Capacitor app has configured a custom URL scheme or Universal Links. Without the proper `applinks` / `assetlinks.json` setup, Google/Apple OAuth will fail silently on the APK.

**Fix**: 
- Use the app's custom scheme: `com.wiseresume.app://auth/callback`
- Configure `android/app/src/main/AndroidManifest.xml` with intent filters for the callback URL
- Add `assetlinks.json` to the server for Google verification

### 4. `window.open()` Blocked in Android WebView
**File**: `src/pages/PortfolioEditorPage.tsx` line 782
```typescript
window.open(actualPortfolioUrl, '_blank', 'noopener,noreferrer')
```
In Android WebView, `window.open` with `_blank` is blocked by default. The `openExternal` utility exists but isn't used here.

**Also affects**: Multiple places where `window.open` is used without the `openExternal` wrapper.

**Fix**: Replace all `window.open(..., '_blank')` calls with the `openExternal()` utility from `src/lib/openExternal.ts`, which correctly uses `_system` on native.

### 5. `html2canvas` Unreliable in WebView
**File**: `src/lib/pdfGenerator.ts`, `src/components/portfolio/qr/QRGeneratorSheet.tsx`
`html2canvas` has known issues in Android WebView:
- Cross-origin font loading failures (Google Fonts)
- `foreignObject` SVG rendering gaps
- Canvas taint errors on external images

**Fix**: Add error boundaries around PDF generation with user-facing retry logic. Pre-load fonts as base64 data URLs before capture. Add a WebView-specific timeout increase (from default 5s to 15s).

---

## HIGH -- UI Overlapping and Layout Issues

### 6. BottomTabBar Rounded Corners Create Dead Zones
**File**: `src/components/layout/BottomTabBar.tsx` line 143
```
"fixed bottom-0 left-0 right-0 z-50 ... rounded-3xl"
```
The `rounded-3xl` (24px border radius) on the bottom tab bar means the corners are visually cut off, but the underlying `fixed bottom-0 left-0 right-0` still occupies the full width. On real phones, this creates:
- Visual gap between the rounded corner and the screen edge where the background shows through
- On phones with gesture navigation bars, the bottom safe area + rounded corners + gesture bar create a confusing visual stack

**Fix**: Remove `rounded-3xl` from the nav and use `rounded-t-2xl` instead (only round the top). Add `mx-2 mb-1` for a floating tab bar look if rounded corners are desired, and ensure `pb-safe` accounts for the margin.

### 7. Multiple Fixed Elements Competing for Z-Index
The app has many `fixed` positioned elements that can overlap on small screens:
- `BottomTabBar` at z-50
- `FloatingCreateButton` at z-50, bottom-[7rem]
- `AddSectionFAB` at z-40, bottom calc(5rem + safe-area)
- `ProofreadButton` at z-40, fixed bottom
- `InstallPrompt` at z-40, bottom-[5.5rem]
- `AIIntroTooltip` at z-[60], bottom-24
- `AnswerScoreSheet` at z-50, fixed bottom
- `FloatingViewLivePill` at z-40, bottom calc(7rem + safe-area)
- `ChatWidget` at z-40, fixed bottom-6

On a phone with 640px viewport height, these elements can stack and obscure content.

**Fix**: Create a z-index registry and stacking-context map. Ensure only ONE floating action is visible per screen. Use `createPortal` consistently and gate visibility based on the current route.

### 8. Editor Header Overflow on Small Screens
**File**: `src/pages/EditorPage.tsx` lines 975-1108
The editor header contains: back button + title + offline indicator + (undo/redo on sm+) + template button + chat button. On a 320px screen, the title with `max-w-[55vw]` (176px) plus all the buttons exceeds the available width, causing buttons to be pushed off-screen or overlapping.

**Fix**: Reduce `max-w-[55vw]` to `max-w-[40vw]` on xs screens. Use `gap-1` instead of `gap-2` in the mobile header. Consider hiding the template button label on very narrow screens.

### 9. Interview Controls Bottom Bar Clips Below Safe Area
**File**: `src/pages/InterviewPage.tsx` line 398
```
className="shrink-0 border-t border-border/20 bg-card/50 backdrop-blur-xl px-4 py-4 space-y-3 pb-safe"
```
The `pb-safe` adds `max(16px, env(safe-area-inset-bottom))`. But on Android devices with gesture navigation, the safe area inset can be 48px+, and the entire control bar (toggle + buttons + text input) becomes very tall, pushing the interview toggle partially off the visible area.

**Fix**: Use `pb-[max(12px,env(safe-area-inset-bottom))]` (reduce the 16px minimum) and add `max-h-[40vh]` with `overflow-y-auto` to the control bar to prevent it from consuming more than 40% of the viewport.

### 10. Countdown Overlay Overlaps Interview Controls
**File**: `src/pages/InterviewPage.tsx` lines 448-466
The countdown numbers are rendered inside the controls `flex` container with `gap-6`. When the countdown appears, it pushes the Replay and Skip buttons apart or overlaps them, because it's not absolutely positioned.

**Fix**: Change the countdown to `absolute` positioning relative to the controls container, centered over the InterviewToggle.

---

## MEDIUM -- Functional Issues

### 11. SpeechRecognition Not Available in Some Android WebViews
The `useVoiceInterview` hook uses the Web Speech API (`webkitSpeechRecognition`), which requires Google Chrome's speech recognition service. In a Capacitor WebView that doesn't have Google Play Services or uses a non-Chrome WebView engine (e.g., older Samsung Internet WebView), this API is unavailable.

**Fix**: Add a pre-check in `InterviewSetup` that tests for `window.SpeechRecognition || window.webkitSpeechRecognition` availability. If unavailable, show a message explaining the user needs to enable the feature or use the text input mode by default.

### 12. Keyboard Resize Mode May Cause Layout Jumps
**File**: `capacitor.config.ts` line 37
```json
Keyboard: { resize: 'body', resizeOnFullScreen: true }
```
`resize: 'body'` resizes the entire WebView when the keyboard opens. Combined with `h-[100dvh]` in `AppShell` and the keyboard-aware scroll hook, this can cause double-resize effects (the CSS `100dvh` already accounts for keyboard, plus Capacitor physically resizes the viewport).

**Fix**: Change to `resize: 'none'` and rely entirely on the CSS `100dvh` + `useKeyboardAwareScroll` hook for keyboard handling. This prevents the double-adjustment.

### 13. PDF Export Uses `html2canvas` Which Blocks Main Thread
**File**: `src/lib/pdfGenerator.ts`
PDF generation runs `html2canvas` synchronously on the main thread, which freezes the UI for 3-10 seconds on mobile devices. No loading indicator is shown during this time.

**Fix**: Wrap the `html2canvas` call in a `requestIdleCallback` or use `OffscreenCanvas` where supported. Show a full-screen loading overlay with progress during PDF generation.

### 14. `window.speechSynthesis` Issues on Android WebView
**File**: `src/pages/InterviewPage.tsx` lines 406-414
The interview replay button uses `window.speechSynthesis` which has known bugs in Android WebView:
- Voices list is empty until a delayed `voiceschanged` event
- `speak()` may silently fail on first call

**Fix**: Pre-load voices in `useEffect` on mount with a retry, and add a `voiceschanged` event listener. Show a toast if synthesis is unavailable.

---

## MEDIUM -- UI Polish

### 15. `pb-safe` Minimum 16px Creates Excessive Bottom Spacing on Non-Notch Devices
**File**: `src/index.css` line 522
```css
.pb-safe { padding-bottom: max(16px, env(safe-area-inset-bottom)); }
```
On devices without notches (most mid-range Androids), `env(safe-area-inset-bottom)` is 0, so every element with `pb-safe` gets 16px bottom padding. This stacks with the BottomTabBar's own padding, creating ~32px of dead space at the bottom.

**Fix**: Reduce the minimum to `max(8px, env(safe-area-inset-bottom))` or use `env(safe-area-inset-bottom, 0px)` with no minimum for elements above the tab bar.

### 16. Double-Tap Zoom Not Fully Disabled
**File**: `index.html` line 5
```
maximum-scale=5.0, user-scalable=yes
```
On Android WebView, allowing user-scalable means double-tap triggers a 300ms delay on all taps (despite `touch-manipulation`). While modern browsers handle this, older WebViews may still exhibit the delay.

**Fix**: For the APK specifically, change to `maximum-scale=1.0, user-scalable=no` since the app handles its own zoom for the resume preview. This eliminates the 300ms tap delay entirely.

### 17. Font Loading Causes FOUT (Flash of Unstyled Text)
**File**: `index.html` line 16
Google Fonts are loaded via `<link rel="preload" ... as="style">` with `display=swap`. On first APK load (no cache), the user sees system fonts for 1-2 seconds before Google Fonts load. In a native app context, this feels unpolished.

**Fix**: Bundle the fonts locally in `public/fonts/` and load them via `@font-face` in CSS. This ensures instant availability without network dependency.

### 18. Sonner Toast Positioning Conflicts with Floating Elements
Toasts appear at the top of the screen by default, but on mobile they can overlap with the header and safe-area padding. On Android with gesture navigation, bottom-positioned toasts may overlap with the tab bar.

**Fix**: Configure Sonner's `toastOptions.className` with explicit positioning that accounts for the header height and safe area. Use `top-[calc(env(safe-area-inset-top)+56px)]`.

---

## LOW -- Quality of Life

### 19. No Network Error Recovery UI
When the APK loses network connectivity, API calls to Supabase fail silently or show generic toasts. There's an `OfflineBanner` but no retry mechanism for failed operations.

**Fix**: Add automatic retry with exponential backoff for failed Supabase queries. Show an inline "Retry" button on failed network operations.

### 20. Bundle Size Could Impact APK First Load
The app loads `framer-motion`, `recharts`, `pdf-lib`, `pdfjs-dist`, `tesseract.js`, `mammoth`, `docx`, `qr-code-styling`, and `react-image-crop`. While manual chunks help, the initial JS parse time on mid-range phones can be 3-5 seconds.

**Fix**: Audit which chunks are loaded on the initial route. Ensure `tesseract.js`, `mammoth`, `docx`, `qr-code-styling`, and `react-image-crop` are only loaded when their features are actually used (they should be lazy-loaded behind `import()`).

---

## Summary Table

| # | Issue | Severity | Impact |
|---|-------|----------|--------|
| 1 | Missing Capacitor server config | Critical | Dev workflow broken |
| 2 | backdrop-blur kills performance | Critical | Laggy scrolling, janky UI |
| 3 | OAuth redirect URL wrong for APK | Critical | Login broken on native |
| 4 | window.open blocked in WebView | Critical | External links don't work |
| 5 | html2canvas unreliable in WebView | Critical | PDF/QR export fails |
| 6 | Tab bar rounded corners dead zones | High | Visual gaps, tap issues |
| 7 | Fixed element z-index stacking | High | Buttons overlapping |
| 8 | Editor header overflow on 320px | High | Buttons pushed off-screen |
| 9 | Interview controls clip below safe area | High | Controls partially hidden |
| 10 | Countdown overlay mispositioned | High | UI elements overlap |
| 11 | SpeechRecognition unavailable | Medium | Interview broken on some devices |
| 12 | Keyboard double-resize | Medium | Layout jumps |
| 13 | PDF blocks main thread | Medium | UI freezes 3-10 seconds |
| 14 | speechSynthesis bugs | Medium | Replay/TTS fails silently |
| 15 | pb-safe excessive on non-notch | Medium | Wasted space |
| 16 | Double-tap zoom delay | Medium | Sluggish tap response |
| 17 | FOUT from Google Fonts | Medium | Flash of unstyled text |
| 18 | Toast positioning conflicts | Medium | Toasts hidden behind elements |
| 19 | No network retry | Low | Operations fail silently |
| 20 | Bundle size parse time | Low | Slow cold start |

## Recommended Fix Order

1. **Fix #2** (backdrop-blur) -- biggest single improvement for native feel
2. **Fix #3 + #4** (OAuth + window.open) -- login and external links must work
3. **Fix #6 + #7** (tab bar + z-index) -- visual overlap issues
4. **Fix #12** (keyboard resize) -- layout stability
5. **Fix #8 + #9 + #10** (header/controls overflow) -- UI clipping
6. **Fix #16 + #17** (tap delay + fonts) -- polish for native feel
7. Everything else in priority order

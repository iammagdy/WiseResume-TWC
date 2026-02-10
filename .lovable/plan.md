

# Fix iOS Compatibility and Improve PDF Import Parsing

## Issue 1: Auth State Stuck (Causes Infinite Loading)

### Root Cause
The `markResolved` function with a `resolved` flag in `AuthContext.tsx` was introduced to fix the timeout issue, but it has a critical side effect: after the first resolution, `onAuthStateChange` is completely ignored. This means:
- Signing out does not update the UI (user stays "logged in")
- Token refreshes are ignored
- Signing in on another tab is not reflected

### Fix (`src/contexts/AuthContext.tsx`)
- Keep the `resolved` flag ONLY for the initial loading state (to stop showing skeletons)
- After initial resolution, let `onAuthStateChange` continue updating user/session state normally
- Keep the 5-second safety timeout and `.catch()` for the initial load
- The timeout should only control `loading: false`, not block future auth events

```text
Before: markResolved() blocks ALL future auth state changes
After:  resolved flag only controls initial loading=false, onAuthStateChange always updates user/session
```

## Issue 2: PDF Parsing - Wrong Name / Missing Data

### Root Cause
The client-side `pdfjs-dist` text extraction works well for digital PDFs but has issues with:
1. PDFs where text items lack proper transforms (two-column/creative layouts)
2. Text ordering issues in sidebar-style resumes where the name appears in a sidebar
3. The quality threshold (50 chars minimum) is too low -- some PDFs extract garbage text that passes the check but confuses the AI

### Fix (`src/lib/pdf/textExtractor.ts`)
- Increase the quality check threshold: require at least 3 letter-words (not just any letters) to confirm good extraction
- Add a secondary quality signal: check if extracted text has reasonable word count (at least 10 words)
- Log the first 200 chars of extracted text for debugging

### Fix (`supabase/functions/parse-resume/index.ts`)
- Strengthen the system prompt name detection rules with additional guidance:
  - The name is almost always on the FIRST LINE of the extracted text
  - If the first line contains "Contact" or similar headers, skip it and look at line 2-3
  - Never use email addresses, phone numbers, or URLs as names
- Add a post-processing validation: if `fullName` looks like a section header or contains "@", clear it and try to extract from the first few lines of the raw text

## Issue 3: iOS-Specific Compatibility

### Current State (Already Good)
- `viewport-fit=cover` is set
- Safe area insets are applied via CSS `env(safe-area-inset-*)`
- `apple-mobile-web-app-capable` and `black-translucent` status bar are configured
- `100dvh` is used for dynamic viewport height

### Remaining iOS Fix (`src/lib/pdf/ocrExtractor.ts`)
- On iOS Safari, large canvas rendering can crash or produce blank results due to memory limits
- Cap canvas dimensions to 2048x2048 for OCR (iOS WebKit limit is ~4096px but 2048 is safer)
- Add `willReadFrequently: true` to `getContext('2d')` for better iOS performance

### Fix (`src/index.css`)
- Ensure `-webkit-overflow-scrolling: touch` is applied for smooth scrolling on iOS
- Add `overscroll-behavior: none` on the body to prevent iOS rubber-band bounce interfering with the app

## Files Changed

| File | Change |
|------|--------|
| `src/contexts/AuthContext.tsx` | Fix `resolved` flag to only control initial loading, not block future auth events |
| `src/lib/pdf/textExtractor.ts` | Improve extraction quality check with word-count validation and debug logging |
| `supabase/functions/parse-resume/index.ts` | Strengthen name detection in AI prompt and add post-processing name validation |
| `src/lib/pdf/ocrExtractor.ts` | Cap canvas size for iOS, add `willReadFrequently` hint |
| `src/index.css` | Add iOS scrolling fixes (`-webkit-overflow-scrolling`, `overscroll-behavior`) |


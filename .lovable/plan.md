

## WiseResume Production Readiness Audit Report

---

### PART 1: CODE CLEANUP

#### Console Statements
| Type | Count | Files | Action |
|------|-------|-------|--------|
| `console.log()` | 4 | 3 files (pdfParser, textExtractor, test file) | All guarded by `import.meta.env.DEV` -- acceptable. Remove from test file. |
| `console.error()` | ~40 | 39 files | All in catch blocks -- keep as-is (critical error logging). |
| `console.warn()` | ~8 | 5 files | All contextual (auth timeout, fallback) -- keep as-is. |
| `debugger` | 0 | -- | Clean |
| `alert()` | 1 | SharePage.tsx (line 61) | Replace with `toast.error('Incorrect password')` |

#### TODO/FIXME Comments
- 1 `TODO` in `useRateApp.ts`: "Replace with actual Play Store URL" -- acceptable for pre-launch.
- 1 commented-out iOS App Store link in same file -- can keep until iOS launch.

#### Unused Imports
- `ApplicationsPage.tsx`: `selectedApp` / `ApplicationDetailSheet` state is set but the sheet is never triggered from the new card layout (cards navigate to `/application/:id` instead). The `ApplicationDetailSheet` import and `selectedApp` state are dead code now.
- `ApplicationsPage.tsx`: `useJobApplicationMutations` and `useJobMutations` imported in line 5-6 via the hooks but neither is destructured or used.

#### Type Safety (`any` usage)
| Location | Count | Severity | Fix |
|----------|-------|----------|-----|
| `docxGenerator.ts` | ~6 | Low | Dynamic import types -- hard to avoid, acceptable |
| `textExtractor.ts` | ~8 | Low | pdfjs-dist untyped API -- acceptable with type guards |
| `pdfGenerator.test.ts` | ~12 | Low | Test mocks -- acceptable |
| `dataExport.ts` | 1 | Medium | `let data: any` -- should type as `{ resumes: unknown[] }` |
| `CoverLetterPage.tsx` | 1 | Medium | `catch (err: any)` -- replace with `catch (err: unknown)` |
| `EditorPage.tsx` | 1 | Medium | `catch (error: any)` -- replace with `catch (error: unknown)` |
| `useResumeShares.ts` | 1 | Medium | `resume: any` return type -- define proper interface |
| `ProfilePage.tsx` | 1 | Low | `as any` template cast -- use `as TemplateId` |
| `OnboardingPage.tsx` | 1 | Low | `as any` sample data cast -- define proper type |
| `TemplatesPage.tsx` | 2 | Low | `as any` sample data cast -- define proper type |

**TypeScript strict mode**: Currently disabled (`noImplicitAny: false`, `strictNullChecks: false`). Enabling would surface hundreds of issues -- not recommended for this release cycle.

---

### PART 2: COMPONENT & HOOK OPTIMIZATION

#### React Performance
- **EditorPage** (685 lines): Uses `useShallow` selectors and `React.memo` on section components -- well optimized.
- **Auto-save**: Uses `useRef` pattern to avoid re-render churn -- correct.
- **Lazy loading**: All routes except Index use `lazyWithRetry` -- correct.
- **Sheet components**: Heavy editor sheets (TailorSheet, RecruiterSimSheet, etc.) are lazy-loaded within EditorPage -- good pattern.

#### useEffect Dependency Issues
- **SharePage.tsx line 24**: `[token, data, viewCounted]` is missing `incrementViewCount` in deps. React exhaustive-deps would warn. However, the mutation reference is stable from useMutation, so this is safe in practice. Add `// eslint-disable-next-line` comment to be explicit.
- **NotificationsPage.tsx line 32**: Same pattern with `queryClient` -- it's stable, but should document with eslint comment.

#### Missing Error States
- **ApplicationsPage**: No error state if `useJobs()` or `useJobApplications()` fail -- just shows empty list silently.
- **CoverLetterPage**: No error state if `useCoverLetters()` fails.

---

### PART 3: SECURITY AUDIT

#### Findings
| Issue | Severity | Details |
|-------|----------|---------|
| Leaked password protection disabled | WARN | Supabase linter flagged this. Enable in auth settings. |
| `safeClient.ts` hardcoded anon key | INFO | Anon key is publishable -- not a secret. Acceptable. |
| `SharePage.tsx` password comparison client-side | HIGH | Password is compared in the browser (`password === share.password`). The share's password is fetched from the database and sent to the client! This exposes passwords. The `get_shared_resume` function returns the password field to the client for comparison. Should be compared server-side. |
| `dangerouslySetInnerHTML` | LOW | Only in `chart.tsx` (shadcn/ui) with internally-generated CSS -- not user content. Safe. |
| RLS policies | OK | All tables properly secured with RESTRICTIVE policies. |
| `localStorage` sensitive data | LOW | Auth session cached in localStorage (standard Supabase pattern). No other sensitive data stored. |
| Input validation | MEDIUM | `CoverLetterPage` inputs (jobTitle, company, jobDescription) have no validation/sanitization before being sent to AI edge functions. Edge functions have payload size limits, but no XSS prevention on client. |

#### Critical Fix: Password Comparison
The `get_shared_resume` RPC returns the share's password to the client. The `SharePage.tsx` then compares it client-side. This means:
1. Anyone can see the password in the network response
2. The password check is bypassable

**Fix**: Modify `get_shared_resume` to accept a `password_attempt` parameter and return null/error if incorrect, never exposing the actual password.

---

### PART 4: PWA & MOBILE READINESS

#### PWA Configuration -- PASS
- `manifest.json`: Complete with all required fields, icons (48-512px + maskable), standalone display, portrait orientation
- Service worker: Configured via `vite-plugin-pwa` with proper caching strategies
- Offline support: `useNetworkStatus` hook, `OfflineBanner` component, `useOfflineSync` for queued saves
- Install prompt: `InstallPrompt` component with dismissal persistence

#### Viewport & Meta Tags -- PASS
- viewport: `width=device-width, initial-scale=1.0, viewport-fit=cover`
- apple-mobile-web-app-capable: yes
- apple-mobile-web-app-status-bar-style: black-translucent
- theme-color: set
- apple-touch-icon: PNG referenced

#### Mobile Touch Targets -- PASS
- 44px minimum enforced across interactive elements
- 48px for Android-critical elements
- 56px for primary FABs
- Safe-area padding applied

#### Capacitor Config -- PASS
- `webContentsDebuggingEnabled: false` (production)
- No `server.url` (loads from local bundle)
- Keyboard resize configured

---

### PART 5: DEPENDENCY AUDIT

#### Potentially Unused Dependencies
| Package | Used? | Action |
|---------|-------|--------|
| `@capacitor/app` | Used in useBackButton | Keep |
| `@elevenlabs/react` | Used in voice interview | Keep |
| `mammoth` | Used in UploadPage for Word parsing | Keep |
| `tesseract.js` | Used for OCR | Keep |
| `react-image-crop` | Used in AvatarCropSheet | Keep |
| `react-markdown` | Used in AgenticChatSheet | Keep |
| `next-themes` | Imported but shadcn/ui default -- NOT actually used (custom ThemeToggle/ThemeDropdown instead) | Can remove |

#### Large Dependencies (bundle impact)
- `tesseract.js`: ~5MB worker -- already lazy-loaded via dynamic import
- `pdfjs-dist`: ~2MB -- loaded only on upload/preview
- `framer-motion`: ~130KB -- used extensively, justified
- `recharts`: ~500KB -- used in dashboard stats

---

### PART 6: RECOMMENDED FIXES (Priority Order)

#### Critical (must fix before production)
1. **Fix password exposure in SharePage**: Modify `get_shared_resume` SQL function to accept and validate password server-side, never return password to client
2. **Replace `alert()` in SharePage**: Use `toast.error('Incorrect password')` instead

#### High Priority
3. **Remove dead code in ApplicationsPage**: Remove `selectedApp` state, `ApplicationDetailSheet` import/render, unused `useJobApplicationMutations`/`useJobMutations` imports
4. **Fix `any` types in core hooks**: Type the `usePublicResume` return properly instead of `resume: any`

#### Medium Priority
5. **Add error states to ApplicationsPage and CoverLetterPage**: Show error UI when queries fail
6. **Replace `catch (err: any)` patterns**: Use `catch (err: unknown)` with proper type narrowing
7. **Add input validation to CoverLetterPage**: Validate/trim job description length before sending to AI

#### Low Priority
8. **Remove `next-themes` package**: Not used (custom theme implementation exists)
9. **Add eslint-disable comments**: Document intentional missing deps in SharePage and NotificationsPage useEffects
10. **Enable leaked password protection**: In Supabase auth settings

---

### Implementation Summary

| File | Changes |
|------|---------|
| `supabase/migrations/new.sql` | Modify `get_shared_resume` to accept + validate password server-side |
| `src/pages/SharePage.tsx` | Remove client-side password comparison, send password to RPC; replace `alert()` with `toast.error()` |
| `src/pages/ApplicationsPage.tsx` | Remove `selectedApp`, `ApplicationDetailSheet`, unused mutation imports |
| `src/pages/CoverLetterPage.tsx` | Fix `catch (err: any)` to `catch (err: unknown)`, add input length validation |
| `src/hooks/useResumeShares.ts` | Define proper return type interface instead of `resume: any` |
| `src/pages/EditorPage.tsx` | Fix `catch (error: any)` to `catch (error: unknown)` |
| `package.json` | Remove `next-themes` dependency |


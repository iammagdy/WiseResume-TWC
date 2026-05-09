## 2026-05-09 — DevKit: error messages migrated from Supabase → Appwrite references

### Files changed
- `src/lib/devkit/errorTranslate.ts` — replaced `SUPABASE_DIRECTIVE` constant with `APPWRITE_DIRECTIVE` (project ID `69fd362b001eb325a192`, fra region); rewrote all six existing error patterns so every `humanMessage`, `hint`, and `aiPromptHead` references Appwrite Functions and the Appwrite Console instead of Supabase/Kinde; added a new seventh pattern matching "Function with the requested ID could not be found" which tells the admin the Appwrite Function is not yet deployed; added an eighth pattern for Appwrite Database collection/document not found; JSDoc on `ErrorContext.function` field updated from "Supabase Edge Function name" to "Appwrite Function name".
- `src/components/dev-kit/EmailManagementPanel.tsx` — inline "RESEND_API_KEY is not configured" warning now directs admin to Appwrite Console → Functions → admin-email → Variables (was Supabase dashboard → Edge Functions → Secrets).
- `src/components/dev-kit/EmailAutomationsPanel.tsx` — audience-unconfigured link changed from `https://supabase.com/dashboard` / "Supabase Edge Function Secrets" to `https://cloud.appwrite.io` / "Appwrite Function Variables".

### What this fixes
Every "Copy AI fix prompt" in a DevKit error card was telling the AI assistant to check "production Supabase (project ref jnsfmkzgxsviuthaqlyy)". Supabase has been fully decommissioned. The prompts now correctly reference Appwrite and give actionable steps (deploy via Appwrite Console, update Appwrite Function Variables). Two panel-level UI strings also referenced Supabase and are now corrected.

---

## 2026-05-09 — DevKit: per-panel crash boundaries + MissionControl initial-render guard

### Files changed
- `src/pages/DevToolsPage.tsx` — added `DevKitPanelBoundary` import; `renderPanel()` now wraps every panel case in `<DevKitPanelBoundary panelName="…">` via a local `wrap()` helper; a single panel crash no longer takes down the whole DevKit shell — the sidebar, header, and all other tabs stay live; the boundary shows the error name, stack trace, component stack, timestamp, and a "Copy full error" button so crashes can be reported precisely.
- `src/components/dev-kit/MissionControlPanel.tsx` — initial-render guard changed from `!data && loading` to `!data && (loading || !error)` — the skeleton now shows on the very first render tick (before the `useEffect` fires and sets `loading: true`) so the full UI never renders with `data === null`.

### Bug fixed
Production error `TypeError: Cannot read properties of undefined (reading 'data')` was crashing one or more DevKit panels and propagating to the global error boundary, which made it look like the whole `/devkit` route was down. Root cause: no `DevKitPanelBoundary` was scoped to individual panels in `renderPanel()`, so any panel-level throw reached React's root. The boundary is now applied to all 20 panels.

## 2026-05-09 — DevKit: all hidden panels wired + Cmd+K palette + session context

### Files changed
- `src/pages/DevToolsPage.tsx` — full rewrite: wrapped in `DevKitSessionProvider`; replaced local `isAuthenticated` state with `useDevKitSession()` `isUnlocked`; password and passkey login both call `unlock()` so all panels receive a live session token; auto-unlock from remembered session via `loadRememberedToken()`; sidebar reorganised into 7 labelled groups; all 20 panels imported and rendered; Cmd+K command palette (⌘K / Ctrl+K) with live search; session lock countdown warning; mobile "More" sheet shows all panels in a grid grouped by category; `MissionControlPanel` receives correct `onNavigate` handler with tab-to-id map; panel count badge in sidebar footer.
- `src/components/dev-kit/AITestSlotModelsCard.tsx` — new component; reads per-slot AI test model config via `fetchAITestSlotModels()` helper; displays OpenRouter / Groq / DeepSeek slot models with override-vs-default label; "Manage in AI Radar" button deep-links to ai panel via `onNavigateToKeys` prop; handles loading / error / refresh states.

### Previously hidden panels now connected (12 total)
`AnalyticsPanel`, `VisitorsPanel`, `LiveActivityPanel`, `MissionControlPanel`, `ObservabilityPanel`, `EmailManagementPanel`, `EmailAutomationsPanel`, `FeatureFlagsPanel`, `ModerationPanel`, `OnboardingFunnelPanel`, `PortfolioUsernamesPanel`, `DevKitRunner`.

### Root cause of panels being hidden
`DevKitSessionProvider` was never mounted anywhere in the app. Panels that call `useDevKitSession()` would have thrown "must be used within DevKitSessionProvider" at runtime. Now the provider wraps the entire DevTools shell.

# WiseResume

## Overview
WiseResume is an AI-powered career management platform (PWA) that helps users build resumes, tailor them to job descriptions, practice interviews, and manage job applications.

## Tech Stack
- **Frontend**: React 18 + TypeScript 5 + Vite 5
- **Styling**: Tailwind CSS (Apple-inspired indigo+amber design system), Radix UI, Framer Motion
- **State**: Zustand + TanStack Query (React Query)
- **Auth**: Kinde Auth
- **Database**: Supabase (PostgreSQL with RLS)
- **Backend**: Supabase Edge Functions (Deno)
- **PWA**: Capacitor 8 + vite-plugin-pwa
- **Package Manager**: npm

## Project Structure
- `src/` - Core frontend code (components, hooks, lib, pages, store)
- `supabase/` - Edge functions and database migrations
- `public/` - Static assets and PWA manifest
- `specs/` - Technical specifications
- `project-governance/` - Architecture documentation
- `wise-templates/` - Resume templates

## Environment Variables
See `.env.example`. Key variables:
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Supabase anonymous key

## AI Backend (Vertex AI Express)
All AI calls route through Vertex AI Express (`aiplatform.googleapis.com`).
- **Endpoint**: `https://aiplatform.googleapis.com/v1/publishers/google/models/{MODEL}:generateContent?key={KEY}`
- **Auth**: API key via `?key=` query parameter (not Bearer header)
- **Body format**: Native Gemini (`contents` / `role` / `parts` + `systemInstruction`)
- **Env var**: `VERTEX_API_KEY` (primary), `WISE_AI_API_KEY` (legacy fallback), `GEMINI_API_KEY` (legacy fallback)
- **Set in**: Supabase → Project Settings → Edge Function Secrets
- **Central client**: `supabase/functions/_shared/aiClient.ts` — `callGeminiDirect` converts OpenAI-style messages to native Gemini format, `parseVertexResponse` converts back to internal `AIResponse`

## Dev Server
- Host: `0.0.0.0`
- Port: `5000`
- Command: `npm run dev`
- All hosts allowed for Replit proxy compatibility

## Workflow
- **Start application**: `npm run dev` on port 5000 (webview)

## Design System (Phase 1 — Redesign)
- **Primary**: Deep Indigo (HSL 239 84% 67%)
- **Accent**: Warm Amber (HSL 38 92% 50%)
- **Typography**: Inter only (no Space Grotesk)
- **Surfaces**: Clean solid backgrounds, no glassmorphism/backdrop-filter
- **Themes**: Light (#FFFFFF bg) + Dark (#111111 bg) with system option
- **Theme hook**: `src/hooks/use-theme.ts` — exposes theme, setTheme, toggleTheme, isDark
- **Theme detection**: `src/hooks/useIsDark.ts` — MutationObserver on `<html class>`
- **Settings store**: `src/store/settingsStore.ts` — persists theme in localStorage key `wiseresume-settings`
- **SkyWallpaper**: Removed (THREE.js/GSAP animated background)
- **Glass classes**: CSS compatibility aliases still defined in index.css but no longer referenced. Phase 4 replaced all glass-* class names. Phase 5 completed full cleanup: removed bare `glass` class from all headers, replaced all semi-transparent surface patterns (bg-card/30-95, bg-muted/30-60, bg-background/70-80) with solid equivalents, replaced all backdrop-blur-xl/md/2xl with backdrop-blur-sm, replaced all semi-transparent borders (border-border/20-60) with solid border-border across 50+ pages and components including all interview, editor, upload, portfolio editor, dashboard, QR, landing, and utility components. Portfolio style name "glass-pro" (data value) and Badge variant="glass" (component variant) are intentionally preserved.
- **Shadow scale**: `shadow-soft-sm`, `shadow-soft`, `shadow-soft-md`, `shadow-soft-lg`, `shadow-soft-xl` via Tailwind config
- **Structural redesign (Task #24)**: Landing → Linear/Vercel style hero + alternating feature blocks + clean pricing; Dashboard → clean greeting header, simple TabsContent (Embla carousel removed), grid quick actions; Settings → Apple iOS style with uppercase section labels, removed section index chips, cleaner profile card
- **Structural redesign (Task #25)**: AI Studio → sticky header with icon+title, fixed broken suggestion chips, normalized tool card grid (removed hardcoded px padding/margins), cleaned AI chat entry area, removed motion wrappers; Applications → removed gradient accent line; Career/Interview/Profile/Notifications already consistent
- **Portfolio CSS (pf-*)**: Untouched — used by public portfolio pages

## UI Components (Phase 2 — Redesign)
- **Buttons**: Clean solid fills, indigo primary, outline with border, no glow shadows
- **Cards**: Solid bg-card with border-border + shadow-soft (no glass-elevated)
- **Inputs/Textarea**: bg-input with border, indigo focus ring (ring-primary/20)
- **Overlays** (Dialog, Sheet, Drawer, AlertDialog): Solid bg-background, shadow-soft-xl, bg-black/50 overlay
- **Popover/Tooltip/Dropdown**: Solid bg-popover with border, shadow-soft-lg
- **Tabs**: bg-muted container, active tab bg-background with shadow-soft-sm
- **Select/Command**: Solid popover with rounded-lg items
- **Checkbox/Radio/Toggle**: Indigo checked states, primary/20 focus rings
- **Progress**: Clean bg-primary on bg-muted, no gradient/glow
- **Skeleton**: Subtle foreground/5 shimmer
- **DesktopNav**: Clean bg-background/95 + backdrop-blur-sm, theme toggle (Sun/Moon), h-14
- **BottomTabBar**: bg-background/95, clean indigo active pill, no glass-surface
- **AppShell**: bg-background (solid), no bg-transparent; mobile header bg-background

## Core App Pages (Phase 4 — Redesign)
- All glass-* classes replaced with direct Tailwind: bg-card, bg-background/95, shadow-soft, border-border
- **Headers**: bg-background/95 backdrop-blur-sm border-b border-border (consistent across all pages)
- **Cards/Sections**: bg-card border border-border shadow-soft rounded-2xl
- **Inputs**: bg-input border border-border (no glass-input)
- Removed: border-glow, border-white/*, shadow-purple-500/*, ring-white/* patterns
- Pages updated: ProfilePage, SettingsPage, DashboardPage, SubscriptionPage, ResumeDetailPage, TemplatesPage
- UploadPage, EditorPage, PreviewPage were already clean (no glass-* usage)

## Bug Fixes (Post-Redesign Audit)
- **AuthContext user.id**: Now uses only the bridge UUID (from token-exchange), never the raw Kinde ID (kp_xxx). If bridge hasn't settled, `user` is null to prevent UUID type errors in Supabase queries.
- **Data query gating**: All hooks with `enabled: !!user` now naturally wait for the bridge since `user` is null until bridge provides a UUID.
- **Edge function fixes**: 6 functions (recruiter-simulation, optimize-for-linkedin, one-page-optimizer, career-path-advisor, career-assessment, generate-resignation-letter) fixed `user.id` → `userId` from requireAuth.
- **Parse-resume merge**: `mergeParseResults` now preserves certifications, awards, publications, volunteering, hobbies, and projects from pass 2.
- **Local parser alignment**: `localParser.ts` project output now matches full Project interface (role, startDate, endDate, technologies, description).
- **Hardcoded keys removed**: `supabaseConstants.ts` and `client.ts` no longer contain hardcoded Supabase URL or anon key fallbacks. Both now require `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` env vars, with console errors if missing.
- **Audit log reliability**: `token-exchange` function `logExchange` is now async/awaited, ensuring audit records are written before the edge function response completes.

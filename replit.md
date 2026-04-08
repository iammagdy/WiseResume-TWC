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
- **Glass classes**: CSS compatibility aliases still defined; Phase 4 replaced all glass-* usage in 6 core pages with direct Tailwind classes (bg-card, bg-background/95, shadow-soft, etc.)
- **Shadow scale**: `shadow-soft-sm`, `shadow-soft`, `shadow-soft-md`, `shadow-soft-lg`, `shadow-soft-xl` via Tailwind config
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

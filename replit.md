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
- **Glass classes**: Kept as compatibility aliases — now render as solid surfaces with subtle borders/shadows
- **Portfolio CSS (pf-*)**: Untouched — used by public portfolio pages

# WiseResume

## Overview
WiseResume is an AI-powered career management platform (PWA) that helps users build resumes, tailor them to job descriptions, practice interviews, and manage job applications.

## Tech Stack
- **Frontend**: React 18 + TypeScript 5 + Vite 5
- **Styling**: Tailwind CSS, Radix UI, Framer Motion, GSAP
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

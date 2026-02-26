
# Create Sequential AI Prompts File for Rebuilding WiseResume

## Overview
Create a new file `docs/REBUILD_PROMPTS.md` containing a complete, ordered set of 50+ prompts that another AI tool can follow step-by-step to recreate the entire WiseResume app from scratch. The file will also include Google Stitch prompts at the top for generating screen designs.

## What the File Will Contain

### Structure
1. **Master System Prompt** - A meta-instruction block that tells the receiving AI how to behave: always track progress (e.g., "Prompt 18/52"), ask clarifying questions, suggest improvements, and show what's remaining.
2. **Google Stitch Prompts (Part A)** - Step-by-step prompts for generating all 41 screen designs in Google Stitch, grouped by feature area.
3. **Web App Build Prompts (Part B)** - 50+ sequential prompts ordered by dependency/priority to build the full app.

### Prompt Ordering Strategy (Part B)
The prompts follow this dependency chain:

```text
Phase 1: Foundation (Prompts 1-5)
  - Project setup, design system, CSS tokens, fonts
  - Auth system (email/password, OAuth, magic link)
  - Database schema (all 21 tables + RLS + RPCs)
  - Zustand stores + React Query config
  - Layout system (AppShell, BottomTabBar, DesktopNav)

Phase 2: Core Screens (Prompts 6-15)
  - Landing page with space theme
  - Dashboard with stats, resume list, FAB
  - Resume Editor (13 sections, stepper, toolbar)
  - Preview page with zoom + page nav
  - Upload page (PDF, DOCX, OCR)
  - Templates gallery (30 templates)
  - Onboarding wizard
  - Profile editor
  - Settings page (all sections)
  - 404 page

Phase 3: AI Features (Prompts 16-25)
  - Shared AI client (3-tier fallback)
  - AI Studio page (tool grid)
  - Resume analysis + scoring edge functions
  - Resume tailoring edge function + UI
  - AI section enhancement + proofreading
  - Cover letter generation
  - Resignation letter generation
  - Mock interview (voice + Web Speech)
  - Career path + quiz
  - Agentic chat

Phase 4: Job Tracking (Prompts 26-29)
  - Applications page
  - Application detail + status tracking
  - Job detail page
  - Activity stats + notifications

Phase 5: Portfolio (Prompts 30-34)
  - Portfolio editor
  - Public portfolio page
  - QR codes + short links
  - Portfolio analytics
  - Ask AI widget

Phase 6: Sharing & Documents (Prompts 35-38)
  - Resume sharing (password, expiry, viewer)
  - Share comments
  - Resume versions
  - PDF + DOCX export

Phase 7: Advanced Features (Prompts 39-45)
  - Help & FAQ page
  - Analytics page
  - Subscription page
  - Referral page
  - Achievements page
  - Guides & Examples
  - Command palette + bug report

Phase 8: Native & Platform (Prompts 46-49)
  - PWA + service worker
  - Capacitor setup (biometric, haptics, status bar)
  - Offline support + sync queue
  - Push notifications

Phase 9: Polish & Launch (Prompts 50-52)
  - Stripe payment integration
  - AI credit enforcement
  - Final QA checklist
```

### Each Prompt Will Include
- Clear prompt number and title (e.g., "PROMPT 7/52 - Dashboard Page")
- Exact instructions referencing the APP_BLUEPRINT for design specs
- Database tables/RPCs needed (if any)
- Edge functions to create (if any)
- Components to build with layout details
- Reference to the design system tokens
- Reminder for the AI to report progress and ask questions

### Google Stitch Section
Will contain ~15 prompts for screen generation, grouped:
- Auth screens (login, signup, reset, verify)
- Dashboard + Editor + Preview
- AI Studio + Interview + Career
- Applications + Job Detail
- Portfolio + Public Portfolio
- Settings + Profile + Onboarding
- Cover Letters + Resignation Letters
- Help, Analytics, Subscription, Referral, Achievements

## Technical Details
- **File**: `docs/REBUILD_PROMPTS.md`
- **Estimated size**: ~3,000-4,000 lines (comprehensive prompts with context)
- **No other files modified**
- **All prompts reference `docs/APP_BLUEPRINT.md` as the source of truth** for design specs, color tokens, component trees, and data models
- Each prompt is self-contained enough to execute independently but follows the dependency order
- The master prompt includes instructions for the AI to maintain a progress tracker in every response

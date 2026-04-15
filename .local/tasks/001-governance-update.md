# Task: Comprehensive Governance Files Update

  ## Objective
  Update every file in `project-governance/` to be a complete, accurate, and comprehensive record of the WiseResume + WiseHire platform — covering everything from day 1 to now.

  ## Why this comes first
  Every agent working on this platform depends on governance files being accurate. WiseHire implementation cannot start with outdated docs that don't even list WiseHire as an approved brand.

  ## Files to update

  ### BRANDING.md
  - Add WiseHire as an officially approved brand name
  - Define WiseHire color: professional blue/indigo, hex value, usage rules
  - Document "For Job Seekers / For Companies" as canonical toggle language
  - WiseResume + WiseHire are sub-brands under the Wise platform umbrella

  ### PRODUCT.md
  - Update audience: dual-audience platform (WiseResume for job seekers + WiseHire for HR)
  - Document full WiseResume feature set as it exists today:
    Resume Builder, 30+ Templates, AI Tailoring, ATS Scoring, Smart Tailoring,
    Public Portfolio, AI Interview Coach (voice + text), Job Application Tracker (Kanban),
    AI Studio (cover letters, resignation letters, LinkedIn optimizer, salary negotiation,
    cold emails, career advisor), Career Assessment, Achievements/Gamification, Analytics
  - Document WiseHire product scope (phased):
    Candidate Brief, JD Writer, Pipeline, Bulk Screening, Bias Reduction,
    Interview Scorecard, Talent Pool, HR Analytics, Team Collaboration
  - Add WiseHire quality rules: desktop-first Phase 1/2 (documented exception),
    WCAG AA mandatory, no blank screens, fail-closed AI, no free tier (contact-us lockout)
  - Keep all existing WiseResume quality rules

  ### ARCHITECTURE.md
  - Document full tech stack:
    React 18 + Vite + TypeScript + Tailwind + Shadcn/UI + Framer Motion + Zustand + TanStack Query
    + Kinde Auth + Supabase (PostgreSQL + RLS + Edge Functions + Storage) + Resend + Capacitor
  - Document Kinde → Supabase Token Bridge in detail
  - Document all current Supabase tables (from types.ts):
    profiles, resumes, resume_sections, resume_versions, resume_experiences, resume_educations,
    resume_skills, resume_certifications, cover_letters, resignation_letters, job_applications,
    jobs, portfolio_settings, portfolio_visits, ai_credits, ai_usage_logs, credit_transactions,
    subscriptions, short_links, audit_logs, user_api_keys, notifications, career_assessments,
    interview_sessions, tailor_history, discount_codes, coupon_redemptions, rpc_rate_limits
  - Document all Supabase Storage buckets: avatars, resumes, portfolios, temp
    (+ candidate-resumes planned for WiseHire)
  - List all 77+ edge functions by category
  - Document AI system: credit limits, atomic deduction RPC, BYOK (AES-GCM-256),
    multi-layer rate limiting, fail-closed behavior
  - Document WiseHire routing: /wisehire/* prefix, account_type-based guards
  - Keep all "Do Not Touch" file rules

  ### DECISIONS.md
  - Preserve all existing 6 decisions exactly
  - Add Decision #7: WiseHire same-codebase expansion with permanent account_type split
  - Add Decision #8: WiseHire desktop-first Phase 1/2 documented exception

  ### CONSTITUTION.md
  - Update Section 1 (Purpose) to cover WiseResume + WiseHire
  - Update approved branding list to include WiseHire
  - Add Section 7: WiseHire Governance (same rules + documented exceptions)
  - Update Section 6.1 to note account_type routing enforcement

  ### CHANGELOG.md
  - Add 2026-04-15 entry: Governance files comprehensively updated for full platform scope + WiseHire

  ## Definition of done
  - All 6 files saved with accurate, comprehensive content
  - No existing governance rules weakened or removed
  - CHANGELOG.md entry added
  - WiseHire is a recognized, governed brand within the platform
  
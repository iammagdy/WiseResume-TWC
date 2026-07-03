# 00 - Migration Rules

**Last Verified:** 2026-05-08
**Status:** DRAFT / MANDATORY

## 1. General Principles
- **Safety First:** Supabase/Kinde remains the primary production environment until Phase 4 is complete.
- **No Manual Migrations:** All database schema changes in Appwrite must be scripted or documented in `06-Database-Schema-Map.md`.
- **Universal Code:** All new code must be platform-agnostic (runnable in Replit, Bolt, Antogravity).
- **TypeScript Strictness:** No `any` types. Interfaces must match the new Appwrite document structures.

## 2. Architecture Rules
- **Smart Hubs:** Consolidate the 84 existing functions into 7 logical Hubs in Appwrite.
- **Shared Secrets:** Use Appwrite's Global Environment Variables for AI keys and credentials.
- **Environment Parity:** Every platform must use a single `.env` format defined in `04-Universal-Environment-Guide.md`.

## 3. Data Integrity
- **Mapping Consistency:** Follow the SQL-to-Document mapping exactly as defined in the Schema Map.
- **Relationship Persistence:** Maintain UUID links between Users, Resumes, and Documents.

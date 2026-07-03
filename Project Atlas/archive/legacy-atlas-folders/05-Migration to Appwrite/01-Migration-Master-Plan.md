# 01 - Migration Master Plan

**Last Verified:** 2026-05-08
**Project:** WiseResume/WiseHire Migration to Appwrite

## Phase 0: Foundations (Current)
- [ ] Create Appwrite Project (Frankfurt Region).
- [ ] Establish Project Atlas Migration folder (Rules & Master Plan).
- [ ] Set up Universal Environment Guide.

## Phase 1: Authentication & Identity
- [ ] Replace Kinde Auth with Appwrite Auth.
- [ ] Map Kinde User IDs to Appwrite User IDs.
- [ ] Create 'Auth-Master' Smart Hub.

## Phase 2: Database Schema & Initial Sync
- [ ] Create Appwrite Collections based on the Schema Map.
- [ ] Build the 'Migrator' script to pull data from Supabase.
- [ ] Implement Parallel Writes (Supabase + Appwrite).

## Phase 3: AI Infrastructure (Smart Hubs)
- [ ] Build the 'AI-Gateway' Smart Hub (9 keys, 3 providers).
- [ ] Migrate AI Routing logic from Supabase tables to Appwrite Config.

## Phase 4: Full App Migration & Testing
- [ ] Update Frontend Hooks to use Appwrite Web SDK.
- [ ] Switch remaining functions to Smart Hubs.
- [ ] End-to-end testing in the 'Migration Beta' environment.

## Phase 5: Production Cut-over
- [ ] Final data sync.
- [ ] Update production DNS/Domains.
- [ ] Decommission Supabase and Kinde.

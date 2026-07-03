# Project Atlas — Documentation Link Issues Report

**Last Verified:** 2026-07-03  
**Status:** Verification Artifact  
**Location:** `Project Atlas/LINK_ISSUES.md`  

---

## Overview

This document tracks broken relative links, stale file pointers, and historical domain/stack references identified during the documentation consolidation process.

> **Note on Historical References:** Links inside `Project Atlas/archive/` and historical session logs (`01-Currently Implemented/`, `05-Migration to Appwrite/`) are preserved as-is to maintain historical audit integrity.

---

## 1. Moved File Relative Link Updates Fixed

* **Source:** `Project Atlas/ai/CLAUDE_INSTRUCTIONS.md`
  * Old link: `./DESIGN.md` → Fixed: `../design-system/DESIGN_GUIDELINES.md`
  * Old link: `./PRODUCT.md` → Fixed: `../product/requirements.md`
* **Source:** Root `README.md`
  * Updated pointers to `Project Atlas/MASTER_HANDBOOK.md`, `CURRENT_STATE.md`, and `RULES.md`.

---

## 2. Historical Link References (Preserved in Historical Logs)

The following relative links reference legacy files (such as pre-Appwrite migration logs for Kinde/Supabase) that were deleted during earlier 2026 development phases:

| Source File | Referenced Link Target | Status |
|---|---|---|
| `Project Atlas/01-Currently Implemented/database-tables/README.md` | `./kinde_events.md` | Preserved Historical Readme Note |
| `Project Atlas/01-Currently Implemented/frontend-layer/README.md` | `./integrations-supabase.md` | Preserved Historical Readme Note |
| `Project Atlas/01-Currently Implemented/functions/README.md` | `./admin-kinde-reconcile.md` | Preserved Historical Readme Note |
| `Project Atlas/01-Currently Implemented/functions/README.md` | `./kinde-webhook.md` | Preserved Historical Readme Note |
| `Project Atlas/01-Currently Implemented/pages/README.md` | `./kindeauthtest.md` | Preserved Historical Readme Note |
| `Project Atlas/01-Currently Implemented/stability-fixes/README.md` | `./kinde-custom-domain-split.md` | Preserved Historical Readme Note |

---

## 3. Stale Domain & Architecture Terminology Audit

* **Production Domain:** Active living Atlas files (`MASTER_HANDBOOK.md`, `CURRENT_STATE.md`, `README.md`) cite **`wiseresume.app`**. Historical deployment notes in `DEPLOYMENT_GUIDE.md` record past Hostinger FTP routes for `resume.thewise.cloud`.
* **Backend Architecture:** All current Atlas files document **Appwrite-native** (Databases, Storage, Functions). References to Supabase, Kinde, or Auth.js exist strictly in historical audit/migration logs.

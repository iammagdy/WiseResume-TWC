# Canonical Appwrite Backend Architecture

**Last Verified:** 2026-07-03  
**Status:** Canonical Architecture Specification  
**Location:** `Project Atlas/architecture/appwrite-architecture.md`  

---

## Overview

WiseResume is an Appwrite-native application. All database persistence, user authentication, storage buckets, and serverless functions run on Appwrite Cloud (`https://fra.cloud.appwrite.io/v1`).

---

## Architectural Pillars

1. **Appwrite Auth:** Handles signups, login sessions, OAuth, and OTP password resets.
2. **Appwrite Databases:** Single database instance `main` managing 96+ collections.
3. **Appwrite Storage:** Manages avatar images, file uploads, and exported resume assets.
4. **Appwrite Serverless Functions:** Server-side Node.js hubs handling AI proxying (`ai-gateway`), DevKit administration (`admin-devkit-data`), analytics (`admin-visitor-analytics`), and transactional emails (`email-service`).

---

## Key Rules

* Non-Appwrite backends (Supabase, Kinde, Firebase) are legacy and strictly prohibited.
* Cross-user queries require Appwrite Functions with server keys (`X-DevKit-Key`).
* Document Security (`documentSecurity: true`) is enforced on user-sensitive collections (`notifications`, `portfolio_visits`).

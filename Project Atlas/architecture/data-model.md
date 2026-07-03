# Canonical Data Model & Collections Specification

**Last Verified:** 2026-07-03  
**Status:** Canonical Architecture Specification  
**Location:** `Project Atlas/architecture/data-model.md`  

---

## Database Schema (`main`)

Appwrite Databases stores application entities across 96+ collections.

### Primary Collections:

* **`profiles`**:
  * `$id`: Matches Appwrite Auth User ID.
  * Attributes: `email`, `full_name`, `avatar_url`, `headline`, `bio`, `theme`, `created_at`.
* **`resumes`**:
  * `$id`: Unique resume ID.
  * Attributes: `user_id`, `title`, `template_id`, `sections` (JSON), `is_target`, `$createdAt`, `$updatedAt`.
* **`tailor_history`**:
  * `$id`: Unique tailoring run ID.
  * Attributes: `user_id`, `resume_id`, `job_description`, `score_before`, `score_after`, `keyword_matches` (JSON), `timestamp`.
* **`portfolios`**:
  * `$id`: Unique portfolio ID.
  * Attributes: `user_id`, `username`, `is_public`, `custom_domain`, `sections_config` (JSON), `is_password_protected`, `password_hash`.
* **`notifications`**:
  * `$id`: Unique notification ID.
  * Attributes: `user_id`, `type`, `title`, `message`, `is_read`, `created_at`.
  * Security: `documentSecurity: true`.

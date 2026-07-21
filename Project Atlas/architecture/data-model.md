# Canonical Data Model & Collections Specification

**Last Verified:** 2026-07-21
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
  * Security: Legacy server-only history. Browser runtime must not query this collection; current user-facing tailoring history is reconstructed from owner-scoped `resumes` lineage and `customization` metadata.
* **`user_preferences`**:
  * `$id`: Unique preference document ID.
  * Attributes: `user_id`, `language`.
  * Security: `documentSecurity: true`, collection permissions `create("users")`, owner-only document read/update/delete permissions.
  * Note: Legacy `user_id` attribute size currently prevents `user_id_idx` creation, but authenticated `user_id` queries are production verified.
* **`jobs`**:
  * `$id`: Unique saved/imported job ID.
  * Attributes: `user_id`, `title`, `company`, `company_logo`, `description`, `requirements`, `location`, `salary_range`, `job_type`, `posted_date`, `source_url`, `is_saved`.
  * Security: `documentSecurity: true`, collection permissions `create("users")`, owner-only document read/update/delete permissions, `user_id_idx` available.
* **`job_applications`**:
  * `$id`: Unique application tracker ID.
  * Attributes: `user_id`, `job_title`, `company`, `status`, `applied_at`, `url`, `notes`, `deadline`, `resume_id`, `cover_letter_id`, `job_feed_item_id`, `source_job_id`, `generated_resume_id`, `generated_cover_letter_id`.
  * Security: `documentSecurity: true`, collection permissions `create("users")`, owner-only document read/update/delete permissions, `user_id_idx`, `status_idx`, `resume_id_idx`, and `user_status_idx` available.
* **`portfolios`**:
  * `$id`: Unique portfolio ID.
  * Attributes: `user_id`, `username`, `is_public`, `custom_domain`, `sections_config` (JSON), `is_password_protected`, `password_hash`.
* **`notifications`**:
  * `$id`: Unique notification ID.
  * Attributes: `user_id`, `type`, `title`, `message`, `is_read`, `created_at`.
  * Security: `documentSecurity: true`.

# Skill: Security & Auth Review

**Skill ID:** `security-review`
**Location:** `Project Atlas/skills/security-review.md`

---

## Security Audit Rules

* **Appwrite Auth**: Use Appwrite Auth exclusively.
* **OTP Password Reset**: HMAC-based OTP password resets (`email-service`) with challenge token verification and attempt limits (5 attempts).
* **Document-Level Security**: Validate document permissions (`read("user:<ownerUserId>")`) on sensitive collections (`notifications`, `portfolio_visits`, `portfolio_history`).
* **Cloudflare Turnstile**: Validate siteverify calls against endpoint `https://challenges.cloudflare.com/turnstile/v0/siteverify`.
* **Zero Secrets Leakage**: No API keys, database credentials, or secret tokens in frontend bundles or Git.

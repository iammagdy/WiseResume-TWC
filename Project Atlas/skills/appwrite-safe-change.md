# Skill: Safe Appwrite Backend Changes

**Skill ID:** `appwrite-safe-change`
**Location:** `Project Atlas/skills/appwrite-safe-change.md`

---

## Appwrite Backend Rules

* **Appwrite-Native Stack**: Auth, Databases (`main`), Storage (`avatars`), and serverless functions (`appwrite-hubs/`).
* **Document Security**: Ensure `documentSecurity: true` is set on collections requiring owner-level document permissions (`Permission.read(Role.user(ownerUserId))`).
* **Targeted Deploys**: Never run `target=all` deploys. Use targeted deploys (e.g. `--only=ai-gateway`).
* **Secrets Protection**: Register secret keys on Appwrite Cloud console and GitHub secrets. Never commit secrets.

# Project Atlas — Operations & Deployment Infrastructure Directory

**Last Verified:** 2026-07-03
**Status:** Canonical Operations Hub
**Location:** `Project Atlas/operations/`

---

## 1. What Belongs Here

* Production deployment runbooks for Vercel and Appwrite Cloud.
* Appwrite Function deployment and secret propagation guides.
* Environment variable checklists, domain routing, and CDN caching rules.
* Key rotation, API key encryption, and security operational procedures.
* Live deployment reference spec: [`Project Atlas/deployment/current-deployment.md`](../deployment/current-deployment.md).

---

## 2. What Does NOT Belong Here

* Executable shell scripts or deploy scripts (place in `scripts/`).
* GitHub Actions workflow files (place in `.github/workflows/`).
* API keys, tokens, or plaintext secrets (NEVER commit secrets to repository documentation).

---

## 3. Operations Policy & Constraints

> [!CAUTION]
> * **Targeted Deploys Only**: Never run `target=all` Appwrite deployments. Deploy targeted function directories only (e.g. `--only=ai-gateway`).
> * **Approval Required**: Appwrite function deploys and Vercel environment modifications require explicit owner authorization.

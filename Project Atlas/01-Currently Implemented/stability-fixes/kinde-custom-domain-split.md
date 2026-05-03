# Kinde custom domain split — `auth.thewise.cloud` separated from `resume.thewise.cloud`

**Last verified:** 2026-05-03
**Type:** stability fix (incident resolution)
**Sources:**
- DNS records on the `thewise.cloud` zone (Hostinger DNS Zone Editor)
- Kinde dashboard → Custom Domains (`auth.thewise.cloud` provisioned `2026-05-03`)
- GitHub repo `iammagdy/WiseResume-TWC` Secrets → `VITE_KINDE_DOMAIN`
- `.github/workflows/deploy.yml` (build-time `VITE_KINDE_DOMAIN` → SPA bundle)
- `src/AppLanding.tsx` + `src/AppInterior.tsx` (KindeProvider construction; `redirectUri = window.location.origin + '/auth/callback'`)
- Live verification: `LIVE_SITE_URL=https://resume.thewise.cloud node scripts/verify-live-deploy.mjs` (all 7 checks ✅) + `dig` against `resume.thewise.cloud` and `auth.thewise.cloud`

**Canonical owner:** `project-governance/CONSTITUTION.md` §6 (Documentation Discipline) + this Atlas card

---

## Why it exists

On 2026-05-03 the live domain `https://resume.thewise.cloud` started serving the **Kinde-hosted custom-themed auth page** at every URL — including the root path — instead of the WiseResume React landing page. The Kinde page itself rendered the error **"Sorry, we don't see a way to authenticate you at the moment"**, with no Email/Google/etc. connection options visible. End users could not reach the app at all.

The cause was a misconfiguration of Kinde's **Custom Domain** feature. Kinde's docs require a dedicated subdomain to be CNAME'd at `eu.kinde.com` so Kinde's edge can serve the branded auth UI under the customer's own domain. The `resume.thewise.cloud` subdomain — which was already in use as the WiseResume **application** domain on Hostinger — was given to Kinde as that custom auth domain. From DNS's point of view a hostname can only resolve to one place, so once `resume.thewise.cloud → eu.kinde.com` was published, every request to that hostname (`/`, `/index.html`, `/changelog.json`, `/assets/*`) was answered by Kinde's edge (Caddy + AWS WAF in `eu-west-1`) and Hostinger became unreachable on that hostname. The app's React bundle was still sitting on Hostinger's filesystem — it just had no DNS path to reach the browser.

The "we don't see a way to authenticate you" message is what Kinde renders when its auth UI is loaded at the **root** of the auth domain with no OAuth `client_id` / `state` / `connection_id` query parameters — i.e. when a browser hits the auth domain directly instead of arriving via the SPA's `login()` redirect. With no `client_id` Kinde cannot resolve which application's connections to render, so the connection list comes up empty.

---

## What changed (operationally — DNS + dashboard, no code)

### 1 — Move Kinde to its own dedicated subdomain

In the Kinde dashboard, the Custom Domain was changed from `resume.thewise.cloud` to `auth.thewise.cloud`. Kinde issued a new ACME-challenge CNAME pair and provisioned the SSL certificate for the new hostname.

DNS records currently published on the `thewise.cloud` zone:

```
CNAME  _acme-challenge.auth   →  _acme-challenge.2639ba62e152dd91a994591bf279338a.thewisecloud.kinde.com
CNAME  auth                   →  eu.kinde.com
```

The corresponding old records under `resume.*` were removed (they were the original break — `_acme-challenge.resume` and `resume → eu.kinde.com`).

### 2 — Restore the app subdomain on Hostinger

`resume.thewise.cloud` was pointed back at Hostinger's web-hosting subnet. Verified by `dns.resolve('resume.thewise.cloud', 'A')` returning `195.35.60.216`, `191.101.104.201` (Hostinger). The React bundle that was uploaded by `deploy.yml` for `v3.11.1` is now reachable again — `LIVE_SITE_URL=https://resume.thewise.cloud node scripts/verify-live-deploy.mjs` returns all 7 checks ✅ and `/changelog.json` reports `v3.11.1`.

### 3 — Update the build-time auth domain baked into the SPA

The GitHub Actions Secret `VITE_KINDE_DOMAIN` (consumed by `.github/workflows/deploy.yml` and inlined into the Vite bundle at build time as `import.meta.env.VITE_KINDE_DOMAIN` — see `src/AppLanding.tsx` lines 19–20 and `src/AppInterior.tsx` lines 85–86) was updated from `https://thewisecloud.kinde.com` (Kinde's default subdomain) to `https://auth.thewise.cloud`. `deploy.yml` was then re-run via `workflow_dispatch` so the bundle ships with the new auth domain (release `v3.11.2`).

### 4 — Kinde Application callback whitelist (unchanged)

The `KindeProvider` in `src/AppInterior.tsx` builds `redirectUri = window.location.origin + '/auth/callback'` — i.e. `https://resume.thewise.cloud/auth/callback`. That entry was already present in the Kinde Application's Allowed Callback URLs from the original setup, so no change was required. The auth-domain change does **not** affect the callback URL — the callback still lands on the **app** domain (`resume.thewise.cloud`), which is correct.

---

## End state

| Hostname                | Resolves to              | Serves                                                      |
|-------------------------|--------------------------|-------------------------------------------------------------|
| `resume.thewise.cloud`  | Hostinger A records      | The WiseResume React SPA (landing, dashboard, `/auth/callback`) |
| `auth.thewise.cloud`    | `eu.kinde.com` (CNAME)   | Kinde's custom-themed auth UI (only reached via OAuth redirect from the SPA's `login()`) |

End-user flow:

1. Visitor opens `https://resume.thewise.cloud/` → Hostinger serves `index.html` → React SPA boots → landing page renders.
2. Visitor clicks **Sign in** / **Sign up** → SPA calls `useKindeAuth().login()` → browser redirects to `https://auth.thewise.cloud/oauth2/auth?client_id=…&state=…&redirect_uri=https://resume.thewise.cloud/auth/callback&…`.
3. Kinde now has a valid `client_id` and renders the connection list → user authenticates → Kinde redirects back to `https://resume.thewise.cloud/auth/callback?code=…&state=…` → SPA exchanges the code → user lands authenticated inside the app.

The "Sorry, we don't see a way to authenticate you at the moment" error is gone because Kinde no longer receives bare `GET /` requests — every request to `auth.thewise.cloud` arrives with a populated OAuth query string built by the SPA.

---

## What did **not** change

- No application code was modified — neither the React SPA nor the server. Only DNS, the Kinde dashboard, and one GitHub Actions Secret.
- `VITE_KINDE_CLIENT_ID` was not changed.
- The Kinde Application itself (client ID, allowed callback URLs, custom theme) was not changed.
- Hostinger's `.htaccess`, the deploy pipeline, and the React bundle's contents are unchanged from `v3.11.1` apart from the new `VITE_KINDE_DOMAIN` value being inlined.

---

## Why a "subdomain" and not a "path"

A frequent misunderstanding during the incident triage: the fix is a separate **subdomain** (`auth.thewise.cloud`), not a path under the existing app domain (e.g. `resume.thewise.cloud/login`). DNS only resolves the part of a URL before the first `/` — the hostname — so a path-based split is not technically possible at the DNS layer. Two separate hostnames are the only way to send `/` requests to two different services.

---

## Lesson for future Kinde / SSO setups

When wiring Kinde (or any IdP that offers a "Custom Domain" branded auth UI), the custom domain must be a **dedicated** subdomain reserved for the auth service — never the same subdomain that already hosts an unrelated web application. The conventional names are `auth.<domain>`, `login.<domain>`, or `id.<domain>`. The app keeps its own subdomain; the IdP gets its own; both coexist via separate DNS records.

# Deployment Guide — The Wise Cloud

> **For any AI agent, developer, or tool working on this codebase:**
> Read this entire file before touching any deployment workflow, FTP config, or Hostinger-related file.
> Ignoring this guide has previously taken down production domains.

---

## The Three Domains — At a Glance

| Domain | What it serves | Repo | Deploy method |
|---|---|---|---|
| `resume.thewise.cloud` | WiseResume app (this repo) | `iammagdy/WiseResume-TWC` | GitHub Actions → FTP → `resume/` |
| `thewise.cloud` | Static landing page (coming soon) | `iammagdy/WiseResume-TWC` | GitHub Actions → FTP → `.` (root) |
| `quran.thewise.cloud` | WiseQuran PWA | `iammagdy/wisequran` | GitHub Actions → SFTP → `quran/` |

These three domains are **completely independent**. Deploying one must never touch the others.

---

## Hostinger File System Layout

```
/public_html/                    ← thewise.cloud root (landing page lives here)
/public_html/resume/             ← resume.thewise.cloud (WiseResume app)
/public_html/quran/              ← quran.thewise.cloud (WiseQuran app)
```

The Hostinger FTP user (`u966279061.thewise.cloud`) lands at `/public_html/` on login.
That means `.` in lftp = `/public_html/` = the web root of `thewise.cloud`.

---

## Domain 1 — resume.thewise.cloud (WiseResume app)

### Workflow file
`.github/workflows/deploy-frontend.yml` in this repo (`iammagdy/WiseResume-TWC`)

### What it does
1. Checks out this repo, runs `npm ci`, runs `npm run build` → produces `dist/`.
2. Uploads `dist/` to the **`resume/`** subdirectory on Hostinger via lftp FTP.

### Critical lftp command
```bash
mirror --reverse --delete --verbose --parallel=3 ./dist/ resume/
```

### ⚠️ DO NOT change `resume/` to `.` or any other path
- `.` = the web root of `thewise.cloud` — changing it would overwrite the landing page.
- `--delete` removes any remote files not in `dist/`, so a wrong path will wipe whatever is there.

### Secrets used (stored in this repo's GitHub Secrets)
- `FTP_PASSWORD` — Hostinger FTP password for `u966279061.thewise.cloud`

### FTP connection details
- Host: `ftp://82.29.154.120:21`
- User: `u966279061.thewise.cloud`
- Mode: FTPS (explicit TLS, passive, `ssl:verify-certificate no`)

### How to redeploy
Go to **GitHub → iammagdy/WiseResume-TWC → Actions → 🚀 Deploy Frontend → Run workflow → main**.
Or trigger via API:
```bash
curl -X POST -H "Authorization: Bearer $GITHUB_TOKEN" \
  "https://api.github.com/repos/iammagdy/WiseResume-TWC/actions/workflows/273053817/dispatches" \
  -d '{"ref":"main"}'
```

---

## Domain 2 — thewise.cloud (landing page)

### Workflow file
`.github/workflows/deploy-landing.yml` in this repo (`iammagdy/WiseResume-TWC`)

### What it does
Uploads a single file — `thewise-cloud-landing/index.html` — to the FTP root (`.`).

### Critical lftp command
```bash
put -O . thewise-cloud-landing/index.html
```

### ⚠️ DO NOT use `mirror` with `--delete` targeting `.`
- `mirror --delete ./dist/ .` would wipe the entire web root including `resume/` and `quran/` directories.
- Always use `put` for the landing page, not `mirror`.

### Source file
`thewise-cloud-landing/index.html` in this repo. Edit this file to update the landing page, then run the deploy-landing workflow.

### How to redeploy
Go to **GitHub → iammagdy/WiseResume-TWC → Actions → 🌐 Deploy thewise.cloud Landing → Run workflow → main**.
Or trigger via API:
```bash
curl -X POST -H "Authorization: Bearer $GITHUB_TOKEN" \
  "https://api.github.com/repos/iammagdy/WiseResume-TWC/actions/workflows/273959366/dispatches" \
  -d '{"ref":"main"}'
```

---

## Domain 3 — quran.thewise.cloud (WiseQuran app)

### Repo
`iammagdy/wisequran` — **separate repository, separate workflows, separate secrets.**

### Workflow file
`.github/workflows/deploy.yml` in the **wisequran repo** (not this repo).

### What it does
1. Checks out wisequran, runs `pnpm install`, `pnpm build`, smoke-tests with Playwright.
2. Uploads `dist/` to `domains/thewise.cloud/public_html/quran` via **SFTP** (`appleboy/scp-action`).

### Secrets used (stored in the **wisequran** repo's GitHub Secrets — NOT here)
- `FTP_SERVER` — Hostinger server hostname/IP
- `FTP_USERNAME` — SFTP username
- `FTP_PASSWORD` — SFTP password
- `FTP_PORT` — SFTP port (22)

### ⚠️ This repo (WiseResume-TWC) has NO control over quran.thewise.cloud
- Never attempt to deploy to `quran/` from the WiseResume-TWC workflows.
- Any change to the WiseQuran app must go through the wisequran repo.

### How to redeploy (if quran.thewise.cloud goes down)
Trigger via API using a token with access to the wisequran repo:
```bash
curl -X POST -H "Authorization: Bearer $GITHUB_TOKEN" \
  "https://api.github.com/repos/iammagdy/wisequran/actions/workflows/244949119/dispatches" \
  -d '{"ref":"main"}'
```
Or go to **GitHub → iammagdy/wisequran → Actions → Deploy to Hostinger → Run workflow**.

---

## The One Rule That Must Never Be Broken

> **Never run `mirror --delete` against `.` (the FTP root) from the WiseResume-TWC repo.**

This single mistake:
- Wipes `resume/` → takes down `resume.thewise.cloud`
- Wipes `quran/` → takes down `quran.thewise.cloud`
- Overwrites `index.html` → replaces the `thewise.cloud` landing page with the wrong app

The `--delete` flag is safe **only** when the mirror target is exactly `resume/`.

---

## Workflow ID Reference

| Workflow | ID | Repo | Triggers |
|---|---|---|---|
| 🚀 Deploy Frontend (WiseResume → resume/) | `273053817` | WiseResume-TWC | `workflow_dispatch` |
| 🌐 Deploy Landing (index.html → root) | `273959366` | WiseResume-TWC | `workflow_dispatch` |
| 🧠 Deploy AI Hubs (Appwrite Functions) | `273053815` | WiseResume-TWC | `workflow_dispatch` |
| Deploy to Hostinger (WiseQuran → quran/) | `244949119` | wisequran | push to main + `workflow_dispatch` |

---

## What Went Wrong (History — Learn From This)

1. **2026-05-08 (Task #25):** A prior agent "fixed" the deploy path from `resume/` → `.`, putting WiseResume on `thewise.cloud` root. `resume.thewise.cloud` stopped receiving new deploys.
2. **2026-05-10:** While diagnosing the v4.1.1 version bump not showing on `resume.thewise.cloud`, the same `.` mistake was repeated and `mirror --delete` wiped the FTP root — taking down both `resume.thewise.cloud` and `quran.thewise.cloud`. Recovery required: re-deploying the WiseResume app to `resume/`, creating the `thewise.cloud` landing page, and triggering the wisequran deploy workflow manually.

**Lesson:** The `resume/` target in `deploy-frontend.yml` is intentional and correct. Do not "fix" it.

---

*Last updated: 2026-05-10 — Magdy Saber*

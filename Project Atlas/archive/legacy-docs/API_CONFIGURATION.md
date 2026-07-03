> [!CAUTION]
> Historical / archived document. Do not treat as current project truth. Use Project Atlas/SOURCE_OF_TRUTH_MAP.md and living specs for current references.

# API Configuration — VITE_API_URL Setup

> **Last updated:** 2026-05-23
> **Critical:** PDF export and server-side features depend on proper API configuration.

## Overview

The WiseResume app uses a **separate Express API server** for:
- PDF export (`/api/export/pdf-native`)
- Health checks (`/api/health`)

The frontend needs to know where this API server is located via the `VITE_API_URL` environment variable.

## Development Setup

### Local Development (localhost)

When running the app locally, use these settings:

**`.env.local`** (already created for you):
```env
VITE_API_URL=http://localhost:5001
```

**Start servers:**
```bash
npm run dev          # Frontend on :5000 (reads .env.local)
npm run server:dev   # API on :5001
```

The `.env.local` file is automatically loaded by Vite and takes precedence over `.env.example`.

### Dev Server with Custom Port

If you run the API on a different port, update `.env.local`:
```env
VITE_API_URL=http://localhost:YOUR_PORT
```

## Production Setup

### Live Domain (resume.thewise.cloud)

The build process reads `VITE_API_URL` from GitHub Secrets during `npm run build`:

```yaml
# In .github/workflows/deploy-frontend.yml
env:
  VITE_API_URL: ${{ secrets.VITE_API_URL }}
```

**Current production API URL:** `https://resume.thewise.cloud` (the same domain, since the API is also deployed there)

The secret is set to: `https://resume.thewise.cloud`

### Setting/Updating the Secret

1. Go to **GitHub → iammagdy/WiseResume-TWC → Settings → Secrets and variables → Actions**
2. Find or create `VITE_API_URL`
3. Set value to the production API base URL

## What Happens Without VITE_API_URL

❌ **Error:** `"PDF export is not available right now. Please try again later or use DOCX export."`

**Root cause:** Frontend cannot reach the PDF export endpoint because it doesn't know where the API server is.

**Fix:** Ensure `VITE_API_URL` is set in:
- Dev: `.env.local` (or export before running `npm run dev`)
- Build: GitHub Secrets
- Runtime: Environment variable passed to build process

## How to Verify It's Working

### Dev
```bash
# Frontend should show no "PDF export unavailable" errors
curl -s http://localhost:5000 | grep -i "export"

# API should respond to health check
curl http://localhost:5001/api/health
```

### Production
```bash
# Check that API is reachable from the built frontend
curl https://resume.thewise.cloud/api/health
```

## Files Involved

- **Frontend code:** `src/lib/nativePdfGenerator.ts` (line 169)
  - Reads: `import.meta.env.VITE_API_URL`
  - Calls: `${apiBase}/api/export/pdf-native`

- **API server:** `server/index.ts` (line 37)
  - Port: `process.env.API_PORT || 5001`
  - Endpoint: `POST /api/export/pdf-native`

- **Dev config:** `.env.local` (environment variables for Vite)

- **Build config:** `.github/workflows/deploy-frontend.yml` (production secrets)

- **Launch config:** `.claude/launch.json` (local dev server setup)

## Troubleshooting

| Symptom | Check |
|---------|-------|
| "PDF export unavailable" error | `.env.local` exists and `VITE_API_URL` is set to correct API base URL |
| API 404 errors in console | Make sure `VITE_API_URL` doesn't have a trailing slash (it should be `http://localhost:5001` not `http://localhost:5001/`) |
| Works locally but fails on live | GitHub Secret `VITE_API_URL` is set to production API URL (currently `https://resume.thewise.cloud`) |
| Blank/loading PDF export | Check network tab — request should POST to `$VITE_API_URL/api/export/pdf-native` |

#!/usr/bin/env bash
# Deploy all Supabase edge functions from the Replit environment.
#
# REPLIT ONE-STEP DEPLOY:
#   SUPABASE_ACCESS_TOKEN is pre-configured as a Replit secret, so you can
#   run this script directly from the Replit shell without any setup:
#
#     bash scripts/deploy-functions.sh
#
# OR trigger via GitHub Actions (preferred for production):
#   Manually dispatch "Deploy Edge Functions" workflow in GitHub Actions.
#
# DevKit deployment panel runbook — run in order when the panel stops showing commits:
# ─────────────────────────────────────────────────────────────────────────────────────
# Step 1: Refresh GitHub DevKit secrets in Supabase
#         Option A (from Replit shell, SUPABASE_ACCESS_TOKEN already set):
#           bash scripts/refresh-devkit-secrets.sh
#         Option B (GitHub Actions):
#           Dispatch "Refresh DevKit GitHub Token in Supabase" workflow
#           (requires GITHUB_PAT, SUPABASE_ACCESS_TOKEN, SUPABASE_PROJECT_REF secrets)
#
# Step 2: Redeploy edge functions to pick up the new secrets
#         Option A (from Replit shell — uses SUPABASE_ACCESS_TOKEN Replit secret):
#           bash scripts/deploy-functions.sh
#         Option B (GitHub Actions):
#           Dispatch "Deploy Edge Functions" workflow
#
# Step 3: Verify DevKit deployment panel
#         Navigate to DevKit → Deployment tab
#         Confirm the commit list loads without errors
# ─────────────────────────────────────────────────────────────────────────────────────

set -e

PROJECT_REF="jnsfmkzgxsviuthaqlyy"

if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
  echo "Error: SUPABASE_ACCESS_TOKEN is not set."
  echo "In Replit: it should already be configured as a secret."
  echo "Locally: export SUPABASE_ACCESS_TOKEN=<your-token>"
  exit 1
fi

echo "Deploying all edge functions to project $PROJECT_REF..."
npx supabase functions deploy --project-ref "$PROJECT_REF" --access-token "$SUPABASE_ACCESS_TOKEN"
echo "Done. Edge functions deployed."

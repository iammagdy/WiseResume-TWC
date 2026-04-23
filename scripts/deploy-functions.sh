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
FUNCTIONS_DIR="supabase/functions"

if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
  echo "Error: SUPABASE_ACCESS_TOKEN is not set."
  echo "In Replit: it should already be configured as a secret."
  echo "Locally: export SUPABASE_ACCESS_TOKEN=<your-token>"
  exit 1
fi

echo "Deploying all edge functions to project $PROJECT_REF..."
echo ""

DEPLOYED=0
FAILED=0
SKIPPED=0

for fn_dir in "$FUNCTIONS_DIR"/*/; do
  fn=$(basename "$fn_dir")
  entry="$fn_dir/index.ts"

  # Skip non-function entries (e.g. _shared, EDGE_FUNCTION_AUDIT.md treated as dir)
  if [[ "$fn" == _* ]] || [ ! -f "$entry" ]; then
    SKIPPED=$((SKIPPED + 1))
    continue
  fi

  echo "→ Deploying $fn..."
  if npx supabase functions deploy "$fn" --project-ref "$PROJECT_REF" --use-api 2>&1 | tail -1; then
    DEPLOYED=$((DEPLOYED + 1))
  else
    echo "  ⚠ Failed to deploy $fn — continuing..."
    FAILED=$((FAILED + 1))
  fi
done

echo ""
echo "Done. Deployed: $DEPLOYED, Failed: $FAILED, Skipped: $SKIPPED."

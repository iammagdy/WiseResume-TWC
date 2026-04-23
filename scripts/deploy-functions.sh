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

PROJECT_REF="jnsfmkzgxsviuthaqlyy"
FUNCTIONS_DIR="supabase/functions"
PARALLEL="${DEPLOY_PARALLEL:-8}"

if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
  echo "Error: SUPABASE_ACCESS_TOKEN is not set."
  echo "In Replit: it should already be configured as a secret."
  echo "Locally: export SUPABASE_ACCESS_TOKEN=<your-token>"
  exit 1
fi

echo "Deploying all edge functions to project $PROJECT_REF (parallel=$PARALLEL)..."
echo ""

LIST_FILE=$(mktemp)
trap 'rm -f "$LIST_FILE"' EXIT

for fn_dir in "$FUNCTIONS_DIR"/*/; do
  fn=$(basename "$fn_dir")
  entry="$fn_dir/index.ts"
  if [[ "$fn" == _* ]] || [ ! -f "$entry" ]; then continue; fi
  echo "$fn" >> "$LIST_FILE"
done

RESULT_FILE=$(mktemp)
trap 'rm -f "$LIST_FILE" "$RESULT_FILE"' EXIT

deploy_one() {
  local fn="$1"
  local log
  log=$(npx supabase functions deploy "$fn" --project-ref "$PROJECT_REF" --use-api 2>&1)
  if [ $? -eq 0 ] && echo "$log" | grep -q "Deployed Functions on project"; then
    echo "  OK   $fn"
    echo "OK $fn" >> "$RESULT_FILE"
  else
    echo "  FAIL $fn"
    echo "FAIL $fn" >> "$RESULT_FILE"
  fi
}
export -f deploy_one
export PROJECT_REF RESULT_FILE

TOTAL=$(wc -l < "$LIST_FILE")
cat "$LIST_FILE" | xargs -P "$PARALLEL" -n 1 -I {} bash -c 'deploy_one "$@"' _ {}

OK=$(grep -c "^OK " "$RESULT_FILE" 2>/dev/null || echo 0)
FAILED=$(grep -c "^FAIL " "$RESULT_FILE" 2>/dev/null || echo 0)

echo ""
echo "Summary: $OK/$TOTAL deployed, $FAILED failed."
if [ "$FAILED" -gt 0 ]; then
  echo "Failed functions:"
  grep "^FAIL " "$RESULT_FILE" | awk '{print "  - " $2}'
  exit 1
fi
exit 0

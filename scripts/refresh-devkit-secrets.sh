#!/usr/bin/env bash
# Refresh GitHub DevKit secrets in Supabase edge functions from the Replit shell.
# SUPABASE_ACCESS_TOKEN is pre-configured as a Replit secret — no setup needed.
#
# Usage:
#   bash scripts/refresh-devkit-secrets.sh <GITHUB_PAT>
#
# Example:
#   bash scripts/refresh-devkit-secrets.sh ghp_yourtoken
#
# After running this, redeploy edge functions:
#   bash scripts/deploy-functions.sh

set -e

PROJECT_REF="jnsfmkzgxsviuthaqlyy"
GITHUB_OWNER="iammagdy"
GITHUB_REPO="wiseresume-twc"

if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
  echo "Error: SUPABASE_ACCESS_TOKEN is not set."
  echo "In Replit: it should already be configured as a secret."
  exit 1
fi

if [ -z "$1" ]; then
  echo "Usage: bash scripts/refresh-devkit-secrets.sh <GITHUB_PAT>"
  echo "  GITHUB_PAT — Your GitHub personal access token (repo read scope)"
  exit 1
fi

GITHUB_PAT="$1"

echo "Pushing GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO to Supabase..."
RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST "https://api.supabase.com/v1/projects/$PROJECT_REF/secrets" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "[
    {\"name\": \"GITHUB_TOKEN\", \"value\": \"$GITHUB_PAT\"},
    {\"name\": \"GITHUB_OWNER\", \"value\": \"$GITHUB_OWNER\"},
    {\"name\": \"GITHUB_REPO\",  \"value\": \"$GITHUB_REPO\"}
  ]")
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -n -1)

echo "HTTP status: $HTTP_CODE"
if [ "$HTTP_CODE" != "200" ] && [ "$HTTP_CODE" != "201" ]; then
  echo "Error: Failed to push secrets (HTTP $HTTP_CODE): $BODY"
  exit 1
fi
echo "✅ Secrets pushed."

echo ""
echo "Verifying secrets are present in Supabase..."
VERIFY=$(curl -s -w "\n%{http_code}" \
  "https://api.supabase.com/v1/projects/$PROJECT_REF/secrets" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN")
VH=$(echo "$VERIFY" | tail -1)
VB=$(echo "$VERIFY" | head -n -1)

MISSING=0
for KEY in GITHUB_TOKEN GITHUB_OWNER GITHUB_REPO; do
  if echo "$VB" | python3 -c "import sys,json; d=json.load(sys.stdin); names=[s['name'] for s in d]; exit(0 if '$KEY' in names else 1)" 2>/dev/null; then
    echo "✅ $KEY verified"
  else
    echo "Error: $KEY not found in Supabase secrets after push"
    MISSING=1
  fi
done
[ "$MISSING" -eq 1 ] && exit 1

echo ""
echo "Verifying GitHub token can read commits..."
STATUS=$(curl -s -o /tmp/gh_commits.json -w "%{http_code}" \
  "https://api.github.com/repos/$GITHUB_OWNER/$GITHUB_REPO/commits?per_page=1" \
  -H "Authorization: Bearer $GITHUB_PAT" \
  -H "Accept: application/vnd.github+json" \
  -H "User-Agent: WiseResume-DevKit/1.0")
if [ "$STATUS" != "200" ]; then
  echo "Warning: GitHub token cannot read commits (HTTP $STATUS). Check token scope."
  cat /tmp/gh_commits.json
else
  echo "✅ GitHub token verified — DevKit deployment tab should now load commits."
fi

echo ""
echo "Done. Run 'bash scripts/deploy-functions.sh' to redeploy edge functions."

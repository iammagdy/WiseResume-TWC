#!/usr/bin/env bash
set -e

PROJECT_REF="jnsfmkzgxsviuthaqlyy"

if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
  echo "Error: SUPABASE_ACCESS_TOKEN is not set."
  echo "Run: export SUPABASE_ACCESS_TOKEN=<your-token>"
  exit 1
fi

echo "Deploying all edge functions to project $PROJECT_REF..."
npx supabase functions deploy --project-ref "$PROJECT_REF" --access-token "$SUPABASE_ACCESS_TOKEN"
echo "Done."

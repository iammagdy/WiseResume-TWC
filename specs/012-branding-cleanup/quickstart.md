# Quickstart: 012-branding-cleanup

## Automated Verification

Run the following command from the repository root to verify no prohibited strings remain in `src/`:

```powershell
git grep -iE 'lovable|bolt|wiseuniverse' src/
```

Expected result: **0 hits**.

## Manual Audit

1. **Portfolio Editor**:
    - Open the editor and load the default sample data.
    - Confirm the name is "Wise Portfolio".
    - Confirm the email is `contact@thewise.cloud`.

2. **AI Settings**:
    - Open Settings -> AI.
    - Confirm the primary AI health check identifies as "WiseResume AI".

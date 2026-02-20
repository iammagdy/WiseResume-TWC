
# Stop Automatic APK Builds on Push

## Problem
The `.github/workflows/build-apk.yml` workflow triggers on both `workflow_dispatch` (manual) and `push` to `main`. Every Lovable commit triggers a new APK build, consuming GitHub Actions minutes.

## Fix
Remove the `push` trigger from the workflow, keeping only `workflow_dispatch`. This means builds will only run when you manually click "Run workflow" in GitHub Actions.

## Technical Change

### File: `.github/workflows/build-apk.yml`

Change the `on:` block from:
```yaml
on:
  workflow_dispatch:
  push:
    branches: [main]
```

To:
```yaml
on:
  workflow_dispatch:
```

One line removed, no other changes needed.

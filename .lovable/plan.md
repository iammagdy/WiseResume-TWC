

## Fix: Add Android Platform in GitHub Actions

### Root Cause
The workflow runs `npx cap sync android`, but the Android platform was never added first. The `android/` directory is not committed to the repository (it's likely in `.gitignore`), so each CI run starts without it.

### Solution
Add `npx cap add android` before `npx cap sync android` in `.github/workflows/build-apk.yml`. The `cap add` command creates the `android/` directory and project files, then `cap sync` copies the web assets and native plugins.

### Technical Details

**File: `.github/workflows/build-apk.yml`**

Add a new step before "Sync Capacitor":

```yaml
- name: Add Android platform
  run: npx cap add android

- name: Sync Capacitor
  run: npx cap sync android
```

Also, after sync, re-inject the custom brand icons into the Android `mipmap` directories (since `cap add` generates default icons). Add a step to copy from `public/icons/` into the appropriate `res/mipmap-*` folders, matching the existing icon injection logic referenced in the project memory.

This is a single-file change to the workflow YAML.

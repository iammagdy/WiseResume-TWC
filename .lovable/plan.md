

## Build APK via GitHub Actions (No Android Studio Required)

### How It Works
Every time you push code to GitHub, a workflow will automatically build the Android APK and make it available for download — all in the cloud.

### Steps

#### Step 1: Prepare Capacitor Config for Production
Remove the live preview URL from `capacitor.config.ts` so the APK uses the built-in files instead of loading from the internet. Also ensure the splash screen hides correctly.

#### Step 2: Create GitHub Actions Workflow
Add a workflow file at `.github/workflows/build-apk.yml` that will:
- Check out your code
- Install Node.js and dependencies
- Run `npm run build` to build the web app
- Add the Android platform (`npx cap add android`)
- Sync web assets to Android (`npx cap sync android`)
- Set up Java 17 (required by Android/Gradle)
- Build the debug APK using Gradle directly (no Android Studio needed)
- Upload the APK as a downloadable artifact

#### Step 3: Download Your APK
After pushing, go to your GitHub repository, click the **Actions** tab, select the completed workflow run, and download the APK from the **Artifacts** section at the bottom.

---

### Technical Details

**New file: `.github/workflows/build-apk.yml`**
```yaml
name: Build Android APK

on:
  workflow_dispatch:   # Manual trigger from GitHub UI
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Build web app
        run: npm run build

      - name: Add Android platform
        run: npx cap add android

      - name: Sync Capacitor
        run: npx cap sync android

      - name: Setup Java 17
        uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: 17

      - name: Build APK
        working-directory: android
        run: ./gradlew assembleDebug

      - name: Upload APK
        uses: actions/upload-artifact@v4
        with:
          name: wiseresume-debug-apk
          path: android/app/build/outputs/apk/debug/app-debug.apk
```

**Modified file: `capacitor.config.ts`**
- Remove the `server.url` property so the app loads from the local bundle
- Keep all other settings (splash screen, keyboard, colors) unchanged

---

### What You'll Do
1. I'll make the two changes above (workflow file + config update)
2. Export your project to GitHub (if not already connected)
3. Go to your repo on GitHub, click **Actions** tab
4. Click "Build Android APK" workflow, then **Run workflow** (or it runs automatically on push)
5. Wait about 3-5 minutes for the build
6. Download the APK from the **Artifacts** section
7. Transfer the APK to your Android phone and install it

### Important Notes
- This builds a **debug APK** (not signed for Play Store, but works fine for personal use and testing)
- The APK will work fully offline since it bundles all web assets
- If you later want a signed release APK for the Play Store, we can add signing keys to the workflow


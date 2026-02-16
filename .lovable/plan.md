

## Set Up Signed Release APK Builds

### What This Does

Instead of building a debug APK (which can't be uploaded to the Play Store), the workflow will produce a **signed release APK** using your own keystore. This is required for publishing to Google Play.

### Prerequisites (You Need to Do This First)

Before I update the workflow, you need to:

1. **Generate a keystore** on your computer by running this command:
   ```
   keytool -genkey -v -keystore wiseresume-release.keystore -alias wiseresume -keyalg RSA -keysize 2048 -validity 10000
   ```
   It will ask you for a password and some info (name, organization, etc.). **Remember the password** -- you'll need it.

2. **Add 4 secrets to your GitHub repository** (Settings > Secrets and variables > Actions > New repository secret):
   - `KEYSTORE_BASE64` -- Run this to get the value: `base64 -i wiseresume-release.keystore` (copy the entire output)
   - `KEYSTORE_PASSWORD` -- The password you chose
   - `KEY_ALIAS` -- `wiseresume` (or whatever alias you used)
   - `KEY_PASSWORD` -- Same as keystore password (unless you set a different one)

### File Change: `.github/workflows/build-apk.yml`

The workflow will be updated to:

- Decode the keystore from the GitHub secret
- Run `assembleRelease` instead of `assembleDebug`
- Sign the APK using your keystore credentials
- Upload the signed release APK as the artifact

**Updated Build APK step:**
```yaml
- name: Decode Keystore
  run: echo "${{ secrets.KEYSTORE_BASE64 }}" | base64 -d > android/app/wiseresume-release.keystore

- name: Build Signed Release APK
  working-directory: android
  run: ./gradlew assembleRelease
  env:
    KEYSTORE_FILE: wiseresume-release.keystore
    KEYSTORE_PASSWORD: ${{ secrets.KEYSTORE_PASSWORD }}
    KEY_ALIAS: ${{ secrets.KEY_ALIAS }}
    KEY_PASSWORD: ${{ secrets.KEY_PASSWORD }}
```

A `signingConfigs` block will also be injected into `android/app/build.gradle` during the CI pipeline (since the `android/` folder is generated fresh each run) to wire up the keystore.

**Updated Upload step:**
```yaml
- name: Upload Signed APK
  uses: actions/upload-artifact@v4
  with:
    name: wiseresume-release-apk
    path: android/app/build/outputs/apk/release/app-release.apk
```

### Summary

| Item | Detail |
|------|--------|
| File changed | `.github/workflows/build-apk.yml` |
| New GitHub secrets needed | `KEYSTORE_BASE64`, `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD` |
| Output | Signed release APK ready for Play Store |
| Trigger | Same as before -- push to `main` or manual |


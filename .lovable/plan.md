

# Fix APK Build: Deep Link Intent Filter Injection

## Problem

The "Inject deep link intent filters" step fails with `sed: -e expression #1, char 80: unknown command: '<'`. This happens because `sed`'s insert (`i\`) command doesn't handle multiline strings containing `<` and `/` characters well -- they conflict with sed's syntax.

## Fix

Replace the `sed` approach with a Python one-liner (or `sed` with a temp file approach). The simplest reliable fix is to use `sed` with a separate file:

1. Write the intent filters XML to a temporary file
2. Use `sed` to read that file into the manifest at the correct location (using `r` command instead of `i`)

Alternatively, use `awk` which handles multiline insertions cleanly.

## Technical Change

### File: `.github/workflows/build-apk.yml` (lines 50-69)

Replace the current "Inject deep link intent filters" step with one that:
1. Writes the intent filter XML block to a temp file (`/tmp/intent-filters.xml`)
2. Uses `sed` with the `r` (read file) command to insert before `</activity>`, which avoids all escaping issues

The new step will look like:

```yaml
- name: Inject deep link intent filters
  run: |
    MANIFEST="android/app/src/main/AndroidManifest.xml"
    cat > /tmp/intent-filters.xml << 'EOF'
            <intent-filter android:autoVerify="true">
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="https" android:host="localhost" android:pathPrefix="/auth/callback" />
            </intent-filter>
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="com.wiseresume.app" android:host="auth" android:pathPrefix="/callback" />
            </intent-filter>
    EOF
    sed -i '/<\/activity>/r /tmp/intent-filters.xml' "$MANIFEST"
    echo "Intent filters injected"
```

This approach avoids all escaping issues because the XML content is in a separate file, never parsed by `sed` as a command.

No other files change.


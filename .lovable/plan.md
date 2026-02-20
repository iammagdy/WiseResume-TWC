

# Fix Intent Filter Placement in APK Build

## Problem

The `sed` command using `r` (read) inserts the intent-filter XML **after** the `</activity>` closing tag, placing the filters directly inside `<application>` instead of inside `<activity>`. This causes the AAPT error: `unexpected element <intent-filter> found in <manifest><application>`.

## Root Cause

`sed`'s `r` command always appends content **after** the matched line. So matching `</activity>` and reading the file puts the XML outside the activity element.

## Fix

Replace the `sed` approach with an `awk` script that inserts the temp file content **before** the `</activity>` line, keeping the intent filters inside the `<activity>` element.

## Technical Change

### File: `.github/workflows/build-apk.yml`

Replace the final `sed` line in the "Inject deep link intent filters" step:

```yaml
# FROM:
sed -i '/<\/activity>/r /tmp/intent-filters.xml' "$MANIFEST"

# TO:
awk '/<\/activity>/{while((getline line < "/tmp/intent-filters.xml")>0) print line} 1' "$MANIFEST" > /tmp/manifest_patched.xml
mv /tmp/manifest_patched.xml "$MANIFEST"
```

This `awk` command reads each line of the manifest; when it encounters `</activity>`, it first prints all lines from the intent-filters file, then prints the `</activity>` line -- placing the filters correctly inside the activity element.

No other files change.


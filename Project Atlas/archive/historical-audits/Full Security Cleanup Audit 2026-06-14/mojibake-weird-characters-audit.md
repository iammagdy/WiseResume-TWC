# Mojibake / Weird Characters Audit - WiseResume 2026-06-14

**Scope:** Search for encoding artifacts, replacement characters, corrupted text  
**Method:** Pattern-based grep search + manual file inspection

---

## Summary

| Category | Count | Status |
|----------|-------|--------|
| Intentional encoding fixes | 1 file | ✓ CORRECT |
| Suspicious characters | 0 files | ✓ NONE FOUND |
| Replacement characters () | 0 files | ✓ NONE FOUND |
| Control characters | 0 files | ✓ NONE FOUND |
| Line ending issues | Unknown | Not analyzed |

---

## Intentional Encoding Fixes (CORRECT - Do Not Modify)

### File: `src/lib/pdf/textPreprocessor.ts`

**Lines 52-68:** These are INTENTIONAL mojibake recovery patterns for PDF text extraction.

```typescript
export function stripNonPrintable(text: string): string {
  return text
    // Remove zero-width characters
    .replace(/[\u200B-\u200F\u2028-\u202F\uFEFF]/g, '')
    // Remove control characters except newline/tab
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Fix common encoding artifacts
    .replace(/â€™/g, "'")      // Smart quote apostrophe
    .replace(/â€"/g, "—")     // Em dash
    .replace(/â€œ/g, '"')      // Left smart quote
    .replace(/â€[^a-zA-Z]/g, '"')  // Right smart quote pattern
    .replace(/Ã©/g, 'é')       // French é
    .replace(/Ã¨/g, 'è')       // French è
    .replace(/Ã¼/g, 'ü')       // German ü
    .replace(/Ã¶/g, 'ö')       // German ö
    .replace(/Ã¤/g, 'ä');      // German ä
}
```

**Explanation:**
- PDF text extraction often produces UTF-8 interpreted as Latin-1
- These patterns recover common characters from corrupted extraction
- **DO NOT FIX THESE** - They are working as designed

---

## Unicode Bullet Normalization (CORRECT)

### File: `src/lib/pdf/textPreprocessor.ts`

**Lines 39-47:** Intentional Unicode bullet conversion

```typescript
export function normalizeBullets(text: string): string {
  return text
    // Unicode bullets: ●, ◦, ◆, ▪, ▸, ►, ✓, ✔, ✦, ⁃, ‣
    .replace(/^[\s]*[●◦◆▪▸►✓✔✦⁃‣■□▶→⇒➢➤➣➜•·∙⋅]/gm, '-')
    // ...
}
```

**Status:** ✓ INTENTIONAL - Normalizes PDF bullets for consistent processing

---

## No Unintentional Mojibake Found

### Search Pattern Results

| Pattern | Matches | Interpretation |
|---------|---------|----------------|
| `Ã©\|Ã¨\|Ã¼\|Ã¶\|Ã¤\|ÃŸ\|Ã` | 5 | All in textPreprocessor.ts (intentional) |
| `ï¿½` (replacement char) | 0 | None found |
| `\x{FFFD}` | 0 | None found |
| `\x{0080}-\x{009F}` | 0 | None found |

---

## Files Examined

### Source Files (TypeScript/JavaScript)
- All `*.ts`, `*.tsx`, `*.js` files searched
- No unintentional encoding issues found

### Documentation
- Markdown files checked
- No visible encoding issues

### JSON Files
- No encoding issues detected

---

## Potential False Positives (Not Issues)

### 1. Regex Character Classes
Some files contain regex patterns with extended ASCII ranges. These are **intentional** for:
- PDF text processing
- Email validation
- URL parsing

Example:
```typescript
/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/  // Email regex
```

### 2. Unicode in Strings
International characters in UI strings are **intentionAL**.

---

## Encoding Configuration

### Repository Settings
| Setting | Value | Status |
|---------|-------|--------|
| Git line endings | Not specified | Use .gitattributes |
| Editor config | Unknown | Recommend UTF-8 |
| BOM | Not present | ✓ Good |

### File Encodings
| File Type | Expected | Status |
|-----------|----------|--------|
| *.ts, *.tsx | UTF-8 | ✓ Correct |
| *.js | UTF-8 | ✓ Correct |
| *.json | UTF-8 | ✓ Correct |
| *.md | UTF-8 | ✓ Correct |

---

## Recommendations

### Immediate Actions

**NONE REQUIRED** - No encoding issues found.

### Best Practices (Optional)

1. **Add .gitattributes** to enforce line endings:
```gitattributes
* text=auto eol=lf
*.ts text eol=lf
*.tsx text eol=lf
*.js text eol=lf
*.json text eol=lf
*.md text eol=lf
```

2. **EditorConfig** (if not present):
```ini
[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
```

### Files to NOT Touch

| File | Reason |
|------|--------|
| `src/lib/pdf/textPreprocessor.ts` | Intentional mojibake recovery |

---

## Conclusion

The WiseResume codebase shows **excellent encoding hygiene**:

- ✅ No unintentional mojibake
- ✅ No replacement characters
- ✅ No control character issues
- ✅ Intentional encoding fixes properly implemented
- ✅ UTF-8 encoding throughout

**No action required for encoding issues.**

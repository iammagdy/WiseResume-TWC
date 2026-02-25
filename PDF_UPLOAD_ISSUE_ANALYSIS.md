# 🔍 PDF Upload Issue - Root Cause Analysis

## 📋 Problem Statement

**Issue:** When uploading a PDF, the app resets and redirects back to the upload page instead of proceeding to the editor.

**Expected:** PDF → Parse → Import Review → Editor  
**Actual:** PDF → Parse → **Reset** → Upload Page

---

## 🎯 Root Causes Identified

### **1. Parse Timeout (60s limit)**
**Location:** `/app/src/lib/pdfParser.ts:21`
```typescript
const PARSE_TIMEOUT = 60000; // 60 seconds
```

**Issue:**  
- Complex PDFs with many pages can exceed 60s
- Timeout causes AbortError and fallback to local parser
- If local parser also fails → No error handling → App resets

**Fix:** Increase timeout for AI parsing to 120s

---

### **2. Missing Error Boundaries**
**Location:** UploadPage component
**Issue:**
- Unhandled promise rejections cause React to unmount
- Page errors not caught by ErrorBoundary
- User sees reset instead of error message

**Fix:** Add try-catch to all async handlers, wrap in ErrorBoundary

---

### **3. Authentication Session Issues**
**Location:** `/app/src/lib/pdfParser.ts:49-54`
```typescript
const { data: { session } } = await supabase.auth.getSession();

if (!session?.access_token) {
  console.warn('No auth session, falling back to local parser');
  return parseResumeText(text);
}
```

**Issue:**
- If session expires during upload → Falls back to local parser
- Local parser may fail silently → No resume data → Reset

**Fix:** Refresh session before parsing, show auth error to user

---

### **4. Large PDF Handling**
**Location:** Multiple places
**Issue:**
- PDFs > 10MB rejected but message unclear
- Multi-page PDFs (>20 pages) slow down significantly
- OCR for scanned PDFs takes >2 minutes with no progress indicator

**Fix:** Better size limits, progress indicators, chunked processing

---

### **5. Edge Function Errors Not Surfaced**
**Location:** `parse-resume` edge function
**Issue:**
- Rate limiting (10 requests/60s) can be exceeded
- AI errors from Gemini not shown to user
- EMERGENT_LLM_KEY might not be configured → Silent failure

**Fix:** Better error messages, retry logic, check key configuration

---

## 🔧 Fixes to Implement

### **Priority 1: Critical Fixes**

#### Fix 1: Increase Parse Timeout
```typescript
// /app/src/lib/pdfParser.ts
const PARSE_TIMEOUT = 120000; // 120 seconds (was 60s)
```

#### Fix 2: Add Error Recovery
```typescript
// In UploadPage.tsx
try {
  const result = await parseResumePDF(file);
  // existing code
} catch (error) {
  console.error('PDF parsing error:', error);
  
  // Show specific error to user
  if (error.message.includes('timeout')) {
    toast.error('PDF is too complex. Try reducing pages or using OCR mode.');
  } else if (error.message.includes('auth')) {
    toast.error('Session expired. Please refresh and try again.');
  } else {
    toast.error('Failed to parse PDF. Please try again or use a different file.');
  }
  
  setErrorType('UNKNOWN');
  setShowErrorRecovery(true);
}
```

#### Fix 3: Refresh Auth Session Before Parsing
```typescript
// Add before calling parse-resume
const { data: { session }, error } = await supabase.auth.refreshSession();
if (error || !session) {
  throw new Error('Authentication required. Please log in again.');
}
```

---

### **Priority 2: User Experience**

#### Fix 1: Better Progress Indicators
```typescript
// Show detailed progress for each step
setParseStep('reading');     // "Reading PDF..."
setParseStep('extracting');  // "Extracting text (Page 3/10)..."
setParseStep('analyzing');   // "Analyzing with AI (45% complete)..."
setParseStep('complete');    // "Done!"
```

#### Fix 2: Size and Page Limits
```typescript
// Before processing
if (file.size > 10 * 1024 * 1024) {
  toast.error('PDF must be under 10MB. Please reduce file size.');
  return;
}

// After PDF load
if (pageCount > 20) {
  toast.warning('Large PDF detected (${pageCount} pages). This may take 2-3 minutes.');
}
```

#### Fix 3: OCR Timeout Handling
```typescript
// In ocrExtractor.ts
const OCR_TIMEOUT_PER_PAGE = 30000; // 30s per page

const timeoutId = setTimeout(() => {
  worker.terminate();
  throw new Error('OCR timeout. Page may be too complex.');
}, OCR_TIMEOUT_PER_PAGE);
```

---

### **Priority 3: Edge Function Improvements**

#### Fix 1: Better Error Messages
```typescript
// In parse-resume/index.ts
} catch (error) {
  console.error('parse-resume error:', error);
  
  let userMessage = 'Failed to parse resume';
  let statusCode = 500;
  
  if (isAIError(error)) {
    const userError = toUserError(error);
    userMessage = userError.message;
    statusCode = userError.status;
  } else if (error.message.includes('timeout')) {
    userMessage = 'AI parsing took too long. The PDF may be too complex. Try OCR mode instead.';
    statusCode = 408;
  } else if (error.message.includes('quota')) {
    userMessage = 'AI quota exceeded. Please try again in a few minutes.';
    statusCode = 429;
  }
  
  return new Response(
    JSON.stringify({ error: userMessage, details: error.message }),
    { status: statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
```

#### Fix 2: Verify EMERGENT_LLM_KEY
```typescript
// At start of parse-resume function
const EMERGENT_KEY = Deno.env.get('EMERGENT_LLM_KEY');
console.log('🔑 AI configuration:', {
  hasEmergentKey: !!EMERGENT_KEY,
  hasGeminiKey: !!Deno.env.get('GEMINI_API_KEY'),
  model: 'gemini-2.5-flash'
});

if (!EMERGENT_KEY && !Deno.env.get('GEMINI_API_KEY')) {
  console.error('❌ No AI keys configured!');
  return new Response(
    JSON.stringify({ error: 'AI service not configured. Please contact support.' }),
    { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
```

---

## 🧪 Testing Checklist

### Test Cases:
1. **Small PDF (1-2 pages, <1MB)**
   - [ ] Uploads successfully
   - [ ] Parses in <10 seconds
   - [ ] Shows import review
   - [ ] Editor loads with data

2. **Large PDF (10+ pages, 5-10MB)**
   - [ ] Shows progress indicator
   - [ ] Completes within timeout
   - [ ] Shows warning about processing time
   - [ ] Data extracted correctly

3. **Scanned PDF (image-based)**
   - [ ] Detects need for OCR
   - [ ] Prompts user for OCR
   - [ ] Shows OCR progress (page-by-page)
   - [ ] Completes successfully

4. **Complex PDF (many sections)**
   - [ ] Parses all sections
   - [ ] Experience items all captured
   - [ ] Skills list complete
   - [ ] Contact info correct

5. **Error Cases**
   - [ ] Session expired → Clear error message
   - [ ] AI timeout → Fallback to local parser
   - [ ] Corrupted PDF → Error recovery UI
   - [ ] Rate limit → Retry after message

---

## 📊 Performance Benchmarks

| PDF Type | Pages | Size | Expected Time | Max Timeout |
|----------|-------|------|---------------|-------------|
| Simple | 1-2 | <1MB | 5-10s | 30s |
| Standard | 3-5 | 1-3MB | 10-20s | 60s |
| Large | 6-10 | 3-7MB | 20-40s | 120s |
| Very Large | 11-20 | 7-10MB | 40-90s | 180s |
| Scanned (OCR) | 1-5 | Any | 30-120s | 300s |

---

## 🎯 Immediate Actions

### **For User (Now):**
1. Try smaller PDFs (1-3 pages)
2. Ensure good internet connection
3. If it fails, try OCR mode manually
4. Check browser console for errors

### **For Developer (Priority):**
1. ✅ Increase parse timeout to 120s
2. ✅ Add auth session refresh
3. ✅ Improve error messages
4. ✅ Add progress indicators
5. ✅ Verify EMERGENT_LLM_KEY configured

---

## 🔍 Debugging Commands

### Check Edge Function Logs:
```bash
# In Supabase dashboard
Settings → Edge Functions → parse-resume → View Logs

# Look for:
- "parse-resume error:"
- "AI configuration:"
- Timeout errors
- Auth errors
```

### Test Edge Function Directly:
```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/parse-resume \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"text":"John Doe\n555-1234\njohn@example.com\n\nExperience: Software Engineer"}'
```

---

## 💡 Long-term Improvements

1. **Chunked Processing:** Break large PDFs into chunks
2. **Background Jobs:** Process PDFs server-side with status polling
3. **Caching:** Cache parsed results for 24h
4. **Smart Retry:** Automatic retry with exponential backoff
5. **Model Selection:** Let users choose faster/cheaper models

---

*Analysis Date: March 2026*
*Version: 2.3.1*

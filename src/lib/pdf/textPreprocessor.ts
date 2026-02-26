/**
 * Smart Text Preprocessor for Resume Text
 * 
 * Cleans and enhances extracted text before AI parsing to improve accuracy.
 * Runs client-side between extraction and AI call.
 */

/**
 * Fix PascalCase/camelCase concatenated words from PDF extraction.
 * e.g. "SoftwareEngineer" → "Software Engineer"
 */
export function fixConcatenatedWords(text: string): string {
  // Protect emails and URLs from being split by PascalCase logic
  const protectedTokens: { placeholder: string; original: string }[] = [];
  let safeText = text.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, (match) => {
    const ph = `__EMAIL_${protectedTokens.length}__`;
    protectedTokens.push({ placeholder: ph, original: match });
    return ph;
  }).replace(/https?:\/\/\S+/g, (match) => {
    const ph = `__URL_${protectedTokens.length}__`;
    protectedTokens.push({ placeholder: ph, original: match });
    return ph;
  });

  // Split PascalCase: "SoftwareEngineer" → "Software Engineer"
  safeText = safeText.replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]{2,})([A-Z][a-z])/g, '$1 $2');

  // Restore protected tokens
  for (const { placeholder, original } of protectedTokens) {
    safeText = safeText.replace(placeholder, original);
  }
  return safeText;
}

/**
 * Normalize various bullet characters to standard dash bullets.
 */
export function normalizeBullets(text: string): string {
  return text
    // Unicode bullets: ●, ◦, ◆, ▪, ▸, ►, ✓, ✔, ✦, ⁃, ‣
    .replace(/^[\s]*[●◦◆▪▸►✓✔✦⁃‣■□▶→⇒➢➤➣➜•·∙⋅]/gm, '-')
    // Double-dash or em-dash bullets
    .replace(/^[\s]*[—–]{1,2}\s*/gm, '- ')
    // Ensure space after dash bullet
    .replace(/^-(?=\S)/gm, '- ');
}

/**
 * Strip non-printable characters and fix encoding artifacts.
 */
export function stripNonPrintable(text: string): string {
  return text
    // Remove zero-width characters
    .replace(/[\u200B-\u200F\u2028-\u202F\uFEFF]/g, '')
    // Remove control characters except newline/tab
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Fix common encoding artifacts
    .replace(/â€™/g, "'")
    .replace(/â€"/g, "—")
    .replace(/â€œ/g, '"')
    .replace(/â€[^a-zA-Z]/g, '"')
    .replace(/Ã©/g, 'é')
    .replace(/Ã¨/g, 'è')
    .replace(/Ã¼/g, 'ü')
    .replace(/Ã¶/g, 'ö')
    .replace(/Ã¤/g, 'ä');
}

/**
 * Collapse excessive whitespace while preserving meaningful line breaks.
 */
export function normalizeWhitespace(text: string): string {
  return text
    // Replace tabs with spaces
    .replace(/\t/g, '  ')
    // Collapse multiple spaces to single
    .replace(/ {3,}/g, '  ')
    // Remove trailing whitespace per line
    .replace(/[ \t]+$/gm, '')
    // Collapse 3+ consecutive blank lines to 2
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}

/**
 * Detect and remove repeated headers/footers across page boundaries.
 * These appear as identical text blocks repeated every N lines.
 */
export function removeHeadersFooters(pages: string[]): string[] {
  if (pages.length < 2) return pages;

  // Find lines that appear identically on multiple pages (likely headers/footers)
  const lineFrequency = new Map<string, number>();
  
  for (const page of pages) {
    const lines = page.split('\n');
    // Check first 3 and last 3 lines of each page
    const candidates = [
      ...lines.slice(0, 3),
      ...lines.slice(-3),
    ];
    
    const seen = new Set<string>();
    for (const line of candidates) {
      const trimmed = line.trim();
      if (trimmed.length < 3 || trimmed.length > 100) continue;
      // Skip lines that look like resume content
      if (/^(experience|education|skills|summary|projects|certifications)/i.test(trimmed)) continue;
      
      if (!seen.has(trimmed)) {
        seen.add(trimmed);
        lineFrequency.set(trimmed, (lineFrequency.get(trimmed) || 0) + 1);
      }
    }
  }

  // Lines appearing on 2+ pages are likely headers/footers
  const repeatedLines = new Set<string>();
  for (const [line, count] of lineFrequency) {
    if (count >= 2) repeatedLines.add(line);
  }

  if (repeatedLines.size === 0) return pages;

  return pages.map(page => {
    const lines = page.split('\n');
    return lines
      .filter(line => !repeatedLines.has(line.trim()))
      .join('\n');
  });
}

/**
 * Main preprocessing pipeline.
 * Cleans extracted text before sending to AI for parsing.
 */
export function preprocessResumeText(text: string, pageTexts?: string[]): string {
  // Step 1: If we have per-page text, remove headers/footers first
  let processedText: string;
  if (pageTexts && pageTexts.length > 1) {
    const cleanedPages = removeHeadersFooters(pageTexts);
    processedText = cleanedPages.join('\n\n');
  } else {
    processedText = text;
  }

  // Step 2: Strip non-printable characters and encoding artifacts
  processedText = stripNonPrintable(processedText);

  // Step 3: Fix concatenated words from PDF extraction
  processedText = fixConcatenatedWords(processedText);

  // Step 4: Normalize bullet characters
  processedText = normalizeBullets(processedText);

  // Step 5: Clean up whitespace
  processedText = normalizeWhitespace(processedText);

  return processedText;
}

/**
 * Extract contact info hints using regex before AI parsing.
 * Scans the first 15 lines for emails, phones to give the AI a strong signal.
 */
export function extractContactHints(text: string): string {
  const lines = text.split('\n').slice(0, 15).join('\n');
  
  const emails = lines.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
  const phones = lines.match(/(?:\+?\d{1,4}[\s\-.]?)?\(?\d{2,4}\)?[\s\-.]?\d{3,4}[\s\-.]?\d{3,4}/g) || [];

  if (emails.length === 0 && phones.length === 0) return '';

  const parts: string[] = ['--- CONTACT INFO HINTS (extracted by regex) ---'];
  if (emails.length > 0) parts.push(`Potential emails: ${[...new Set(emails)].join(', ')}`);
  if (phones.length > 0) parts.push(`Potential phones: ${[...new Set(phones)].join(', ')}`);

  return '\n\n' + parts.join('\n');
}

/**
 * Compute a text quality confidence score (0-1).
 * Used to decide if OCR or additional processing is needed.
 */
export function computeTextConfidence(text: string): { confidence: number; issues: string[] } {
  const issues: string[] = [];
  let score = 1.0;

  const cleanedText = text.replace(/\s+/g, ' ').trim();
  const words = cleanedText.split(/\s+/).filter(w => w.length > 1);
  const wordCount = words.length;

  // Word count checks
  if (wordCount < 20) {
    score -= 0.5;
    issues.push('very low word count');
  } else if (wordCount < 50) {
    score -= 0.25;
    issues.push('low word count');
  }

  // Check for common resume keywords
  const resumeKeywords = /\b(experience|education|skills|work|university|degree|manager|engineer|developer|analyst|company|role|position|responsibilities|achievements|projects?|certifications?|email|phone|address)\b/i;
  const keywordMatches = cleanedText.match(new RegExp(resumeKeywords.source, 'gi'));
  if (!keywordMatches || keywordMatches.length < 2) {
    score -= 0.2;
    issues.push('few resume keywords detected');
  }

  // Check for email presence (strong signal)
  const hasEmail = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(cleanedText);
  if (!hasEmail) {
    score -= 0.1;
    issues.push('no email detected');
  }

  // Check for garbage ratio (non-printable or unusual characters)
  const printableRatio = cleanedText.replace(/[^\x20-\x7E\u00C0-\u024F\u0400-\u04FF\u0600-\u06FF\u0900-\u097F\u4E00-\u9FFF\u3040-\u30FF\uAC00-\uD7AF\u05D0-\u05FF]/g, '').length / Math.max(cleanedText.length, 1);
  if (printableRatio < 0.7) {
    score -= 0.3;
    issues.push('high garbage character ratio');
  } else if (printableRatio < 0.85) {
    score -= 0.15;
    issues.push('some garbage characters');
  }

  // Check average word length (too short or too long suggests extraction issues)
  const avgWordLen = words.reduce((sum, w) => sum + w.length, 0) / Math.max(words.length, 1);
  if (avgWordLen < 2.5 || avgWordLen > 15) {
    score -= 0.15;
    issues.push('unusual word lengths');
  }

  // Check for multi-column artifacts (lots of short lines)
  const lines = text.split('\n').filter(l => l.trim());
  const shortLineRatio = lines.filter(l => l.trim().length < 15).length / Math.max(lines.length, 1);
  if (shortLineRatio > 0.5 && wordCount > 30) {
    score -= 0.1;
    issues.push('possible multi-column layout');
  }

  return { confidence: Math.max(0, Math.min(1, score)), issues };
}

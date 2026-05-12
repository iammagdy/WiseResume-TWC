#!/usr/bin/env node
import { existsSync, mkdirSync, copyFileSync, readdirSync, statSync, writeFileSync, readFileSync, unlinkSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import https from 'node:https';

// Pinned SHA-256 of eng.traineddata.gz at @tesseract.js-data/eng@4.0.0.
// Computed from the canonical jsdelivr-served file; verified twice. If
// jsdelivr ever serves a different blob (mirror compromise, replaced
// release, etc.) the build fails loudly instead of silently bundling
// untrusted bytes into the app's OCR engine.
const ENG_SHA256 = 'ed350f3752f81ee8f38769edc14d92d997dababe23b565c59879372cc46a2468';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const NM = join(ROOT, 'node_modules');
const PUB = join(ROOT, 'public');
const CACHE = join(ROOT, 'scripts', '.cache');

function ensureDir(p) {
  if (!existsSync(p)) mkdirSync(p, { recursive: true });
}

function copyIfNewer(src, dst) {
  if (!existsSync(src)) {
    throw new Error(`Source missing: ${relative(ROOT, src)}`);
  }
  const sstat = statSync(src);
  if (existsSync(dst)) {
    const dstat = statSync(dst);
    if (dstat.mtimeMs >= sstat.mtimeMs && dstat.size === sstat.size) {
      return false;
    }
  }
  ensureDir(dirname(dst));
  copyFileSync(src, dst);
  return true;
}

function copyDir(srcDir, dstDir) {
  ensureDir(dstDir);
  let copied = 0;
  for (const name of readdirSync(srcDir)) {
    const s = join(srcDir, name);
    const d = join(dstDir, name);
    const st = statSync(s);
    if (st.isDirectory()) {
      copied += copyDir(s, d);
    } else if (copyIfNewer(s, d)) {
      copied++;
    }
  }
  return copied;
}

function sha256OfFile(p) {
  return createHash('sha256').update(readFileSync(p)).digest('hex');
}

/**
 * Attempt a single HTTPS download with redirect following.
 * Resolves with the downloaded Buffer on success; rejects on failure.
 */
function httpDownload(url) {
  return new Promise((res, rej) => {
    const get = (u, redirectsLeft = 5) => {
      const req = https.get(u, (response) => {
        if ([301, 302, 303, 307, 308].includes(response.statusCode) && response.headers.location && redirectsLeft > 0) {
          response.resume();
          get(response.headers.location, redirectsLeft - 1);
          return;
        }
        if (response.statusCode !== 200) {
          rej(new Error(`HTTP ${response.statusCode} for ${u}`));
          return;
        }
        const chunks = [];
        response.on('data', (c) => chunks.push(c));
        response.on('end', () => res(Buffer.concat(chunks)));
        response.on('error', rej);
      });
      req.on('error', rej);
      req.setTimeout(120_000, () => { req.destroy(); rej(new Error(`Request timed out after 120s: ${u}`)); });
    };
    get(url);
  });
}

/**
 * Download url → dst, verifying sha256, with up to maxAttempts retries and
 * exponential back-off.  Returns true when the file was (re)downloaded, false
 * when the cached copy was already valid.  Throws only after all retries are
 * exhausted — callers decide whether to treat that as fatal.
 */
async function downloadWithRetry(url, dst, expectedSha256, maxAttempts = 3) {
  if (existsSync(dst) && statSync(dst).size > 1_000_000) {
    const have = sha256OfFile(dst);
    if (have === expectedSha256) return false;
    console.warn(`[copy-pdf-ocr-assets] cached ${relative(ROOT, dst)} sha256 mismatch — re-downloading`);
    unlinkSync(dst);
  }
  ensureDir(dirname(dst));

  let lastErr;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`[copy-pdf-ocr-assets] downloading ${url} (attempt ${attempt}/${maxAttempts})…`);
      const buf = await httpDownload(url);
      const got = createHash('sha256').update(buf).digest('hex');
      if (got !== expectedSha256) {
        throw new Error(
          `Integrity check FAILED\n` +
          `  expected: ${expectedSha256}\n` +
          `  got:      ${got}\n` +
          `Refusing to write — untrusted bytes.`
        );
      }
      writeFileSync(dst, buf);
      return true;
    } catch (err) {
      lastErr = err;
      if (attempt < maxAttempts) {
        const wait = 2 ** (attempt - 1) * 3_000; // 3s, 6s
        console.warn(`[copy-pdf-ocr-assets] attempt ${attempt} failed: ${err.message} — retrying in ${wait / 1000}s…`);
        await new Promise(r => setTimeout(r, wait));
      }
    }
  }
  throw lastErr;
}

async function main() {
  console.log('[copy-pdf-ocr-assets] Starting…');

  // 1) pdf.js cmaps
  const cmapSrc = join(NM, 'pdfjs-dist', 'cmaps');
  const cmapDst = join(PUB, 'pdfjs', 'cmaps');
  const cmapsCopied = copyDir(cmapSrc, cmapDst);
  console.log(`[copy-pdf-ocr-assets] pdf.js cmaps: ${cmapsCopied} new/updated → public/pdfjs/cmaps/`);

  // 2) pdf.js standard fonts
  const fontSrc = join(NM, 'pdfjs-dist', 'standard_fonts');
  const fontDst = join(PUB, 'pdfjs', 'standard_fonts');
  const fontsCopied = copyDir(fontSrc, fontDst);
  console.log(`[copy-pdf-ocr-assets] pdf.js fonts: ${fontsCopied} new/updated → public/pdfjs/standard_fonts/`);

  // 3) Tesseract worker
  const workerSrc = join(NM, 'tesseract.js', 'dist', 'worker.min.js');
  const workerDst = join(PUB, 'tesseract', 'worker.min.js');
  const workerCopied = copyIfNewer(workerSrc, workerDst);
  console.log(`[copy-pdf-ocr-assets] tesseract worker: ${workerCopied ? 'updated' : 'unchanged'} → public/tesseract/worker.min.js`);

  // 4) Tesseract core (ship every variant the worker may select at runtime).
  // Tesseract.js v7 picks the appropriate WASM at runtime based on browser
  // capability detection (relaxedsimd > simd > plain) and lstm flag. To avoid
  // any CDN fallback, ship them all. Total ~30 MB before gzip; per-variant
  // download is ~2-4 MB.
  const coreSrc = join(NM, 'tesseract.js-core');
  const coreDst = join(PUB, 'tesseract', 'core');
  ensureDir(coreDst);
  const coreFiles = readdirSync(coreSrc).filter((f) => /\.(wasm|js)$/.test(f));
  let coreCopied = 0;
  for (const f of coreFiles) {
    if (copyIfNewer(join(coreSrc, f), join(coreDst, f))) coreCopied++;
  }
  console.log(`[copy-pdf-ocr-assets] tesseract core: ${coreCopied} of ${coreFiles.length} new/updated → public/tesseract/core/`);

  // 5) English language data — fetched once from the canonical URL that
  // Tesseract.js itself uses, then cached in scripts/.cache/ so reruns are
  // offline. The file is also placed under public/tesseract/lang/.
  //
  // Non-fatal: if the CDN is unreachable after 3 attempts (e.g. Hostinger's
  // build environment has outbound network restrictions or the CDN is briefly
  // unavailable), the rest of the build still succeeds. Camera-scan / OCR
  // features will be silently disabled at runtime for that deployment, but
  // all other app functionality deploys correctly. The warning is loud so it
  // shows up prominently in the build log.
  const langCachePath = join(CACHE, 'eng.traineddata.gz');
  console.log(`[copy-pdf-ocr-assets] verifying eng.traineddata.gz (sha256 ${ENG_SHA256.slice(0, 16)}…) …`);
  try {
    await downloadWithRetry(
      'https://cdn.jsdelivr.net/npm/@tesseract.js-data/eng/4.0.0/eng.traineddata.gz',
      langCachePath,
      ENG_SHA256,
    );
    const langDst = join(PUB, 'tesseract', 'lang', 'eng.traineddata.gz');
    const langCopied = copyIfNewer(langCachePath, langDst);
    console.log(`[copy-pdf-ocr-assets] tesseract lang: ${langCopied ? 'updated' : 'unchanged'} → public/tesseract/lang/eng.traineddata.gz`);
  } catch (langErr) {
    console.warn(
      `\n[copy-pdf-ocr-assets] WARNING: could not download eng.traineddata.gz after 3 attempts: ${langErr.message}\n` +
      `  Camera-scan / OCR will not work in this deployment.\n` +
      `  All other app features are unaffected. Build continuing.\n`
    );
  }

  console.log('[copy-pdf-ocr-assets] Done.');
}

main().catch((e) => {
  console.error('[copy-pdf-ocr-assets] FAILED:', e.message);
  process.exit(1);
});

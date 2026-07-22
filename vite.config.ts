/// <reference types="vitest" />
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { createHash } from "crypto";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import { visualizer } from "rollup-plugin-visualizer";
import {
  getManualChunkName,
  PREFETCH_CHUNKS,
  PUBLIC_PORTFOLIO_PREFETCH_EXCLUSION,
} from "./src/lib/buildChunkPolicy";

const CSP_BASE = [
  "default-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https://fra.cloud.appwrite.io wss://fra.cloud.appwrite.io https://api.resend.com https://api.openrouter.ai https://api.groq.com https://generativelanguage.googleapis.com https://api.elevenlabs.io https://challenges.cloudflare.com https://*.ingest.de.sentry.io",
  "worker-src 'self' blob:",
  "frame-src https://challenges.cloudflare.com",
  "object-src 'none'",
  "base-uri 'self'",
];

// Production CSP — served via meta tag injected at build time (not in dev).
// Note: frame-ancestors is included here for defense-in-depth, but meta-tag
// CSP does not enforce frame-ancestors in all browsers — the _headers file
// provides the authoritative HTTP header for frame-ancestors enforcement.
const CSP = [...CSP_BASE, "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com", "frame-ancestors 'none'"].join('; ');

function cspPlugin(): Plugin {
  return {
    name: 'inject-csp',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        // Skip in dev mode — no CSP is enforced there (server headers are empty).
        // Only inject the meta tag during production builds.
        if (!ctx.bundle) return html;
        const tag = `  <meta http-equiv="Content-Security-Policy" content="${CSP}" />\n`;
        return html.replace('<head>', '<head>\n' + tag);
      },
    },
  };
}

// Defer route prefetch until the page is interactive. Previously, prefetch
// links were emitted directly into <head>, which competes with critical
// app JS for bandwidth on cold start (especially on mobile). Now we emit
// a tiny external bootstrap as a build asset (CSP `script-src 'self' 'unsafe-inline'`
// compliant — inline scripts would be blocked) that waits for window
// `load`, then materializes <link rel="prefetch"> tags via
// requestIdleCallback. Net: zero competing bytes during the splash
// window, full prefetch benefit after the page is interactive.
function prefetchPlugin(): Plugin {
  return {
    name: 'prefetch-key-routes',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        if (!ctx.bundle) return html;
        const urls: string[] = [];
        for (const [fileName, chunk] of Object.entries(ctx.bundle)) {
          if (chunk.type !== 'chunk') continue;
          if (PREFETCH_CHUNKS.some(name => chunk.name === name)) {
            urls.push(`/${fileName}`);
          }
        }
        if (urls.length === 0) return html;
        const code =
          `(function(){var u=${JSON.stringify(urls)};` +
          `if(new RegExp(${JSON.stringify(PUBLIC_PORTFOLIO_PREFETCH_EXCLUSION)}).test(location.pathname)){return;}` +
          `function go(){u.forEach(function(href){var l=document.createElement('link');` +
          `l.rel='prefetch';l.as='script';l.crossOrigin='';l.href=href;` +
          `document.head.appendChild(l);});}` +
          `function schedule(){if('requestIdleCallback' in window){requestIdleCallback(go,{timeout:3000});}` +
          `else{setTimeout(go,1500);}}` +
          `if(document.readyState==='complete'){schedule();}` +
          `else{addEventListener('load',schedule,{once:true});}})();`;
        const hash = createHash('sha256').update(code).digest('hex').slice(0, 8);
        const assetFileName = `assets/prefetch-${hash}.js`;
        // Emit as a real asset so it satisfies `script-src 'self' 'unsafe-inline'`.
        (ctx.bundle as Record<string, unknown>)[assetFileName] = {
          type: 'asset',
          fileName: assetFileName,
          name: 'prefetch',
          source: code,
          needsCodeReference: false,
        };
        const tag = `  <script src="/${assetFileName}" defer></script>\n`;
        return html.replace('</head>', tag + '</head>');
      },
    },
  };
}

// Emit <link rel="preload"> tags for the Inter 400 and 500 woff2 font
// assets so the browser can fetch the most-used weights before the CSS
// @font-face rules are parsed, eliminating FOIT on the critical hero
// text. Only the latin subset (the smallest, most commonly used) is
// preloaded; other subsets and weights load normally on demand.
function fontPreloadPlugin(): Plugin {
  return {
    name: 'font-preload',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        if (!ctx.bundle) return html;
        const tags: string[] = [];
        for (const [fileName] of Object.entries(ctx.bundle)) {
          if (!fileName.endsWith('.woff2')) continue;
          const lower = fileName.toLowerCase();
          // Preload Inter latin 400-normal and 500-normal — the weights
          // used for body text and nav on the landing hero. Skip other
          // subsets and weights; they can load on demand.
          const isInter = lower.includes('inter');
          const isLatinOnly = !lower.includes('ext') && !lower.includes('greek') &&
            !lower.includes('cyrillic') && !lower.includes('vietnamese');
          const isCriticalWeight = lower.includes('-400-') || lower.includes('-500-');
          if (isInter && isLatinOnly && isCriticalWeight) {
            tags.push(`  <link rel="preload" href="/${fileName}" as="font" type="font/woff2" crossorigin />\n`);
          }
        }
        if (tags.length === 0) return html;
        return html.replace('</head>', tags.join('') + '</head>');
      },
    },
  };
}

// App version sourced from package.json — bump there to update the
// internal build label shown in the landing footer.
const APP_VERSION = require('./package.json').version as string;

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: '/',
  define: {
    __APP_VERSION__: JSON.stringify(APP_VERSION),
    // Safety fallback: any leftover __BUILD_COMMIT__ reference will resolve
    // to an empty string instead of throwing a ReferenceError at runtime.
    __BUILD_COMMIT__: JSON.stringify(''),
  },
  server: {
    host: "0.0.0.0",
    port: 5000,
    allowedHosts: true,
    hmr: {
      overlay: false,
    },
    // No CSP header in dev — the production build injects it via meta tag.
    // Vite's own dev-server scripts (HMR, module preload) use inline scripts
    // and event handlers that would require 'unsafe-inline' to pass.
    // Document-Policy is required for Sentry browser profiling.
    headers: {
      'Document-Policy': 'js-profiling',
    },
    proxy: {
      // Proxy server-side API calls through the Express server (default :5001).
      // Override with API_PORT or VITE_DEV_API_PORT when 5001 is taken (e.g. another Vite).
      '/api': {
        target: `http://localhost:${process.env.VITE_DEV_API_PORT || process.env.API_PORT || '5001'}`,
        changeOrigin: true,
      },
    },
  },
  // Strip developer-only console calls and `debugger` statements from
  // production bundles so DevTools (F12) on the deployed site stays
  // quiet. `console.error` and `console.warn` are intentionally kept
  // so Sentry breadcrumbs and the ErrorBoundary still capture useful
  // diagnostics.
  //
  // Note: esbuild's `drop: ['console']` would remove EVERY console.*
  // call (including .error/.warn), so we cannot use that. Instead we
  // (a) drop `debugger` outright and (b) mark the noisy methods as
  // `pure` so the minifier strips calls whose return value is unused
  // — which is true for every direct console.log/info/debug/trace in
  // this codebase. console.error and console.warn are NOT in the pure
  // list, so they survive minification untouched.
  //
  // In dev mode this is harmless: the dev server doesn't minify, so
  // `pure` annotations have no effect and all console output flows.
  esbuild: {
    drop: ['debugger'],
    pure: ['console.log', 'console.info', 'console.debug', 'console.trace'],
  },
  build: {
    // Sourcemaps are only emitted when uploading to Sentry. Without the
    // Sentry token, sourcemaps are disabled entirely so the production
    // build that gets uploaded to Hostinger never contains *.js.map
    // files (which would otherwise expose the original, un-minified
    // source code to anyone who guesses the URL).
    sourcemap: process.env.SENTRY_AUTH_TOKEN ? 'hidden' : false,
    rollupOptions: {
      output: {
        manualChunks: getManualChunkName,
      },
    },
  },
  plugins: [
    react(),
    cspPlugin(),
    prefetchPlugin(),
    fontPreloadPlugin(),
    // PWA / service worker removed. No manifest or SW is served.
    process.env.SENTRY_AUTH_TOKEN
      ? sentryVitePlugin({
          org: process.env.SENTRY_ORG,
          project: process.env.SENTRY_PROJECT,
          authToken: process.env.SENTRY_AUTH_TOKEN,
          release: {
            name: process.env.VITE_SENTRY_RELEASE ?? process.env.GITHUB_SHA ?? 'local',
          },
          sourcemaps: {
            filesToDeleteAfterUpload: ['./dist/**/*.js.map'],
          },
          telemetry: false,
        })
      : null,
    process.env.ANALYZE === 'true'
      ? visualizer({ open: false, filename: 'dist/stats.html', gzipSize: true, template: 'treemap' })
      : null,
  ].filter(Boolean),
  optimizeDeps: {
    exclude: ['docx', 'pdfjs-dist'],
    include: ['pdf-lib'],
  },
  resolve: {
    alias: [
      { find: '@', replacement: path.resolve(__dirname, './src') },
      // Only rewrite the bare `pdfjs-dist` specifier to the ESM build entry.
      // Using a regex with a `$` anchor prevents Vite from also rewriting
      // subpath imports like `pdfjs-dist/build/pdf.worker.min.mjs?url`,
      // which a plain string alias would mangle into a non-existent path.
      { find: /^pdfjs-dist$/, replacement: 'pdfjs-dist/build/pdf.mjs' },
      // pako@1 is CJS-only and has no ESM `default` export. pdf-lib and
      // friends do `import pako from 'pako'`, which crashes when Vite
      // pre-bundles pako. Route the bare specifier through a shim that
      // synthesises the default export from the namespace.
      { find: /^pako$/, replacement: path.resolve(__dirname, './src/shims/pako.ts') },
    ],
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: path.resolve(__dirname, "./src/test/setup.ts"),
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
}));

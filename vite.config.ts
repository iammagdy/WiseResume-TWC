/// <reference types="vitest" />
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { createHash } from "crypto";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import { visualizer } from "rollup-plugin-visualizer";

const CSP_BASE = [
  "default-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https://*.supabase.co https://*.supabase.in wss://*.supabase.co https://*.kinde.com https://api.openrouter.ai https://api.groq.com https://generativelanguage.googleapis.com https://api.elevenlabs.io",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
];

// Production CSP — served via meta tag injected at build time (not in dev).
// Note: frame-ancestors is included here for defense-in-depth, but meta-tag
// CSP does not enforce frame-ancestors in all browsers — the _headers file
// provides the authoritative HTTP header for frame-ancestors enforcement.
const CSP = [...CSP_BASE, "script-src 'self'", "frame-ancestors 'none'"].join('; ');

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

const PREFETCH_CHUNKS = ['DashboardPage', 'EditorPage', 'UploadPage', 'framer', 'AnimatedSplash'];

// Defer route prefetch until the page is interactive. Previously, prefetch
// links were emitted directly into <head>, which competes with critical
// app JS for bandwidth on cold start (especially on mobile). Now we emit
// a tiny external bootstrap as a build asset (CSP `script-src 'self'`
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
          `function go(){u.forEach(function(href){var l=document.createElement('link');` +
          `l.rel='prefetch';l.as='script';l.crossOrigin='';l.href=href;` +
          `document.head.appendChild(l);});}` +
          `function schedule(){if('requestIdleCallback' in window){requestIdleCallback(go,{timeout:3000});}` +
          `else{setTimeout(go,1500);}}` +
          `if(document.readyState==='complete'){schedule();}` +
          `else{addEventListener('load',schedule,{once:true});}})();`;
        const hash = createHash('sha256').update(code).digest('hex').slice(0, 8);
        const assetFileName = `assets/prefetch-${hash}.js`;
        // Emit as a real asset so it satisfies `script-src 'self'`.
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

// App version sourced from package.json — bump there to update the
// internal build label shown in the landing footer.
const APP_VERSION = require('./package.json').version as string;

// https://vitejs.dev/config/
export default defineConfig(() => ({
  base: '/',
  define: {
    __APP_VERSION__: JSON.stringify(APP_VERSION),
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
    headers: {},
    proxy: {
      // Proxy server-side API calls through the Express server (port 5001)
      // This keeps server-only secrets (DB, service keys) off the client
      '/api': {
        target: 'http://localhost:5001',
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
        manualChunks(id) {
          if (id.includes('node_modules/framer-motion')) return 'framer';
          if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-')) return 'charts';

          // Document-export bundle: pdf-lib, pdfjs, docx, qr, html2canvas,
          // image-crop are all only loaded on user-initiated export/upload
          // paths. Merging them into one logical bundle reduces the small
          // chunk count on cold start (each chunk costs an HTTP RTT on
          // mobile) without adding to the critical path.
          if (
            id.includes('node_modules/pdf-lib') ||
            id.includes('node_modules/pdfjs-dist') ||
            id.includes('node_modules/docx') ||
            id.includes('node_modules/qr-code-styling') ||
            id.includes('node_modules/html2canvas') ||
            id.includes('node_modules/react-image-crop')
          ) return 'doc-export';

          // OCR is the single largest dep family — keep isolated so it
          // never pulls into the doc-export path on first PDF render.
          if (id.includes('node_modules/tesseract') || id.includes('node_modules/mammoth')) return 'ocr';

          if (id.includes('node_modules/@radix-ui')) return 'radix';
          if (id.includes('node_modules/ogl')) return 'ogl';
          if (id.includes('node_modules/@supabase')) return 'supabase';
          if (id.includes('node_modules/@kinde-oss')) return 'kinde-auth';
          if (id.includes('node_modules/@tanstack/react-query')) return 'react-query';
          if (id.includes('node_modules/zustand')) return 'zustand';
          if (
            id.includes('node_modules/react-markdown') ||
            id.includes('node_modules/remark') ||
            id.includes('node_modules/rehype') ||
            id.includes('node_modules/micromark') ||
            id.includes('node_modules/mdast') ||
            id.includes('node_modules/hast') ||
            id.includes('node_modules/unified')
          ) return 'markdown';
        },
      },
    },
  },
  plugins: [
    react(),
    cspPlugin(),
    prefetchPlugin(),
    // PWA / service worker intentionally removed.
    // public/custom-sw.js is now a tombstone that unregisters any
    // previously-installed service worker on the user's next visit.
    // It is copied from public/ as a plain static asset by Vite.
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
    exclude: ['docx'],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
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

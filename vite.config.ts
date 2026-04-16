/// <reference types="vitest" />
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import { visualizer } from "rollup-plugin-visualizer";

const CSP_BASE = [
  "default-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
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

function prefetchPlugin(): Plugin {
  return {
    name: 'prefetch-key-routes',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        if (!ctx.bundle) return html;
        const links: string[] = [];
        for (const [fileName, chunk] of Object.entries(ctx.bundle)) {
          if (chunk.type !== 'chunk') continue;
          if (PREFETCH_CHUNKS.some(name => chunk.name === name)) {
            links.push(`  <link rel="prefetch" href="/${fileName}" as="script" crossorigin />`);
          }
        }
        if (links.length === 0) return html;
        return html.replace('</head>', links.join('\n') + '\n</head>');
      },
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(() => ({
  base: '/',
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
  },
  build: {
    sourcemap: 'hidden',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/framer-motion')) return 'framer';
          if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-')) return 'charts';
          if (id.includes('node_modules/pdf-lib') || id.includes('node_modules/pdfjs-dist')) return 'pdf';
          if (id.includes('node_modules/tesseract') || id.includes('node_modules/mammoth')) return 'ocr';
          if (id.includes('node_modules/docx')) return 'docx';
          if (id.includes('node_modules/qr-code-styling')) return 'qr';
          if (id.includes('node_modules/react-image-crop')) return 'image-crop';
          if (id.includes('node_modules/@radix-ui')) return 'radix';
          if (id.includes('node_modules/html2canvas')) return 'html2canvas';
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
    VitePWA({
      strategies: "injectManifest",
      srcDir: "public",
      filename: "custom-sw.js",
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "favicon.ico", "icons/*.png"],
      manifest: false, // Use existing public/manifest.json
      injectManifest: {
        globPatterns: ["**/*.{js,css,html,ico,svg,woff2}"],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        dontCacheBustURLsMatching: /~oauth/,
      },
    }),
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

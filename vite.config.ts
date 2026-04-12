/// <reference types="vitest" />
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https://*.supabase.co https://*.supabase.in wss://*.supabase.co https://*.kinde.com https://api.openrouter.ai https://api.groq.com https://generativelanguage.googleapis.com https://api.elevenlabs.io",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
].join('; ');

function cspPlugin(): Plugin {
  return {
    name: 'inject-csp',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
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
export default defineConfig(({ mode }) => ({
  base: '/',
  server: {
    host: "0.0.0.0",
    port: 5000,
    allowedHosts: true,
    hmr: {
      overlay: false,
    },
    headers: {
      'Content-Security-Policy': CSP,
    },
  },
  build: {
    sourcemap: false,
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
          if (id.includes('node_modules/three') || id.includes('node_modules/@react-three')) return 'three';
          if (id.includes('node_modules/html2canvas')) return 'html2canvas';
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

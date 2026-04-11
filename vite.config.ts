/// <reference types="vitest" />
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";
import { spawn } from "child_process";
import { existsSync } from "fs";

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

function runCmd(cmd: string, args: string[], extraEnv: Record<string, string> = {}): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { env: { ...process.env, ...extraEnv }, stdio: 'inherit' });
    proc.on('close', code => (code === 0 ? resolve() : reject(new Error(`Exit ${code}`))));
    proc.on('error', reject);
  });
}

async function deployEdgeFunctions(token: string): Promise<void> {
  const CLI = '/tmp/supabase';
  const REF = 'jnsfmkzgxsviuthaqlyy';
  if (!existsSync(CLI)) {
    console.log('[edge-deploy] Downloading Supabase CLI…');
    await runCmd('curl', ['-fsSL', 'https://github.com/supabase/cli/releases/latest/download/supabase_linux_amd64.tar.gz', '-o', '/tmp/supabase.tar.gz']);
    await runCmd('tar', ['-xzf', '/tmp/supabase.tar.gz', '-C', '/tmp']);
  }
  for (const fn of ['admin-github-status', 'admin-env-check']) {
    console.log(`[edge-deploy] Deploying ${fn}…`);
    try {
      await runCmd(CLI, ['functions', 'deploy', fn, '--project-ref', REF, '--no-verify-jwt'], { SUPABASE_ACCESS_TOKEN: token });
      console.log(`[edge-deploy] ${fn} ✓`);
    } catch (e) {
      console.error(`[edge-deploy] ${fn} failed:`, e);
    }
  }
}

function deployEdgeFunctionsPlugin(): Plugin {
  return {
    name: 'deploy-edge-functions',
    apply: 'serve',
    configureServer() {
      const token = process.env.SUPABASE_ACCESS_TOKEN;
      if (!token) {
        console.log('[edge-deploy] SUPABASE_ACCESS_TOKEN not found in process.env — skipping auto-deploy');
        return;
      }
      console.log('[edge-deploy] SUPABASE_ACCESS_TOKEN found — deploying edge functions in background…');
      setImmediate(() => deployEdgeFunctions(token).catch(console.error));
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
    prefetchPlugin(),
    deployEdgeFunctionsPlugin(),
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

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: './', // Use relative paths for all assets to support any deployment path
  server: {
    host: "::",
    port: 3000,
    allowedHosts: [
      'app-deploy-test-2.cluster-5.preview.emergentcf.cloud',
      '.preview.emergentcf.cloud',
      '.preview.emergentagent.com',
      'localhost'
    ],
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
        },
      },
    },
  },
  plugins: [
    react(),
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
        navigateFallbackDenylist: [/^\/~oauth/],
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
}));

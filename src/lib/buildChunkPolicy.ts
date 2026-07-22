export const PREFETCH_CHUNKS = ['DashboardPage', 'UploadPage', 'framer', 'AnimatedSplash'];

export const PUBLIC_PORTFOLIO_PREFETCH_EXCLUSION = '^/(?:ar/)?p/[^/]+/?$';

export function getManualChunkName(id: string): string | undefined {
  if (id.includes('node_modules/framer-motion')) return 'framer';
  if (
    id.includes('node_modules/clsx') ||
    id.includes('node_modules/class-variance-authority') ||
    id.includes('node_modules/tailwind-merge')
  ) return 'ui-utils';
  if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-')) return 'charts';

  if (
    id.includes('node_modules/pdf-lib') ||
    id.includes('node_modules/pdfjs-dist') ||
    id.includes('node_modules/docx') ||
    id.includes('node_modules/qr-code-styling') ||
    id.includes('node_modules/html2canvas') ||
    id.includes('node_modules/react-image-crop')
  ) return 'doc-export';

  if (id.includes('node_modules/tesseract') || id.includes('node_modules/mammoth')) return 'ocr';

  if (id.includes('node_modules/@radix-ui')) return 'radix';
  if (id.includes('node_modules/ogl')) return 'ogl';
  if (id.includes('node_modules/appwrite')) return 'appwrite';
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

  return undefined;
}

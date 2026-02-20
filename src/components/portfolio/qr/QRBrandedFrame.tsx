import { PORTFOLIO_DOMAIN } from '@/lib/portfolioUrl';

interface QRBrandedFrameProps {
  /** When true, renders as a plain div (for html2canvas capture). Otherwise renders a clickable link. */
  isCapture?: boolean;
}

export function QRBrandedFrame({ isCapture = false }: QRBrandedFrameProps) {
  const content = (
    <div className="flex items-center justify-center gap-1.5 py-2 px-4">
      <span className="text-[11px] font-medium tracking-wide" style={{ color: '#a1a1aa' }}>
        Made with
      </span>
      <span
        className={`text-[11px] font-bold tracking-wide ${!isCapture ? 'bg-clip-text text-transparent' : ''}`}
        style={isCapture
          ? { color: '#a855f7' }
          : {
              backgroundImage: 'linear-gradient(135deg, #a855f7, #ec4899)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }
        }
      >
        Wise Resume
      </span>
    </div>
  );

  if (isCapture) {
    return <div>{content}</div>;
  }

  return (
    <a
      href={PORTFOLIO_DOMAIN}
      target="_blank"
      rel="noopener noreferrer"
      className="block active:scale-95 transition-transform touch-manipulation"
    >
      {content}
    </a>
  );
}

import { useEffect, useRef } from 'react';
import QRCodeStyling from 'qr-code-styling';

const QR_SIZE = 220;

interface TotpQRCodeProps {
  otpauthUrl: string;
  size?: number;
}

export function TotpQRCode({ otpauthUrl, size = QR_SIZE }: TotpQRCodeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const qrRef = useRef<QRCodeStyling | null>(null);

  useEffect(() => {
    if (!containerRef.current || !otpauthUrl) return;

    qrRef.current = new QRCodeStyling({
      width: size,
      height: size,
      type: 'svg',
      data: otpauthUrl,
      margin: 8,
      qrOptions: { errorCorrectionLevel: 'M' },
      dotsOptions: { color: '#000000', type: 'rounded' },
      cornersSquareOptions: { type: 'extra-rounded' },
      backgroundOptions: { color: '#ffffff' },
    });

    containerRef.current.innerHTML = '';
    qrRef.current.append(containerRef.current);
  }, [otpauthUrl, size]);

  return (
    <div className="rounded-lg border-2 border-border bg-white p-2 shadow-sm inline-block">
      <div ref={containerRef} style={{ width: size, height: size }} />
    </div>
  );
}

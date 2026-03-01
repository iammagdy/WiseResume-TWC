import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, QrCode, Layers, Upload, Copy, ExternalLink, Wifi, Mail, Phone, Link as LinkIcon, Type, Contact } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/utils';

type ContentKind = 'url' | 'email' | 'phone' | 'wifi' | 'vcard' | 'text';

interface ParsedResult {
  kind: ContentKind;
  raw: string;
  wifi?: { ssid: string; password: string; encryption: string };
}

function detectContent(raw: string): ParsedResult {
  if (/^https?:\/\//i.test(raw)) return { kind: 'url', raw };
  if (/^mailto:/i.test(raw)) return { kind: 'email', raw };
  if (/^tel:/i.test(raw)) return { kind: 'phone', raw };
  if (/^WIFI:/.test(raw)) {
    const ssid = raw.match(/S:([^;]*)/)?.[1] || '';
    const password = raw.match(/P:([^;]*)/)?.[1] || '';
    const encryption = raw.match(/T:([^;]*)/)?.[1] || '';
    return { kind: 'wifi', raw, wifi: { ssid, password, encryption } };
  }
  if (/^BEGIN:VCARD/i.test(raw)) return { kind: 'vcard', raw };
  return { kind: 'text', raw };
}

async function decodeQR(file: File): Promise<string | null> {
  // Try BarcodeDetector first
  if ('BarcodeDetector' in window) {
    try {
      const bitmap = await createImageBitmap(file);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
      const results = await detector.detect(bitmap);
      if (results.length > 0) return results[0].rawValue;
    } catch { /* fall through to jsQR */ }
  }

  // Fallback: jsQR
  try {
    const jsQR = (await import('jsqr')).default;
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(bitmap, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const result = jsQR(imageData.data, canvas.width, canvas.height);
    return result?.data || null;
  } catch {
    return null;
  }
}

const ICON_MAP: Record<ContentKind, React.ElementType> = {
  url: LinkIcon,
  email: Mail,
  phone: Phone,
  wifi: Wifi,
  vcard: Contact,
  text: Type,
};

export default function QrScanPage() {
  const navigate = useNavigate();
  const [result, setResult] = useState<ParsedResult | null>(null);
  const [scanning, setScanning] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setScanning(true);
    setResult(null);
    haptics.light();
    const decoded = await decodeQR(file);
    setScanning(false);
    if (decoded) {
      haptics.success();
      setResult(detectContent(decoded));
    } else {
      haptics.error();
      toast.error('No QR code found in image');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith('image/')) handleFile(file);
  };

  const handleCopy = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.raw);
    haptics.light();
    toast.success('Copied!');
  };

  const Icon = result ? ICON_MAP[result.kind] : QrCode;

  return (
    <div className="flex-1 flex flex-col min-h-0 pb-20 lg:pb-6 pt-safe">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/30">
        <Button variant="ghost" size="icon" onClick={() => navigate('/qr-code')} className="shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold">QR Scanner</h1>
          <p className="text-xs text-muted-foreground">Decode QR codes from images</p>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => navigate('/qr-code')}>
            <QrCode className="w-3.5 h-3.5" /> Create
          </Button>
          <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => navigate('/qr-batch')}>
            <Layers className="w-3.5 h-3.5" /> Batch
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {/* Upload area */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className={cn(
            'flex flex-col items-center justify-center gap-3 p-8 rounded-2xl border-2 border-dashed cursor-pointer transition-all touch-manipulation active:scale-[0.98]',
            dragOver ? 'border-primary bg-primary/5' : 'border-border/40 bg-card/30 hover:border-primary/30'
          )}
        >
          <div className={cn('w-14 h-14 rounded-full flex items-center justify-center', scanning ? 'animate-pulse bg-primary/20' : 'bg-muted/50')}>
            <Upload className="w-6 h-6 text-muted-foreground" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium">{scanning ? 'Scanning...' : 'Upload QR Code Image'}</p>
            <p className="text-xs text-muted-foreground mt-1">Drop an image or tap to select</p>
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
        </div>

        {/* Result */}
        {result && (
          <div className="space-y-3 animate-fade-in">
            <div className="flex items-center gap-2">
              <Icon className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium capitalize">{result.kind} Detected</span>
            </div>

            {/* Smart display */}
            {result.kind === 'url' && (
              <a href={result.raw} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 rounded-xl bg-primary/5 border border-primary/20 text-primary text-sm hover:bg-primary/10 transition-colors">
                <ExternalLink className="w-4 h-4 shrink-0" />
                <span className="truncate">{result.raw}</span>
              </a>
            )}
            {result.kind === 'email' && (
              <a href={result.raw} className="flex items-center gap-2 p-3 rounded-xl bg-primary/5 border border-primary/20 text-primary text-sm">
                <Mail className="w-4 h-4 shrink-0" />
                <span>{result.raw.replace('mailto:', '')}</span>
              </a>
            )}
            {result.kind === 'phone' && (
              <a href={result.raw} className="flex items-center gap-2 p-3 rounded-xl bg-primary/5 border border-primary/20 text-primary text-sm">
                <Phone className="w-4 h-4 shrink-0" />
                <span>{result.raw.replace('tel:', '')}</span>
              </a>
            )}
            {result.kind === 'wifi' && result.wifi && (
              <div className="rounded-xl bg-card/50 border border-border/30 p-3 space-y-2">
                {[['SSID', result.wifi.ssid], ['Password', result.wifi.password], ['Encryption', result.wifi.encryption]].map(([k, v]) => (
                  <div key={k} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{k}</span>
                    <span className="font-medium">{v || '—'}</span>
                  </div>
                ))}
              </div>
            )}
            {result.kind === 'vcard' && (
              <pre className="text-xs bg-card/50 border border-border/30 rounded-xl p-3 overflow-x-auto whitespace-pre-wrap">{result.raw}</pre>
            )}
            {result.kind === 'text' && (
              <p className="text-sm p-3 rounded-xl bg-card/50 border border-border/30">{result.raw}</p>
            )}

            {/* Raw data + copy */}
            <div className="space-y-2">
              <span className="text-xs text-muted-foreground">Raw Data</span>
              <Textarea value={result.raw} readOnly rows={3} className="text-xs" />
              <Button variant="outline" size="sm" className="w-full gap-2" onClick={handleCopy}>
                <Copy className="w-3.5 h-3.5" /> Copy to Clipboard
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

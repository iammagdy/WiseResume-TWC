import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCodeStyling from 'qr-code-styling';
import { ArrowLeft, Download, QrCode, ScanLine, FileUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import { PRESET_THEMES, type PresetTheme } from '@/lib/qr-presets';
import type { ErrorCorrectionLevel } from '@/components/portfolio/qr/qr-types';

function buildBatchOptions(data: string, preset: PresetTheme, size: number, errorLevel: ErrorCorrectionLevel) {
  const dotsOpts = preset.useGradient
    ? {
        gradient: {
          type: preset.gradientType as 'linear' | 'radial',
          rotation: preset.gradientRotation * (Math.PI / 180),
          colorStops: [{ offset: 0, color: preset.gradientColor1 }, { offset: 1, color: preset.gradientColor2 }],
        },
      }
    : { color: preset.fgColor };

  return {
    width: size, height: size, margin: 10,
    data,
    dotsOptions: { type: preset.dotsStyle, ...dotsOpts },
    cornersSquareOptions: { type: preset.cornersSquareStyle, ...dotsOpts },
    cornersDotOptions: { type: preset.cornersDotStyle, ...dotsOpts },
    backgroundOptions: { color: preset.bgColor },
    qrOptions: { errorCorrectionLevel: errorLevel },
  };
}

function parseEntries(raw: string): { data: string; label: string }[] {
  return raw
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line, i) => {
      const comma = line.indexOf(',');
      if (comma > 0) {
        return { data: line.slice(0, comma).trim(), label: line.slice(comma + 1).trim() || `qr-${i + 1}` };
      }
      return { data: line, label: `qr-${i + 1}` };
    });
}

export default function QrBatchPage() {
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const [preset, setPreset] = useState<PresetTheme>(PRESET_THEMES[0]);
  const [size, setSize] = useState(400);
  const [errorLevel, setErrorLevel] = useState<ErrorCorrectionLevel>('M');
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const entries = parseEntries(input);

  const handleCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setInput(reader.result as string);
    reader.readAsText(file);
  };

  const handleGenerate = async () => {
    if (entries.length === 0) { toast.error('Add some data first'); return; }
    haptics.medium();
    setGenerating(true);
    setProgress(0);

    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      for (let i = 0; i < entries.length; i++) {
        const { data, label } = entries[i];
        const opts = buildBatchOptions(data, preset, size, errorLevel);
        const qr = new QRCodeStyling(opts);

        // Offscreen render
        const div = document.createElement('div');
        div.style.cssText = 'position:fixed;left:-9999px;top:0;';
        document.body.appendChild(div);
        qr.append(div);
        await new Promise((r) => setTimeout(r, 200));

        const blob = await qr.getRawData('png');
        document.body.removeChild(div);

        if (blob) {
          const sanitized = label.replace(/[^a-zA-Z0-9_-]/g, '_');
          zip.file(`${sanitized}.png`, blob);
        }

        setProgress(Math.round(((i + 1) / entries.length) * 100));
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(zipBlob);
      link.download = 'qr-codes.zip';
      link.click();
      URL.revokeObjectURL(link.href);

      haptics.success();
      toast.success(`${entries.length} QR codes exported!`);
    } catch (err) {
      toast.error('Batch generation failed');
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 pb-20 lg:pb-6 pt-safe">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/30">
        <Button variant="ghost" size="icon" onClick={() => navigate('/qr-code')} className="shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold">Batch QR Generator</h1>
          <p className="text-xs text-muted-foreground">Generate multiple QR codes as ZIP</p>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => navigate('/qr-code')}>
            <QrCode className="w-3.5 h-3.5" /> Single
          </Button>
          <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => navigate('/qr-scan')}>
            <ScanLine className="w-3.5 h-3.5" /> Scan
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Input */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Data ({entries.length} items)</span>
            <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleCSV} />
            <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => fileRef.current?.click()}>
              <FileUp className="w-3.5 h-3.5" /> Import CSV
            </Button>
          </div>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={"https://example.com, My Website\nhttps://other.com, Other Site\n\nOne per line. Optional: data, label"}
            rows={6}
          />
        </div>

        {/* Preset picker */}
        <div className="space-y-2">
          <span className="text-sm font-medium">Style Preset</span>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {PRESET_THEMES.map((p) => (
              <button
                key={p.id}
                onClick={() => { haptics.light(); setPreset(p); }}
                className={cn(
                  'flex flex-col items-center gap-1 px-3 py-2 rounded-xl border shrink-0 transition-all active:scale-95 touch-manipulation min-w-[56px]',
                  preset.id === p.id ? 'border-primary bg-primary/10 ring-1 ring-primary/30' : 'border-border/40 bg-card/50'
                )}
              >
                <div className="w-6 h-6 rounded-full border border-border/30" style={{ background: p.swatch }} />
                <span className="text-[9px] font-medium text-foreground/70">{p.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Controls */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2 rounded-xl bg-card/30 p-3 border border-border/20">
            <div className="flex justify-between">
              <span className="text-xs text-muted-foreground">Size</span>
              <span className="text-xs font-medium">{size}px</span>
            </div>
            <Slider value={[size]} onValueChange={([v]) => setSize(v)} min={200} max={1000} step={50} />
          </div>
          <div className="space-y-2 rounded-xl bg-card/30 p-3 border border-border/20">
            <span className="text-xs text-muted-foreground">Error Correction</span>
            <Select value={errorLevel} onValueChange={(v) => setErrorLevel(v as ErrorCorrectionLevel)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="L">L (7%)</SelectItem>
                <SelectItem value="M">M (15%)</SelectItem>
                <SelectItem value="Q">Q (25%)</SelectItem>
                <SelectItem value="H">H (30%)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Progress */}
        {generating && (
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground text-center">Generating... {progress}%</p>
          </div>
        )}
      </div>

      {/* Bottom action */}
      <div className="fixed bottom-20 lg:bottom-0 left-0 right-0 border-t border-border/20 bg-background/80 backdrop-blur-md px-4 py-3 pb-safe z-20">
        <Button
          className="w-full h-12 rounded-xl active:scale-95 font-medium"
          disabled={entries.length === 0 || generating}
          onClick={handleGenerate}
        >
          <Download className="w-4 h-4 mr-2" />
          {generating ? `Generating ${progress}%...` : `Generate ${entries.length} QR Codes`}
        </Button>
      </div>
    </div>
  );
}

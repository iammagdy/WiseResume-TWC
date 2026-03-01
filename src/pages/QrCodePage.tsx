import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCodeStyling from 'qr-code-styling';
import { motion } from 'framer-motion';
import { ArrowLeft, Download, Copy, QrCode, Layers, ScanLine, Upload, X, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/utils';

import { ContentTypeForm, derivedText, DEFAULT_CONTENT, type ContentState } from '@/components/qr/ContentTypeForm';
import { FrameControls, exportWithFrame, DEFAULT_FRAME, type FrameState } from '@/components/qr/QRFrameComposer';
import { PRESET_THEMES, type PresetTheme } from '@/lib/qr-presets';
import type { DotType, CornerSquareType, CornerDotType, ErrorCorrectionLevel } from '@/components/portfolio/qr/qr-types';
import { contrastRatio } from '@/components/portfolio/qr/qr-utils';

const QR_CAPACITY: Record<ErrorCorrectionLevel, number> = { L: 2953, M: 2331, Q: 1663, H: 1273 };

const SHAPES: { id: DotType; label: string; icon: string }[] = [
  { id: 'square', label: 'Square', icon: '⬛' },
  { id: 'dots', label: 'Dots', icon: '⚫' },
  { id: 'rounded', label: 'Rounded', icon: '🔘' },
  { id: 'extra-rounded', label: 'Soft', icon: '🫧' },
  { id: 'classy', label: 'Classy', icon: '💎' },
  { id: 'classy-rounded', label: 'Elegant', icon: '✨' },
];

const OUTER_SHAPES: { id: CornerSquareType; label: string }[] = [
  { id: 'square', label: 'Square' },
  { id: 'extra-rounded', label: 'Rounded' },
  { id: 'dot', label: 'Circle' },
];

const INNER_SHAPES: { id: 'square' | 'dot'; label: string }[] = [
  { id: 'square', label: 'Square' },
  { id: 'dot', label: 'Circle' },
];

function ColorPicker({ label, value, onChange: onChangeColor }: { label: string; value: string; onChange: (c: string) => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <div className="w-8 h-8 rounded-lg border border-border/40 relative overflow-hidden shrink-0" style={{ backgroundColor: value }}>
        <input type="color" value={value} onChange={(e) => onChangeColor(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
      </div>
      <span className="text-xs text-muted-foreground">{label}</span>
    </label>
  );
}

export default function QrCodePage() {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const qrRef = useRef<QRCodeStyling | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Content state
  const [content, setContent] = useState<ContentState>(DEFAULT_CONTENT);

  // Style state
  const [size, setSize] = useState(300);
  const [margin, setMargin] = useState(10);
  const [dotsStyle, setDotsStyle] = useState<DotType>('rounded');
  const [cornersSquareStyle, setCornersSquareStyle] = useState<CornerSquareType>('extra-rounded');
  const [cornersDotStyle, setCornersDotStyle] = useState<'square' | 'dot'>('dot');

  // Color state
  const [fgColor, setFgColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [useGradient, setUseGradient] = useState(false);
  const [gradientType, setGradientType] = useState<'linear' | 'radial'>('linear');
  const [gradientColor1, setGradientColor1] = useState('#000000');
  const [gradientColor2, setGradientColor2] = useState('#4338ca');
  const [gradientRotation, setGradientRotation] = useState(0);
  const [transparentBg, setTransparentBg] = useState(false);

  // Logo state
  const [logoDataUrl, setLogoDataUrl] = useState('');
  const [logoSize, setLogoSize] = useState(0.25);
  const [logoPadding, setLogoPadding] = useState(5);

  // Error correction
  const [errorLevel, setErrorLevel] = useState<ErrorCorrectionLevel>('M');

  // Frame state
  const [frame, setFrame] = useState<FrameState>(DEFAULT_FRAME);

  // Preset
  const [activePreset, setActivePreset] = useState<string | null>(null);

  // Tab
  const [activeTab, setActiveTab] = useState('content');

  const finalErrorLevel = logoDataUrl ? 'H' : errorLevel;

  const data = derivedText(content);
  const charCount = data.length;
  const capacity = QR_CAPACITY[finalErrorLevel];
  const capacityPercent = (charCount / capacity) * 100;

  const buildOptions = useCallback(() => {
    const dotsOpts = useGradient
      ? {
          gradient: {
            type: gradientType,
            rotation: gradientRotation * (Math.PI / 180),
            colorStops: [{ offset: 0, color: gradientColor1 }, { offset: 1, color: gradientColor2 }],
          },
        }
      : { color: fgColor };

    return {
      width: 280,
      height: 280,
      data,
      margin,
      dotsOptions: { type: dotsStyle, ...dotsOpts },
      cornersSquareOptions: { type: cornersSquareStyle, ...dotsOpts },
      cornersDotOptions: { type: cornersDotStyle, ...dotsOpts },
      backgroundOptions: { color: transparentBg ? 'transparent' : bgColor },
      qrOptions: { errorCorrectionLevel: finalErrorLevel },
      ...(logoDataUrl
        ? {
            image: logoDataUrl,
            imageOptions: { hideBackgroundDots: true, imageSize: logoSize, margin: logoPadding, crossOrigin: 'anonymous' as const },
          }
        : {}),
    };
  }, [data, margin, dotsStyle, cornersSquareStyle, cornersDotStyle, fgColor, bgColor, useGradient, gradientType, gradientColor1, gradientColor2, gradientRotation, transparentBg, finalErrorLevel, logoDataUrl, logoSize, logoPadding]);

  // QR init & debounced update
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (!containerRef.current) return;
      const opts = buildOptions();
      if (!qrRef.current) {
        qrRef.current = new QRCodeStyling(opts);
        containerRef.current.innerHTML = '';
        qrRef.current.append(containerRef.current);
      } else {
        qrRef.current.update(opts);
      }
    }, 150);
    return () => clearTimeout(debounceRef.current);
  }, [buildOptions]);

  const applyPreset = (preset: PresetTheme) => {
    haptics.light();
    setActivePreset(preset.id);
    setDotsStyle(preset.dotsStyle);
    setCornersSquareStyle(preset.cornersSquareStyle);
    setCornersDotStyle(preset.cornersDotStyle);
    setUseGradient(preset.useGradient);
    setGradientType(preset.gradientType);
    setGradientColor1(preset.gradientColor1);
    setGradientColor2(preset.gradientColor2);
    setGradientRotation(preset.gradientRotation);
    setFgColor(preset.fgColor);
    setBgColor(preset.bgColor);
    setTransparentBg(false);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setLogoDataUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleDownload = async () => {
    haptics.medium();
    if (!qrRef.current) return;

    if (frame.enabled) {
      // Get canvas from QR
      const rawData = await qrRef.current.getRawData('png');
      if (!rawData) { toast.error('Failed to generate QR'); return; }
      const pngBlob = rawData instanceof Blob ? rawData : new Blob([rawData as unknown as BlobPart]);
      const bitmap = await createImageBitmap(pngBlob);
      const c = document.createElement('canvas');
      c.width = size;
      c.height = size;
      const ctx = c.getContext('2d')!;
      ctx.drawImage(bitmap, 0, 0, size, size);
      await exportWithFrame(c, frame, 'qr-code');
      toast.success('QR code with frame downloaded!');
    } else {
      qrRef.current.download({ name: 'qr-code', extension: 'png' });
      toast.success('QR code downloaded!');
    }
  };

  const handleCopy = async () => {
    haptics.light();
    if (!qrRef.current) return;
    try {
      const rawData = await qrRef.current.getRawData('png');
      if (!rawData) throw new Error('No data');
      const pngBlob = rawData instanceof Blob ? rawData : new Blob([rawData as unknown as BlobPart], { type: 'image/png' });
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob })]);
      toast.success('Copied to clipboard!');
    } catch {
      toast.error('Copy failed — try downloading instead');
    }
  };

  // Contrast warning
  const fg = useGradient ? gradientColor1 : fgColor;
  const bg = transparentBg ? '#ffffff' : bgColor;
  const contrast = contrastRatio(fg, bg);
  const lowContrast = contrast < 3;

  return (
    <div className="flex-1 flex flex-col min-h-0 pb-20 lg:pb-6 pt-safe">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/30">
        <Button variant="ghost" size="icon" onClick={() => navigate('/ai-studio')} className="shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold">QR Code Generator</h1>
          <p className="text-xs text-muted-foreground">Create custom QR codes</p>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => navigate('/qr-batch')}>
            <Layers className="w-3.5 h-3.5" /> Batch
          </Button>
          <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => navigate('/qr-scan')}>
            <ScanLine className="w-3.5 h-3.5" /> Scan
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Preview */}
        <div className="flex flex-col items-center py-4 px-4">
          <div className={cn(
            'rounded-2xl p-4 transition-colors',
            transparentBg ? 'bg-[repeating-conic-gradient(#e5e5e5_0%_25%,transparent_0%_50%)] bg-[length:16px_16px]' : ''
          )} style={!transparentBg ? { backgroundColor: bgColor } : undefined}>
            <div ref={containerRef} className="rounded-xl overflow-hidden" />
          </div>

          {/* Capacity bar */}
          <div className="w-full max-w-[300px] mt-2">
            <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
              <span>{charCount} chars</span>
              <span className={cn(capacityPercent > 90 ? 'text-destructive' : capacityPercent > 70 ? 'text-amber-500' : '')}>
                {Math.round(capacityPercent)}% of {finalErrorLevel} capacity
              </span>
            </div>
            <div className="h-1 bg-muted rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all', capacityPercent > 90 ? 'bg-destructive' : capacityPercent > 70 ? 'bg-amber-500' : 'bg-primary')}
                style={{ width: `${Math.min(capacityPercent, 100)}%` }}
              />
            </div>
          </div>

          {lowContrast && (
            <div className="flex items-center gap-2 mt-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <p className="text-[10px] text-amber-400">Low contrast ({contrast.toFixed(1)}:1) — may be hard to scan</p>
            </div>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="px-4">
          <TabsList className="w-full flex justify-center gap-0 bg-transparent p-0 h-auto mb-3">
            {[
              { id: 'content', label: '📝', title: 'Content' },
              { id: 'style', label: '🎨', title: 'Style' },
              { id: 'colors', label: '🎨', title: 'Colors' },
              { id: 'advanced', label: '⚙️', title: 'More' },
            ].map((t) => (
              <TabsTrigger
                key={t.id}
                value={t.id}
                className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-xs data-[state=active]:bg-primary/10 data-[state=active]:text-primary min-w-[54px]"
              >
                <span className="text-base">{t.label}</span>
                <span className="text-[10px] font-medium">{t.title}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="pb-4">
            {/* Content tab */}
            <TabsContent value="content" className="mt-0">
              <ContentTypeForm state={content} onChange={(p) => setContent((s) => ({ ...s, ...p }))} />
            </TabsContent>

            {/* Style tab */}
            <TabsContent value="style" className="mt-0 space-y-4">
              {/* Presets */}
              <div className="space-y-2">
                <span className="text-sm font-medium text-foreground/80">Presets</span>
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                  {PRESET_THEMES.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => applyPreset(p)}
                      className={cn(
                        'flex flex-col items-center gap-1 px-3 py-2 rounded-xl border shrink-0 transition-all active:scale-95 touch-manipulation min-w-[56px]',
                        activePreset === p.id ? 'border-primary bg-primary/10 ring-1 ring-primary/30' : 'border-border/40 bg-card/50'
                      )}
                    >
                      <div className="w-6 h-6 rounded-full border border-border/30" style={{ background: p.swatch }} />
                      <span className="text-[9px] font-medium text-foreground/70">{p.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Module shape */}
              <div className="space-y-2 rounded-xl bg-card/30 p-3 border border-border/20">
                <span className="text-sm font-medium text-foreground/80">Module Shape</span>
                <div className="grid grid-cols-3 gap-1.5">
                  {SHAPES.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => { haptics.light(); setDotsStyle(s.id); setActivePreset(null); }}
                      className={cn(
                        'flex flex-col items-center gap-1 py-2 rounded-lg text-xs transition-all active:scale-95 touch-manipulation min-h-[44px]',
                        dotsStyle === s.id ? 'bg-primary/15 text-primary ring-1 ring-primary/30' : 'bg-muted/30 text-muted-foreground'
                      )}
                    >
                      <span className="text-sm">{s.icon}</span>
                      <span className="text-[10px] font-medium">{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Corners */}
              <div className="space-y-3 rounded-xl bg-card/30 p-3 border border-border/20">
                <span className="text-sm font-medium text-foreground/80">Corners</span>
                <div className="flex gap-1.5">
                  {OUTER_SHAPES.map((s) => (
                    <button key={s.id} onClick={() => { haptics.light(); setCornersSquareStyle(s.id); setActivePreset(null); }}
                      className={cn('flex-1 py-2 rounded-lg text-xs font-medium transition-all active:scale-95 min-h-[44px]',
                        cornersSquareStyle === s.id ? 'bg-primary/15 text-primary ring-1 ring-primary/30' : 'bg-muted/30 text-muted-foreground'
                      )}>{s.label}</button>
                  ))}
                </div>
                <div className="flex gap-1.5">
                  {INNER_SHAPES.map((s) => (
                    <button key={s.id} onClick={() => { haptics.light(); setCornersDotStyle(s.id); setActivePreset(null); }}
                      className={cn('flex-1 py-2 rounded-lg text-xs font-medium transition-all active:scale-95 min-h-[44px]',
                        cornersDotStyle === s.id ? 'bg-primary/15 text-primary ring-1 ring-primary/30' : 'bg-muted/30 text-muted-foreground'
                      )}>{s.label}</button>
                  ))}
                </div>
              </div>

              {/* Size & Margin */}
              <div className="space-y-3 rounded-xl bg-card/30 p-3 border border-border/20">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">Export Size</span>
                    <span className="text-xs font-medium">{size}px</span>
                  </div>
                  <Slider value={[size]} onValueChange={([v]) => setSize(v)} min={100} max={1000} step={50} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">Margin</span>
                    <span className="text-xs font-medium">{margin}px</span>
                  </div>
                  <Slider value={[margin]} onValueChange={([v]) => setMargin(v)} min={0} max={50} step={1} />
                </div>
              </div>
            </TabsContent>

            {/* Colors tab */}
            <TabsContent value="colors" className="mt-0 space-y-4">
              <div className="space-y-3 rounded-xl bg-card/30 p-3 border border-border/20">
                <div className="flex gap-6">
                  <ColorPicker label="Foreground" value={fgColor} onChange={(c) => { setFgColor(c); setActivePreset(null); }} />
                  <ColorPicker label="Background" value={bgColor} onChange={(c) => { setBgColor(c); setActivePreset(null); }} />
                </div>

                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">Transparent Background</Label>
                  <Switch checked={transparentBg} onCheckedChange={(v) => { haptics.light(); setTransparentBg(v); }} />
                </div>

                <button
                  onClick={() => { haptics.light(); setUseGradient(!useGradient); setActivePreset(null); }}
                  className={cn('w-full py-2 rounded-lg text-xs font-medium transition-all active:scale-95 min-h-[36px]',
                    useGradient ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground'
                  )}
                >
                  {useGradient ? '✨ Gradient On' : 'Enable Gradient'}
                </button>

                {useGradient && (
                  <div className="space-y-3">
                    <div className="flex gap-6">
                      <ColorPicker label="From" value={gradientColor1} onChange={setGradientColor1} />
                      <ColorPicker label="To" value={gradientColor2} onChange={setGradientColor2} />
                    </div>
                    <Select value={gradientType} onValueChange={(v) => setGradientType(v as 'linear' | 'radial')}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="linear">Linear</SelectItem>
                        <SelectItem value="radial">Radial</SelectItem>
                      </SelectContent>
                    </Select>
                    {gradientType === 'linear' && (
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-xs text-muted-foreground">Rotation</span>
                          <span className="text-xs font-medium">{gradientRotation}°</span>
                        </div>
                        <Slider value={[gradientRotation]} onValueChange={([v]) => setGradientRotation(v)} min={0} max={360} step={15} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Advanced tab */}
            <TabsContent value="advanced" className="mt-0 space-y-4">
              {/* Logo */}
              <div className="space-y-3 rounded-xl bg-card/30 p-3 border border-border/20">
                <span className="text-sm font-medium text-foreground/80">Logo Overlay</span>
                <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />

                {logoDataUrl ? (
                  <div className="flex items-center gap-3">
                    <img src={logoDataUrl} alt="Logo" className="w-10 h-10 rounded-lg object-contain border border-border/30" />
                    <Button variant="ghost" size="sm" onClick={() => setLogoDataUrl('')} className="text-xs">
                      <X className="w-3.5 h-3.5 mr-1" /> Remove
                    </Button>
                  </div>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => logoInputRef.current?.click()} className="w-full gap-2">
                    <Upload className="w-4 h-4" /> Upload Logo
                  </Button>
                )}

                {logoDataUrl && (
                  <>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-xs text-muted-foreground">Logo Size</span>
                        <span className="text-xs font-medium">{Math.round(logoSize * 100)}%</span>
                      </div>
                      <Slider value={[logoSize]} onValueChange={([v]) => setLogoSize(v)} min={0.1} max={0.4} step={0.01} />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-xs text-muted-foreground">Padding</span>
                        <span className="text-xs font-medium">{logoPadding}px</span>
                      </div>
                      <Slider value={[logoPadding]} onValueChange={([v]) => setLogoPadding(v)} min={0} max={20} step={1} />
                    </div>
                    <p className="text-[10px] text-amber-400">⚠️ Logo enabled — error correction set to H for scannability</p>
                  </>
                )}
              </div>

              {/* Error Correction */}
              <div className="space-y-2 rounded-xl bg-card/30 p-3 border border-border/20">
                <span className="text-sm font-medium text-foreground/80">Error Correction</span>
                <Select value={finalErrorLevel} onValueChange={(v) => setErrorLevel(v as ErrorCorrectionLevel)} disabled={!!logoDataUrl}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="L">L — 7% recovery</SelectItem>
                    <SelectItem value="M">M — 15% recovery</SelectItem>
                    <SelectItem value="Q">Q — 25% recovery</SelectItem>
                    <SelectItem value="H">H — 30% recovery</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Frame */}
              <FrameControls frame={frame} onChange={(p) => setFrame((s) => ({ ...s, ...p }))} />
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* Sticky bottom */}
      <div className="fixed bottom-20 lg:bottom-0 left-0 right-0 border-t border-border/20 bg-background/80 backdrop-blur-md px-4 py-3 pb-safe flex gap-2 z-20">
        <Button variant="outline" className="flex-1 h-12 rounded-xl active:scale-95 font-medium" onClick={handleCopy}>
          <Copy className="w-4 h-4 mr-2" /> Copy
        </Button>
        <Button className="flex-1 h-12 rounded-xl active:scale-95 font-medium" onClick={handleDownload}>
          <Download className="w-4 h-4 mr-2" /> Download
        </Button>
      </div>
    </div>
  );
}

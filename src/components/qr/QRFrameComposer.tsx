import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { haptics } from '@/lib/haptics';

export interface FrameState {
  enabled: boolean;
  text: string;
  style: 'banner' | 'pill' | 'box';
  color: string;
  textColor: string;
}

export const DEFAULT_FRAME: FrameState = {
  enabled: false,
  text: 'SCAN ME',
  style: 'banner',
  color: '#000000',
  textColor: '#ffffff',
};

interface FrameControlsProps {
  frame: FrameState;
  onChange: (partial: Partial<FrameState>) => void;
}

const FRAME_STYLES: { id: FrameState['style']; label: string; icon: string }[] = [
  { id: 'banner', label: 'Banner', icon: '▬' },
  { id: 'pill', label: 'Pill', icon: '⬭' },
  { id: 'box', label: 'Box', icon: '▢' },
];

export function FrameControls({ frame, onChange }: FrameControlsProps) {
  return (
    <div className="space-y-3 rounded-xl bg-card/30 p-3 border border-border/20">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium text-foreground/80">Frame</Label>
        <Switch
          checked={frame.enabled}
          onCheckedChange={(v) => { haptics.light(); onChange({ enabled: v }); }}
        />
      </div>

      {frame.enabled && (
        <div className="space-y-3">
          <Input
            placeholder="SCAN ME"
            value={frame.text}
            onChange={(e) => onChange({ text: e.target.value })}
            maxLength={30}
          />

          <div className="flex gap-1.5">
            {FRAME_STYLES.map((s) => (
              <button
                key={s.id}
                onClick={() => { haptics.light(); onChange({ style: s.id }); }}
                className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-lg text-xs transition-all active:scale-95 touch-manipulation min-h-[44px] ${
                  frame.style === s.id
                    ? 'bg-primary/15 text-primary ring-1 ring-primary/30'
                    : 'bg-muted/30 text-muted-foreground hover:bg-muted/50'
                }`}
              >
                <span className="text-sm">{s.icon}</span>
                <span className="text-[10px] font-medium">{s.label}</span>
              </button>
            ))}
          </div>

          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <div className="w-8 h-8 rounded-lg border border-border/40 relative overflow-hidden" style={{ backgroundColor: frame.color }}>
                <input type="color" value={frame.color} onChange={(e) => onChange({ color: e.target.value })} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
              </div>
              <span className="text-xs text-muted-foreground">Frame</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <div className="w-8 h-8 rounded-lg border border-border/40 relative overflow-hidden" style={{ backgroundColor: frame.textColor }}>
                <input type="color" value={frame.textColor} onChange={(e) => onChange({ textColor: e.target.value })} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
              </div>
              <span className="text-xs text-muted-foreground">Text</span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}

/** Export QR canvas with frame composited via offscreen canvas */
export async function exportWithFrame(
  qrCanvas: HTMLCanvasElement,
  frame: FrameState,
  filename: string
): Promise<void> {
  const padding = 24;
  const labelHeight = frame.enabled ? 40 : 0;
  const w = qrCanvas.width + padding * 2;
  const h = qrCanvas.height + padding * 2 + labelHeight;

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  // Draw frame background
  if (frame.enabled) {
    ctx.fillStyle = frame.color;
    if (frame.style === 'pill') {
      const r = 24;
      ctx.beginPath();
      ctx.moveTo(r, 0);
      ctx.lineTo(w - r, 0);
      ctx.quadraticCurveTo(w, 0, w, r);
      ctx.lineTo(w, h - r);
      ctx.quadraticCurveTo(w, h, w - r, h);
      ctx.lineTo(r, h);
      ctx.quadraticCurveTo(0, h, 0, h - r);
      ctx.lineTo(0, r);
      ctx.quadraticCurveTo(0, 0, r, 0);
      ctx.closePath();
      ctx.fill();
    } else if (frame.style === 'box') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = frame.color;
      ctx.lineWidth = 4;
      ctx.strokeRect(2, 2, w - 4, h - 4);
    } else {
      ctx.fillRect(0, 0, w, h);
    }
  } else {
    ctx.clearRect(0, 0, w, h);
  }

  // Draw QR
  ctx.drawImage(qrCanvas, padding, padding);

  // Draw label text
  if (frame.enabled && frame.text) {
    ctx.fillStyle = frame.style === 'box' ? frame.color : frame.textColor;
    ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(frame.text, w / 2, qrCanvas.height + padding * 2 + labelHeight / 2);
  }

  // Download
  const link = document.createElement('a');
  link.download = `${filename}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

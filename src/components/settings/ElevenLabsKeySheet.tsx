import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Key, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface ElevenLabsKeySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentKey: string;
  onSave: (key: string) => void;
}

export function ElevenLabsKeySheet({ open, onOpenChange, currentKey, onSave }: ElevenLabsKeySheetProps) {
  const [key, setKey] = useState(currentKey);

  useEffect(() => {
    if (open) setKey(currentKey);
  }, [open, currentKey]);

  const handleSave = () => {
    onSave(key.trim());
    toast.success(key.trim() ? 'API key saved' : 'API key cleared');
    onOpenChange(false);
  };

  const handleClear = () => {
    setKey('');
    onSave('');
    toast.success('API key cleared');
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Key className="w-5 h-5 text-primary" />
            ElevenLabs API Key
          </SheetTitle>
        </SheetHeader>
        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            Enter your own ElevenLabs API key for speech-to-text during interviews. Leave empty to use the default key.
          </p>
          <Input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="sk_..."
            className="font-mono text-sm"
          />
          <div className="flex gap-2">
            <Button onClick={handleSave} className="flex-1">
              Save
            </Button>
            {currentKey && (
              <Button variant="outline" onClick={handleClear}>
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

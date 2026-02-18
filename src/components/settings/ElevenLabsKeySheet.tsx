import { useState, useEffect, forwardRef } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Key, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/safeClient';

interface ElevenLabsKeySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** True when a key is already stored server-side */
  currentKey: string;
  onSave: (key: string) => void;
}

export const ElevenLabsKeySheet = forwardRef<HTMLDivElement, ElevenLabsKeySheetProps>(
  function ElevenLabsKeySheet({ open, onOpenChange, currentKey, onSave }, ref) {
  const [key, setKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  /** Whether the server has a key stored already */
  const hasServerKey = Boolean(currentKey);

  // Reset input when sheet opens
  useEffect(() => {
    if (open) setKey('');
  }, [open]);

  const handleSave = async () => {
    const trimmed = key.trim();
    if (!trimmed) {
      toast.error('Please enter an API key');
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.functions.invoke('manage-api-keys', {
        body: { action: 'save', provider: 'elevenlabs', apiKey: trimmed, keyTier: 'unknown' },
      });

      if (error) throw new Error(error.message);

      onSave(trimmed); // notify parent that a key is now configured
      toast.success('ElevenLabs API key saved securely');
      onOpenChange(false);
    } catch (err) {
      toast.error('Failed to save API key');
      console.error('[ElevenLabsKeySheet] Save error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = async () => {
    setIsClearing(true);
    try {
      const { error } = await supabase.functions.invoke('manage-api-keys', {
        body: { action: 'delete', provider: 'elevenlabs' },
      });

      if (error) throw new Error(error.message);

      onSave(''); // notify parent that key is gone
      toast.success('API key cleared');
      onOpenChange(false);
    } catch (err) {
      toast.error('Failed to clear API key');
      console.error('[ElevenLabsKeySheet] Clear error:', err);
    } finally {
      setIsClearing(false);
    }
  };

    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="rounded-t-2xl" ref={ref}>
          <SheetHeader className="shrink-0">
            <SheetTitle className="flex items-center gap-2">
              <Key className="w-5 h-5 text-primary" />
              ElevenLabs API Key
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 min-h-0 overflow-y-auto space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Enter your own ElevenLabs API key for speech-to-text during interviews.
              The key is stored securely and never exposed to the client.
              Leave empty to use the default key.
            </p>

            {hasServerKey && (
              <p className="text-xs text-primary font-medium">
                ✓ A custom key is currently stored securely on the server.
              </p>
            )}

            <Input
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder={hasServerKey ? 'Enter new key to replace existing…' : 'sk_…'}
              className="font-mono text-sm"
            />
            <div className="flex gap-2">
              <Button onClick={handleSave} className="flex-1" disabled={isSaving || !key.trim()}>
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Save
              </Button>
              {hasServerKey && (
                <Button variant="outline" onClick={handleClear} disabled={isClearing}>
                  {isClearing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </Button>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    );
  }
);

import { useState, useRef, useCallback } from 'react';
import ReactCrop, { type Crop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Sparkles, Loader2, RefreshCw, Check, X } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { haptics } from '@/lib/haptics';
import { supabase } from '@/integrations/supabase/safeClient';
import { useAIAction } from '@/hooks/useAIAction';

interface AvatarCropSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageFile: File | null;
  onComplete: (croppedBlob: Blob) => void;
}

function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number
): Crop {
  return centerCrop(
    makeAspectCrop(
      {
        unit: '%',
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight
    ),
    mediaWidth,
    mediaHeight
  );
}

export function AvatarCropSheet({
  open,
  onOpenChange,
  imageFile,
  onComplete,
}: AvatarCropSheetProps) {
  const [crop, setCrop] = useState<Crop>();
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [showAIPreview, setShowAIPreview] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const { execute: executeAI } = useAIAction({ operation: 'headshot' });

  // Load image when file changes
  useState(() => {
    if (imageFile) {
      const reader = new FileReader();
      reader.onload = () => {
        setImageSrc(reader.result as string);
        setAiResult(null);
        setShowAIPreview(false);
      };
      reader.readAsDataURL(imageFile);
    }
  });

  // Reset state when opening with new file
  const handleImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    setCrop(centerAspectCrop(width, height, 1));
  }, []);

  const getCroppedImg = useCallback(async (): Promise<Blob | null> => {
    if (!imgRef.current || !crop) return null;

    const image = imgRef.current;
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const pixelCrop = {
      x: (crop.x / 100) * image.naturalWidth,
      y: (crop.y / 100) * image.naturalHeight,
      width: (crop.width / 100) * image.naturalWidth,
      height: (crop.height / 100) * image.naturalHeight,
    };

    // Set canvas size to a reasonable avatar size
    const outputSize = 512;
    canvas.width = outputSize;
    canvas.height = outputSize;

    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      outputSize,
      outputSize
    );

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/png', 1);
    });
  }, [crop]);

  const handleUseCropped = async () => {
    haptics.light();
    const blob = await getCroppedImg();
    if (blob) {
      onComplete(blob);
      onOpenChange(false);
    } else {
      toast.error('Failed to crop image');
    }
  };

  const handleGenerateAIHeadshot = async () => {
    if (!imageSrc) return;

    setIsGeneratingAI(true);
    haptics.light();

    try {
      // First get the cropped image as base64
      const croppedBlob = await getCroppedImg();
      if (!croppedBlob) {
        throw new Error('Failed to crop image');
      }

      // Convert blob to base64
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result);
        };
        reader.readAsDataURL(croppedBlob);
      });

      // Call the edge function with credit check
      const result = await executeAI(async () => {
        const { data, error } = await supabase.functions.invoke('generate-headshot', {
          body: { imageBase64: base64 },
        });

        if (error) throw error;
        if (!data?.imageUrl) throw new Error('No image returned');
        return data;
      });

      if (!result) { setIsGeneratingAI(false); return; }

      setAiResult(result.imageUrl);
      setShowAIPreview(true);
      haptics.success();
      toast.success('AI headshot generated!');
    } catch (error) {
      console.error('AI headshot error:', error);
      haptics.error();
      toast.error('Failed to generate AI headshot');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleUseAIResult = async () => {
    if (!aiResult) return;

    haptics.light();
    try {
      // Convert data URL to blob
      const response = await fetch(aiResult);
      const blob = await response.blob();
      onComplete(blob);
      onOpenChange(false);
    } catch (error) {
      console.error('Error using AI result:', error);
      toast.error('Failed to use AI image');
    }
  };

  const handleRejectAI = () => {
    setShowAIPreview(false);
    setAiResult(null);
    haptics.light();
  };

  const handleClose = () => {
    setImageSrc(null);
    setCrop(undefined);
    setAiResult(null);
    setShowAIPreview(false);
    onOpenChange(false);
  };

  // Load image when file changes
  if (imageFile && !imageSrc) {
    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result as string);
      setAiResult(null);
      setShowAIPreview(false);
    };
    reader.readAsDataURL(imageFile);
  }

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="bottom" className="h-[85vh] flex flex-col p-0">
        <SheetHeader className="shrink-0 px-6 pt-6 pb-4 border-b border-border">
          <SheetTitle>
            {showAIPreview ? 'AI Professional Headshot' : 'Crop Your Photo'}
          </SheetTitle>
          <SheetDescription>
            {showAIPreview
              ? 'Review your AI-generated professional headshot'
              : 'Adjust the crop area, then use as-is or generate an AI headshot'}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 min-h-0 overflow-y-auto px-6">
          <div className="py-6 flex flex-col items-center gap-4">
            {showAIPreview && aiResult ? (
              <>
                {/* AI Result Preview */}
                <div className="relative w-64 h-64 rounded-full overflow-hidden border-4 border-primary/20">
                  <img
                    src={aiResult}
                    alt="AI Generated Headshot"
                    className="w-full h-full object-cover"
                  />
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  Professional headshot generated by AI
                </p>
              </>
            ) : imageSrc ? (
              <>
                {/* Crop View */}
                <div className="w-full max-w-sm">
                  <ReactCrop
                    crop={crop}
                    onChange={(_, percentCrop) => setCrop(percentCrop)}
                    aspect={1}
                    circularCrop
                    className="max-w-full"
                  >
                    <img
                      ref={imgRef}
                      src={imageSrc}
                      alt="Upload"
                      onLoad={handleImageLoad}
                      className="max-w-full max-h-[40vh] object-contain"
                    />
                  </ReactCrop>
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Drag to reposition • Resize corners to adjust
                </p>

                {/* AI Headshot Button */}
                <Button
                  variant="outline"
                  onClick={handleGenerateAIHeadshot}
                  disabled={isGeneratingAI}
                  className="mt-2 gap-2"
                >
                  {isGeneratingAI ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      AI Professional Headshot
                    </>
                  )}
                </Button>
                {!isGeneratingAI && (
                  <p className="text-xs text-muted-foreground text-center max-w-xs">
                    Transform your photo into a professional headshot with business attire
                  </p>
                )}
              </>
            ) : (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex gap-3 p-6 pb-safe border-t border-border bg-background shrink-0">
          {showAIPreview ? (
            <>
              <Button
                variant="outline"
                onClick={handleRejectAI}
                className="flex-1 gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </Button>
              <Button onClick={handleUseAIResult} className="flex-1 gap-2">
                <Check className="w-4 h-4" />
                Use This
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={handleClose}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleUseCropped}
                disabled={!crop || isGeneratingAI}
                className="flex-1"
              >
                Use Photo
              </Button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

import { useState, useRef, useCallback } from 'react';
import ReactCrop, { type Crop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Sparkles } from 'lucide-react';
import { MiniSpinner } from '@/components/ui/MiniSpinner';
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

interface AvatarCropSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageFile: File | null;
  onComplete: (croppedBlob: Blob) => void;
}

function centerAspectCrop(mediaWidth: number, mediaHeight: number, aspect: number): Crop {
  return centerCrop(
    makeAspectCrop({ unit: '%', width: 90 }, aspect, mediaWidth, mediaHeight),
    mediaWidth,
    mediaHeight,
  );
}

export function AvatarCropSheet({ open, onOpenChange, imageFile, onComplete }: AvatarCropSheetProps) {
  const [crop, setCrop] = useState<Crop>();
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Load image when file changes
  useState(() => {
    if (imageFile) {
      const reader = new FileReader();
      reader.onload = () => setImageSrc(reader.result as string);
      reader.readAsDataURL(imageFile);
    }
  });

  const handleImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    setCrop(centerAspectCrop(width, height, 1));
  }, []);

  const getCroppedImg = useCallback(async (): Promise<Blob | null> => {
    if (!imgRef.current || !crop) return null;
    const image = imgRef.current;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const pixelCrop = {
      x: (crop.x / 100) * image.naturalWidth,
      y: (crop.y / 100) * image.naturalHeight,
      width: (crop.width / 100) * image.naturalWidth,
      height: (crop.height / 100) * image.naturalHeight,
    };
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
      outputSize,
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

  const handleClose = () => {
    setImageSrc(null);
    setCrop(undefined);
    onOpenChange(false);
  };

  // Load image when file changes (effect-style sync update guard)
  if (imageFile && !imageSrc) {
    const reader = new FileReader();
    reader.onload = () => setImageSrc(reader.result as string);
    reader.readAsDataURL(imageFile);
  }

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="bottom" className="h-[85vh] flex flex-col p-0">
        <SheetHeader className="shrink-0 px-6 pt-6 pb-4 border-b border-border">
          <SheetTitle>Crop Your Photo</SheetTitle>
          <SheetDescription>Adjust the crop area, then save it as your avatar.</SheetDescription>
        </SheetHeader>

        <div className="flex-1 min-h-0 overflow-y-auto px-6">
          <div className="py-6 flex flex-col items-center gap-4">
            {imageSrc ? (
              <>
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

                <Button
                  variant="outline"
                  onClick={() => {
                    haptics.light();
                    toast('AI Professional Headshot is coming soon!', {
                      description:
                        'A future update will let you transform your photo into a polished headshot with business attire.',
                    });
                  }}
                  className="mt-2 gap-2"
                  type="button"
                >
                  <Sparkles className="w-4 h-4" />
                  AI Professional Headshot
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                    Coming Soon
                  </span>
                </Button>
              </>
            ) : (
              <div className="flex items-center justify-center h-40">
                <MiniSpinner size={32} />
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3 p-6 pb-safe border-t border-border bg-background shrink-0">
          <Button variant="outline" onClick={handleClose} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleUseCropped} disabled={!crop} className="flex-1">
            Use Photo
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

import { useState, useRef } from 'react';
import { User, Upload, Type, Camera } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { AvatarCropSheet } from '@/components/settings/AvatarCropSheet';
import { haptics } from '@/lib/haptics';

interface ResumePhotoSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profilePhotoUrl: string | null;
  resumeId: string | undefined;
  onUseProfilePhoto: () => void;
  onUploadPhoto: (blob: Blob) => void;
  onKeepInitials: (dontAskAgain: boolean) => void;
}

export function ResumePhotoSheet({
  open,
  onOpenChange,
  profilePhotoUrl,
  resumeId,
  onUseProfilePhoto,
  onUploadPhoto,
  onKeepInitials,
}: ResumePhotoSheetProps) {
  const [dontAskAgain, setDontAskAgain] = useState(false);
  const [showCropSheet, setShowCropSheet] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUseProfile = () => {
    haptics.light();
    onUseProfilePhoto();
    onOpenChange(false);
  };

  const handleUploadClick = () => {
    haptics.light();
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setShowCropSheet(true);
    }
    // Reset input so the same file can be selected again
    e.target.value = '';
  };

  const handleCropComplete = (blob: Blob) => {
    onUploadPhoto(blob);
    setShowCropSheet(false);
    setSelectedFile(null);
    onOpenChange(false);
  };

  const handleKeepInitials = () => {
    haptics.light();
    onKeepInitials(dontAskAgain);
    onOpenChange(false);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="flex flex-col p-0">
          <SheetHeader className="shrink-0 px-6 pt-6 pb-4">
            <SheetTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-primary" />
              Add Photo to Resume
            </SheetTitle>
            <SheetDescription>
              This template supports a profile photo to make your resume stand out!
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 min-h-0 overflow-y-auto px-6">
            <div className="grid grid-cols-3 gap-3 py-4">
              {/* Use Profile Photo */}
              <button
                onClick={handleUseProfile}
                disabled={!profilePhotoUrl}
                className="flex flex-col items-center gap-3 p-4 rounded-xl border border-border bg-card hover:bg-accent/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                  {profilePhotoUrl ? (
                    <img
                      src={profilePhotoUrl}
                      alt="Profile"
                      className="w-14 h-14 rounded-full object-cover"
                    />
                  ) : (
                    <User className="w-7 h-7 text-primary" />
                  )}
                </div>
                <span className="text-sm font-medium text-center">
                  {profilePhotoUrl ? 'Use Profile' : 'No Profile Photo'}
                </span>
              </button>

              {/* Upload New Photo */}
              <button
                onClick={handleUploadClick}
                className="flex flex-col items-center gap-3 p-4 rounded-xl border border-border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="w-14 h-14 rounded-full bg-secondary/50 flex items-center justify-center">
                  <Upload className="w-7 h-7 text-muted-foreground" />
                </div>
                <span className="text-sm font-medium text-center">Upload New</span>
              </button>

              {/* Keep Initials */}
              <button
                onClick={handleKeepInitials}
                className="flex flex-col items-center gap-3 p-4 rounded-xl border border-border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
                  <Type className="w-7 h-7 text-muted-foreground" />
                </div>
                <span className="text-sm font-medium text-center">Keep Initials</span>
              </button>
            </div>

            {/* Don't ask again checkbox */}
            <div className="flex items-center gap-3 py-4 border-t border-border">
              <Checkbox
                id="dont-ask-photo"
                checked={dontAskAgain}
                onCheckedChange={(checked) => setDontAskAgain(checked === true)}
              />
              <Label
                htmlFor="dont-ask-photo"
                className="text-sm text-muted-foreground cursor-pointer"
              >
                Don't ask again for this resume
              </Label>
            </div>
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Footer */}
          <div className="shrink-0 p-6 pb-safe border-t border-border">
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => onOpenChange(false)}
            >
              Maybe Later
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Crop Sheet */}
      <AvatarCropSheet
        open={showCropSheet}
        onOpenChange={setShowCropSheet}
        imageFile={selectedFile}
        onComplete={handleCropComplete}
      />
    </>
  );
}

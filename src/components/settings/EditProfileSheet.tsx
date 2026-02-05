import { useState, useEffect, useRef } from 'react';
import { Camera, Upload, Loader2, MapPin, Briefcase, Linkedin, CheckCircle2 } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { haptics } from '@/lib/haptics';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  CareerLevel,
  INDUSTRY_OPTIONS, 
  CAREER_LEVEL_OPTIONS,
  calculateProfileCompletion 
} from '@/hooks/useProfile';

interface Profile {
  fullName: string | null;
  avatarUrl: string | null;
  jobTitle: string | null;
  industry: string | null;
  careerLevel: CareerLevel | null;
  location: string | null;
  linkedinUrl: string | null;
  profileCompleted: boolean;
}

interface EditProfileSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: Profile | null;
  userId?: string;
  userEmail?: string;
  onSave: (data: Partial<Profile>) => Promise<void>;
}

export function EditProfileSheet({
  open,
  onOpenChange,
  profile,
  userId,
  userEmail,
  onSave,
}: EditProfileSheetProps) {
  const [fullName, setFullName] = useState(profile?.fullName || '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatarUrl || '');
  const [jobTitle, setJobTitle] = useState(profile?.jobTitle || '');
  const [industry, setIndustry] = useState(profile?.industry || '');
  const [careerLevel, setCareerLevel] = useState<CareerLevel | ''>(profile?.careerLevel || '');
  const [location, setLocation] = useState(profile?.location || '');
  const [linkedinUrl, setLinkedinUrl] = useState(profile?.linkedinUrl || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync form state when profile changes or sheet opens
  useEffect(() => {
    if (open && profile) {
      setFullName(profile.fullName || '');
      setAvatarUrl(profile.avatarUrl || '');
      setJobTitle(profile.jobTitle || '');
      setIndustry(profile.industry || '');
      setCareerLevel(profile.careerLevel || '');
      setLocation(profile.location || '');
      setLinkedinUrl(profile.linkedinUrl || '');
    }
  }, [open, profile]);

  const currentFormProfile: Profile = {
    fullName: fullName.trim() || null,
    avatarUrl: avatarUrl.trim() || null,
    jobTitle: jobTitle.trim() || null,
    industry: industry || null,
    careerLevel: careerLevel || null,
    location: location.trim() || null,
    linkedinUrl: linkedinUrl.trim() || null,
    profileCompleted: false,
  };
  const completionPercentage = calculateProfileCompletion(currentFormProfile);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    // Validate file type and size
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Add cache-busting query param
      setAvatarUrl(`${publicUrl}?t=${Date.now()}`);
      haptics.success();
      toast.success('Avatar uploaded');
    } catch (error) {
      console.error('Avatar upload error:', error);
      haptics.error();
      toast.error('Failed to upload avatar');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({
        fullName: fullName.trim() || null,
        avatarUrl: avatarUrl.trim() || null,
        jobTitle: jobTitle.trim() || null,
        industry: industry || null,
        careerLevel: careerLevel || null,
        location: location.trim() || null,
        linkedinUrl: linkedinUrl.trim() || null,
        profileCompleted: completionPercentage === 100,
      });
      haptics.success();
      onOpenChange(false);
    } catch (error) {
      haptics.error();
    } finally {
      setIsSaving(false);
    }
  };

  const getInitials = () => {
    if (fullName.trim()) {
      return fullName
        .trim()
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    if (userEmail) {
      return userEmail.charAt(0).toUpperCase();
    }
    return 'U';
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] flex flex-col p-0">
        <SheetHeader>
          <div className="px-6 pt-6 pb-4 border-b border-border">
            <SheetTitle>Edit Profile</SheetTitle>
            <SheetDescription>Personalize your resume-building experience</SheetDescription>
            
            {/* Profile Completion */}
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Profile completion</span>
                <span className="font-medium flex items-center gap-1">
                  {completionPercentage}%
                  {completionPercentage === 100 && (
                    <CheckCircle2 className="w-4 h-4 text-success" />
                  )}
                </span>
              </div>
              <Progress value={completionPercentage} className="h-2" />
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 px-6">
          <div className="space-y-6 py-6">
          {/* Avatar Preview */}
          <div className="flex justify-center">
            <div className="relative group">
              <Avatar className="h-20 w-20">
                <AvatarImage src={avatarUrl || undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center border-2 border-background hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {isUploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Camera className="w-4 h-4" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground text-center">Tap the camera to upload</p>

          {/* Basic Info Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">BASIC INFO</h3>
            
            <div className="space-y-2">
              <Label htmlFor="fullName">Display Name</Label>
              <Input
                id="fullName"
                placeholder="Enter your name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location" className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5" />
                Location
              </Label>
              <Input
                id="location"
                placeholder="City, Country"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="linkedin" className="flex items-center gap-2">
                <Linkedin className="w-3.5 h-3.5" />
                LinkedIn URL
              </Label>
              <Input
                id="linkedin"
                placeholder="https://linkedin.com/in/yourprofile"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
              />
            </div>
          </div>

          {/* Professional Details Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">PROFESSIONAL DETAILS</h3>
            
            <div className="space-y-2">
              <Label htmlFor="jobTitle" className="flex items-center gap-2">
                <Briefcase className="w-3.5 h-3.5" />
                Current Role / Job Title
              </Label>
              <Input
                id="jobTitle"
                placeholder="e.g. Software Engineer"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="industry">Industry</Label>
              <Select value={industry} onValueChange={setIndustry}>
                <SelectTrigger id="industry">
                  <SelectValue placeholder="Select your industry" />
                </SelectTrigger>
                <SelectContent>
                  {INDUSTRY_OPTIONS.map((ind) => (
                    <SelectItem key={ind} value={ind}>
                      {ind}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Career Level</Label>
              <div className="grid grid-cols-2 gap-2">
                {CAREER_LEVEL_OPTIONS.map((level) => (
                  <button
                    key={level.value}
                    type="button"
                    onClick={() => setCareerLevel(level.value)}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      careerLevel === level.value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:border-muted-foreground/50'
                    }`}
                  >
                    <div className="font-medium text-sm">{level.label}</div>
                    <div className="text-xs text-muted-foreground">{level.description}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
          </div>
        </ScrollArea>

          {/* Actions */}
          <div className="flex gap-3 p-6 border-t border-border bg-background">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
      </SheetContent>
    </Sheet>
  );
}

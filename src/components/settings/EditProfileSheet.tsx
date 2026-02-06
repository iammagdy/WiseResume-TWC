import { useState, useEffect, useRef } from 'react';
import { Camera, Upload, Loader2, MapPin, Briefcase, Linkedin, CheckCircle2, Sparkles, Download, X } from 'lucide-react';
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

import { haptics } from '@/lib/haptics';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  CareerLevel,
  INDUSTRY_OPTIONS, 
  CAREER_LEVEL_OPTIONS,
  calculateProfileCompletion 
} from '@/hooks/useProfile';
import { LinkedInImportSheet } from './LinkedInImportSheet';
import { AvatarCropSheet } from './AvatarCropSheet';
import { useResumeStore } from '@/store/resumeStore';
import { Experience, Education } from '@/types/resume';
import { v4 as uuidv4 } from 'uuid';

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
  const [linkedInImportOpen, setLinkedInImportOpen] = useState(false);
  const [cropSheetOpen, setCropSheetOpen] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);

  const { currentResume, updateResume } = useResumeStore();

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

  // Handle file selection - open crop sheet instead of direct upload
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
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

    // Open crop sheet with the selected file
    setSelectedImageFile(file);
    setCropSheetOpen(true);
    
    // Reset file input so same file can be selected again
    e.target.value = '';
  };

  // Handle cropped image upload and auto-save to database
  const handleCroppedImage = async (blob: Blob) => {
    if (!userId) return;

    setIsUploading(true);
    try {
      const fileName = `${userId}/avatar.png`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, blob, { upsert: true, contentType: 'image/png' });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Add cache-busting query param
      const newAvatarUrl = `${publicUrl}?t=${Date.now()}`;
      setAvatarUrl(newAvatarUrl);
      
      // AUTO-SAVE: Immediately persist avatar URL to database
      await onSave({ avatarUrl: newAvatarUrl });
      
      haptics.success();
      toast.success('Avatar updated');
    } catch (error) {
      console.error('Avatar upload error:', error);
      haptics.error();
      toast.error('Failed to upload avatar');
    } finally {
      setIsUploading(false);
      setSelectedImageFile(null);
    }
  };

  // Handle removing avatar
  const handleRemoveAvatar = async () => {
    if (!userId || !avatarUrl) return;
    
    setIsUploading(true);
    try {
      // Try to delete from storage
      const fileName = `${userId}/avatar.png`;
      await supabase.storage.from('avatars').remove([fileName]);
      
      // Clear local state
      setAvatarUrl('');
      
      // Save null to database
      await onSave({ avatarUrl: null });
      
      haptics.success();
      toast.success('Avatar removed');
    } catch (error) {
      console.error('Error removing avatar:', error);
      haptics.error();
      toast.error('Failed to remove avatar');
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

   // Extract LinkedIn username from URL
   const getLinkedInUsername = () => {
     if (!linkedinUrl) return undefined;
     const match = linkedinUrl.match(/linkedin\.com\/in\/([^\/\?]+)/);
     return match?.[1];
   };
 
   // Transform LinkedIn data to resume format
   const handleLinkedInImport = (data: {
     summary?: string | null;
     experience?: Array<{
       title: string;
       company: string;
       location?: string;
       startDate: string;
       endDate: string;
       description: string;
       current: boolean;
     }>;
     education?: Array<{
       institution: string;
       degree: string;
       field?: string;
       startYear?: string;
       endYear?: string;
       description?: string;
     }>;
     skills?: string[];
   }) => {
     const updates: Partial<typeof currentResume> = {};
 
     // Transform and merge summary
     if (data.summary) {
       updates.summary = data.summary;
     }
 
     // Transform and merge experience
     if (data.experience?.length) {
       const transformedExp: Experience[] = data.experience.map((exp) => ({
         id: uuidv4(),
         company: exp.company,
         position: exp.title,
         startDate: exp.startDate,
         endDate: exp.current ? 'Present' : exp.endDate,
         current: exp.current,
         description: exp.description,
         achievements: [],
       }));
       updates.experience = [
         ...transformedExp,
         ...(currentResume?.experience || []),
       ];
     }
 
     // Transform and merge education
     if (data.education?.length) {
       const transformedEdu: Education[] = data.education.map((edu) => ({
         id: uuidv4(),
         institution: edu.institution,
         degree: edu.degree,
         field: edu.field || '',
         startDate: edu.startYear || '',
         endDate: edu.endYear || '',
       }));
       updates.education = [
         ...transformedEdu,
         ...(currentResume?.education || []),
       ];
     }
 
     // Merge skills (deduplicate)
     if (data.skills?.length) {
       const existingSkills = new Set((currentResume?.skills || []).map(s => s.toLowerCase()));
       const newSkills = data.skills.filter(s => !existingSkills.has(s.toLowerCase()));
       updates.skills = [...newSkills, ...(currentResume?.skills || [])];
     }
 
     // Update the resume store
     updateResume(updates);
   };
 
  return (
     <>
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] flex flex-col p-0">
        <SheetHeader className="shrink-0">
          <div className="px-6 pt-6 pb-4 border-b border-border">
            <SheetTitle>Edit Profile</SheetTitle>
            <SheetDescription>Personalize your resume-building experience</SheetDescription>
            
            {/* Profile Completion */}
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Profile completion</span>
                <span className="font-semibold text-primary flex items-center gap-1.5">
                  {completionPercentage}%
                  {completionPercentage === 100 && (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  )}
                </span>
              </div>
              <Progress value={completionPercentage} className="h-2" />
              {completionPercentage < 100 && (
                <p className="text-xs text-muted-foreground">
                  Complete your profile to get personalized AI suggestions
                </p>
              )}
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 min-h-0 overflow-y-auto px-6">
          <div className="space-y-6 py-6">
            {/* Avatar Preview */}
            <div className="flex flex-col items-center gap-2">
              <div className="relative group">
                <Avatar className="h-24 w-24 border-2 border-border">
                  <AvatarImage src={avatarUrl || undefined} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
                {/* Camera button to upload */}
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
                {/* Remove avatar button - only show when avatar exists */}
                {avatarUrl && !isUploading && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center border-2 border-background hover:bg-destructive/90 transition-colors"
                    title="Remove avatar"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {avatarUrl ? 'Tap camera to change, X to remove' : 'Tap the camera to upload'}
              </p>
            </div>

            {/* Basic Info Section */}
            <div className="space-y-3">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Basic Info
              </h3>
              
              <div className="rounded-xl bg-card/50 border border-border overflow-hidden">
                <div className="p-4 space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="fullName" className="text-xs text-muted-foreground">
                      Display Name
                    </Label>
                    <Input
                      id="fullName"
                      placeholder="Enter your name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="bg-background"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="location" className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <MapPin className="w-3 h-3" />
                      Location
                    </Label>
                    <Input
                      id="location"
                      placeholder="City, Country"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="bg-background"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="linkedin" className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Linkedin className="w-3 h-3" />
                      LinkedIn Username
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                        linkedin.com/in/
                      </span>
                      <Input
                        id="linkedin"
                        placeholder="yourprofile"
                        value={linkedinUrl?.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//i, '') || ''}
                        onChange={(e) => setLinkedinUrl(`https://linkedin.com/in/${e.target.value.replace(/\s/g, '')}`)}
                        className="pl-[115px] bg-background"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* LinkedIn Import Button */}
              <button
                type="button"
                onClick={() => {
                  haptics.light();
                  setLinkedInImportOpen(true);
                }}
                className="w-full flex items-center justify-between p-4 rounded-xl border border-dashed border-primary/50 bg-primary/5 hover:bg-primary/10 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-sm">Import from LinkedIn</p>
                    <p className="text-xs text-muted-foreground">AI extracts your profile data</p>
                  </div>
                </div>
                <Download className="w-5 h-5 text-primary group-hover:translate-y-0.5 transition-transform" />
              </button>
            </div>

            {/* Professional Details Section */}
            <div className="space-y-3">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Professional Details
              </h3>
              
              <div className="rounded-xl bg-card/50 border border-border overflow-hidden">
                <div className="p-4 space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="jobTitle" className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Briefcase className="w-3 h-3" />
                      Current Role / Job Title
                    </Label>
                    <Input
                      id="jobTitle"
                      placeholder="e.g. Software Engineer"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      className="bg-background"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="industry" className="text-xs text-muted-foreground">
                      Industry
                    </Label>
                    <Select value={industry} onValueChange={setIndustry}>
                      <SelectTrigger id="industry" className="bg-background">
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
                    <Label className="text-xs text-muted-foreground">Career Level</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {CAREER_LEVEL_OPTIONS.map((level) => (
                        <button
                          key={level.value}
                          type="button"
                          onClick={() => setCareerLevel(level.value)}
                          className={`p-3 rounded-lg border text-left transition-all ${
                            careerLevel === level.value
                              ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary/20'
                              : 'border-border bg-background hover:border-muted-foreground/50'
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
            </div>
          </div>
        </div>

        {/* Actions - Fixed footer */}
        <div className="flex gap-3 p-6 pb-safe border-t border-border bg-background shrink-0">
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
     
     {/* LinkedIn Import Sheet */}
     <LinkedInImportSheet
       open={linkedInImportOpen}
       onOpenChange={setLinkedInImportOpen}
       onImport={handleLinkedInImport}
       linkedinUsername={getLinkedInUsername()}
     />
     
     {/* Avatar Crop Sheet */}
     <AvatarCropSheet
       open={cropSheetOpen}
       onOpenChange={setCropSheetOpen}
       imageFile={selectedImageFile}
       onComplete={handleCroppedImage}
     />
     </>
   );
}

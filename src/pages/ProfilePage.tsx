import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit2, Share2, FileText, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import { useProfile, calculateProfileCompletion } from '@/hooks/useProfile';
import { useResumes } from '@/hooks/useResumes';
import { useJobApplications } from '@/hooks/useJobApplications';
import { EditProfileSheet } from '@/components/settings/EditProfileSheet';
import { ResumeListCard } from '@/components/dashboard/ResumeListCard';
import { useResumeStore } from '@/store/resumeStore';
import { dbToResumeData, useResumeMutations } from '@/hooks/useResumes';
import { toast } from 'sonner';
import { useEffect } from 'react';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile, updateProfile } = useProfile(user?.id, user);
  const { data: resumes = [] } = useResumes();
  const { data: applications = [] } = useJobApplications();
  const { deleteResume, duplicateResume } = useResumeMutations();
  const { setCurrentResume, setCurrentResumeId, setSelectedTemplate } = useResumeStore();
  const [editOpen, setEditOpen] = useState(false);

  // Auth guard handled by ProtectedRoute
  if (!user) return null;

  const completion = calculateProfileCompletion(profile);

  const getInitials = () => {
    if (profile?.fullName) {
      return profile.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return user.email?.charAt(0).toUpperCase() || 'U';
  };

  const handleEditResume = (id: string) => {
    const resume = resumes.find(r => r.id === id);
    if (resume) {
      setCurrentResume(dbToResumeData(resume));
      setCurrentResumeId(id);
      setSelectedTemplate(resume.template_id as any);
      navigate('/editor');
    }
  };

  const handleShareProfile = async () => {
    const text = `${profile?.fullName || 'User'} — ${profile?.jobTitle || 'Professional'}\n${resumes.length} resumes on WiseResume`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'My WiseResume Profile', text });
      } catch {}
    } else {
      await navigator.clipboard.writeText(text);
      toast.success('Profile info copied!');
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 px-4 h-14 pt-safe border-b border-border glass-header backdrop-blur-md">
        <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')} className="w-12 h-12" aria-label="Go back">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-bold text-foreground">My Profile</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {/* Avatar & Name */}
        <div className="flex flex-col items-center text-center gap-3">
          <Avatar className="h-20 w-20 border-2 border-border">
            <AvatarImage src={profile?.avatarUrl || undefined} />
            <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-xl font-bold text-foreground">{profile?.fullName || 'Your Name'}</h2>
            <p className="text-sm text-muted-foreground">{profile?.jobTitle || 'Add a job title'}</p>
          </div>
        </div>

        {/* Profile Completion */}
        <div className="glass-elevated rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Profile completion</span>
            <span className="font-semibold text-primary">{completion}%</span>
          </div>
          <Progress value={completion} className="h-2" />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1 h-12 min-h-[48px] rounded-xl active:scale-95 touch-manipulation" onClick={() => setEditOpen(true)}>
            <Edit2 className="w-4 h-4 mr-2" /> Edit Profile
          </Button>
          <Button variant="outline" className="flex-1 h-12 min-h-[48px] rounded-xl active:scale-95 touch-manipulation" onClick={handleShareProfile}>
            <Share2 className="w-4 h-4 mr-2" /> Share
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="glass-elevated rounded-2xl p-4 text-center">
            <FileText className="w-6 h-6 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold text-foreground">{resumes.length}</p>
            <p className="text-xs text-muted-foreground">Resumes</p>
          </div>
          <div className="glass-elevated rounded-2xl p-4 text-center">
            <Briefcase className="w-6 h-6 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold text-foreground">{applications.length}</p>
            <p className="text-xs text-muted-foreground">Applications</p>
          </div>
        </div>

        {/* Resume Portfolio */}
        {resumes.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">My Resumes</h3>
            <div className="space-y-3">
              {resumes.map(resume => (
                <ResumeListCard
                  key={resume.id}
                  resume={resume}
                  onEdit={handleEditResume}
                  onDuplicate={(id) => duplicateResume.mutate(id)}
                  onDelete={(id) => deleteResume.mutate(id)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <EditProfileSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        profile={profile}
        userId={user.id}
        userEmail={user.email}
        onSave={updateProfile}
      />
    </div>
  );
}

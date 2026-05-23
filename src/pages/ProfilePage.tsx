import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit2, Share2, FileText, Briefcase, Globe, ExternalLink, MapPin, Clock, FileDown, Sparkles, User, AlertTriangle, RefreshCw } from 'lucide-react';
import { MiniSpinner } from '@/components/ui/MiniSpinner';
import { LoadingButton } from '@/components/ui/LoadingButton';
import { BackButton } from '@/components/ui/BackButton';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useProfile, calculateProfileCompletion, getNextMissingField } from '@/hooks/useProfile';
import { usePlan } from '@/hooks/usePlan';
import { PlanAvatar } from '@/components/ui/PlanAvatar';
import { useResumes } from '@/hooks/useResumes';
import { useJobApplications } from '@/hooks/useJobApplications';
import { EditProfileSheet } from '@/components/settings/EditProfileSheet';
import { CareerMilestonesRow } from '@/components/dashboard/CareerMilestonesRow';
import { ResumeListCard } from '@/components/dashboard/ResumeListCard';
import { LinkedInImportSheet } from '@/components/settings/LinkedInImportSheet';
import { useResumeStore } from '@/store/resumeStore';
import { dbToResumeData, useResumeMutations } from '@/hooks/useResumes';
import { toast } from 'sonner';
import { haptics } from '@/lib/haptics';
import { getPortfolioUrl } from '@/lib/portfolioUrl';
import { formatDistanceToNow } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';


import { ProfileSkeleton } from '@/components/profile/ProfileSkeleton';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, authSettled } = useAuth();
  const { profile, loading: profileLoading, updateProfile } = useProfile(user?.id);
  const { plan } = usePlan();
  const { data: resumes = [] } = useResumes();
  const { data: applications = [] } = useJobApplications();
  const { deleteResume, duplicateResume } = useResumeMutations();
  const { setCurrentResume, setCurrentResumeId, setSelectedTemplate } = useResumeStore();
  const [editOpen, setEditOpen] = useState(false);
const [linkedinOpen, setLinkedinOpen] = useState(false);
  const [draftWarningOpen, setDraftWarningOpen] = useState(false);
  const [isNavigatingToOnboarding, setIsNavigatingToOnboarding] = useState(false);
  const [isResyncing, setIsResyncing] = useState(false);
  const [isGoingLive, setIsGoingLive] = useState(false);

  const isLoading = !authSettled || (profileLoading && !profile);

  if (isLoading) return <ProfileSkeleton />;
  if (!user) return null;

  const completion = calculateProfileCompletion(profile);

  const getInitials = () => {
    if (profile?.fullName) {
      return profile.fullName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return user.email?.charAt(0).toUpperCase() || 'U';
  };

  const handleEditResume = (id: string) => {
    const resume = resumes.find((r) => r.id === id);
    if (resume) {
      setCurrentResume(dbToResumeData(resume));
      setCurrentResumeId(id);
      setSelectedTemplate(resume.template_id as any);
      navigate('/editor');
    }
  };

  const handlePortfolioShare = async () => {
    if (!profile?.portfolioEnabled) {
      setDraftWarningOpen(true);
      return;
    }
    await doPortfolioShare();
  };

  const doPortfolioShare = async () => {
    if (!profile?.username) {
      toast.error('Set up your portfolio username first');
      return;
    }
    const url = getPortfolioUrl(profile.username);
    if (navigator.share) {
      try {
        await navigator.share({ title: `${profile?.fullName || 'My'} Portfolio`, url });
      } catch { /* Sharing failed or cancelled */ }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success('Portfolio URL copied!');
    }
    haptics.light();
  };

  const handleGoLive = async () => {
    if (isGoingLive) return;
    setIsGoingLive(true);
    try {
      await updateProfile({ portfolioEnabled: true });
      toast.success('Portfolio is now live!');
      setDraftWarningOpen(false);
      await doPortfolioShare();
    } catch {
      toast.error('Failed to update portfolio status');
    } finally {
      setIsGoingLive(false);
    }
  };

  const handleLinkedInImport = (data: any) => {
    void data;
    toast.success('Profile imported — open the editor to use your data');
    haptics.success();
  };

  const nextTip = getNextMissingField(profile);

  const portfolioResume = resumes.find((r) => r.id === profile?.portfolioResumeId) || resumes[0];
  const portfolioLastSyncedAt = profile?.portfolioExtras?.lastSyncedFromResumeAt;
  const isPortfolioStale =
    profile?.portfolioSyncMode === 'locked' &&
    !!portfolioResume?.updated_at &&
    !!portfolioLastSyncedAt &&
    new Date(portfolioResume.updated_at) > new Date(portfolioLastSyncedAt);

  const handleResyncPortfolio = async () => {
    if (isResyncing) return;
    haptics.light();
    setIsResyncing(true);
    try {
      await updateProfile({
        portfolioSyncMode: 'auto',
        portfolioExtras: {
          ...(profile?.portfolioExtras || {}),
          lastSyncedFromResumeAt: new Date().toISOString(),
        },
      });
      toast.success('Portfolio re-synced with your resume');
    } catch {
      toast.error('Failed to re-sync portfolio');
    } finally {
      setIsResyncing(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Header */}
      <header className="lg:hidden shrink-0 sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <BackButton />
          <User className="w-5 h-5 text-primary" />
          <h1 className="text-page-title truncate">My Profile</h1>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 lg:max-w-none mx-auto w-full">
        {/* Incomplete Profile Banner */}
        {completion < 100 && (
          <div className="flex items-center gap-3 p-3 rounded-xl border border-primary/20 bg-primary/5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">Profile {completion}% complete</p>
              <p className="text-xs text-muted-foreground">Finish setup for better AI suggestions</p>
            </div>
            <Button
              variant="default"
              size="sm"
              className="shrink-0 h-8"
              disabled={isNavigatingToOnboarding}
              onClick={() => {
                setIsNavigatingToOnboarding(true);
                navigate('/onboarding');
              }}
            >
              {isNavigatingToOnboarding ? 'Loading...' : 'Complete'}
            </Button>
          </div>
        )}
        {/* Avatar & Name */}
        <div className="flex flex-col items-center text-center gap-3">
          <PlanAvatar
            plan={plan}
            avatarUrl={profile?.avatarUrl}
            initials={getInitials()}
            size="h-24 w-24"
            showLabel
          />
           <div>
            <h2 className="text-2xl font-bold text-foreground">{profile?.fullName || 'Your Name'}</h2>
            {profile?.jobTitle &&
            <p className="text-sm font-medium text-muted-foreground">{profile.jobTitle}</p>
            }
            <p className="text-xs text-muted-foreground mt-0.5">{user.email}</p>
            {profile?.location &&
            <div className="flex items-center justify-center gap-1 mt-1">
                <MapPin className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{profile.location}</span>
              </div>
            }
            {profile?.updatedAt &&
            <p className="text-[10px] text-muted-foreground/60 mt-1 flex items-center justify-center gap-1">
                <Clock className="w-2.5 h-2.5" />
                Updated {formatDistanceToNow(new Date(profile.updatedAt), { addSuffix: true })}
              </p>
            }
          </div>
        </div>

        {/* Profile Completion */}
        <div className="bg-card border border-border shadow-soft rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Profile Completion</h3>
            <span className="text-sm text-primary font-medium">{completion}%</span>
          </div>
          <Progress value={completion} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {nextTip ? `💡 ${nextTip.hint}` : 'Your profile is complete! 🎉'}
          </p>
          <Button variant="secondary" size="sm" className="w-full text-slate-50" onClick={() => setEditOpen(true)}>
            <Edit2 className="w-4 h-4 mr-2" /> Edit account &amp; professional details
          </Button>
        </div>

        {/* Actions — Edit, Import Profile */}
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" className="flex-1 h-12 min-h-[48px] rounded-xl active:scale-95 touch-manipulation" onClick={() => setEditOpen(true)}>
            <Edit2 className="w-4 h-4 mr-2" /> Edit
          </Button>
          <Button variant="outline" className="flex-1 h-12 min-h-[48px] rounded-xl active:scale-95 touch-manipulation" onClick={() => { haptics.light(); setLinkedinOpen(true); }}>
            <FileDown className="w-4 h-4 mr-2" /> Import
          </Button>
        </div>

        {/* Portfolio Website Card */}
        <div className="bg-card border border-border shadow-soft rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Globe className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-foreground text-sm">My Portfolio Website</h3>
                  <Badge variant={profile?.portfolioEnabled ? 'default' : 'secondary'} className="text-[10px] px-1.5 py-0">
                    {profile?.portfolioEnabled ? '🟢 Live' : 'Draft'}
                  </Badge>
                </div>
                {profile?.username ?
                <p className="text-xs text-muted-foreground truncate">WiseResume/{profile.username}</p> :
                <p className="text-xs text-muted-foreground">Create your personal portfolio site</p>
                }
              </div>
            </div>
          </div>
          {profile?.views != null && profile.views > 0 &&
          <p className="text-xs text-muted-foreground flex items-center gap-1">
              👁 <span className="font-semibold text-foreground">{profile.views}</span> total views
            </p>
          }
          {isPortfolioStale && (
            <div className="flex items-start gap-2 p-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground">Portfolio may be out of date</p>
                <p className="text-[11px] text-muted-foreground">Your resume was updated after the portfolio was last synced.</p>
              </div>
              <LoadingButton
                variant="outline"
                size="sm"
                isLoading={isResyncing}
                loadingText="Syncing…"
                spinnerSize={12}
                className="shrink-0 h-7 text-[11px] px-2 border-amber-500/40 hover:bg-amber-500/10"
                onClick={handleResyncPortfolio}
              >
                Re-sync now
              </LoadingButton>
            </div>
          )}
          <div className="grid grid-cols-3 gap-2">
            {profile?.username && profile?.portfolioEnabled &&
            <a
              href={getPortfolioUrl(profile.username)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => haptics.light()}
              className="inline-flex items-center justify-center h-9 rounded-xl text-xs active:scale-95 touch-manipulation border border-input bg-background hover:bg-accent hover:text-accent-foreground px-3">
                <ExternalLink className="w-3.5 h-3.5 mr-1" /> Preview
              </a>
            }
            {profile?.username &&
            <Button
              variant="outline"
              size="sm"
              className="h-9 rounded-xl text-xs active:scale-95 touch-manipulation"
              onClick={handlePortfolioShare}>
                <Share2 className="w-3.5 h-3.5 mr-1" /> Share
              </Button>
            }
            <Button
              variant={profile?.username ? 'outline' : 'default'}
              size="sm"
              className={`h-9 rounded-xl text-xs active:scale-95 touch-manipulation ${!(profile?.username) ? 'col-span-3' : ''}`}
              onClick={() => { haptics.light(); navigate('/portfolio'); }}>
              <Edit2 className="w-3.5 h-3.5 mr-1" />
              {profile?.username ? 'Edit' : 'Set Up Portfolio'}
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card border border-border shadow-soft rounded-2xl p-4 text-center">
            <FileText className="w-6 h-6 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold text-foreground">{resumes.length}</p>
            <p className="text-xs text-muted-foreground">Resumes</p>
          </div>
          <div className="bg-card border border-border shadow-soft rounded-2xl p-4 text-center">
            <Briefcase className="w-6 h-6 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold text-foreground">{applications.length}</p>
            <p className="text-xs text-muted-foreground">Applications</p>
          </div>
        </div>

        {/* Career Milestones */}
        <CareerMilestonesRow />

        {/* Resume Portfolio */}
        {resumes.length > 0 &&
        <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">My Resumes</h3>
            <div className="space-y-3">
              {resumes.map((resume) =>
            <ResumeListCard
              key={resume.id}
              resume={resume}
              onEdit={handleEditResume}
              onDuplicate={(id) => duplicateResume.mutate(id)}
              onDelete={(id) => deleteResume.mutate(id)}
              isProcessing={
                (deleteResume.isPending && deleteResume.variables === resume.id) ||
                (duplicateResume.isPending && duplicateResume.variables === resume.id)
              } />
            )}
            </div>
          </div>
        }
      </div>

      <EditProfileSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        profile={profile}
        userId={user.id}
        userEmail={user.email}
        onSave={updateProfile} />

<LinkedInImportSheet
        open={linkedinOpen}
        onOpenChange={setLinkedinOpen}
        onImport={handleLinkedInImport} />

      {/* Draft Portfolio Warning */}
      <AlertDialog open={draftWarningOpen} onOpenChange={setDraftWarningOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Portfolio is inactive</AlertDialogTitle>
            <AlertDialogDescription>
              Your portfolio website is currently in draft mode. Visitors won't be able to see it until you make it live.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button variant="outline" onClick={async () => { setDraftWarningOpen(false); await doPortfolioShare(); }}>
              Share Anyway
            </Button>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleGoLive(); }}
              disabled={isGoingLive}
              className="inline-flex items-center gap-2"
            >
              {isGoingLive && <MiniSpinner size={14} />}
              {isGoingLive ? 'Going Live…' : 'Go Live & Share'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

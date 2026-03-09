import {
  Eye, Sparkles, Search, Loader2, Link2, Linkedin, Github,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CollapsibleCard } from './shared';
import { VisitorsPanel } from '@/components/portfolio/VisitorsPanel';
import { haptics } from '@/lib/haptics';

export interface MoreTabProps {
  // SEO
  metaTitle: string;
  onMetaTitleChange: (val: string) => void;
  metaDescription: string;
  onMetaDescriptionChange: (val: string) => void;
  onGenerateSEO: () => void;
  generatingSEO: boolean;
  seoPlaceholderName: string;
  seoPlaceholderTitle: string;
  // Visitors
  portfolioUsername?: string;
  userId?: string;
  portfolioEnabled: boolean;
  views: number;
  // Career Card
  onOpenCareerCard: () => void;
  hasLivePortfolio: boolean;
  // Social & Extra Links
  linkedinUrl: string;
  onLinkedinUrlChange: (val: string) => void;
  githubUrl: string;
  onGithubUrlChange: (val: string) => void;
  contactEmail: string;
  onContactEmailChange: (val: string) => void;
  twitterUrl: string;
  onTwitterUrlChange: (val: string) => void;
  websiteUrl: string;
  onWebsiteUrlChange: (val: string) => void;
  // Collapsible sections
  openSections: Set<string>;
  toggleSection: (id: string) => void;
}

export function MoreTab(props: MoreTabProps) {
  const {
    metaTitle, onMetaTitleChange, metaDescription, onMetaDescriptionChange,
    onGenerateSEO, generatingSEO, seoPlaceholderName, seoPlaceholderTitle,
    portfolioUsername, userId, portfolioEnabled, views,
    onOpenCareerCard, hasLivePortfolio,
    linkedinUrl, onLinkedinUrlChange,
    githubUrl, onGithubUrlChange,
    contactEmail, onContactEmailChange,
    twitterUrl, onTwitterUrlChange, websiteUrl, onWebsiteUrlChange,
    openSections, toggleSection,
  } = props;

  return (
    <div className="space-y-3">
      {/* Social Links & Contact */}
      <CollapsibleCard
        id="sociallinks"
        icon={<Link2 className="w-4 h-4" />}
        title="Links & Contact"
        hint={(linkedinUrl || githubUrl || contactEmail) ? <span className="text-[11px]">configured</span> : undefined}
        openSections={openSections}
        toggleSection={toggleSection}
      >
        <p className="text-[11px] text-muted-foreground mb-3">Links shown on your public portfolio.</p>
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
              <Linkedin className="w-3.5 h-3.5" /> LinkedIn URL
            </label>
            <Input placeholder="https://linkedin.com/in/yourusername" value={linkedinUrl} onChange={e => onLinkedinUrlChange(e.target.value)} type="url" inputMode="url" autoCapitalize="none" autoCorrect="off" spellCheck={false} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
              <Github className="w-3.5 h-3.5" /> GitHub URL
            </label>
            <Input placeholder="https://github.com/yourusername" value={githubUrl} onChange={e => onGithubUrlChange(e.target.value)} type="url" inputMode="url" autoCapitalize="none" autoCorrect="off" spellCheck={false} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">Contact Email</label>
            <Input type="email" placeholder="your@email.com" value={contactEmail} onChange={e => onContactEmailChange(e.target.value)} autoComplete="email" autoCapitalize="none" inputMode="email" />
            <p className="text-[11px] text-muted-foreground">Public email shown on your portfolio. Defaults to your account email if empty.</p>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">X (Twitter) URL</label>
            <Input placeholder="https://x.com/yourusername" value={twitterUrl} onChange={e => onTwitterUrlChange(e.target.value)} type="url" inputMode="url" autoCapitalize="none" autoCorrect="off" spellCheck={false} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">Personal Website</label>
            <Input placeholder="https://yourwebsite.com" value={websiteUrl} onChange={e => onWebsiteUrlChange(e.target.value)} type="url" inputMode="url" autoCapitalize="none" autoCorrect="off" spellCheck={false} />
          </div>
        </div>
      </CollapsibleCard>

      {/* SEO & Sharing */}
      <CollapsibleCard
        id="seo"
        icon={<Search className="w-4 h-4" />}
        title="SEO & Sharing"
        hint={metaTitle ? <span className="truncate max-w-[120px] text-[11px]">{metaTitle}</span> : undefined}
        openSections={openSections}
        toggleSection={toggleSection}
      >
        <div className="flex items-center justify-between mb-1">
          <p className="text-[11px] text-muted-foreground">Customize how your portfolio appears on Google & social media.</p>
          <Button variant="ghost" size="sm" onClick={onGenerateSEO} disabled={generatingSEO} className="h-7 text-xs px-2 active:scale-95 shrink-0 ml-2">
            {generatingSEO ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />}
            AI Generate
          </Button>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground">Page Title</label>
          <Input placeholder={`${seoPlaceholderName} — ${seoPlaceholderTitle}`} value={metaTitle} onChange={e => onMetaTitleChange(e.target.value)} maxLength={60} />
          <p className="text-[11px] text-muted-foreground text-right">{metaTitle.length}/60</p>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground">Meta Description</label>
          <Textarea placeholder="Defaults to your bio..." value={metaDescription} onChange={e => onMetaDescriptionChange(e.target.value)} className="min-h-[60px]" maxLength={160} />
          <p className="text-[11px] text-muted-foreground text-right">{metaDescription.length}/160</p>
        </div>
      </CollapsibleCard>

      {/* Visitors & Analytics */}
      <CollapsibleCard
        id="visitors"
        icon={<Eye className="w-4 h-4" />}
        title="Visitors & Analytics"
        hint={views > 0 ? <Badge variant="secondary" className="text-[10px] py-0 px-1.5">{views} views</Badge> : undefined}
        openSections={openSections}
        toggleSection={toggleSection}
      >
        <VisitorsPanel
          username={portfolioUsername}
          userId={userId}
          portfolioEnabled={portfolioEnabled}
        />
      </CollapsibleCard>

      {/* Career Card */}
      {hasLivePortfolio && (
        <Button
          variant="outline"
          className="w-full h-11 min-h-[44px] rounded-xl active:scale-95 touch-manipulation text-sm"
          onClick={() => { haptics.light(); onOpenCareerCard(); }}
        >
          <Sparkles className="w-4 h-4 mr-1.5" /> Career Card
        </Button>
      )}
    </div>
  );
}

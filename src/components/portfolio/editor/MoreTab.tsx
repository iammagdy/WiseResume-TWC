import { useState } from 'react';
import {
  Sparkles, Search, Loader2, Link2, Linkedin, Github, History, AlertCircle, Twitter, ShieldCheck, Languages,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { CollapsibleCard } from './shared';
import { haptics } from '@/lib/haptics';
import { normalizeUrl } from '@/lib/urlUtils';

export interface MoreTabProps {
  // History
  onOpenHistory: () => void;
  // SEO
  metaTitle: string;
  onMetaTitleChange: (val: string) => void;
  metaDescription: string;
  onMetaDescriptionChange: (val: string) => void;
  onGenerateSEO: () => void;
  generatingSEO: boolean;
  seoPlaceholderName: string;
  seoPlaceholderTitle: string;
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
  // Multilingual
  portfolioPrimaryLanguage: string;
  onPortfolioPrimaryLanguageChange: (val: string) => void;
  portfolioSecondaryLanguage: string;
  onPortfolioSecondaryLanguageChange: (val: string) => void;
  onTranslate: () => void;
  translating: boolean;
}

function needsHttpsWarning(url: string): boolean {
  if (!url.trim()) return false;
  return !/^https?:\/\//i.test(url.trim());
}

export function MoreTab(props: MoreTabProps) {
  const {
    onOpenHistory,
    metaTitle, onMetaTitleChange, metaDescription, onMetaDescriptionChange,
    onGenerateSEO, generatingSEO, seoPlaceholderName, seoPlaceholderTitle,
    onOpenCareerCard, hasLivePortfolio,
    linkedinUrl, onLinkedinUrlChange,
    githubUrl, onGithubUrlChange,
    contactEmail, onContactEmailChange,
    twitterUrl, onTwitterUrlChange, websiteUrl, onWebsiteUrlChange,
    openSections, toggleSection,
    portfolioPrimaryLanguage, onPortfolioPrimaryLanguageChange,
    portfolioSecondaryLanguage, onPortfolioSecondaryLanguageChange,
    onTranslate, translating,
  } = props;

  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const markTouched = (field: string) => setTouched(prev => ({ ...prev, [field]: true }));

  const showWarning = (field: string, url: string) => touched[field] && needsHttpsWarning(url);

  return (
    <div className="space-y-3">
      {/* Social Links & Contact */}
      <CollapsibleCard
        id="sociallinks"
        icon={<Link2 className="w-4 h-4" />}
        title="Contact & links"
        hint={(linkedinUrl || githubUrl || contactEmail) ? <span className="text-[11px]">configured</span> : undefined}
        openSections={openSections}
        toggleSection={toggleSection}
      >
        <p className="text-[11px] text-muted-foreground mb-3">Links shown on your public portfolio. Social profiles (LinkedIn, GitHub, X) sync from your Settings — update them there to avoid duplication.</p>
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">Public Contact Email</label>
            <Input
              type="email"
              placeholder="your@email.com"
              value={contactEmail}
              onChange={e => onContactEmailChange(e.target.value)}
              onBlur={() => onContactEmailChange(contactEmail.trim().toLowerCase())}
              autoComplete="email"
              autoCapitalize="none"
              inputMode="email"
            />
            <p className="text-[11px] text-muted-foreground">Shown on your portfolio "Contact me" button. Defaults to your account email if empty.</p>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
              <ShieldCheck className="w-3 h-3 shrink-0 text-green-500" />
              Hidden from bots — only real visitors clicking the button can see it.
            </p>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
              <Linkedin className="w-3.5 h-3.5" /> LinkedIn URL
            </label>
            <Input
              placeholder="https://linkedin.com/in/yourusername"
              value={linkedinUrl}
              onChange={e => onLinkedinUrlChange(e.target.value)}
              onBlur={() => { markTouched('linkedin'); onLinkedinUrlChange(normalizeUrl(linkedinUrl)); }}
              type="url"
              inputMode="url"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className={showWarning('linkedin', linkedinUrl) ? 'border-yellow-500' : ''}
            />
            {showWarning('linkedin', linkedinUrl) && (
              <p className="text-[11px] text-yellow-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 shrink-0" /> Missing https:// — will be added on save
              </p>
            )}
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
              <Github className="w-3.5 h-3.5" /> GitHub URL
            </label>
            <Input
              placeholder="https://github.com/yourusername"
              value={githubUrl}
              onChange={e => onGithubUrlChange(e.target.value)}
              onBlur={() => { markTouched('github'); onGithubUrlChange(normalizeUrl(githubUrl)); }}
              type="url"
              inputMode="url"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className={showWarning('github', githubUrl) ? 'border-yellow-500' : ''}
            />
            {showWarning('github', githubUrl) && (
              <p className="text-[11px] text-yellow-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 shrink-0" /> Missing https:// — will be added on save
              </p>
            )}
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
              <Twitter className="w-3.5 h-3.5" /> X / Twitter URL
            </label>
            <Input
              placeholder="https://x.com/yourusername"
              value={twitterUrl}
              onChange={e => onTwitterUrlChange(e.target.value)}
              onBlur={() => { markTouched('twitter'); onTwitterUrlChange(normalizeUrl(twitterUrl)); }}
              type="url"
              inputMode="url"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className={showWarning('twitter', twitterUrl) ? 'border-yellow-500' : ''}
            />
            {showWarning('twitter', twitterUrl) && (
              <p className="text-[11px] text-yellow-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 shrink-0" /> Missing https:// — will be added on save
              </p>
            )}
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5" /> Website URL
            </label>
            <Input
              placeholder="https://yourwebsite.com"
              value={websiteUrl}
              onChange={e => onWebsiteUrlChange(e.target.value)}
              onBlur={() => { markTouched('website'); onWebsiteUrlChange(normalizeUrl(websiteUrl)); }}
              type="url"
              inputMode="url"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className={showWarning('website', websiteUrl) ? 'border-yellow-500' : ''}
            />
            {showWarning('website', websiteUrl) && (
              <p className="text-[11px] text-yellow-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 shrink-0" /> Missing https:// — will be added on save
              </p>
            )}
          </div>
        </div>
      </CollapsibleCard>

      {/* Multilingual */}
      <CollapsibleCard
        id="multilingual"
        icon={<Languages className="w-4 h-4" />}
        title="Multilingual"
        hint={portfolioSecondaryLanguage ? <span className="text-[11px]">{portfolioSecondaryLanguage}</span> : undefined}
        openSections={openSections}
        toggleSection={toggleSection}
      >
        <p className="text-[11px] text-muted-foreground mb-3">Add a second language so visitors can toggle all your portfolio content into a translated version. AI automatically re-translates on every save.</p>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Primary Language</label>
            <select
              value={portfolioPrimaryLanguage}
              onChange={e => onPortfolioPrimaryLanguageChange(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="English">English</option>
              <option value="Arabic">Arabic (العربية)</option>
              <option value="Chinese">Chinese (中文)</option>
              <option value="Dutch">Dutch (Nederlands)</option>
              <option value="French">French (Français)</option>
              <option value="German">German (Deutsch)</option>
              <option value="Hindi">Hindi (हिन्दी)</option>
              <option value="Italian">Italian (Italiano)</option>
              <option value="Japanese">Japanese (日本語)</option>
              <option value="Korean">Korean (한국어)</option>
              <option value="Polish">Polish (Polski)</option>
              <option value="Portuguese">Portuguese (Português)</option>
              <option value="Russian">Russian (Русский)</option>
              <option value="Spanish">Spanish (Español)</option>
              <option value="Turkish">Turkish (Türkçe)</option>
              <option value="Ukrainian">Ukrainian (Українська)</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Secondary Language</label>
            <select
              value={portfolioSecondaryLanguage}
              onChange={e => onPortfolioSecondaryLanguageChange(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">None (monolingual)</option>
              <option value="Arabic">Arabic (العربية)</option>
              <option value="Chinese">Chinese (中文)</option>
              <option value="Dutch">Dutch (Nederlands)</option>
              <option value="French">French (Français)</option>
              <option value="German">German (Deutsch)</option>
              <option value="Hindi">Hindi (हिन्दी)</option>
              <option value="Italian">Italian (Italiano)</option>
              <option value="Japanese">Japanese (日本語)</option>
              <option value="Korean">Korean (한국어)</option>
              <option value="Polish">Polish (Polski)</option>
              <option value="Portuguese">Portuguese (Português)</option>
              <option value="Russian">Russian (Русский)</option>
              <option value="Spanish">Spanish (Español)</option>
              <option value="Turkish">Turkish (Türkçe)</option>
              <option value="Ukrainian">Ukrainian (Українська)</option>
            </select>
          </div>
          {portfolioSecondaryLanguage && (
            <Button
              variant="outline"
              size="sm"
              className="w-full h-9 rounded-xl text-xs active:scale-95 touch-manipulation"
              onClick={onTranslate}
              disabled={translating}
            >
              {translating ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 mr-1.5" />}
              {translating ? 'Translating...' : `Re-translate to ${portfolioSecondaryLanguage}`}
            </Button>
          )}
          <p className="text-[11px] text-muted-foreground">Translations cover bio, summary, highlights, services, testimonials, case studies, certifications, and your featured project description. Re-translate anytime after editing content.</p>
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

      {/* Revision History */}
      <div className="rounded-xl border border-border bg-card p-3">
        <p className="text-[11px] text-muted-foreground mb-2">View and restore previous versions of your portfolio.</p>
        <Button variant="outline" size="sm" className="w-full text-xs" onClick={onOpenHistory}>
          <History className="w-3.5 h-3.5 mr-1.5" /> Revision History
        </Button>
      </div>

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

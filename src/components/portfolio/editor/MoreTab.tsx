import {
  Eye, Sparkles, Briefcase, Star, Search, Plus, X,
  MessageSquareQuote, TrendingUp, Loader2, Link2,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CollapsibleCard, SubSectionHeading } from './shared';
import { VisitorsPanel } from '@/components/portfolio/VisitorsPanel';
import type { PortfolioSections } from './ContentVisibilitySection';
import { SECTION_LABELS } from './ContentVisibilitySection';
import { haptics } from '@/lib/haptics';

export interface MoreTabProps {
  // Content visibility
  sections: PortfolioSections;
  onToggleSectionVisibility: (key: keyof PortfolioSections) => void;
  syncMode: 'auto' | 'locked';
  onSyncModeChange: (val: 'auto' | 'locked') => void;
  // Collapsible sections
  openSections: Set<string>;
  toggleSection: (id: string) => void;
  // Case Studies
  caseStudies: Array<{ id: string; title: string; challenge: string; outcome: string }>;
  onCaseStudiesChange: (val: Array<{ id: string; title: string; challenge: string; outcome: string }>) => void;
  // Services
  services: Array<{ id: string; title: string; description: string; category: string }>;
  onServicesChange: (val: Array<{ id: string; title: string; description: string; category: string }>) => void;
  // Testimonials
  testimonials: Array<{ id: string; quote: string; authorName: string; authorTitle: string }>;
  onTestimonialsChange: (val: Array<{ id: string; quote: string; authorName: string; authorTitle: string }>) => void;
  // Highlights
  highlights: Array<{ id: string; value: string; label: string }>;
  onHighlightsChange: (val: Array<{ id: string; value: string; label: string }>) => void;
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
  // Extra links (moved from Setup)
  twitterUrl: string;
  onTwitterUrlChange: (val: string) => void;
  websiteUrl: string;
  onWebsiteUrlChange: (val: string) => void;
}

export function MoreTab(props: MoreTabProps) {
  const {
    sections, onToggleSectionVisibility, syncMode, onSyncModeChange,
    openSections, toggleSection,
    caseStudies, onCaseStudiesChange,
    services, onServicesChange,
    testimonials, onTestimonialsChange,
    highlights, onHighlightsChange,
    metaTitle, onMetaTitleChange, metaDescription, onMetaDescriptionChange,
    onGenerateSEO, generatingSEO, seoPlaceholderName, seoPlaceholderTitle,
    portfolioUsername, userId, portfolioEnabled, views,
    onOpenCareerCard, hasLivePortfolio,
    twitterUrl, onTwitterUrlChange, websiteUrl, onWebsiteUrlChange,
  } = props;

  const visibleCount = Object.values(sections).filter(Boolean).length;
  const totalCount = Object.keys(sections).length;

  return (
    <div className="space-y-3">
      {/* Content Visibility */}
      <CollapsibleCard
        id="content"
        icon={<Eye className="w-4 h-4" />}
        title="Content & Visibility"
        hint={<span className="text-[11px]">{visibleCount}/{totalCount} shown</span>}
        openSections={openSections}
        toggleSection={toggleSection}
      >
        <p className="text-[11px] text-muted-foreground">Choose which sections appear on your public portfolio.</p>
        <div className="space-y-2">
          {(Object.keys(SECTION_LABELS) as (keyof PortfolioSections)[]).map(key => (
            <div key={key} className="flex items-center justify-between py-1">
              <span className="text-sm text-foreground">{SECTION_LABELS[key]}</span>
              <Switch checked={sections[key]} onCheckedChange={() => onToggleSectionVisibility(key)} />
            </div>
          ))}
        </div>

        {/* Sync Mode */}
        <SubSectionHeading icon={<Sparkles className="w-3.5 h-3.5" />} label="Content Sync Mode" />
        <p className="text-[11px] text-muted-foreground mb-2">Control how your portfolio content stays in sync with your resume.</p>
        <div className="space-y-2">
          {(['auto', 'locked'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => onSyncModeChange(mode)}
              className={`w-full flex items-start gap-3 rounded-xl border p-3 text-left transition-all ${
                syncMode === mode ? 'border-primary bg-primary/5' : 'border-border bg-card/50'
              }`}
            >
              <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${syncMode === mode ? 'border-primary' : 'border-muted-foreground'}`}>
                {syncMode === mode && <div className="w-2 h-2 rounded-full bg-primary" />}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{mode === 'auto' ? 'Auto-sync' : 'Locked snapshot'}</p>
                <p className="text-[11px] text-muted-foreground">
                  {mode === 'auto'
                    ? 'Changes to your resumes automatically sync to this portfolio.'
                    : "Freeze your portfolio at this version — edits to your resume won't affect it"}
                </p>
              </div>
            </button>
          ))}
        </div>
      </CollapsibleCard>

      {/* Case Studies */}
      <CollapsibleCard
        id="casestudies"
        icon={<Briefcase className="w-4 h-4" />}
        title="Case Studies"
        hint={caseStudies.length > 0 ? <span className="text-[11px]">{caseStudies.length} added</span> : undefined}
        openSections={openSections}
        toggleSection={toggleSection}
      >
        <p className="text-[11px] text-muted-foreground mb-3">Showcase detailed project stories.</p>
        <div className="space-y-3">
          {caseStudies.map((cs, i) => (
            <div key={cs.id} className="rounded-xl border border-border bg-card/50 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Case Study {i + 1}</span>
                <button onClick={() => onCaseStudiesChange(caseStudies.filter(c => c.id !== cs.id))} className="text-muted-foreground hover:text-destructive transition-colors"><X className="w-4 h-4" /></button>
              </div>
              <Input placeholder="Title" value={cs.title} onChange={e => onCaseStudiesChange(caseStudies.map(c => c.id === cs.id ? { ...c, title: e.target.value } : c))} />
              <Textarea placeholder="Challenge" value={cs.challenge} onChange={e => onCaseStudiesChange(caseStudies.map(c => c.id === cs.id ? { ...c, challenge: e.target.value } : c))} className="min-h-[60px] text-sm" />
              <Textarea placeholder="Outcome" value={cs.outcome} onChange={e => onCaseStudiesChange(caseStudies.map(c => c.id === cs.id ? { ...c, outcome: e.target.value } : c))} className="min-h-[60px] text-sm" />
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => onCaseStudiesChange([...caseStudies, { id: crypto.randomUUID(), title: '', challenge: '', outcome: '' }])} className="w-full h-10 rounded-xl active:scale-95 touch-manipulation">
            <Plus className="w-4 h-4 mr-2" /> Add Case Study
          </Button>
        </div>
      </CollapsibleCard>

      {/* Services */}
      <CollapsibleCard
        id="services"
        icon={<Star className="w-4 h-4" />}
        title="Services & Offerings"
        hint={services.length > 0 ? <span className="text-[11px]">{services.length} added</span> : undefined}
        openSections={openSections}
        toggleSection={toggleSection}
      >
        <p className="text-[11px] text-muted-foreground mb-3">List what you offer.</p>
        <div className="space-y-3">
          {services.map((svc, i) => (
            <div key={svc.id} className="rounded-xl border border-border bg-card/50 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Service {i + 1}</span>
                <button onClick={() => onServicesChange(services.filter(s => s.id !== svc.id))} className="text-muted-foreground hover:text-destructive transition-colors"><X className="w-4 h-4" /></button>
              </div>
              <Input placeholder="Service title" value={svc.title} onChange={e => onServicesChange(services.map(s => s.id === svc.id ? { ...s, title: e.target.value } : s))} />
              <Textarea placeholder="Brief description..." value={svc.description} onChange={e => onServicesChange(services.map(s => s.id === svc.id ? { ...s, description: e.target.value } : s))} className="min-h-[60px] text-sm" />
              <select value={svc.category} onChange={e => onServicesChange(services.map(s => s.id === svc.id ? { ...s, category: e.target.value } : s))} className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="development">Development</option>
                <option value="design">Design</option>
                <option value="consulting">Consulting</option>
                <option value="writing">Writing</option>
                <option value="other">Other</option>
              </select>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => onServicesChange([...services, { id: crypto.randomUUID(), title: '', description: '', category: 'development' }])} className="w-full h-10 rounded-xl active:scale-95 touch-manipulation">
            <Plus className="w-4 h-4 mr-2" /> Add Service
          </Button>
        </div>
      </CollapsibleCard>

      {/* Testimonials */}
      <CollapsibleCard
        id="testimonials"
        icon={<MessageSquareQuote className="w-4 h-4" />}
        title="Testimonials"
        hint={testimonials.length > 0 ? <span className="text-[11px]">{testimonials.length} added</span> : undefined}
        openSections={openSections}
        toggleSection={toggleSection}
      >
        <p className="text-[11px] text-muted-foreground mb-3">Add quotes from colleagues or clients (max 3).</p>
        <div className="space-y-3">
          {testimonials.map((t, i) => (
            <div key={t.id} className="rounded-xl border border-border bg-card/50 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Testimonial {i + 1}</span>
                <button onClick={() => onTestimonialsChange(testimonials.filter(x => x.id !== t.id))} className="text-muted-foreground hover:text-destructive transition-colors"><X className="w-4 h-4" /></button>
              </div>
              <Textarea placeholder="What they said..." value={t.quote} onChange={e => onTestimonialsChange(testimonials.map(x => x.id === t.id ? { ...x, quote: e.target.value } : x))} className="min-h-[60px] text-sm" maxLength={300} />
              <Input placeholder="Author name" value={t.authorName} onChange={e => onTestimonialsChange(testimonials.map(x => x.id === t.id ? { ...x, authorName: e.target.value } : x))} />
              <Input placeholder="Author title" value={t.authorTitle} onChange={e => onTestimonialsChange(testimonials.map(x => x.id === t.id ? { ...x, authorTitle: e.target.value } : x))} />
            </div>
          ))}
          {testimonials.length < 3 && (
            <Button variant="outline" size="sm" onClick={() => onTestimonialsChange([...testimonials, { id: crypto.randomUUID(), quote: '', authorName: '', authorTitle: '' }])} className="w-full h-10 rounded-xl active:scale-95 touch-manipulation">
              <Plus className="w-4 h-4 mr-2" /> Add Testimonial
            </Button>
          )}
        </div>
      </CollapsibleCard>

      {/* Highlight Metrics */}
      <CollapsibleCard
        id="highlights"
        icon={<TrendingUp className="w-4 h-4" />}
        title="Highlight Metrics"
        hint={highlights.length > 0 ? <span className="text-[11px]">{highlights.length} added</span> : undefined}
        openSections={openSections}
        toggleSection={toggleSection}
      >
        <p className="text-[11px] text-muted-foreground mb-3">Showcase key numbers (max 3).</p>
        <div className="space-y-3">
          {highlights.map((h, i) => (
            <div key={h.id} className="rounded-xl border border-border bg-card/50 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Metric {i + 1}</span>
                <button onClick={() => onHighlightsChange(highlights.filter(x => x.id !== h.id))} className="text-muted-foreground hover:text-destructive transition-colors"><X className="w-4 h-4" /></button>
              </div>
              <Input placeholder="Value (e.g. 50+)" value={h.value} onChange={e => onHighlightsChange(highlights.map(x => x.id === h.id ? { ...x, value: e.target.value } : x))} maxLength={10} />
              <Input placeholder="Label (e.g. Projects)" value={h.label} onChange={e => onHighlightsChange(highlights.map(x => x.id === h.id ? { ...x, label: e.target.value } : x))} maxLength={30} />
            </div>
          ))}
          {highlights.length < 3 && (
            <Button variant="outline" size="sm" onClick={() => onHighlightsChange([...highlights, { id: crypto.randomUUID(), value: '', label: '' }])} className="w-full h-10 rounded-xl active:scale-95 touch-manipulation">
              <Plus className="w-4 h-4 mr-2" /> Add Metric
            </Button>
          )}
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

      {/* Extra Links */}
      <CollapsibleCard
        id="extralinks"
        icon={<Link2 className="w-4 h-4" />}
        title="Extra Links"
        hint={twitterUrl || websiteUrl ? <span className="text-[11px]">configured</span> : undefined}
        openSections={openSections}
        toggleSection={toggleSection}
      >
        <p className="text-[11px] text-muted-foreground mb-3">Optional links shown on your portfolio.</p>
        <div className="space-y-2">
          <label className="text-xs font-medium text-foreground">X (Twitter) URL</label>
          <Input placeholder="https://x.com/yourusername" value={twitterUrl} onChange={e => onTwitterUrlChange(e.target.value)} type="url" inputMode="url" autoCapitalize="none" autoCorrect="off" spellCheck={false} />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium text-foreground">Personal Website</label>
          <Input placeholder="https://yourwebsite.com" value={websiteUrl} onChange={e => onWebsiteUrlChange(e.target.value)} type="url" inputMode="url" autoCapitalize="none" autoCorrect="off" spellCheck={false} />
        </div>
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

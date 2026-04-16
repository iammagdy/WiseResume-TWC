import { useState } from 'react';
import {
  Briefcase, Star, Plus, X, FileText,
  MessageSquareQuote, TrendingUp, RefreshCw, Lock, AlertTriangle,
  ChevronUp, ChevronDown, Pin, Link, Award, Sparkles, Loader2, Copy, Check,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { CollapsibleCard } from './shared';
import { toast } from 'sonner';

const SECTION_LABEL_MAP: Record<string, string> = {
  about: 'About',
  experience: 'Experience',
  education: 'Education',
  skills: 'Skills',
  projects: 'Projects',
  caseStudies: 'Case Studies',
  services: 'Services',
  testimonials: 'Testimonials',
  certifications: 'Certifications',
  awards: 'Awards',
  publications: 'Publications',
  volunteering: 'Volunteering',
  githubProjects: 'GitHub Projects',
};

export interface ContentTabProps {
  // Collapsible sections
  openSections: Set<string>;
  toggleSection: (id: string) => void;
  // Sync mode
  syncMode: 'auto' | 'locked';
  onSyncModeChange: (mode: 'auto' | 'locked') => void;
  // Stale sync detection
  resumeUpdatedAt?: string | null;
  portfolioLastSyncedAt?: string | null;
  // Portfolio Summary (separate from CV bio)
  portfolioSummary: string;
  onPortfolioSummaryChange: (val: string) => void;
  // Bio (CV bio — used as initial value for summary)
  bio: string;
  // Projects (renamed from Case Studies)
  caseStudies: Array<{ id: string; title: string; challenge: string; outcome: string }>;
  onCaseStudiesChange: (val: Array<{ id: string; title: string; challenge: string; outcome: string }>) => void;
  // Services
  services: Array<{ id: string; title: string; description: string; category: string }>;
  onServicesChange: (val: Array<{ id: string; title: string; description: string; category: string }>) => void;
  // Testimonials
  testimonials: Array<{ id: string; quote: string; authorName: string; authorTitle: string }>;
  onTestimonialsChange: (val: Array<{ id: string; quote: string; authorName: string; authorTitle: string }>) => void;
  onGenerateTestimonialPrompt?: (testimonialId: string, colleagueName: string) => Promise<string>;
  // Highlights
  highlights: Array<{ id: string; value: string; label: string }>;
  onHighlightsChange: (val: Array<{ id: string; value: string; label: string }>) => void;
  // Section reordering
  sectionOrder: string[];
  onSectionOrderChange: (order: string[]) => void;
  // Featured/pinned project
  pinnedProject: { title: string; description: string; url: string } | null;
  onPinnedProjectChange: (val: { title: string; description: string; url: string } | null) => void;
  // Portfolio certifications
  portfolioCertifications: Array<{ id: string; name: string; issuer: string; date: string; credentialUrl: string; badgeUrl: string }>;
  onPortfolioCertificationsChange: (val: Array<{ id: string; name: string; issuer: string; date: string; credentialUrl: string; badgeUrl: string }>) => void;
}

export function ContentTab(props: ContentTabProps) {
  const {
    openSections, toggleSection,
    syncMode, onSyncModeChange,
    resumeUpdatedAt, portfolioLastSyncedAt,
    portfolioSummary, onPortfolioSummaryChange,
    bio,
    caseStudies, onCaseStudiesChange,
    services, onServicesChange,
    testimonials, onTestimonialsChange,
    onGenerateTestimonialPrompt,
    highlights, onHighlightsChange,
    sectionOrder, onSectionOrderChange,
    pinnedProject, onPinnedProjectChange,
    portfolioCertifications, onPortfolioCertificationsChange,
  } = props;

  const [testimonialPrompts, setTestimonialPrompts] = useState<Record<string, string>>({});
  const [generatingPromptFor, setGeneratingPromptFor] = useState<string | null>(null);
  const [copiedPromptFor, setCopiedPromptFor] = useState<string | null>(null);

  const handleGeneratePrompt = async (testimonialId: string, authorName: string) => {
    if (!onGenerateTestimonialPrompt) return;
    setGeneratingPromptFor(testimonialId);
    try {
      const result = await onGenerateTestimonialPrompt(testimonialId, authorName);
      setTestimonialPrompts(prev => ({ ...prev, [testimonialId]: result }));
    } catch {
      toast.error('Failed to generate prompt. Please try again.');
    } finally {
      setGeneratingPromptFor(null);
    }
  };

  const handleCopyPrompt = async (testimonialId: string) => {
    const text = testimonialPrompts[testimonialId];
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopiedPromptFor(testimonialId);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopiedPromptFor(null), 2000);
  };

  const isStale = syncMode === 'locked'
    && !!resumeUpdatedAt
    && !!portfolioLastSyncedAt
    && new Date(resumeUpdatedAt) > new Date(portfolioLastSyncedAt);

  const handleSwitchToCustom = () => {
    if (syncMode === 'auto') {
      if (!portfolioSummary && bio) {
        onPortfolioSummaryChange(bio);
      }
    }
    onSyncModeChange('locked');
  };

  const moveSectionUp = (idx: number) => {
    if (idx === 0) return;
    const next = [...sectionOrder];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    onSectionOrderChange(next);
  };

  const moveSectionDown = (idx: number) => {
    if (idx === sectionOrder.length - 1) return;
    const next = [...sectionOrder];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    onSectionOrderChange(next);
  };

  return (
    <div className="space-y-3">
      {/* Stale sync warning */}
      {isStale && (
        <div className="flex items-start gap-3 p-3 rounded-xl border border-amber-500/30 bg-amber-500/10">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">Portfolio may be out of date</p>
            <p className="text-xs text-muted-foreground">Your resume was updated after the portfolio was last synced.</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 h-8 text-xs border-amber-500/40 hover:bg-amber-500/10"
            onClick={() => onSyncModeChange('auto')}
          >
            Re-sync now
          </Button>
        </div>
      )}

      {/* Content Mode Toggle */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-foreground">Content Mode</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onSyncModeChange('auto')}
            className={`flex items-center gap-2 rounded-xl border p-3 text-left transition-all active:scale-[0.97] ${
              syncMode === 'auto' ? 'border-primary bg-primary/5' : 'border-border bg-card'
            }`}
          >
            <RefreshCw className={`w-4 h-4 shrink-0 ${syncMode === 'auto' ? 'text-primary' : 'text-muted-foreground'}`} />
            <div>
              <p className="text-sm font-medium text-foreground">Match CV</p>
              <p className="text-[10px] text-muted-foreground">Auto-syncs</p>
            </div>
          </button>
          <button
            onClick={handleSwitchToCustom}
            className={`flex items-center gap-2 rounded-xl border p-3 text-left transition-all active:scale-[0.97] ${
              syncMode === 'locked' ? 'border-primary bg-primary/5' : 'border-border bg-card'
            }`}
          >
            <Lock className={`w-4 h-4 shrink-0 ${syncMode === 'locked' ? 'text-primary' : 'text-muted-foreground'}`} />
            <div>
              <p className="text-sm font-medium text-foreground">Custom</p>
              <p className="text-[10px] text-muted-foreground">Edit freely</p>
            </div>
          </button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          {syncMode === 'auto'
            ? 'Content syncs from your resume automatically. Switch to Custom to edit independently.'
            : 'You can freely edit all sections. Changes won\'t affect your CV.'}
        </p>
      </div>

      {/* Section Order */}
      <CollapsibleCard
        id="section-order"
        icon={<ChevronUp className="w-4 h-4" />}
        title="Section Order"
        hint={<span className="text-[11px] text-muted-foreground">drag to reorder</span>}
        openSections={openSections}
        toggleSection={toggleSection}
      >
        <p className="text-[11px] text-muted-foreground mb-2">Change the order sections appear on your public portfolio.</p>
        <div className="space-y-1.5">
          {sectionOrder.map((sectionKey, idx) => (
            <div key={sectionKey} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/40 border border-border">
              <span className="flex-1 text-sm text-foreground">{SECTION_LABEL_MAP[sectionKey] ?? sectionKey}</span>
              <div className="flex gap-0.5">
                <button
                  onClick={() => moveSectionUp(idx)}
                  disabled={idx === 0}
                  className="w-7 h-7 flex items-center justify-center rounded-md transition-colors hover:bg-muted disabled:opacity-30"
                  aria-label="Move up"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button
                  onClick={() => moveSectionDown(idx)}
                  disabled={idx === sectionOrder.length - 1}
                  className="w-7 h-7 flex items-center justify-center rounded-md transition-colors hover:bg-muted disabled:opacity-30"
                  aria-label="Move down"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </CollapsibleCard>

      {/* Featured/Pinned Project */}
      <CollapsibleCard
        id="pinned-project"
        icon={<Pin className="w-4 h-4" />}
        title="Featured Project"
        hint={pinnedProject?.title ? <span className="text-[11px] truncate max-w-[100px]">{pinnedProject.title}</span> : undefined}
        openSections={openSections}
        toggleSection={toggleSection}
      >
        <p className="text-[11px] text-muted-foreground mb-3">Pin one project as a hero card at the top of your portfolio.</p>
        {pinnedProject === null ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPinnedProjectChange({ title: '', description: '', url: '' })}
            className="w-full h-10 rounded-xl active:scale-95 touch-manipulation"
          >
            <Pin className="w-4 h-4 mr-2" /> Pin a Project
          </Button>
        ) : (
          <div className="space-y-2 rounded-xl border border-border bg-card p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Featured Project</span>
              <button onClick={() => onPinnedProjectChange(null)} className="text-muted-foreground hover:text-destructive transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <Input
              placeholder="Project headline"
              value={pinnedProject.title}
              onChange={e => onPinnedProjectChange({ ...pinnedProject, title: e.target.value })}
              maxLength={80}
            />
            <Textarea
              placeholder="Short description (what you built, what makes it special)"
              value={pinnedProject.description}
              onChange={e => onPinnedProjectChange({ ...pinnedProject, description: e.target.value })}
              className="min-h-[70px] text-sm"
              maxLength={200}
            />
            <div className="relative">
              <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="https://your-project.com (optional)"
                value={pinnedProject.url}
                onChange={e => onPinnedProjectChange({ ...pinnedProject, url: e.target.value })}
                type="url"
                inputMode="url"
                autoCapitalize="none"
                autoCorrect="off"
                className="pl-8"
              />
            </div>
            <p className="text-[11px] text-muted-foreground text-right">{pinnedProject.description.length}/200</p>
          </div>
        )}
      </CollapsibleCard>

      {syncMode === 'auto' ? (
        <div className="text-center py-8 space-y-2 bg-card border border-border shadow-soft rounded-xl">
          <RefreshCw className="w-6 h-6 text-primary mx-auto" />
          <p className="text-sm font-medium text-foreground">Content auto-syncs from your resume</p>
          <p className="text-xs text-muted-foreground px-4">
            Your portfolio automatically shows the latest data from your selected resume. Switch to "Custom" mode to edit content independently.
          </p>
        </div>
      ) : (
        <>
          {/* Summary */}
          <CollapsibleCard
            id="summary"
            icon={<FileText className="w-4 h-4" />}
            title="Summary"
            hint={portfolioSummary ? <span className="text-[11px]">{portfolioSummary.length}/500</span> : undefined}
            openSections={openSections}
            toggleSection={toggleSection}
          >
            <p className="text-[11px] text-muted-foreground mb-3">A short about-me paragraph for your portfolio. Independent from your CV bio.</p>
            <Textarea
              value={portfolioSummary}
              onChange={e => onPortfolioSummaryChange(e.target.value)}
              placeholder="Write a portfolio summary or start from your CV bio..."
              className="min-h-[100px]"
              maxLength={500}
            />
            <p className="text-[11px] text-muted-foreground text-right mt-1">{portfolioSummary.length}/500</p>
          </CollapsibleCard>

          {/* Projects (renamed from Case Studies) */}
          <CollapsibleCard
            id="casestudies"
            icon={<Briefcase className="w-4 h-4" />}
            title="Projects"
            hint={caseStudies.length > 0 ? <span className="text-[11px]">{caseStudies.length} added</span> : undefined}
            openSections={openSections}
            toggleSection={toggleSection}
          >
            <p className="text-[11px] text-muted-foreground mb-3">Showcase detailed project stories.</p>
            <div className="space-y-3">
              {caseStudies.map((cs, i) => (
                <div key={cs.id} className="rounded-xl border border-border bg-card p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Project {i + 1}</span>
                    <button onClick={() => onCaseStudiesChange(caseStudies.filter(c => c.id !== cs.id))} className="text-muted-foreground hover:text-destructive transition-colors"><X className="w-4 h-4" /></button>
                  </div>
                  <Input placeholder="Title" value={cs.title} onChange={e => onCaseStudiesChange(caseStudies.map(c => c.id === cs.id ? { ...c, title: e.target.value } : c))} />
                  <Textarea placeholder="Challenge" value={cs.challenge} onChange={e => onCaseStudiesChange(caseStudies.map(c => c.id === cs.id ? { ...c, challenge: e.target.value } : c))} className="min-h-[60px] text-sm" />
                  <Textarea placeholder="Outcome" value={cs.outcome} onChange={e => onCaseStudiesChange(caseStudies.map(c => c.id === cs.id ? { ...c, outcome: e.target.value } : c))} className="min-h-[60px] text-sm" />
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => onCaseStudiesChange([...caseStudies, { id: crypto.randomUUID(), title: '', challenge: '', outcome: '' }])} className="w-full h-10 rounded-xl active:scale-95 touch-manipulation">
                <Plus className="w-4 h-4 mr-2" /> Add Project
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
                <div key={svc.id} className="rounded-xl border border-border bg-card p-3 space-y-2">
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
            <p className="text-[11px] text-muted-foreground mb-3">Add quotes from colleagues or clients. Displayed as a scrollable carousel on your portfolio.</p>
            <div className="space-y-3">
              {testimonials.map((t, i) => (
                <div key={t.id} className="rounded-xl border border-border bg-card p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Testimonial {i + 1}</span>
                    <button onClick={() => onTestimonialsChange(testimonials.filter(x => x.id !== t.id))} className="text-muted-foreground hover:text-destructive transition-colors"><X className="w-4 h-4" /></button>
                  </div>
                  <Textarea placeholder="What they said..." value={t.quote} onChange={e => onTestimonialsChange(testimonials.map(x => x.id === t.id ? { ...x, quote: e.target.value } : x))} className="min-h-[60px] text-sm" maxLength={300} />
                  <Input placeholder="Author name" value={t.authorName} onChange={e => onTestimonialsChange(testimonials.map(x => x.id === t.id ? { ...x, authorName: e.target.value } : x))} />
                  <Input placeholder="Author title" value={t.authorTitle} onChange={e => onTestimonialsChange(testimonials.map(x => x.id === t.id ? { ...x, authorTitle: e.target.value } : x))} />
                  {onGenerateTestimonialPrompt && (
                    <div className="pt-1 space-y-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleGeneratePrompt(t.id, t.authorName)}
                        disabled={generatingPromptFor === t.id}
                        className="w-full h-8 text-xs rounded-lg"
                      >
                        {generatingPromptFor === t.id
                          ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Generating…</>
                          : <><Sparkles className="w-3.5 h-3.5 mr-1.5" />Generate Request Message</>
                        }
                      </Button>
                      {testimonialPrompts[t.id] && (
                        <div className="rounded-lg border border-border bg-muted/40 p-2.5 space-y-2">
                          <p className="text-[11px] text-muted-foreground font-medium">Draft outreach message — copy and send to your colleague:</p>
                          <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">{testimonialPrompts[t.id]}</p>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopyPrompt(t.id)}
                            className="h-7 text-xs px-2 w-full"
                          >
                            {copiedPromptFor === t.id
                              ? <><Check className="w-3.5 h-3.5 mr-1.5 text-green-500" />Copied!</>
                              : <><Copy className="w-3.5 h-3.5 mr-1.5" />Copy message</>
                            }
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => onTestimonialsChange([...testimonials, { id: crypto.randomUUID(), quote: '', authorName: '', authorTitle: '' }])} className="w-full h-10 rounded-xl active:scale-95 touch-manipulation">
                <Plus className="w-4 h-4 mr-2" /> Add Testimonial
              </Button>
            </div>
          </CollapsibleCard>

          {/* Portfolio Certifications & Badges */}
          <CollapsibleCard
            id="portfolioCerts"
            icon={<Award className="w-4 h-4" />}
            title="Certifications & Badges"
            hint={portfolioCertifications.length > 0 ? <span className="text-[11px]">{portfolioCertifications.length} added</span> : undefined}
            openSections={openSections}
            toggleSection={toggleSection}
          >
            <p className="text-[11px] text-muted-foreground mb-3">Highlight certifications, badges, or awards with links. Shown as a card grid on your portfolio.</p>
            <div className="space-y-3">
              {portfolioCertifications.map((cert, i) => (
                <div key={cert.id} className="rounded-xl border border-border bg-card p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Badge {i + 1}</span>
                    <button onClick={() => onPortfolioCertificationsChange(portfolioCertifications.filter(x => x.id !== cert.id))} className="text-muted-foreground hover:text-destructive transition-colors"><X className="w-4 h-4" /></button>
                  </div>
                  <Input placeholder="Name (e.g. AWS Solutions Architect)" value={cert.name} onChange={e => onPortfolioCertificationsChange(portfolioCertifications.map(x => x.id === cert.id ? { ...x, name: e.target.value } : x))} maxLength={80} />
                  <Input placeholder="Issuer (e.g. Amazon)" value={cert.issuer} onChange={e => onPortfolioCertificationsChange(portfolioCertifications.map(x => x.id === cert.id ? { ...x, issuer: e.target.value } : x))} maxLength={60} />
                  <Input placeholder="Date (e.g. Jan 2024)" value={cert.date} onChange={e => onPortfolioCertificationsChange(portfolioCertifications.map(x => x.id === cert.id ? { ...x, date: e.target.value } : x))} maxLength={30} />
                  <Input placeholder="Credential URL (optional)" value={cert.credentialUrl} onChange={e => onPortfolioCertificationsChange(portfolioCertifications.map(x => x.id === cert.id ? { ...x, credentialUrl: e.target.value } : x))} type="url" inputMode="url" autoCapitalize="none" />
                  <Input placeholder="Badge image URL (optional)" value={cert.badgeUrl} onChange={e => onPortfolioCertificationsChange(portfolioCertifications.map(x => x.id === cert.id ? { ...x, badgeUrl: e.target.value } : x))} type="url" inputMode="url" autoCapitalize="none" />
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => onPortfolioCertificationsChange([...portfolioCertifications, { id: crypto.randomUUID(), name: '', issuer: '', date: '', credentialUrl: '', badgeUrl: '' }])} className="w-full h-10 rounded-xl active:scale-95 touch-manipulation">
                <Plus className="w-4 h-4 mr-2" /> Add Certification
              </Button>
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
                <div key={h.id} className="rounded-xl border border-border bg-card p-3 space-y-2">
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
        </>
      )}
    </div>
  );
}

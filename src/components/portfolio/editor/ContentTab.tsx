import {
  Briefcase, Star, Plus, X,
  MessageSquareQuote, TrendingUp,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { CollapsibleCard } from './shared';

export interface ContentTabProps {
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
}

export function ContentTab(props: ContentTabProps) {
  const {
    openSections, toggleSection,
    caseStudies, onCaseStudiesChange,
    services, onServicesChange,
    testimonials, onTestimonialsChange,
    highlights, onHighlightsChange,
  } = props;

  return (
    <div className="space-y-3">
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
    </div>
  );
}

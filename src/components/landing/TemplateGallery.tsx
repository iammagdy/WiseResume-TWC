import { useRef, useState } from 'react';
import { TemplateId } from '@/types/resume';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

interface TemplateInfo {
  id: TemplateId;
  name: string;
  spaceAlias: string;
  accent: string;
  layout: 'standard' | 'sidebar' | 'bold-header' | 'centered' | 'minimal' | 'terminal';
}

const templates: TemplateInfo[] = [
  { id: 'modern', name: 'Modern', spaceAlias: 'Voyager', accent: '#7c3aed', layout: 'standard' },
  { id: 'classic', name: 'Classic', spaceAlias: 'Heritage', accent: '#374151', layout: 'centered' },
  { id: 'creative', name: 'Creative', spaceAlias: 'Explorer', accent: '#059669', layout: 'sidebar' },
  { id: 'executive', name: 'Executive', spaceAlias: 'Commander', accent: '#1e40af', layout: 'bold-header' },
  { id: 'developer', name: 'Developer', spaceAlias: 'Terminal', accent: '#0d9488', layout: 'terminal' },
  { id: 'elegant', name: 'Elegant', spaceAlias: 'Aurora', accent: '#b45309', layout: 'minimal' },
];

function MiniPreview({ template }: { template: TemplateInfo }) {
  const { accent, layout } = template;

  const line = (w: string, h = 4) => (
    <div className="rounded-full bg-gray-200" style={{ width: w, height: h }} />
  );
  const titleLine = (w: string) => (
    <div className="rounded-full bg-gray-300" style={{ width: w, height: 5 }} />
  );
  const sectionHead = (label: string, color = accent) => (
    <div className="rounded-full mb-1.5" style={{ width: '40%', height: 4, backgroundColor: color }} />
  );
  const bullet = (w: string) => (
    <div className="flex items-center gap-1">
      <div className="w-1 h-1 rounded-full bg-gray-400 flex-shrink-0" />
      {line(w, 3)}
    </div>
  );
  const tag = (w: string, bg: string) => (
    <div className="rounded-full px-0.5" style={{ width: w, height: 6, backgroundColor: bg }} />
  );

  // Developer - Terminal aesthetic
  if (layout === 'terminal') {
    return (
      <div className="flex flex-col h-full">
        {/* Terminal header */}
        <div className="bg-gray-900 p-2 rounded-t-sm">
          <div className="flex items-center gap-1 mb-1.5">
            <span className="text-[6px] font-mono" style={{ color: '#10b981' }}>&gt;</span>
            <div className="h-[5px] w-3/5 rounded-full bg-white/80" />
          </div>
          <div className="h-[3px] w-2/5 rounded-full bg-white/30" />
        </div>
        {/* Body */}
        <div className="flex-1 bg-white p-2 flex flex-col gap-2">
          {/* // ABOUT */}
          <div className="flex items-center gap-1">
            <span className="text-[5px] font-mono text-emerald-600">//</span>
            <div className="h-[4px] w-1/3 rounded-full bg-emerald-500" />
          </div>
          <div className="border-l-2 border-gray-200 pl-1.5 space-y-1">
            {line('95%', 3)}
            {line('80%', 3)}
          </div>
          {/* // TECH_STACK */}
          <div className="flex items-center gap-1">
            <span className="text-[5px] font-mono text-emerald-600">//</span>
            <div className="h-[4px] w-2/5 rounded-full bg-emerald-500" />
          </div>
          <div className="flex flex-wrap gap-1">
            {tag('22%', '#0d948820')}
            {tag('18%', '#0d948820')}
            {tag('25%', '#0d948820')}
            {tag('15%', '#0d948820')}
            {tag('20%', '#0d948820')}
          </div>
          {/* // EXPERIENCE */}
          <div className="flex items-center gap-1 mt-auto">
            <span className="text-[5px] font-mono text-emerald-600">//</span>
            <div className="h-[4px] w-2/5 rounded-full bg-emerald-500" />
          </div>
          <div className="border-l-2 border-gray-200 pl-1.5 space-y-1">
            {bullet('85%')}
            {bullet('70%')}
          </div>
        </div>
      </div>
    );
  }

  // Creative - Sidebar layout
  if (layout === 'sidebar') {
    return (
      <div className="flex h-full">
        <div className="w-[35%] rounded-l-sm p-2 flex flex-col gap-2" style={{ backgroundColor: `${accent}15` }}>
          <div className="h-7 w-7 rounded-full mx-auto" style={{ backgroundColor: `${accent}30` }} />
          <div className="space-y-1">
            {line('100%', 3)}
            {line('80%', 3)}
            {line('60%', 3)}
          </div>
          <div className="mt-2 space-y-1">
            {tag('80%', `${accent}25`)}
            {tag('65%', `${accent}25`)}
            {tag('90%', `${accent}25`)}
            {tag('50%', `${accent}25`)}
          </div>
        </div>
        <div className="flex-1 bg-white p-2 flex flex-col gap-2">
          {titleLine('70%')}
          <div className="h-[3px] w-1/2 rounded-full bg-gray-200" />
          <div className="mt-1">{sectionHead('EXPERIENCE')}</div>
          <div className="space-y-1">
            {bullet('90%')}
            {bullet('80%')}
            {bullet('85%')}
          </div>
          <div className="mt-auto">{sectionHead('EDUCATION')}</div>
          <div className="space-y-1">
            {line('100%', 3)}
            {line('75%', 3)}
          </div>
        </div>
      </div>
    );
  }

  // Executive - Bold header
  if (layout === 'bold-header') {
    return (
      <div className="flex flex-col h-full">
        <div className="p-2.5 rounded-t-sm" style={{ backgroundColor: accent }}>
          <div className="h-[6px] w-2/3 rounded-full bg-white/80 mb-1" />
          <div className="h-[3px] w-1/2 rounded-full bg-white/50" />
        </div>
        <div className="flex-1 bg-white p-2 flex flex-col gap-2">
          {sectionHead('SUMMARY')}
          <div className="space-y-1">
            {line('100%', 3)}
            {line('90%', 3)}
          </div>
          {sectionHead('EXPERIENCE')}
          <div className="space-y-1">
            {bullet('95%')}
            {bullet('85%')}
            {bullet('70%')}
          </div>
          <div className="mt-auto flex gap-1 flex-wrap">
            {tag('25%', `${accent}18`)}
            {tag('20%', `${accent}18`)}
            {tag('30%', `${accent}18`)}
          </div>
        </div>
      </div>
    );
  }

  // Classic - Centered header
  if (layout === 'centered') {
    return (
      <div className="flex flex-col h-full bg-white p-2 items-center">
        <div className="h-[6px] w-1/2 rounded-full bg-gray-300 mb-1" />
        <div className="h-[3px] w-2/5 rounded-full bg-gray-200 mb-1" />
        <div className="h-[1px] w-3/4 my-1.5" style={{ backgroundColor: `${accent}50` }} />
        <div className="w-full space-y-1 mb-2">
          {line('100%', 3)}
          {line('85%', 3)}
        </div>
        <div className="w-full">{sectionHead('EXPERIENCE')}</div>
        <div className="w-full space-y-1 mb-2">
          {bullet('90%')}
          {bullet('80%')}
          {bullet('70%')}
        </div>
        <div className="w-full mt-auto">{sectionHead('EDUCATION')}</div>
        <div className="w-full space-y-1">
          {line('100%', 3)}
          {line('65%', 3)}
        </div>
      </div>
    );
  }

  // Elegant - Minimal
  if (layout === 'minimal') {
    return (
      <div className="flex flex-col h-full bg-white p-3">
        {titleLine('60%')}
        <div className="h-[3px] w-1/3 rounded-full bg-gray-200 mt-1 mb-3" />
        <div className="space-y-1 mb-3">
          {line('100%', 3)}
          {line('85%', 3)}
        </div>
        <div className="h-[1px] w-full bg-gray-200 mb-2" />
        <div className="space-y-3 flex-1">
          {[1, 2].map(s => (
            <div key={s}>
              <div className="h-[4px] w-1/4 rounded-full mb-1.5" style={{ backgroundColor: `${accent}60` }} />
              <div className="space-y-1">
                {bullet('90%')}
                {bullet('75%')}
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-1 mt-auto">
          {tag('22%', `${accent}15`)}
          {tag('28%', `${accent}15`)}
          {tag('18%', `${accent}15`)}
        </div>
      </div>
    );
  }

  // Modern - Standard with accent border
  return (
    <div className="flex flex-col h-full bg-white p-2">
      <div className="border-b-2 pb-1.5 mb-2" style={{ borderColor: accent }}>
        <div className="h-[6px] w-2/3 rounded-full bg-gray-300 mb-1" />
        <div className="h-[3px] w-1/2 rounded-full bg-gray-200" />
      </div>
      {sectionHead('SUMMARY')}
      <div className="space-y-1 mb-2">
        {line('100%', 3)}
        {line('90%', 3)}
      </div>
      {sectionHead('EXPERIENCE')}
      <div className="space-y-1 mb-2">
        {bullet('95%')}
        {bullet('85%')}
        {bullet('75%')}
      </div>
      <div className="mt-auto flex gap-1 flex-wrap">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-[6px] rounded-full" style={{ backgroundColor: `${accent}18`, width: `${18 + i * 4}%` }} />
        ))}
      </div>
    </div>
  );
}

export function TemplateGallery() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(1);
  const navigate = useNavigate();

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const scrollLeft = scrollRef.current.scrollLeft;
    const itemWidth = scrollRef.current.offsetWidth * 0.65;
    const newIndex = Math.round(scrollLeft / itemWidth);
    setActiveIndex(Math.min(newIndex, templates.length - 1));
  };

  return (
    <section className="py-12 sm:py-16">
      <div className="text-center mb-8 sm:mb-10 px-4 sm:px-6 opacity-0 animate-fade-in" style={{ animationDelay: '0.1s', animationFillMode: 'forwards' }}>
        <p className="text-caption text-secondary mb-2">
          12 Pro Templates
        </p>
        <h2 className="text-h2 text-foreground">
          Choose Your Flight Suit
        </h2>
        <p className="text-muted-foreground text-body mt-1">Pick a design, customize it with AI</p>
      </div>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex gap-4 sm:gap-5 overflow-x-auto snap-x snap-mandatory px-6 sm:px-10 pb-6 scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {templates.map((template, index) => (
          <div
            key={template.id}
            className={cn(
              'flex-shrink-0 w-[60%] min-w-[180px] sm:w-[32%] snap-center transition-all duration-300 cursor-pointer opacity-0 animate-fade-in hover:-translate-y-1',
              activeIndex === index ? 'scale-100' : 'scale-95 opacity-70'
            )}
            style={{ animationDelay: `${0.15 + index * 0.08}s`, animationFillMode: 'forwards' }}
            onClick={() => navigate('/auth')}
          >
            <div
              className={cn(
                'rounded-xl overflow-hidden border transition-all duration-300',
                activeIndex === index
                  ? 'border-primary/50 shadow-lg'
                  : 'border-border/30 hover:border-border/60'
              )}
              style={activeIndex === index ? { boxShadow: `0 8px 30px ${template.accent}30` } : undefined}
            >
              <div className="aspect-[612/792] bg-white rounded-lg overflow-hidden">
                <MiniPreview template={template} />
              </div>
            </div>
            <div className="text-center mt-3">
              <p className="font-display font-semibold text-foreground text-sm">{template.spaceAlias}</p>
              <p className="text-xs text-muted-foreground">{template.name}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Dots + see all */}
      <div className="flex flex-col items-center gap-3 mt-2">
        <div className="flex gap-2">
          {templates.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                if (!scrollRef.current) return;
                const itemWidth = scrollRef.current.offsetWidth * 0.65;
                scrollRef.current.scrollTo({ left: index * itemWidth, behavior: 'smooth' });
              }}
              className={cn(
                'h-2 rounded-full transition-all duration-300',
                activeIndex === index
                  ? 'bg-primary w-6'
                  : 'bg-muted-foreground/30 w-2 hover:bg-muted-foreground/50'
              )}
              aria-label={`Go to template ${index + 1}`}
            />
          ))}
        </div>
        <button
          onClick={() => navigate('/auth')}
          className="text-xs text-primary hover:text-primary/80 flex items-center gap-0.5 transition-colors group"
        >
          See all 12 templates <ChevronRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    </section>
  );
}

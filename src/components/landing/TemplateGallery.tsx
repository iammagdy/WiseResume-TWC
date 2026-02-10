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
  layout: 'standard' | 'sidebar' | 'two-column' | 'centered' | 'minimal' | 'bold-header';
}

const templates: TemplateInfo[] = [
  { id: 'modern', name: 'Modern', spaceAlias: 'Voyager', accent: '#7c3aed', layout: 'standard' },
  { id: 'classic', name: 'Classic', spaceAlias: 'Heritage', accent: '#374151', layout: 'centered' },
  { id: 'creative', name: 'Creative', spaceAlias: 'Explorer', accent: '#059669', layout: 'sidebar' },
  { id: 'executive', name: 'Executive', spaceAlias: 'Commander', accent: '#1e40af', layout: 'bold-header' },
  { id: 'developer', name: 'Developer', spaceAlias: 'Terminal', accent: '#0d9488', layout: 'two-column' },
  { id: 'elegant', name: 'Elegant', spaceAlias: 'Aurora', accent: '#b45309', layout: 'minimal' },
];

function MiniPreview({ template }: { template: TemplateInfo }) {
  const { accent, layout } = template;

  const lines = (count: number, widths: string[]) =>
    widths.slice(0, count).map((w, i) => (
      <div key={i} className="h-[3px] rounded-full bg-gray-200" style={{ width: w }} />
    ));

  const sectionHeader = (w: string) => (
    <div className="h-[4px] rounded-full mb-1.5" style={{ width: w, backgroundColor: accent }} />
  );

  if (layout === 'sidebar') {
    return (
      <div className="flex h-full gap-2">
        <div className="w-[35%] rounded-sm p-2 flex flex-col gap-2" style={{ backgroundColor: `${accent}12` }}>
          <div className="h-6 w-6 rounded-full mx-auto" style={{ backgroundColor: `${accent}30` }} />
          <div className="space-y-1">{lines(3, ['100%', '80%', '60%'])}</div>
          <div className="mt-auto space-y-1">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-[5px] rounded-full" style={{ backgroundColor: `${accent}20`, width: `${70 + i * 8}%` }} />
            ))}
          </div>
        </div>
        <div className="flex-1 p-2 flex flex-col gap-2">
          <div className="h-[5px] w-3/4 rounded-full bg-gray-300" />
          <div className="h-[3px] w-1/2 rounded-full bg-gray-200" />
          <div className="mt-1">{sectionHeader('40%')}</div>
          <div className="space-y-1">{lines(4, ['100%', '90%', '85%', '70%'])}</div>
          <div className="mt-auto">{sectionHeader('35%')}</div>
          <div className="space-y-1">{lines(2, ['100%', '75%'])}</div>
        </div>
      </div>
    );
  }

  if (layout === 'bold-header') {
    return (
      <div className="flex flex-col h-full">
        <div className="p-2 rounded-t-sm" style={{ backgroundColor: accent }}>
          <div className="h-[5px] w-2/3 rounded-full bg-white/80 mb-1" />
          <div className="h-[3px] w-1/2 rounded-full bg-white/50" />
        </div>
        <div className="flex-1 p-2 flex flex-col gap-2">
          {sectionHeader('35%')}
          <div className="space-y-1">{lines(3, ['100%', '90%', '70%'])}</div>
          {sectionHeader('30%')}
          <div className="space-y-1">{lines(3, ['100%', '85%', '60%'])}</div>
          <div className="mt-auto flex gap-1">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-[5px] flex-1 rounded-full" style={{ backgroundColor: `${accent}20` }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (layout === 'two-column') {
    return (
      <div className="flex flex-col h-full p-2">
        <div className="h-[5px] w-3/4 rounded-full bg-gray-300 mb-1" />
        <div className="h-[3px] w-1/2 rounded-full mb-2" style={{ backgroundColor: `${accent}60` }} />
        <div className="h-[2px] w-full rounded-full mb-2" style={{ backgroundColor: `${accent}30` }} />
        <div className="flex gap-2 flex-1">
          <div className="flex-1 space-y-2">
            {sectionHeader('50%')}
            <div className="space-y-1">{lines(4, ['100%', '90%', '80%', '65%'])}</div>
          </div>
          <div className="flex-1 space-y-2">
            {sectionHeader('45%')}
            <div className="space-y-1">{lines(4, ['100%', '85%', '95%', '70%'])}</div>
          </div>
        </div>
      </div>
    );
  }

  if (layout === 'centered') {
    return (
      <div className="flex flex-col h-full p-2 items-center">
        <div className="h-[6px] w-1/2 rounded-full bg-gray-300 mb-1" />
        <div className="h-[3px] w-2/5 rounded-full bg-gray-200 mb-1" />
        <div className="h-[1px] w-3/4 my-1.5" style={{ backgroundColor: `${accent}40` }} />
        <div className="w-full space-y-1 mb-2">{lines(2, ['100%', '80%'])}</div>
        <div className="w-full">{sectionHeader('40%')}</div>
        <div className="w-full space-y-1 mb-2">{lines(3, ['100%', '90%', '70%'])}</div>
        <div className="w-full mt-auto">{sectionHeader('35%')}</div>
        <div className="w-full space-y-1">{lines(2, ['100%', '60%'])}</div>
      </div>
    );
  }

  if (layout === 'minimal') {
    return (
      <div className="flex flex-col h-full p-3">
        <div className="h-[5px] w-2/3 rounded-full bg-gray-300 mb-1" />
        <div className="h-[3px] w-1/3 rounded-full bg-gray-200 mb-3" />
        <div className="space-y-1 mb-3">{lines(2, ['100%', '85%'])}</div>
        <div className="h-[1px] w-full bg-gray-200 mb-2" />
        <div className="space-y-3 flex-1">
          {[1, 2].map(s => (
            <div key={s}>
              <div className="h-[4px] w-1/4 rounded-full mb-1.5" style={{ backgroundColor: `${accent}50` }} />
              <div className="space-y-1">{lines(2, ['100%', '75%'])}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // standard
  return (
    <div className="flex flex-col h-full p-2">
      <div className="border-b-2 pb-1.5 mb-2" style={{ borderColor: accent }}>
        <div className="h-[6px] w-2/3 rounded-full bg-gray-300 mb-1" />
        <div className="h-[3px] w-1/2 rounded-full bg-gray-200" />
      </div>
      {sectionHeader('35%')}
      <div className="space-y-1 mb-2">{lines(3, ['100%', '90%', '70%'])}</div>
      {sectionHeader('40%')}
      <div className="space-y-1 mb-2">{lines(3, ['100%', '85%', '75%'])}</div>
      <div className="mt-auto flex gap-1 flex-wrap">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-[5px] rounded-full px-1" style={{ backgroundColor: `${accent}15`, width: `${20 + i * 3}%` }} />
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
      <div className="text-center mb-8 sm:mb-10 px-4 sm:px-6 animate-fade-in-up">
        <p className="text-secondary text-xs sm:text-sm font-medium tracking-wider uppercase mb-2">
          🚀 12 Pro Templates
        </p>
        <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground">
          Choose Your Flight Suit
        </h2>
        <p className="text-muted-foreground text-sm mt-1">Pick a design, customize it with AI</p>
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
              'flex-shrink-0 w-[60%] min-w-[180px] sm:w-[32%] snap-center transition-all duration-300 animate-fade-in-up cursor-pointer',
              activeIndex === index ? 'scale-100' : 'scale-95 opacity-70'
            )}
            style={{ animationDelay: `${index * 0.08}s` }}
            onClick={() => navigate('/editor')}
          >
            <div
              className={cn(
                'rounded-xl overflow-hidden border transition-all duration-300',
                activeIndex === index
                  ? 'border-primary/50 shadow-lg shadow-primary/20'
                  : 'border-border/30'
              )}
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
          onClick={() => navigate('/editor')}
          className="text-xs text-primary hover:text-primary/80 flex items-center gap-0.5 transition-colors"
        >
          See all 12 templates <ChevronRight className="h-3 w-3" />
        </button>
      </div>
    </section>
  );
}

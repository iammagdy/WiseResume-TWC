import { useRef, useState } from 'react';
import { TemplateId } from '@/types/resume';
import { cn } from '@/lib/utils';

const templates: { id: TemplateId; name: string; spaceAlias: string; accentColor: string }[] = [
  { id: 'modern', name: 'Modern', spaceAlias: 'Voyager', accentColor: 'hsl(var(--primary))' },
  { id: 'executive', name: 'Executive', spaceAlias: 'Commander', accentColor: 'hsl(var(--accent))' },
  { id: 'creative', name: 'Creative', spaceAlias: 'Explorer', accentColor: 'hsl(var(--secondary))' },
];

export function TemplateGallery() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(1);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const scrollLeft = scrollRef.current.scrollLeft;
    const itemWidth = scrollRef.current.offsetWidth * 0.75;
    const newIndex = Math.round(scrollLeft / itemWidth);
    setActiveIndex(Math.min(newIndex, templates.length - 1));
  };

  return (
    <section className="py-12 sm:py-16">
      <div className="text-center mb-8 sm:mb-10 px-4 sm:px-6 animate-fade-in-up">
        <p className="text-secondary text-xs sm:text-sm font-medium tracking-wider uppercase mb-2">
          🚀 Templates
        </p>
        <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground">
          Choose Your Flight Suit
        </h2>
      </div>

      {/* Scrollable gallery with lightweight placeholders */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex gap-4 sm:gap-6 overflow-x-auto snap-x snap-mandatory px-4 sm:px-8 pb-6 scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {templates.map((template, index) => (
          <div
            key={template.id}
            className={cn(
              'flex-shrink-0 w-[75%] min-w-[200px] sm:w-[40%] snap-center transition-all duration-300 animate-fade-in-up',
              activeIndex === index ? 'scale-100' : 'scale-95 opacity-70'
            )}
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div
              className={cn(
                'rounded-xl overflow-hidden border transition-all duration-300',
                activeIndex === index
                  ? 'border-primary/50 shadow-lg shadow-primary/20'
                  : 'border-border/30'
              )}
            >
              {/* Lightweight placeholder instead of full template render */}
              <div
                className="aspect-[612/792] bg-card/80 p-4 sm:p-6 flex flex-col"
                style={{ borderTop: `4px solid ${template.accentColor}` }}
              >
                {/* Header placeholder */}
                <div className="mb-4">
                  <div className="h-4 w-2/3 rounded bg-foreground/15 mb-2" />
                  <div className="h-2 w-1/2 rounded bg-muted-foreground/10" />
                </div>
                {/* Summary placeholder */}
                <div className="space-y-1.5 mb-4">
                  <div className="h-2 w-full rounded bg-muted-foreground/8" />
                  <div className="h-2 w-5/6 rounded bg-muted-foreground/8" />
                  <div className="h-2 w-4/6 rounded bg-muted-foreground/8" />
                </div>
                {/* Section placeholder */}
                <div className="h-3 w-1/3 rounded mb-2" style={{ backgroundColor: `${template.accentColor}30` }} />
                <div className="space-y-1.5 mb-4">
                  <div className="h-2 w-full rounded bg-muted-foreground/8" />
                  <div className="h-2 w-5/6 rounded bg-muted-foreground/8" />
                  <div className="h-2 w-3/4 rounded bg-muted-foreground/8" />
                </div>
                {/* Another section */}
                <div className="h-3 w-1/4 rounded mb-2" style={{ backgroundColor: `${template.accentColor}30` }} />
                <div className="space-y-1.5 flex-1">
                  <div className="h-2 w-full rounded bg-muted-foreground/8" />
                  <div className="h-2 w-4/5 rounded bg-muted-foreground/8" />
                </div>
                {/* Skills row */}
                <div className="flex gap-1.5 mt-auto pt-3">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-5 px-3 rounded-full" style={{ backgroundColor: `${template.accentColor}15`, minWidth: '40px' }} />
                  ))}
                </div>
              </div>
            </div>
            <div className="text-center mt-4">
              <p className="font-display font-semibold text-foreground">{template.spaceAlias}</p>
              <p className="text-xs text-muted-foreground">{template.name}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination dots */}
      <div className="flex justify-center gap-2 mt-2">
        {templates.map((_, index) => (
          <button
            key={index}
            onClick={() => {
              if (!scrollRef.current) return;
              const itemWidth = scrollRef.current.offsetWidth * 0.75;
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
    </section>
  );
}

import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Bookmark, ThumbsUp, ThumbsDown, Type } from 'lucide-react';
import { BackButton } from '@/components/ui/BackButton';
import ReactMarkdown from 'react-markdown';
import { Badge } from '@/components/ui/badge';
import { getGuideBySlug, getGuidesByCategory, GUIDE_CATEGORIES } from '@/lib/guidesData';
import { useGuidesStore } from '@/store/guidesStore';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/utils';

const FONT_SIZES = { sm: 'text-sm leading-relaxed', md: 'text-base leading-relaxed', lg: 'text-lg leading-loose' } as const;

export default function GuidePage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const guide = getGuideBySlug(slug || '');
  const scrollRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const { bookmarkedSlugs, toggleBookmark, readSlugs, markRead, helpfulSlugs, setHelpful, fontSize, setFontSize } = useGuidesStore();
  const [showFontMenu, setShowFontMenu] = useState(false);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || !guide) return;
    const pct = el.scrollTop / (el.scrollHeight - el.clientHeight);
    const clamped = Math.min(1, Math.max(0, pct));
    setProgress(clamped);
    if (clamped > 0.8) markRead(guide.slug);
  }, [guide, markRead]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  if (!guide) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-lg font-bold mb-2">Guide Not Found</p>
          <button onClick={() => navigate('/guides')} className="text-primary text-sm hover:underline">
            ← Back to Guides
          </button>
        </div>
      </div>
    );
  }

  const isBookmarked = bookmarkedSlugs.includes(guide.slug);
  const helpful = helpfulSlugs[guide.slug];
  const categoryLabel = GUIDE_CATEGORIES.find((c) => c.id === guide.category)?.label ?? guide.category;
  const related = getGuidesByCategory(guide.category).filter((g) => g.slug !== guide.slug).slice(0, 3);

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Progress bar */}
      <div className="h-1 bg-muted">
        <div className="h-full bg-primary transition-all duration-150" style={{ width: `${progress * 100}%` }} />
      </div>

      {/* Header */}
      <header className="pt-safe pt-2 pb-2 px-4 flex items-center gap-2 glass-header">
        <BackButton />
        <span className="flex-1 min-w-0 text-sm font-medium truncate">{guide.title}</span>
        <button
          onClick={() => { setShowFontMenu(!showFontMenu); haptics.light(); }}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full touch-manipulation active:scale-95"
          aria-label="Font size"
        >
          <Type className="w-4 h-4" />
        </button>
        <button
          onClick={() => { toggleBookmark(guide.slug); haptics.light(); }}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full touch-manipulation active:scale-95"
          aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
        >
          <Bookmark className={cn('w-5 h-5', isBookmarked ? 'fill-primary text-primary' : 'text-muted-foreground')} />
        </button>
      </header>

      {/* Font size selector */}
      {showFontMenu && (
        <div className="px-4 pb-2 flex gap-2">
          {(['sm', 'md', 'lg'] as const).map((s) => (
            <button
              key={s}
              onClick={() => { setFontSize(s); haptics.light(); setShowFontMenu(false); }}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium min-h-[36px] touch-manipulation active:scale-95 transition-all',
                fontSize === s ? 'bg-primary text-primary-foreground' : 'glass-surface'
              )}
            >
              {s === 'sm' ? 'Small' : s === 'md' ? 'Medium' : 'Large'}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain px-5 pb-safe">
        <div className="max-w-2xl mx-auto py-4">
          <Badge variant="secondary" className="mb-2 text-[10px]">{categoryLabel}</Badge>
          <h1 className="text-xl font-bold mb-1">{guide.title}</h1>
          <p className="text-xs text-muted-foreground mb-6">{guide.readTimeMinutes} min read</p>

          <article className={cn('prose prose-sm dark:prose-invert max-w-none', FONT_SIZES[fontSize])}>
            <ReactMarkdown>{guide.content}</ReactMarkdown>
          </article>

          {/* Helpful? */}
          <div className="mt-10 py-6 border-t border-border">
            <p className="text-sm font-medium text-center mb-3">Was this guide helpful?</p>
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => { setHelpful(guide.slug, true); haptics.success(); }}
                className={cn(
                  'min-w-[52px] min-h-[52px] flex items-center justify-center rounded-full transition-all touch-manipulation active:scale-90',
                  helpful === true ? 'bg-primary/20 text-primary' : 'glass-surface text-muted-foreground'
                )}
                aria-label="Yes, helpful"
              >
                <ThumbsUp className="w-5 h-5" />
              </button>
              <button
                onClick={() => { setHelpful(guide.slug, false); haptics.light(); }}
                className={cn(
                  'min-w-[52px] min-h-[52px] flex items-center justify-center rounded-full transition-all touch-manipulation active:scale-90',
                  helpful === false ? 'bg-destructive/20 text-destructive' : 'glass-surface text-muted-foreground'
                )}
                aria-label="Not helpful"
              >
                <ThumbsDown className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Related */}
          {related.length > 0 && (
            <div className="mt-6 pb-8">
              <h3 className="text-sm font-bold mb-3">Related Guides</h3>
              <div className="space-y-2">
                {related.map((r) => (
                  <button
                    key={r.slug}
                    onClick={() => { haptics.light(); navigate(`/guides/${r.slug}`); }}
                    className="w-full text-left p-3 rounded-xl glass-surface transition-all active:scale-[0.98] touch-manipulation min-h-[48px]"
                  >
                    <p className="text-sm font-medium">{r.title}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{r.readTimeMinutes} min read</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

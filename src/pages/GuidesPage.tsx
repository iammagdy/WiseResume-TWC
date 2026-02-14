import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Bookmark, BookOpen, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { guides, GUIDE_CATEGORIES, type GuideCategory, type Guide } from '@/lib/guidesData';
import { useGuidesStore } from '@/store/guidesStore';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/utils';

export default function GuidesPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<GuideCategory | 'all'>('all');
  const [showSaved, setShowSaved] = useState(false);
  const { bookmarkedSlugs, readSlugs, toggleBookmark } = useGuidesStore();

  const filtered = useMemo(() => {
    let list: Guide[] = showSaved
      ? guides.filter((g) => bookmarkedSlugs.includes(g.slug))
      : guides;

    if (activeCategory !== 'all') {
      list = list.filter((g) => g.category === activeCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (g) =>
          g.title.toLowerCase().includes(q) ||
          g.tags.some((t) => t.includes(q))
      );
    }
    return list;
  }, [searchQuery, activeCategory, showSaved, bookmarkedSlugs]);

  const categoryLabel = (cat: GuideCategory) =>
    GUIDE_CATEGORIES.find((c) => c.id === cat)?.label ?? cat;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <header className="pt-safe pt-3 pb-2 px-4 flex items-center gap-3 glass-header">
        <button
          onClick={() => { haptics.light(); navigate('/dashboard'); }}
          className="min-w-[48px] min-h-[48px] flex items-center justify-center rounded-full touch-manipulation active:scale-95"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold flex-1 min-w-0 truncate">Career Guides</h1>
      </header>

      {/* Search */}
      <div className="px-4 pt-3 pb-2">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search guides..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 rounded-full h-11 glass-input"
          />
        </div>
      </div>

      {/* Browse / Saved toggle */}
      <div className="px-4 pb-2 flex gap-2">
        <button
          onClick={() => { setShowSaved(false); haptics.light(); }}
          className={cn(
            'px-4 py-2 rounded-full text-sm font-medium transition-all touch-manipulation active:scale-95 min-h-[44px]',
            !showSaved ? 'bg-primary text-primary-foreground' : 'glass-surface text-muted-foreground'
          )}
        >
          <BookOpen className="w-4 h-4 inline mr-1.5 -mt-0.5" />Browse
        </button>
        <button
          onClick={() => { setShowSaved(true); haptics.light(); }}
          className={cn(
            'px-4 py-2 rounded-full text-sm font-medium transition-all touch-manipulation active:scale-95 min-h-[44px]',
            showSaved ? 'bg-primary text-primary-foreground' : 'glass-surface text-muted-foreground'
          )}
        >
          <Bookmark className="w-4 h-4 inline mr-1.5 -mt-0.5" />Saved{bookmarkedSlugs.length > 0 && ` (${bookmarkedSlugs.length})`}
        </button>
      </div>

      {/* Category chips */}
      {!showSaved && (
        <div className="px-4 pb-3 flex gap-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => { setActiveCategory('all'); haptics.light(); }}
            className={cn(
              'shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all touch-manipulation active:scale-95 min-h-[36px]',
              activeCategory === 'all' ? 'bg-primary text-primary-foreground' : 'glass-surface text-muted-foreground'
            )}
          >
            All
          </button>
          {GUIDE_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => { setActiveCategory(cat.id); haptics.light(); }}
              className={cn(
                'shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all touch-manipulation active:scale-95 min-h-[36px]',
                activeCategory === cat.id ? 'bg-primary text-primary-foreground' : 'glass-surface text-muted-foreground'
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>
      )}

      {/* Guide list */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-safe">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <BookOpen className="w-12 h-12 text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground text-sm">
              {showSaved ? 'No saved guides yet' : 'No guides found'}
            </p>
          </div>
        ) : (
          <div className="space-y-3 pb-4">
            {filtered.map((guide) => {
              const isRead = readSlugs.includes(guide.slug);
              const isBookmarked = bookmarkedSlugs.includes(guide.slug);
              const preview = guide.content.replace(/^#.*\n+/, '').replace(/[#*`>\[\]]/g, '').trim().slice(0, 80);
              return (
                <button
                  key={guide.slug}
                  onClick={() => { haptics.light(); navigate(`/guides/${guide.slug}`); }}
                  className="w-full text-left p-4 rounded-xl glass-surface transition-all active:scale-[0.98] touch-manipulation min-h-[52px]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className={cn('font-semibold text-sm leading-tight', isRead && 'text-muted-foreground')}>
                        {guide.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{preview}…</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="secondary" className="text-[10px]">{categoryLabel(guide.category)}</Badge>
                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Clock className="w-3 h-3" />{guide.readTimeMinutes} min
                        </span>
                        {isRead && <Badge variant="outline" className="text-[10px]">Read</Badge>}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        haptics.light();
                        toggleBookmark(guide.slug);
                      }}
                      className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full touch-manipulation active:scale-90"
                      aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
                    >
                      <Bookmark className={cn('w-5 h-5', isBookmarked ? 'fill-primary text-primary' : 'text-muted-foreground')} />
                    </button>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

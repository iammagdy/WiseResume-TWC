import { memo, useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Star, Plus, Search, X } from 'lucide-react';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import { toast } from 'sonner';
import { contentPhrases, ALL_CATEGORIES, CATEGORY_LABELS, CATEGORY_COLORS, type ContentCategory } from '@/lib/contentLibrary';
import { useContentLibraryStore } from '@/store/contentLibraryStore';

interface ContentLibrarySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsert: (text: string) => void;
}

export const ContentLibrarySheet = memo(function ContentLibrarySheet({
  open,
  onOpenChange,
  onInsert,
}: ContentLibrarySheetProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ContentCategory | 'all'>('all');
  const [tab, setTab] = useState<'browse' | 'favorites'>('browse');
  const searchRef = useRef<HTMLInputElement>(null);

  const { favorites, recentlyUsed, toggleFavorite, addToRecent } = useContentLibraryStore();

  useEffect(() => {
    if (open) {
      setTimeout(() => searchRef.current?.focus(), 300);
    } else {
      setSearch('');
      setSelectedCategory('all');
      setTab('browse');
    }
  }, [open]);

  const filteredPhrases = useMemo(() => {
    let results = contentPhrases;

    if (tab === 'favorites') {
      results = results.filter((p) => favorites.includes(p.id));
    }

    if (selectedCategory !== 'all') {
      results = results.filter((p) => p.category === selectedCategory);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      results = results.filter((p) => p.text.toLowerCase().includes(q));
    }

    return results;
  }, [search, selectedCategory, tab, favorites]);

  const handleInsert = useCallback(
    (phrase: typeof contentPhrases[0]) => {
      haptics.medium();
      addToRecent(phrase.id);
      onInsert(phrase.text);
      toast.success('Phrase added ✓', { duration: 1500 });
    },
    [onInsert, addToRecent]
  );

  const handleToggleFav = useCallback(
    (id: string) => {
      haptics.light();
      toggleFavorite(id);
    },
    [toggleFavorite]
  );

  const categories: { key: ContentCategory | 'all'; label: string }[] = [
    { key: 'all', label: 'All' },
    ...ALL_CATEGORIES.map((c) => ({ key: c, label: CATEGORY_LABELS[c] })),
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[75vh] flex flex-col p-0" hideCloseButton>
        {/* Drag handle */}
        <div className="pt-3 pb-2 flex justify-center">
          <div className="w-12 h-1.5 bg-muted-foreground/40 rounded-full" />
        </div>

        <SheetTitle className="px-4 pb-2 text-lg font-semibold">Content Library</SheetTitle>

        {/* Search */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search phrases..."
              className="pl-9 pr-9"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 touch-manipulation"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>

        {/* Browse / Favorites tabs */}
        <div className="px-4 pb-2 flex gap-2">
          {(['browse', 'favorites'] as const).map((t) => (
            <button
              key={t}
              onClick={() => { haptics.selection(); setTab(t); }}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-all touch-manipulation active:scale-95',
                tab === t ? 'glass-elevated text-foreground' : 'text-muted-foreground hover:bg-muted/50'
              )}
            >
              {t === 'browse' ? 'Browse' : `Favorites (${favorites.length})`}
            </button>
          ))}
        </div>

        {/* Category chips (horizontal scroll) */}
        <div className="px-4 pb-3 overflow-x-auto flex gap-2 no-scrollbar" style={{ touchAction: 'pan-x' }}>
          {categories.map((c) => (
            <button
              key={c.key}
              onClick={() => { haptics.selection(); setSelectedCategory(c.key); }}
              className={cn(
                'shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all touch-manipulation active:scale-95 whitespace-nowrap',
                selectedCategory === c.key
                  ? 'bg-primary text-primary-foreground'
                  : 'glass-surface text-muted-foreground hover:text-foreground'
              )}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Phrase list */}
        <div className="flex-1 overflow-y-auto px-4 pb-safe space-y-2">
          {filteredPhrases.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Star className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm font-medium">
                {tab === 'favorites' ? 'No favorites yet' : 'No phrases found'}
              </p>
              <p className="text-xs mt-1">
                {tab === 'favorites' ? 'Star phrases to save them here' : 'Try a different search'}
              </p>
            </div>
          )}
          {filteredPhrases.map((phrase) => (
            <PhraseCard
              key={phrase.id}
              phrase={phrase}
              isFavorite={favorites.includes(phrase.id)}
              onInsert={() => handleInsert(phrase)}
              onToggleFavorite={() => handleToggleFav(phrase.id)}
            />
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
});

interface PhraseCardProps {
  phrase: typeof contentPhrases[0];
  isFavorite: boolean;
  onInsert: () => void;
  onToggleFavorite: () => void;
}

const PhraseCard = memo(function PhraseCard({ phrase, isFavorite, onInsert, onToggleFavorite }: PhraseCardProps) {
  // Highlight {variables} in primary color
  const rendered = phrase.text.split(/(\{[^}]+\})/g).map((part, i) =>
    part.startsWith('{') ? (
      <span key={i} className="text-primary font-medium">{part}</span>
    ) : (
      <span key={i}>{part}</span>
    )
  );

  return (
    <div className="glass-surface rounded-xl p-3 flex items-start gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm leading-relaxed">{rendered}</p>
        <span className={cn('inline-block mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium', CATEGORY_COLORS[phrase.category])}>
          {CATEGORY_LABELS[phrase.category]}
        </span>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={onToggleFavorite}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-muted/50 active:scale-95 transition-all touch-manipulation"
          aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Star className={cn('w-4 h-4', isFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground')} />
        </button>
        <button
          onClick={onInsert}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-primary/10 hover:bg-primary/20 active:scale-95 transition-all touch-manipulation"
          aria-label="Insert phrase"
        >
          <Plus className="w-4 h-4 text-primary" />
        </button>
      </div>
    </div>
  );
});

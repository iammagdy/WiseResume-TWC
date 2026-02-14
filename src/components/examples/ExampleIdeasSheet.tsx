import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Copy, Bookmark } from 'lucide-react';
import { haptics } from '@/lib/haptics';
import { toast } from 'sonner';
import { useContentLibraryStore } from '@/store/contentLibraryStore';
import type { ResumeExample } from '@/types/resumeExamples';

interface Props {
  example: ResumeExample | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PhraseGroup {
  section: string;
  phrases: string[];
}

function extractPhrases(example: ResumeExample): PhraseGroup[] {
  const groups: PhraseGroup[] = [];

  if (example.resumeData.summary) {
    groups.push({ section: 'Summary', phrases: [example.resumeData.summary] });
  }

  const achievements = example.resumeData.experience.flatMap(e => e.achievements);
  if (achievements.length > 0) {
    groups.push({ section: 'Achievements', phrases: achievements });
  }

  if (example.resumeData.skills.length > 0) {
    groups.push({ section: 'Skills', phrases: [example.resumeData.skills.join(', ')] });
  }

  return groups;
}

export function ExampleIdeasSheet({ example, open, onOpenChange }: Props) {
  const { addToRecent, toggleFavorite, favorites } = useContentLibraryStore();

  if (!example) return null;

  const phraseGroups = extractPhrases(example);

  const handleCopy = async (phrase: string) => {
    haptics.light();
    await navigator.clipboard.writeText(phrase);
    addToRecent(phrase);
    toast.success('Copied to clipboard');
  };

  const handleSave = (phrase: string) => {
    haptics.success();
    toggleFavorite(phrase);
    const isFav = favorites.includes(phrase);
    toast.success(isFav ? 'Removed from library' : 'Saved to library');
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[75dvh] flex flex-col p-0">
        <SheetHeader className="px-4 pt-4 pb-2">
          <SheetTitle className="text-fluid-base">Get Ideas from {example.title}</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 pb-safe space-y-4 min-h-0">
          {phraseGroups.map((group) => (
            <section key={group.section}>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{group.section}</h4>
              <div className="space-y-2">
                {group.phrases.map((phrase, i) => (
                  <div key={i} className="glass-surface rounded-xl p-3 flex items-start gap-2">
                    <p className="flex-1 text-sm text-foreground leading-relaxed min-w-0">{phrase}</p>
                    <div className="flex flex-col gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-9 h-9 active:scale-95"
                        onClick={() => handleCopy(phrase)}
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`w-9 h-9 active:scale-95 ${favorites.includes(phrase) ? 'text-primary' : ''}`}
                        onClick={() => handleSave(phrase)}
                      >
                        <Bookmark className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}

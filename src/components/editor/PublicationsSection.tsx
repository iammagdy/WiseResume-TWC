import { memo, useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp, BookOpen, Calendar, Link } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useResumeStore } from '@/store/resumeStore';
import { Publication } from '@/types/resume';
import { v4 as uuidv4 } from 'uuid';
import haptics from '@/lib/haptics';

export const PublicationsSection = memo(function PublicationsSection() {
  const publications = useResumeStore(state => state.currentResume?.publications) || [];
  const updateResume = useResumeStore(state => state.updateResume);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const addPublication = () => { haptics.light(); const n: Publication = { id: uuidv4(), title: '', publisher: '', date: '' }; updateResume({ publications: [...publications, n] }); setExpandedId(n.id); };
  const updatePub = (id: string, u: Partial<Publication>) => { updateResume({ publications: publications.map(p => p.id === id ? { ...p, ...u } : p) }); };
  const deletePub = (id: string) => { haptics.light(); updateResume({ publications: publications.filter(p => p.id !== id) }); };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end"><Button variant="outline" size="sm" onClick={addPublication} className="gap-2 active:scale-95 transition-transform"><Plus className="w-4 h-4" />Add</Button></div>
      {publications.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground"><BookOpen className="w-10 h-10 mx-auto mb-2 opacity-40" /><p className="text-sm">Add your publications</p></div>
      ) : (
        <div className="space-y-3">
          {publications.map((pub, i) => (
            <div key={pub.id} className="rounded-xl border border-border overflow-hidden">
              <button onClick={() => setExpandedId(expandedId === pub.id ? null : pub.id)} className="w-full p-4 flex items-center justify-between hover:bg-muted/50 touch-manipulation active:bg-muted/70 min-h-[72px]">
                <div className="text-left flex-1 min-w-0 pr-3"><p className="font-semibold text-sm truncate">{pub.title || `Publication ${i + 1}`}</p><p className="text-sm text-muted-foreground truncate">{pub.publisher || 'Publisher'}</p></div>
                <div className="shrink-0 w-10 h-10 flex items-center justify-center">{expandedId === pub.id ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}</div>
              </button>
              {expandedId === pub.id && (
                <div className="animate-in fade-in-0 duration-200"><div className="p-4 pt-0 space-y-4 border-t border-border">
                  <div><Label className="text-sm flex items-center gap-1.5 mb-2"><BookOpen className="w-4 h-4" />Title</Label><Input value={pub.title} onChange={e => updatePub(pub.id, { title: e.target.value })} placeholder="Publication Title" className="h-12" /></div>
                  <div><Label className="text-sm mb-2">Publisher / Journal</Label><Input value={pub.publisher} onChange={e => updatePub(pub.id, { publisher: e.target.value })} placeholder="Journal or Conference" className="h-12" /></div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div><Label className="text-sm flex items-center gap-1.5 mb-2"><Calendar className="w-4 h-4" />Date</Label><Input value={pub.date} onChange={e => updatePub(pub.id, { date: e.target.value })} placeholder="2024" className="h-12" /></div>
                    <div><Label className="text-sm mb-2">Co-Authors</Label><Input value={pub.coAuthors || ''} onChange={e => updatePub(pub.id, { coAuthors: e.target.value })} placeholder="John Doe, Jane Smith" className="h-12" /></div>
                  </div>
                  <div><Label className="text-sm flex items-center gap-1.5 mb-2"><Link className="w-4 h-4" />URL / DOI</Label><Input value={pub.url || ''} onChange={e => updatePub(pub.id, { url: e.target.value })} placeholder="https://doi.org/..." className="h-12" type="url" /></div>
                  <div><Label className="text-sm mb-2">Description</Label><Textarea value={pub.description || ''} onChange={e => updatePub(pub.id, { description: e.target.value })} placeholder="Brief description..." className="min-h-[80px] resize-none text-base" /></div>
                  <div className="flex justify-end pt-2"><Button variant="ghost" size="sm" onClick={() => deletePub(pub.id)} className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"><Trash2 className="w-4 h-4" />Remove</Button></div>
                </div></div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

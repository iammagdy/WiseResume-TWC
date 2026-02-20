import { memo, useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp, Award, Calendar, Building2, Link, ArrowUp, ArrowDown } from 'lucide-react';
import { DragHandle } from './DragHandle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useResumeStore } from '@/store/resumeStore';
import { Certification } from '@/types/resume';
import { v4 as uuidv4 } from 'uuid';
import haptics from '@/lib/haptics';

export const CertificationsSection = memo(function CertificationsSection() {
  const certifications = useResumeStore(state => state.currentResume?.certifications) || [];
  const updateResume = useResumeStore(state => state.updateResume);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const addCert = () => {
    haptics.light();
    const n: Certification = { id: uuidv4(), name: '', issuer: '', date: '' };
    updateResume({ certifications: [...certifications, n] });
    setExpandedId(n.id);
  };

  const updateCert = (id: string, u: Partial<Certification>) => {
    updateResume({ certifications: certifications.map(c => c.id === id ? { ...c, ...u } : c) });
  };

  const deleteCert = (id: string) => {
    haptics.light();
    updateResume({ certifications: certifications.filter(c => c.id !== id) });
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    haptics.light();
    const arr = [...certifications];
    [arr[index - 1], arr[index]] = [arr[index], arr[index - 1]];
    updateResume({ certifications: arr });
  };

  const moveDown = (index: number) => {
    if (index >= certifications.length - 1) return;
    haptics.light();
    const arr = [...certifications];
    [arr[index], arr[index + 1]] = [arr[index + 1], arr[index]];
    updateResume({ certifications: arr });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button variant="outline" size="sm" onClick={addCert} className="gap-2 active:scale-95 transition-transform">
          <Plus className="w-4 h-4" />Add
        </Button>
      </div>

      {certifications.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Award className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Add your certifications & licenses</p>
        </div>
      ) : (
        <div className="space-y-3">
          {certifications.map((cert, index) => (
            <div key={cert.id} className="rounded-xl border border-border overflow-hidden">
              <button
                onClick={() => setExpandedId(expandedId === cert.id ? null : cert.id)}
                className="w-full p-4 flex items-center justify-between hover:bg-muted/50 touch-manipulation active:bg-muted/70 min-h-[72px]"
              >
                <DragHandle />
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={e => { e.stopPropagation(); moveUp(index); }} disabled={index === 0} className="p-1.5 rounded hover:bg-muted disabled:opacity-30 min-w-[32px] min-h-[32px] flex items-center justify-center" aria-label="Move up"><ArrowUp className="w-3.5 h-3.5" /></button>
                  <button onClick={e => { e.stopPropagation(); moveDown(index); }} disabled={index === certifications.length - 1} className="p-1.5 rounded hover:bg-muted disabled:opacity-30 min-w-[32px] min-h-[32px] flex items-center justify-center" aria-label="Move down"><ArrowDown className="w-3.5 h-3.5" /></button>
                </div>
                <div className="text-left flex-1 min-w-0 px-3">
                  <p className="font-semibold text-sm truncate">{cert.name || `Certification ${index + 1}`}</p>
                  <p className="text-sm text-muted-foreground truncate">{cert.issuer || 'Issuing organization'}</p>
                </div>
                <div className="shrink-0 w-10 h-10 flex items-center justify-center">
                  {expandedId === cert.id ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
                </div>
              </button>

              {expandedId === cert.id && (
                <div className="animate-in fade-in-0 duration-200">
                  <div className="p-4 pt-0 space-y-4 border-t border-border">
                    <div>
                      <Label className="text-sm flex items-center gap-1.5 mb-2"><Award className="w-4 h-4" />Certification Name</Label>
                      <Input value={cert.name} onChange={e => updateCert(cert.id, { name: e.target.value })} placeholder="AWS Solutions Architect" className="h-12" />
                    </div>
                    <div>
                      <Label className="text-sm flex items-center gap-1.5 mb-2"><Building2 className="w-4 h-4" />Issuing Organization</Label>
                      <Input value={cert.issuer} onChange={e => updateCert(cert.id, { issuer: e.target.value })} placeholder="Amazon Web Services" className="h-12" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm flex items-center gap-1.5 mb-2"><Calendar className="w-4 h-4" />Date Issued</Label>
                        <Input value={cert.date} onChange={e => updateCert(cert.id, { date: e.target.value })} placeholder="Jan 2024" className="h-12" />
                      </div>
                      <div>
                        <Label className="text-sm flex items-center gap-1.5 mb-2"><Calendar className="w-4 h-4" />Expiry Date (optional)</Label>
                        <Input value={cert.expiryDate || ''} onChange={e => updateCert(cert.id, { expiryDate: e.target.value })} placeholder="Jan 2027" className="h-12" />
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm mb-2">Credential ID (optional)</Label>
                      <Input value={cert.credentialId || ''} onChange={e => updateCert(cert.id, { credentialId: e.target.value })} placeholder="ABC123XYZ" className="h-12" />
                    </div>
                    <div className="flex justify-end pt-2">
                      <Button variant="ghost" size="sm" onClick={() => deleteCert(cert.id)} className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10">
                        <Trash2 className="w-4 h-4" />Remove
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

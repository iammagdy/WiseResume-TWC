import { useState, useEffect, useRef } from 'react';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Loader2, UserPlus, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/safeClient';
import { getUserId } from '@/lib/supabaseBridge';

interface Role {
  id: string;
  title: string;
}

interface DuplicateMatch {
  id: string;
  name: string;
  pipeline_stage: string;
}

interface AddCandidateSheetProps {
  open: boolean;
  onClose: () => void;
  roles: Role[];
  defaultRoleId?: string;
  onAdd: (data: { name: string; email?: string; roleId?: string }) => Promise<void>;
}

async function checkForDuplicates(name: string, email: string): Promise<DuplicateMatch[]> {
  const userId = await getUserId();
  if (!userId || (!name.trim() && !email.trim())) return [];

  const orParts: string[] = [];
  if (name.trim().length >= 2) {
    orParts.push(`name.ilike.${name.trim()}`);
  }
  if (email.trim().length >= 4) {
    orParts.push(`email.ilike.${email.trim()}`);
  }
  if (!orParts.length) return [];

  const { data } = await supabase
    .from('wisehire_candidates')
    .select('id, name, pipeline_stage')
    .eq('owner_id', userId)
    .eq('is_deleted', false)
    .or(orParts.join(','))
    .limit(3);

  return (data ?? []) as DuplicateMatch[];
}

export function AddCandidateSheet({ open, onClose, roles, defaultRoleId, onAdd }: AddCandidateSheetProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [roleId, setRoleId] = useState(defaultRoleId ?? 'none');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [duplicates, setDuplicates] = useState<DuplicateMatch[]>([]);
  const checkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) {
      setName('');
      setEmail('');
      setRoleId(defaultRoleId ?? 'none');
      setError('');
      setDuplicates([]);
    }
  }, [open, defaultRoleId]);

  function scheduleDuplicateCheck(newName: string, newEmail: string) {
    if (checkTimer.current) clearTimeout(checkTimer.current);
    checkTimer.current = setTimeout(async () => {
      const matches = await checkForDuplicates(newName, newEmail);
      setDuplicates(matches);
    }, 600);
  }

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setName(v);
    scheduleDuplicateCheck(v, email);
  }

  function handleEmailChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setEmail(v);
    scheduleDuplicateCheck(name, v);
  }

  const canSubmit = name.trim().length >= 2 && !loading;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError('');
    try {
      await onAdd({
        name: name.trim(),
        email: email.trim() || undefined,
        roleId: roleId !== 'none' ? roleId : undefined,
      });
      setName('');
      setEmail('');
      setRoleId(defaultRoleId ?? 'none');
      setDuplicates([]);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add candidate');
    } finally {
      setLoading(false);
    }
  }

  const STAGE_LABELS: Record<string, string> = {
    shortlisted: 'Shortlisted',
    contacted: 'Contacted',
    interviewing: 'Interviewing',
    offer_sent: 'Offer Sent',
    hired: 'Hired',
    rejected: 'Rejected',
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Add Candidate
          </SheetTitle>
          <SheetDescription>
            Candidate will be placed in the Shortlisted stage.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="candidateName">Full name *</Label>
            <Input
              id="candidateName"
              value={name}
              onChange={handleNameChange}
              placeholder="Jane Smith"
              autoFocus
              disabled={loading}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="candidateEmail">Email</Label>
            <Input
              id="candidateEmail"
              type="email"
              value={email}
              onChange={handleEmailChange}
              placeholder="jane@example.com"
              disabled={loading}
            />
          </div>

          {/* Duplicate warning */}
          {duplicates.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 p-3 space-y-1.5">
              <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <p className="text-xs font-semibold">Possible duplicate{duplicates.length > 1 ? 's' : ''} detected</p>
              </div>
              {duplicates.map((d) => (
                <p key={d.id} className="text-xs text-amber-600 dark:text-amber-300 pl-5">
                  <span className="font-medium">{d.name}</span>
                  {' '}— currently in <span className="font-medium">{STAGE_LABELS[d.pipeline_stage] ?? d.pipeline_stage}</span>
                </p>
              ))}
              <p className="text-[11px] text-amber-500 dark:text-amber-400 pl-5">You can still add this candidate if they are different people.</p>
            </div>
          )}

          {roles.length > 0 && (
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={roleId} onValueChange={setRoleId}>
                <SelectTrigger>
                  <SelectValue placeholder="No role assigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No role</SelectItem>
                  {roles.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <Button
            type="submit"
            disabled={!canSubmit}
            className="w-full bg-blue-700 hover:bg-blue-800 text-white"
          >
            {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Adding…</> : 'Add Candidate'}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}

import { useState } from 'react';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Loader2, UserPlus } from 'lucide-react';

interface Role {
  id: string;
  title: string;
}

interface AddCandidateSheetProps {
  open: boolean;
  onClose: () => void;
  roles: Role[];
  defaultRoleId?: string;
  onAdd: (data: { name: string; email?: string; roleId?: string }) => Promise<void>;
}

export function AddCandidateSheet({ open, onClose, roles, defaultRoleId, onAdd }: AddCandidateSheetProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [roleId, setRoleId] = useState(defaultRoleId ?? 'none');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add candidate');
    } finally {
      setLoading(false);
    }
  }

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
              onChange={(e) => setName(e.target.value)}
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
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@example.com"
              disabled={loading}
            />
          </div>

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

import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Loader2, Sparkles, KeyRound, AlertCircle } from 'lucide-react';
import { edgeFunctions } from '@/lib/edgeFunctions';
import type { JDData } from './JDInlineEditor';
import type { WiseHireRole } from '@/hooks/wisehire/useJDs';

interface JDWriterFormProps {
  roles: WiseHireRole[];
  onResult: (jd: JDData, roleId: string | null) => void;
}

export function JDWriterForm({ roles, onResult }: JDWriterFormProps) {
  const [input, setInput] = useState('');
  const [selectedRoleId, setSelectedRoleId] = useState<string>('none');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [requiresKey, setRequiresKey] = useState(false);

  const charCount = input.trim().length;
  const canSubmit = charCount >= 10 && !loading;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError('');
    setRequiresKey(false);

    try {
      const { data, error: fnErr } = await edgeFunctions.invoke('wisehire-write-jd', {
        body: {
          input: input.trim(),
          role_id: selectedRoleId !== 'none' ? selectedRoleId : undefined,
        },
      });

      if (fnErr) {
        // 402 with requiresApiKey means the user needs to add an AI key
        if ((fnErr as { status?: number }).status === 402) { setRequiresKey(true); return; }
        throw new Error(fnErr.message);
      }
      if (!data?.jd) throw new Error('No JD returned from AI. Please try again.');

      onResult(data.jd as JDData, selectedRoleId !== 'none' ? selectedRoleId : null);
      setInput('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
      <div>
        <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-1">Write a Job Description</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Describe the role in a sentence or two and we'll generate a full JD.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="jdInput">Role description</Label>
        <Textarea
          id="jdInput"
          placeholder="e.g. Senior frontend engineer with React experience for a fintech startup in London…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={4}
          className="resize-none"
          disabled={loading}
        />
        <p className={`text-xs ${charCount < 10 && charCount > 0 ? 'text-amber-500' : 'text-slate-400'}`}>
          {charCount} characters {charCount < 10 ? `(${10 - charCount} more needed)` : ''}
        </p>
      </div>

      {roles.length > 0 && (
        <div className="space-y-1.5">
          <Label htmlFor="roleSelect">Save to role (optional)</Label>
          <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
            <SelectTrigger id="roleSelect">
              <SelectValue placeholder="Don't save to a role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Don't save to a role</SelectItem>
              {roles.map((r) => (
                <SelectItem key={r.id} value={r.id}>{r.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {requiresKey && (
        <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 text-sm">
          <KeyRound className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-700 dark:text-amber-400 mb-0.5">AI key required</p>
            <p className="text-amber-700/80 dark:text-amber-400/80">
              Add an OpenAI or Anthropic key in{' '}
              <a href="/wisehire/settings" className="underline font-medium">Settings</a>{' '}
              to use AI on the Starter plan.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <Button
        type="submit"
        disabled={!canSubmit}
        className="w-full bg-blue-700 hover:bg-blue-800 text-white font-semibold"
      >
        {loading ? (
          <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating JD…</>
        ) : (
          <><Sparkles className="h-4 w-4 mr-2" /> Write JD with AI</>
        )}
      </Button>
    </form>
  );
}

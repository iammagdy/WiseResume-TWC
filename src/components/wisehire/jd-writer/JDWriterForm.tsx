import { useState } from 'react';
import { MiniSpinner } from '@/components/ui/MiniSpinner';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Sparkles, AlertCircle } from 'lucide-react';
import { appwriteFunctions } from '@/lib/appwrite-functions';
import type { JDData } from './JDInlineEditor';
import type { WiseHireRole } from '@/hooks/wisehire/useJDs';
import { useAIAction } from '@/hooks/useAIAction';

interface JDWriterFormProps {
  roles: WiseHireRole[];
  onResult: (jd: JDData, roleId: string | null) => void;
}

export function JDWriterForm({ roles, onResult }: JDWriterFormProps) {
  const [input, setInput] = useState('');
  const [selectedRoleId, setSelectedRoleId] = useState<string>('none');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { execute: executeAI } = useAIAction({ operation: 'wisehire_jd_writer' });

  const charCount = input.trim().length;
  const canSubmit = charCount >= 10 && !loading;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError('');

    try {
      const data = await executeAI(async () => {
        const response = await appwriteFunctions.invoke<{ jd: JDData }>('wisehire-write-jd', {
          body: {
            input: input.trim(),
            role_id: selectedRoleId !== 'none' ? selectedRoleId : undefined,
          },
        });
        if (response.error) {
          throw Object.assign(new Error(response.error.message), {
            status: response.error.status ?? 500,
            code: response.error.code,
          });
        }
        return response.data;
      }, { silent: true });
      if (!data) return;
      if (!data.jd) throw new Error('No JD returned from AI. Please try again.');

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
          Describe the role and AI will draft only from the facts you provide. Review the result before publishing.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="jdInput">Role description</Label>
        <Textarea
          id="jdInput"
          placeholder="e.g. Senior frontend engineer with React experience for a fintech startup in London…"
          value={input}
          onChange={(e) => setInput(e.target.value.slice(0, 4000))}
          rows={4}
          className="resize-none"
          disabled={loading}
        />
        <p className={`text-xs ${charCount < 10 && charCount > 0 ? 'text-amber-500' : 'text-slate-400'}`}>
          {charCount} / 4000 characters {charCount < 10 ? `(${10 - charCount} more needed)` : ''}
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
          <><MiniSpinner size={16} className="mr-2" /> Generating JD…</>
        ) : (
          <><Sparkles className="h-4 w-4 mr-2" /> Write JD with AI</>
        )}
      </Button>
    </form>
  );
}

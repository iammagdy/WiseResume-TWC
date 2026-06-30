import { useCallback, useEffect, useState } from 'react';
import { Search, RefreshCw, UserPlus, ShieldCheck, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { invokeWithRetry } from '@/lib/devkit/devKitClient';
import { devKitAuthHeaders } from '@/lib/devkit/devKitAuth';
import { unwrapAdminResponse, formatEdgeError } from '@/lib/devkit/edgeResponse';
import { DevKitErrorCard } from './DevKitErrorCard';
import { DevKitLoading, DevKitMetricCard } from './DevKitUI';

interface SignupUser {
  user_id: string; email: string | null; full_name: string | null; signed_up_at: string;
  last_active_at: string | null; email_verified: boolean; signup_method: string;
  source: string | null; medium: string | null; campaign: string | null;
  profile_status: 'present' | 'missing'; onboarding_status: string; resume_count: number; plan: string;
}
interface SignupResponse {
  users: SignupUser[]; total: number;
  summary: { signups: number; verified: number; unverified: number };
  meta: { timezone: string; generatedAt: string; source: string; complete: boolean; truncated: boolean };
}

type Range = 'today' | '7d' | '30d' | 'custom';

function cairoRange(range: Range, customFrom: string, customTo: string) {
  if (range === 'custom') return { from: customFrom ? new Date(`${customFrom}T00:00:00+03:00`).toISOString() : undefined, to: customTo ? new Date(`${customTo}T23:59:59.999+03:00`).toISOString() : undefined };
  const days = range === 'today' ? 0 : range === '7d' ? 7 : 30;
  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit' });
  const cairoDate = formatter.format(new Date(Date.now() - days * 86400000));
  return { from: new Date(`${cairoDate}T00:00:00+03:00`).toISOString() };
}

export function AdminSignupsPanel() {
  const [data, setData] = useState<SignupResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<Range>('7d');
  const [search, setSearch] = useState('');
  const [verification, setVerification] = useState('all');
  const [profile, setProfile] = useState('all');
  const [resume, setResume] = useState('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [page, setPage] = useState(0);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const bounds = cairoRange(range, customFrom, customTo);
      const tuple = await invokeWithRetry<SignupResponse>('admin-devkit-data', {
        headers: devKitAuthHeaders(),
        body: {
          action: 'list-signups', page, pageSize: 50, search, sort: 'joined_desc', ...bounds,
          filters: {
            ...bounds,
            ...(verification !== 'all' ? { verification } : {}),
            ...(profile !== 'all' ? { profile } : {}),
            ...(resume !== 'all' ? { resume } : {}),
          },
        },
      });
      setData(unwrapAdminResponse<SignupResponse>(tuple, 'admin-devkit-data'));
    } catch (cause) { setError(formatEdgeError(cause, 'Failed to load signups')); }
    finally { setLoading(false); }
  }, [range, customFrom, customTo, page, search, verification, profile, resume]);

  useEffect(() => { const id = window.setTimeout(load, 250); return () => window.clearTimeout(id); }, [load]);
  useEffect(() => setPage(0), [range, search, verification, profile, resume, customFrom, customTo]);

  if (loading && !data) return <DevKitLoading text="Loading Appwrite Auth signups…" />;
  if (error && !data) return <DevKitErrorCard error={error} title="Failed to load signups" onRetry={load} context={{ panel: 'AdminSignupsPanel' }} />;

  const totalPages = Math.max(1, Math.ceil((data?.total || 0) / 50));
  return <div className="space-y-4">
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <DevKitMetricCard label="Signups" value={data?.summary.signups ?? '—'} subtext="Appwrite Auth" icon={UserPlus} />
      <DevKitMetricCard label="Verified" value={data?.summary.verified ?? '—'} subtext="Email verified" icon={ShieldCheck} />
      <DevKitMetricCard label="Unverified" value={data?.summary.unverified ?? '—'} subtext="Needs verification" icon={ShieldAlert} />
    </div>
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3">
      <div className="relative min-w-56 flex-1"><Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" /><Input className="pl-9" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search all signups" /></div>
      <select className="h-10 rounded-md border border-border bg-background px-3 text-sm" value={range} onChange={e => setRange(e.target.value as Range)}><option value="today">Today</option><option value="7d">7 days</option><option value="30d">30 days</option><option value="custom">Custom</option></select>
      <select className="h-10 rounded-md border border-border bg-background px-3 text-sm" value={verification} onChange={e => setVerification(e.target.value)}><option value="all">All verification</option><option value="verified">Verified</option><option value="unverified">Unverified</option></select>
      <select className="h-10 rounded-md border border-border bg-background px-3 text-sm" value={profile} onChange={e => setProfile(e.target.value)}><option value="all">All profiles</option><option value="present">Has profile</option><option value="missing">No profile</option></select>
      <select className="h-10 rounded-md border border-border bg-background px-3 text-sm" value={resume} onChange={e => setResume(e.target.value)}><option value="all">All resumes</option><option value="present">Has resume</option><option value="missing">No resume</option></select>
      <Button variant="outline" size="icon" onClick={load} aria-label="Refresh signups"><RefreshCw className="w-4 h-4" /></Button>
      {range === 'custom' && <><Input type="date" className="w-40" value={customFrom} onChange={e => setCustomFrom(e.target.value)} aria-label="Signup date from" /><Input type="date" className="w-40" value={customTo} onChange={e => setCustomTo(e.target.value)} aria-label="Signup date to" /></>}
    </div>
    {data?.meta.truncated && <div role="status" className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-500">Results are partial. Narrow the range for exact totals.</div>}
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-[1050px] text-sm"><thead className="bg-muted/40 text-xs text-muted-foreground"><tr>{['User','Signed up','Verification','Source','Profile','Onboarding','Resumes','Plan','Last active'].map(h => <th key={h} className="p-3 text-left">{h}</th>)}</tr></thead>
      <tbody>{data?.users.map(user => <tr key={user.user_id} className="border-t border-border"><td className="p-3"><div className="font-medium">{user.full_name || 'Unnamed'}</div><div className="text-xs text-muted-foreground">{user.email}</div></td><td className="p-3 whitespace-nowrap">{new Date(user.signed_up_at).toLocaleString()}</td><td className="p-3">{user.email_verified ? 'Verified' : 'Unverified'}</td><td className="p-3">{user.source || 'Direct'}{user.campaign ? ` / ${user.campaign}` : ''}</td><td className="p-3">{user.profile_status}</td><td className="p-3">{user.onboarding_status}</td><td className="p-3 tabular-nums">{user.resume_count}</td><td className="p-3 capitalize">{user.plan}</td><td className="p-3 whitespace-nowrap">{user.last_active_at ? new Date(user.last_active_at).toLocaleString() : 'Never'}</td></tr>)}</tbody></table>
      {!data?.users.length && <div className="p-12 text-center text-sm text-muted-foreground">No signups match these filters.</div>}
    </div>
    <div className="flex justify-between text-xs text-muted-foreground"><span>{data?.total || 0} signups · {data?.meta.timezone}</span><div className="flex items-center gap-2"><Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Previous</Button><span>{page + 1}/{totalPages}</span><Button variant="outline" size="sm" disabled={page + 1 >= totalPages} onClick={() => setPage(p => p + 1)}>Next</Button></div></div>
  </div>;
}

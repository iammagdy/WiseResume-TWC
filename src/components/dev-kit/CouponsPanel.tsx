import { useState, useEffect, useCallback } from 'react';
import { MiniSpinner } from '@/components/ui/MiniSpinner';
import { Ticket, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { appwriteFunctions } from '@/lib/appwrite-functions';
import { devKitAuthHeaders } from '@/lib/devkit/devKitAuth';
import { unwrapAdminResponse, formatEdgeError } from '@/lib/devkit/edgeResponse';
import { DevKitErrorCard } from './DevKitErrorCard';

interface DiscountCode {
  $id: string;
  $createdAt: string;
  code: string;
  active: boolean;
  percent_off: number;
  plan_override?: 'pro' | 'premium';
  plan_days?: number;
  max_uses?: number;
  uses_count?: number;
}

export const CouponsPanel = () => {
  const [coupons, setCoupons] = useState<DiscountCode[]>([]);
  const [newCode, setNewCode] = useState('');
  const [newPlan, setNewPlan] = useState<'pro' | 'premium'>('premium');
  const [newPlanDays, setNewPlanDays] = useState('30');
  const [newMaxUses, setNewMaxUses] = useState('0');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCoupons = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const tuple = await appwriteFunctions.invoke('admin-devkit-data', {
        headers: devKitAuthHeaders(),
        body: { action: 'list-discount-codes' },
      });
      const result = unwrapAdminResponse<{ codes?: DiscountCode[]; total?: number }>(
        tuple,
        'admin-devkit-data',
      );
      setCoupons(result.codes ?? []);
    } catch (e) {
      setError(formatEdgeError(e, 'Failed to load discount codes'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCoupons(); }, [fetchCoupons]);

  const handleAdd = async () => {
    const code = newCode.trim();
    if (!code) { toast.info('Enter a coupon code'); return; }
    const planDays = Number(newPlanDays);
    const maxUses = Number(newMaxUses);
    if (!Number.isInteger(planDays) || planDays < 1 || planDays > 365) {
      toast.info('Duration must be a whole number from 1 to 365 days');
      return;
    }
    if (!Number.isInteger(maxUses) || maxUses < 0 || maxUses > 1_000_000) {
      toast.info('Maximum uses must be 0 (unlimited) or a whole number up to 1,000,000');
      return;
    }
    setAdding(true);
    try {
      const tuple = await appwriteFunctions.invoke('admin-devkit-data', {
        headers: devKitAuthHeaders(),
        body: {
          action: 'add-discount-code',
          code,
          percent_off: 100,
          active: true,
          plan_override: newPlan,
          plan_days: planDays,
          max_uses: maxUses,
        },
      });
      unwrapAdminResponse(tuple, 'admin-devkit-data');
      setNewCode('');
      toast.success(`Coupon ${code.toUpperCase()} created`);
      fetchCoupons();
    } catch (e) {
      toast.error(formatEdgeError(e, 'Failed to create coupon'));
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="p-6 rounded-3xl bg-blue-500/5 border border-blue-500/10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[minmax(220px,1fr)_160px_130px_150px_auto] gap-4 items-end">
        <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
          <Label htmlFor="coupon-code">Coupon code</Label>
          <Input
            id="coupon-code"
            placeholder="BETA2026"
            className="bg-white/5 border-white/10 rounded-xl uppercase font-black tracking-widest"
            value={newCode}
            onChange={e => setNewCode(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            disabled={adding}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Plan</Label>
          <Select value={newPlan} onValueChange={value => setNewPlan(value as 'pro' | 'premium')} disabled={adding}>
            <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="premium">Premium</SelectItem>
              <SelectItem value="pro">Pro</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="coupon-days">Days</Label>
          <Input
            id="coupon-days"
            type="number"
            min={1}
            max={365}
            value={newPlanDays}
            onChange={event => setNewPlanDays(event.target.value)}
            disabled={adding}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="coupon-max-uses">Max uses (0 = unlimited)</Label>
          <Input
            id="coupon-max-uses"
            type="number"
            min={0}
            max={1_000_000}
            value={newMaxUses}
            onChange={event => setNewMaxUses(event.target.value)}
            disabled={adding}
          />
        </div>
        <Button
          onClick={handleAdd}
          disabled={adding || !newCode.trim()}
          className="rounded-xl h-11 px-8 bg-blue-600 hover:bg-blue-500 font-bold uppercase italic shrink-0"
        >
          {adding ? <MiniSpinner size={16} /> : <Plus size={18} className="mr-2" />}
          {adding ? 'Adding…' : 'Generate'}
        </Button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12 gap-3 text-white/40">
          <MiniSpinner size={20} />
          <span className="text-sm">Loading discount codes…</span>
        </div>
      )}

      {!loading && error && (
        <DevKitErrorCard
          error={error}
          title="Failed to load discount codes"
          onRetry={fetchCoupons}
          context={{ panel: 'CouponsPanel', action: 'list-discount-codes' }}
        />
      )}

      {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {coupons.map(c => (
            <div
              key={c.$id}
              className="p-5 rounded-2xl bg-card border border-border flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-white/5 rounded-xl text-yellow-400">
                  <Ticket size={20} />
                </div>
                <div>
                  <p className="font-black text-lg tracking-tighter text-white uppercase">{c.code}</p>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">
                    {(c.plan_override || 'UNCONFIGURED').toUpperCase()} • {c.plan_days || 0} DAYS •{' '}
                    {c.max_uses ? `${c.uses_count || 0}/${c.max_uses} USED` : 'UNLIMITED'} •{' '}
                    <span className={c.active ? 'text-emerald-400' : 'text-red-400'}>
                      {c.active ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          ))}

          {coupons.length === 0 && (
            <div className="col-span-2 p-12 text-center text-muted-foreground border border-dashed border-border rounded-3xl">
              No discount codes yet. Generate your first one above.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

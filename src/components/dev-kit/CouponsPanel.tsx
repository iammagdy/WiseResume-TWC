import { useState, useEffect, useCallback } from 'react';
import { MiniSpinner } from '@/components/ui/MiniSpinner';
import { Ticket, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
}

export const CouponsPanel = () => {
  const [coupons, setCoupons] = useState<DiscountCode[]>([]);
  const [newCode, setNewCode] = useState('');
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
      const result = unwrapAdminResponse<{ data?: { codes?: DiscountCode[]; total?: number } }>(
        tuple,
        'admin-devkit-data',
      );
      setCoupons(result.data?.codes ?? []);
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
    setAdding(true);
    try {
      const tuple = await appwriteFunctions.invoke('admin-devkit-data', {
        headers: devKitAuthHeaders(),
        body: { action: 'add-discount-code', code, percent_off: 100, active: true },
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
      <div className="p-6 rounded-3xl bg-blue-500/5 border border-blue-500/10 flex items-center gap-4">
        <Input
          placeholder="ENTER NEW CODE (e.g. BETA2026)"
          className="bg-white/5 border-white/10 rounded-xl uppercase font-black tracking-widest"
          value={newCode}
          onChange={e => setNewCode(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          disabled={adding}
        />
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
                    {c.percent_off}% OFF •{' '}
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
